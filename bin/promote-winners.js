#!/usr/bin/env node

/**
 * Promote winning prompt variants based on A/B test evolution data.
 *
 * Reads _ab-results/evolution.jsonl, identifies variants that consistently
 * outperform the base prompt (>60% win rate, >=3 data points), and promotes
 * them by replacing the base template.
 *
 * Usage:
 *   node bin/promote-winners.js [--dry-run]
 */

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const { EvolutionTracker } = require('../lib/evolution-tracker');
const { PromptRegistry } = require('../lib/prompt-registry');

const PROJECT_ROOT = path.join(__dirname, '..');
const TEMPLATES_PATH = path.join(PROJECT_ROOT, 'templates', 'agents');
const RESULTS_DIR = path.join(PROJECT_ROOT, '_ab-results');

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log('Prompt Evolution: Promote Winners');
  console.log('==================================');
  if (dryRun) console.log('[DRY RUN MODE]\n');

  const tracker = new EvolutionTracker(RESULTS_DIR);
  const summary = tracker.getSummary();

  console.log(`Total A/B records: ${summary.totalRecords}`);
  console.log(`Variants tested:   ${summary.uniqueVariants.join(', ') || 'none'}`);
  console.log(`Layers tested:     ${summary.uniqueLayers.join(', ') || 'none'}`);
  console.log('');

  const candidates = tracker.getPromotionCandidates();
  if (candidates.length === 0) {
    console.log('No variants meet promotion criteria (>60% win rate, >=3 data points).');
    return;
  }

  console.log(`Promotion candidates: ${candidates.length}`);
  console.log('');

  // Scan registry to find template paths
  const registry = new PromptRegistry(TEMPLATES_PATH);
  const entries = await registry.scan();

  const promotions = [];
  const archiveDir = path.join(TEMPLATES_PATH, 'archive');

  for (const candidate of candidates) {
    console.log(`  ${candidate.layerId}: ${candidate.variant} wins ${candidate.wins}/${candidate.total} (${(candidate.winRate * 100).toFixed(0)}%)`);

    // Find the variant file and the base file it should replace
    const variantEntry = entries.find(
      e => e.isVariant && e.variantName === candidate.variant && e.baselinePath
    );

    if (!variantEntry) {
      console.log(`    SKIP: Could not find variant file for '${candidate.variant}'`);
      continue;
    }

    const basePath = variantEntry.baselinePath;
    const variantPath = variantEntry.filePath;
    const baseFilename = path.basename(basePath);
    const dateStr = new Date().toISOString().split('T')[0];
    const archiveName = `${baseFilename.replace('.md', '')}.${dateStr}.md`;

    console.log(`    Base:    ${baseFilename}`);
    console.log(`    Variant: ${path.basename(variantPath)}`);
    console.log(`    Archive: archive/${archiveName}`);

    if (!dryRun) {
      // Create archive directory
      await fsp.mkdir(archiveDir, { recursive: true });

      // Move old base to archive
      await fsp.copyFile(basePath, path.join(archiveDir, archiveName));

      // Copy variant to base location
      await fsp.copyFile(variantPath, basePath);

      console.log(`    PROMOTED`);
    } else {
      console.log(`    [DRY RUN] Would promote`);
    }

    promotions.push({
      timestamp: new Date().toISOString(),
      layerId: candidate.layerId,
      variant: candidate.variant,
      winRate: candidate.winRate,
      dataPoints: candidate.total,
      basePath: basePath,
      variantPath: variantPath,
      archivePath: path.join(archiveDir, archiveName)
    });
  }

  // Log promotions
  if (!dryRun && promotions.length > 0) {
    const logPath = path.join(RESULTS_DIR, 'promotions.jsonl');
    const logLines = promotions.map(p => JSON.stringify(p)).join('\n') + '\n';
    fs.appendFileSync(logPath, logLines);
    console.log(`\nLogged ${promotions.length} promotion(s) to ${logPath}`);
  }

  console.log(`\nDone. ${promotions.length} variant(s) ${dryRun ? 'would be' : ''} promoted.`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { main };

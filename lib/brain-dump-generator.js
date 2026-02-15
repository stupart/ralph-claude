class BrainDumpGenerator {
  generate(generationHistory, convergenceReport, codebaseMetadata) {
    if (!generationHistory) throw new Error('generationHistory is required');
    if (!convergenceReport) throw new Error('convergenceReport is required');
    if (!codebaseMetadata) throw new Error('codebaseMetadata is required');

    const generations = generationHistory.generations || [];
    const nextGen = generations.length > 0 ? Math.max(...generations.map(g => g.generation)) + 1 : 1;

    if (generations.length === 0) {
      return `# Brain Dump: Layer Cake v${nextGen}\n\n## Project Context\nNo historical data available. Manual input required.\n\n## Current State Summary\n${this._formatCodebaseMetadata(codebaseMetadata)}\n\n## Meta-Problem Analysis\nNo analysis available without historical data.\n\n## Proposed Epics\nNo automated proposals. Define epics manually.\n\n## Constraints and "What NOT to Do"\nNo constraints derived from history.\n`;
    }

    const chronicDeferrals = this._identifyChronicDeferrals(generationHistory);
    const proposedEpics = this._prioritizeEpics(generationHistory, convergenceReport);
    const recurringIssues = this._surfaceRecurringIssues(generationHistory.issueLedger);
    const constraints = this._generateConstraints(generationHistory, convergenceReport);

    const projectContext = `Layer Cake is a 12-layer autonomous code generation pipeline. Current version: v${nextGen - 1}. Module count: ${codebaseMetadata.moduleCount || '(data unavailable)'}. Test count: ${codebaseMetadata.testCount || '(data unavailable)'}.`;

    const currentState = `Tests: ${codebaseMetadata.testCount || '(data unavailable)'}. Recent changes: ${codebaseMetadata.recentChanges || '(data unavailable)'}.`;

    let metaProblem = `Convergence status: **${convergenceReport.compositeScore || convergenceReport.status}**.`;
    if (recurringIssues.length > 0) metaProblem += `\n\n### Recurring Pain Points\n\n${recurringIssues.map(i => `- ${i}`).join('\n')}`;
    if (chronicDeferrals.length > 0) metaProblem += `\n\n### Chronic Deferrals\n\n${chronicDeferrals.map(d => `- **${d.epicName}**: ${d.urgency}`).join('\n')}`;

    return this._assembleMarkdown({ nextGen, projectContext, currentState, metaProblem, proposedEpics, constraints });
  }

  _formatCodebaseMetadata(metadata) {
    const parts = [];
    if (metadata.moduleCount) parts.push(`Module count: ${metadata.moduleCount}`);
    else parts.push('Module count: (data unavailable)');
    if (metadata.testCount) parts.push(`Test count: ${metadata.testCount}`);
    else parts.push('Test count: (data unavailable)');
    if (metadata.recentChanges) parts.push(`Recent changes: ${metadata.recentChanges}`);
    return parts.join('. ') + '.';
  }

  _identifyChronicDeferrals(generationHistory) {
    const deferrals = [];
    const counts = generationHistory.deferralCounts || {};
    for (const [epicName, data] of Object.entries(counts)) {
      if (data.consecutive >= 3) {
        deferrals.push({
          epicName,
          consecutive: data.consecutive,
          total: data.total,
          urgency: `Deferred ${data.consecutive} consecutive generations. MUST deliver or explicitly cancel.`
        });
      }
    }
    return deferrals.sort((a, b) => b.consecutive - a.consecutive);
  }

  _prioritizeEpics(generationHistory, convergenceReport) {
    const proposals = [];
    const deferralCounts = generationHistory.deferralCounts || {};
    const issueLedger = generationHistory.issueLedger || [];

    for (const [epicName, counts] of Object.entries(deferralCounts)) {
      if (counts.total === 0) continue;
      let score = counts.consecutive * 10;
      let rationale = `Deferred ${counts.consecutive} consecutive times.`;
      const relatedIssues = issueLedger.filter(i => i.title.toLowerCase().includes(epicName.toLowerCase().split(' ')[0]));
      for (const issue of relatedIssues) {
        score += issue.severity === 'MAJOR' ? 5 : 2;
        rationale += ` Related issue "${issue.title}" (${issue.severity}).`;
      }
      proposals.push({ epicName, score, rationale, source: 'deferral' });
    }

    for (const regression of (convergenceReport.regressions || [])) {
      proposals.push({ epicName: `Address ${regression.metric} regression`, score: 8, rationale: `${regression.metric} has been regressing.`, source: 'convergence' });
    }
    for (const plateau of (convergenceReport.plateaus || [])) {
      proposals.push({ epicName: `Break ${plateau.metric} plateau`, score: 3, rationale: `${plateau.metric} has plateaued.`, source: 'convergence' });
    }

    return proposals.sort((a, b) => b.score - a.score);
  }

  _surfaceRecurringIssues(issueLedger) {
    const recurring = (issueLedger || [])
      .filter(i => i.recurrenceCount >= 2)
      .sort((a, b) => b.recurrenceCount - a.recurrenceCount);

    const top = recurring.slice(0, 10);
    const formatted = top.map(issue => {
      const gens = issue.generations.map(g => `v${g}`).join(', ');
      return `**${issue.title}**: Found in ${issue.recurrenceCount} generations (${gens}). ${issue.severity}.`;
    });

    if (recurring.length > 10) {
      formatted.push(`...and ${recurring.length - 10} additional recurring issues`);
    }
    return formatted;
  }

  _generateConstraints(generationHistory, convergenceReport) {
    const constraints = [];

    for (const reg of (convergenceReport.regressions || [])) {
      constraints.push(`Do NOT ignore ${reg.metric} — it has been regressing since generation v${reg.startGeneration}`);
    }

    for (const [name, counts] of Object.entries(generationHistory.deferralCounts || {})) {
      if (counts.consecutive >= 3) {
        constraints.push(`Do NOT defer "${name}" again without explicit cancellation decision`);
      }
    }

    const recurringIssues = (generationHistory.issueLedger || []).filter(i => i.recurrenceCount >= 2);
    for (const issue of recurringIssues.slice(0, 3)) {
      constraints.push(`Do NOT ignore "${issue.title}" — it has recurred ${issue.recurrenceCount} times`);
    }

    constraints.push('Do NOT modify core pipeline modules (ralph.js, state-machine.js, validator.js) unless a bug is found');

    return constraints;
  }

  _assembleMarkdown({ nextGen, projectContext, currentState, metaProblem, proposedEpics, constraints }) {
    const parts = [];
    parts.push(`# Brain Dump: Layer Cake v${nextGen}\n`);

    parts.push(`## Project Context\n\n${projectContext}\n`);
    parts.push(`## Current State Summary\n\n${currentState}\n`);
    parts.push(`## Meta-Problem Analysis\n\n${metaProblem}\n`);

    parts.push(`## Proposed Epics\n`);
    proposedEpics.forEach((epic, i) => {
      parts.push(`### ${i + 1}. ${epic.epicName}\n\n**Priority Score**: ${epic.score} | **Source**: ${epic.source}\n\n**Rationale**: ${epic.rationale}\n`);
    });

    parts.push(`## Constraints and "What NOT to Do"\n`);
    constraints.forEach((c, i) => {
      parts.push(`${i + 1}. ${c}`);
    });

    return parts.join('\n');
  }
}

module.exports = { BrainDumpGenerator };

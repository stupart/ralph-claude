# Ralph A/B Test: Post-Test Instructions

When the overnight test is complete, follow these steps to analyze results and clean up.

---

## Step 1: Stop Both Instances

```bash
# Gracefully stop (Ctrl+C in both terminals)
# Or force kill:
pkill -f ralph-og
pkill -f ralph-new
pkill -f "claude.*Porpus"
```

---

## Step 2: Stop Dev Servers

```bash
pkill -f "Porpus.*vite"
pkill -f "Porpus.*tsx"

# Verify ports are free
lsof -i :3001,3002,5173,5174
```

---

## Step 3: Collect Results

### Basic Stats

```bash
echo "=== OG RALPH RESULTS ==="
cd ~/Porpus-OG-Ralph

echo "Git commits:"
git log --oneline | wc -l

echo "Features completed:"
grep -c '"status": "passing"' PRD.json 2>/dev/null || echo "N/A"

echo "Progress entries:"
grep -c "^## \[" progress.md

echo ""
echo "=== NEW RALPH RESULTS ==="
cd ~/Porpus-NEW-Ralph

echo "Git commits:"
git log --oneline | wc -l

echo "Features completed:"
grep -oP '(?<=\| )(done|pending)(?= \|)' PROJECT.md | sort | uniq -c

echo "Progress entries:"
grep -c "^### " PROJECT.md
```

### Detailed Comparison

```bash
# Create results directory
mkdir -p ~/ralph-ab-test-results-$(date +%Y%m%d)
cd ~/ralph-ab-test-results-$(date +%Y%m%d)

# Copy key files
cp ~/Porpus-OG-Ralph/PRD.json ./og-PRD.json
cp ~/Porpus-OG-Ralph/progress.md ./og-progress.md
cp ~/Porpus-OG-Ralph/plan.md ./og-plan.md 2>/dev/null

cp ~/Porpus-NEW-Ralph/PROJECT.md ./new-PROJECT.md

# Git logs
cd ~/Porpus-OG-Ralph && git log --oneline > ~/ralph-ab-test-results-*/og-commits.txt
cd ~/Porpus-NEW-Ralph && git log --oneline > ~/ralph-ab-test-results-*/new-commits.txt

# Diff of actual code changes
cd ~/Porpus-OG-Ralph && git diff og-ralph-test~50..og-ralph-test --stat > ~/ralph-ab-test-results-*/og-code-diff.txt 2>/dev/null
cd ~/Porpus-NEW-Ralph && git diff new-ralph-test~50..new-ralph-test --stat > ~/ralph-ab-test-results-*/new-code-diff.txt 2>/dev/null
```

---

## Step 4: Analyze Quality

### Questions to Answer

1. **Completion Rate**
   - How many features did each complete?
   - Did either get stuck?

2. **Code Quality**
   - Run tests in both: `cd ~/Porpus-OG-Ralph && npm test`
   - Check for TypeScript errors: `npm run typecheck`
   - Compare code patterns

3. **Commit Discipline**
   - Are commits atomic (one task each)?
   - Are commit messages clear?

4. **Journey Completion**
   - Did either verify with `/chrome`?
   - Do the features actually work?

5. **Time Efficiency**
   - How long did each take per feature?
   - Any wasted iterations?

### Manual Testing

```bash
# Start OG version
cd ~/Porpus-OG-Ralph && npm run dev
# Open http://localhost:5173 and test the new feature

# Start NEW version (stop OG first)
cd ~/Porpus-NEW-Ralph && npm run dev
# Open http://localhost:5174 and test the new feature
```

---

## Step 5: Document Findings

Create a summary file:

```bash
cat > ~/ralph-ab-test-results-$(date +%Y%m%d)/SUMMARY.md << 'EOF'
# Ralph A/B Test Summary

Date: [DATE]
Duration: [X hours]

## OG Ralph (PRD.json approach)

- Features completed: X/Y
- Total commits: X
- Tests passing: X/X
- Blockers encountered: [list]
- Notable behaviors: [observations]

## NEW Ralph (PROJECT.md approach)

- Features completed: X/Y
- Total commits: X
- Tests passing: X/X
- Blockers encountered: [list]
- Notable behaviors: [observations]

## Winner

[OG / NEW / TIE]

## Reasons

1. [Reason 1]
2. [Reason 2]
3. [Reason 3]

## Recommendations

- [What to improve]
- [What to keep]
- [Next steps]
EOF
```

---

## Step 6: Cleanup

### Option A: Keep Results, Remove Worktrees

```bash
# Results are saved in ~/ralph-ab-test-results-*/

# Remove worktrees
cd /Users/tylerstupart/ralph-claude/Porpus
git worktree remove ~/Porpus-OG-Ralph --force
git worktree remove ~/Porpus-NEW-Ralph --force

# Optionally delete branches
git branch -D og-ralph-test new-ralph-test

# Or keep branches for reference
git branch  # verify they still exist
```

### Option B: Keep Everything for Further Analysis

```bash
# Just stop the processes, keep worktrees
# You can restart later with:
cd ~/Porpus-OG-Ralph && caffeinate -ims ralph-og
cd ~/Porpus-NEW-Ralph && caffeinate -ims ralph-new
```

### Option C: Merge Winning Approach

If NEW Ralph wins and you want to use its changes:

```bash
cd /Users/tylerstupart/ralph-claude/Porpus
git checkout trunk
git merge new-ralph-test -m "merge: NEW ralph test results"
```

If OG Ralph wins:

```bash
cd /Users/tylerstupart/ralph-claude/Porpus
git checkout trunk
git merge og-ralph-test -m "merge: OG ralph test results"
```

---

## Step 7: Update Ralph Default

If you decide on a winner:

```bash
cd /Users/tylerstupart/ralph-claude

# If NEW approach wins:
git checkout unified-project-doc
cargo install --path . --force

# If OG approach wins:
git checkout main
cargo install --path . --force

# Now `ralph` command uses the winning version
```

---

## Troubleshooting

### If a worktree is corrupted:

```bash
git worktree remove ~/Porpus-OG-Ralph --force
git worktree prune
```

### If ports are still in use:

```bash
# Find and kill processes
lsof -ti :3001 | xargs kill -9
lsof -ti :3002 | xargs kill -9
lsof -ti :5173 | xargs kill -9
lsof -ti :5174 | xargs kill -9
```

### If ralph binaries are missing:

```bash
ls -la ~/.cargo/bin/ralph*
# Rebuild if needed (see Phase 6 in main plan)
```

### If git branches are messed up:

```bash
cd /Users/tylerstupart/ralph-claude/Porpus
git worktree list  # see what's linked
git branch -a      # see all branches
git status         # check current state
```

---

## Files Created During Test

| Location | Purpose |
|----------|---------|
| `~/Porpus-OG-Ralph/` | OG Ralph worktree |
| `~/Porpus-NEW-Ralph/` | NEW Ralph worktree |
| `~/.cargo/bin/ralph-og` | OG Ralph binary |
| `~/.cargo/bin/ralph-new` | NEW Ralph binary |
| `~/ralph-ab-test-results-*/` | Collected results |

---

## Quick Reference

```bash
# Start test
caffeinate -ims ralph-og  # Terminal 1
caffeinate -ims ralph-new # Terminal 2

# Check status
tail -f ~/Porpus-OG-Ralph/progress.md
tail -f ~/Porpus-NEW-Ralph/PROJECT.md

# Stop test
pkill -f ralph

# Cleanup
git worktree remove ~/Porpus-OG-Ralph --force
git worktree remove ~/Porpus-NEW-Ralph --force
```

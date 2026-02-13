# Subtasks: Add Folder Creation on Layer Entry

**Parent Feature:** Filesystem State Machine
**Parent Epic:** Ralph Orchestration

---

## Subtask 1: Create FolderManager Module

**Action:** Create FolderManager module with ensureLayerFolder(layer) function that creates the appropriate output folder when entering a new layer.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/src/state/folder-manager.js` - Folder management utilities

**Code Pattern/API:** function ensureLayerFolder(projectPath, layer) { const folderName = LAYER_CAKE.getLayer(layer).outputs; fs.mkdirSync(path.join(projectPath, folderName), { recursive: true }); }

**Verification:** Entering L4 creates 4-epics/ folder; folder names match LAYER_CAKE output patterns

---

## Subtask 2: Integrate with State Transitions

**Action:** Modify advance() and cascade() functions to call ensureLayerFolder() when entering a new layer, with idempotent behavior (don't fail if folder exists).

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/state/state-manager.js` - Integrate folder creation

**Code Pattern/API:** advance() { ... FolderManager.ensureLayerFolder(projectPath, newLayer); ... }

**Verification:** Folder created automatically on layer entry; existing folders are not recreated or errored; folder structure is correct

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met

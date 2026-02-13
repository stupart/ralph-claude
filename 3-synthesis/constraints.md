# Constraints and Boundaries

Technical, process, and scope limitations for the Layer Cake system.

---

## Technical Constraints

### TC1: Context Window Limits

**Constraint:** Each Claude session has a finite context window (currently ~200K tokens for Claude 3.5 Sonnet, larger for other models).

**Impact:**
- Cannot load entire project history into each session
- Large codebases require selective file loading
- Long-running sessions accumulate context and may degrade

**Mitigations:**
- Context packages per role (load only what's needed)
- Session breaks at natural boundaries (layer transitions)
- Summarization of completed work rather than full history

**Measurement:** Monitor token usage per session, alert if approaching limits.

---

### TC2: API Cost Accumulation

**Constraint:** Every agent invocation, review cycle, and retry costs API tokens.

**Impact:**
- Iteration requests add cost (ITERATE -> refine -> re-review)
- Multiple agents multiply costs
- Large projects with many subtasks are expensive

**Mitigations:**
- Graduated rigor reduces late-stage iteration cycles
- Context packages minimize per-call token usage
- Escalation limits prevent infinite iteration loops
- Project tier selection right-sizes the process

**Measurement:** Track API cost per layer, per project tier. Identify cost hotspots.

---

### TC3: Session Timeout and Interruption

**Constraint:** Claude sessions can end unexpectedly due to timeout, API errors, or user action.

**Impact:**
- Work in progress may be lost
- State may become inconsistent
- User must restart and resume

**Mitigations:**
- _status.md updated frequently
- Git commits at task boundaries
- Handoff prompt template for clean resume
- Folder structure as backup state

**Measurement:** Track session resume frequency, identify common interruption points.

---

### TC4: Browser Automation Reliability

**Constraint:** /chrome testing depends on MCP browser automation which may be slow, flaky, or unavailable.

**Impact:**
- UI tests may timeout or produce inconsistent results
- Some environments don't have /chrome available
- Complex interactions may not work reliably

**Mitigations:**
- Fallback to automated test suites when /chrome unavailable
- Retry flaky browser tests once before requesting iteration
- Document manual testing steps for complex scenarios

**Measurement:** Track /chrome success rate, identify flaky test patterns.

---

### TC5: Git Availability and Permissions

**Constraint:** Layer Cake assumes Git is available and the project is a Git repository.

**Impact:**
- Non-Git projects cannot use checkpoint/resume features
- Permission issues may block commits
- Submodules and complex Git setups may confuse state

**Mitigations:**
- Verify Git status on session start
- Fallback to _status.md only if Git unavailable
- Document Git requirements clearly

---

## Process Constraints

### PC1: Minimum Artifact Counts

**Constraint:** Each layer has enforced minimums (3+ epics, 3+ features per epic, etc.).

**Impact:**
- Simple tasks may be over-decomposed
- Agents cannot proceed until minimums are met
- May generate padding to meet counts

**Mitigations:**
- Project tier system (micro/small/medium/large)
- "N/A with justification" for genuinely sparse areas
- Judge reviews for padding and rejects it

**Boundaries:**
| Tier | Min Epics | Min Features/Epic | Min Tasks/Feature | Min Subtasks/Task |
|------|-----------|-------------------|-------------------|-------------------|
| Micro | 1 | 2 | 2 | 1 |
| Small | 3 | 3 | 3 | 2 |
| Medium | 4 | 4 | 4 | 2 |
| Large | 5 | 5 | 5 | 3 |

---

### PC2: Maximum Iteration Limits

**Constraint:** Max 3 iterations per layer before escalation to human decision.

**Impact:**
- Persistent issues prompt human involvement
- Cannot iterate indefinitely on the same layer
- May escalate issues that could be resolved with more iterations

**Rationale:** Prevents infinite loops, ensures human oversight on challenging problems. An iteration request is not a failure - it's the system prompting deeper thinking. But after 3 iterations, human judgment is needed to decide the path forward.

**Boundary:** 3 iterations, then escalate one level up. If escalation also results in 3 iterations, escalate again.

---

### PC3: Human Gate Requirements

**Constraint:** L3 (Synthesis) and L7 (Subtasks) require human approval before proceeding.

**Impact:**
- Progress blocks until human is available
- Async workflows are interrupted
- Human becomes bottleneck for throughput

**Mitigations:**
- Clear notifications when gates are reached
- All context provided for quick review
- Future: tiered gating based on project risk

**Boundaries:**
- L3 gate: Cannot proceed to L4 (Epics) without human APPROVE
- L7 gate: Cannot proceed to L8 (Build) without human APPROVE

---

### PC4: Agent Role Separation

**Constraint:** Each agent has specific tools and cannot perform other roles' actions.

**Impact:**
- Judge cannot fix issues it finds (only report them)
- Builder cannot improve specs (only follow them)
- Planner cannot run tests (only write specs)

**Rationale:** Prevents self-review bias, enforces accountability.

**Boundaries:**
| Agent | CAN DO | CANNOT DO |
|-------|--------|-----------|
| Planner | Read, Write specs, Search code | Edit code, Run tests |
| Builder | Read, Write, Edit code, Run bash | Write specs, Review |
| Judge | Read, Search, Run tests | Write anything, Edit code |

---

### PC5: Template Compliance

**Constraint:** All artifacts must follow defined templates with required sections.

**Impact:**
- Non-compliant artifacts are rejected by Judge
- Some creativity constrained by template structure
- Updates to templates require artifact updates

**Mitigations:**
- "N/A: {reason}" allowed for inapplicable sections
- Templates are guidelines not straitjackets for content
- Templates can evolve through retrospectives

---

## Scope Constraints (What Layer Cake is NOT)

### SC1: Not a Project Management Tool

**What it IS:** A methodology for AI-assisted development with quality gates.

**What it is NOT:**
- Task tracking software (no Jira integration)
- Team collaboration platform (single operator assumed)
- Sprint planning tool (no velocity tracking)
- Time estimation system (no effort estimates)

**Boundary:** Layer Cake produces specs and code, not project management artifacts.

---

### SC2: Not a Testing Framework

**What it IS:** A process that uses tests as verification.

**What it is NOT:**
- Test generation tool (tests are part of implementation)
- Test automation framework (uses existing frameworks)
- Coverage measurement tool (no coverage goals enforced)
- Performance testing system (functional focus)

**Boundary:** Layer Cake verifies tests pass, doesn't dictate testing approach.

---

### SC3: Not a Deployment System

**What it IS:** A development process from idea to code-complete.

**What it is NOT:**
- CI/CD pipeline (no automated deployment)
- Infrastructure provisioning (no cloud setup)
- Release management (no versioning strategy beyond git tags)
- Monitoring setup (no observability integration)

**Boundary:** Layer Cake ends at "code reviewed and approved." Deployment is external.

---

### SC4: Not Multi-User Collaborative

**What it IS:** A single-operator methodology (one human overseeing AI agents).

**What it is NOT:**
- Team workflow (no role assignment to humans)
- Code review by multiple humans (single human gates)
- Merge conflict resolution (assumes single branch)
- Access control system (no permissions model)

**Boundary:** One human, multiple AI agents. Human teams use external coordination.

---

### SC5: Not Technology-Specific

**What it IS:** A methodology applicable to any software project.

**What it is NOT:**
- Language-specific (works with any programming language)
- Framework-specific (no React/Vue/Django assumptions)
- Platform-specific (works on any OS with Claude access)
- IDE-integrated (operates via filesystem and CLI)

**Boundary:** Technology choices are made in the project, not by Layer Cake.

---

### SC6: Not Replacing Human Judgment

**What it IS:** An AI-assisted process with human oversight.

**What it is NOT:**
- Fully autonomous (human gates exist for a reason)
- Infallible (AI makes mistakes, hence review layers)
- Complete replacement for senior engineers (humans still decide architecture)
- Business decision maker (humans decide what to build)

**Boundary:** AI proposes, human disposes. Critical decisions remain human.

---

## Anti-Patterns to Avoid

### AP1: Over-Engineering

**Description:** Adding complexity for complexity's sake.

**Signs:**
- 12 layers feels excessive for simple feature
- Minimum counts create padding, not substance
- Templates have fields that are always N/A

**Remedy:** Use project tiers. Micro tasks don't need full ceremony.

---

### AP2: Analysis Paralysis

**Description:** Getting stuck in planning, never reaching code.

**Signs:**
- L4-L7 taking longer than expected
- Specs getting revised repeatedly without building
- Human hesitant to approve at gates

**Remedy:** Time-box planning layers. Imperfect plans can be fixed in review cycles.

---

### AP3: Excessive Iteration Cycles

**Description:** Judge keeps requesting refinements, work never ships.

**Signs:**
- Iteration count reaching max repeatedly
- Same issues appearing in different forms
- Human constantly resolving escalations

**Remedy:** Graduated rigor (Judge becomes more pragmatic on later iterations), clear MINOR/MAJOR definitions, accept "good enough." Remember: iterations are the system working, but endless iterations indicate a deeper issue to address.

---

### AP4: Context Bloat

**Description:** Loading too much context, degrading quality.

**Signs:**
- Sessions slowing down near end
- Agent responses becoming confused or contradictory
- Token usage much higher than expected

**Remedy:** Strict context packages, session breaks at layer boundaries.

---

### AP5: Process Worship

**Description:** Following the process even when it doesn't make sense.

**Signs:**
- Forcing artifacts that don't apply
- Refusing reasonable shortcuts
- Valuing compliance over outcomes

**Remedy:** Retrospectives should identify process friction. Methodology can evolve.

---

## Summary Table

| Category | Constraint | Mitigation |
|----------|-----------|------------|
| Technical | Context limits | Context packages per role |
| Technical | API costs | Tiered process, graduated rigor |
| Technical | Session timeout | Frequent checkpoints, handoff protocol |
| Process | Minimum counts | Project tier selection |
| Process | Iteration limits | Escalation with human oversight |
| Process | Human gates | Clear notifications, context provided |
| Scope | Not PM tool | External project management |
| Scope | Not multi-user | Single operator model |
| Scope | Not replacing humans | Human gates, final decisions |

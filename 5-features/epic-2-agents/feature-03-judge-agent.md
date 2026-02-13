# Feature: Judge Agent Prompt and Context Package

## Overview
Create the complete Judge agent configuration including its system prompt, context loading rules, tool permissions, and review criteria. The Judge handles plan reviews (L3-L7 GAN reviews) and build reviews (L9-L11), operating with a rigorous, critical mindset that defaults to requesting iteration when issues are found.

## User Value
A well-configured Judge agent catches issues early and enforces quality standards. Users get thorough reviews that identify problems before they compound, ensuring that plans are complete and implementations actually work as specified.

## Requirements
1. System prompt must establish Judge identity as "GAN critic" with rigorous mindset
2. Prompt must clearly distinguish plan review mode (L3-L7) from build review mode (L9-L11)
3. Plan review criteria: thoroughness, completeness, minimum counts, clarity, no gaps
4. Build review criteria: acceptance criteria met, UX quality, edge cases handled, no regressions
5. Tool permissions must be limited to: Read, Glob, Grep, Bash (for running tests), /chrome (for UX testing)
6. Judge must NOT have Write or Edit permissions - cannot modify code/specs
7. Review output must use standard template with verdict (PASS/ITERATE), issues list, and cascade decision
8. Each issue must be classified as MINOR, MAJOR, or ESCALATE
9. Prompt must include graduated rigor rules (iteration 1 comprehensive, iteration 3 must-haves only)
10. Judge must provide specific, actionable feedback - not vague "needs improvement"
11. **LAYER-SPECIFIC PROMPTS:** Each review layer (L3, L4, L5, L6, L7, L9, L10, L11) must have a specialized prompt with layer-specific criteria
12. **SCOPE COVERAGE REVIEW:** L4-L7 prompts must check that the plan comprehensively covers the original brain dump and synthesis - no dropped ideas or scope gaps
13. **TRACEABILITY CHECK:** Judge must verify that synthesis concepts (JTBD, journeys, architecture decisions) are traceable to specific epics/features
14. **SYNTHESIS COMPLETENESS (L3):** Judge must compare decomposition (quotes, patterns, tensions) against original brain dump to verify nothing was missed

## Technical Approach
1. Create base Judge prompt with critic mindset establishment
2. Create LAYER-SPECIFIC plan review prompts for each layer:
   - L3: Synthesis completeness - compare against brain dump, verify all patterns/tensions captured
   - L4: Epic scope coverage - verify synthesis → epics traceability, no dropped concepts
   - L5: Feature coverage - verify epics fully decomposed, requirements trace to JTBD
   - L6: Task completeness - verify features fully tasked, no implementation gaps
   - L7: Subtask readiness - verify builder can implement without questions, full scope covered
3. Create LAYER-SPECIFIC build review prompts:
   - L9: Feature verification - acceptance criteria met, UX tested via /chrome
   - L10: Epic integration - features work together, data flows correctly
   - L11: Final review - ship-worthy, no missed scope, "would I be proud?"
4. Implement SCOPE COVERAGE protocol: Load synthesis artifacts (jtbd.md, journeys.md, architecture.md) and verify each item traces to plan
5. Define context loading that includes spec, implementation diff, AND original synthesis for traceability
6. Include /chrome usage instructions for L9-L11
7. Store prompts in templates/agents/judge-L{N}.md (one per review layer)

## Acceptance Criteria
- [ ] Judge system prompt establishes rigorous critic identity
- [ ] LAYER-SPECIFIC prompts exist for each review layer (L3, L4, L5, L6, L7, L9, L10, L11)
- [ ] L3 prompt includes synthesis-vs-brain-dump comparison protocol
- [ ] L4-L7 prompts include scope coverage verification (synthesis → plan traceability)
- [ ] L9-L11 prompts include UX testing via /chrome
- [ ] Tool permissions explicitly exclude Write and Edit
- [ ] Review output follows standard template with verdict and issues
- [ ] Each issue is classified with severity (MINOR/MAJOR/ESCALATE)
- [ ] Cascade decision specifies which layer to return to
- [ ] Graduated rigor is incorporated based on iteration count
- [ ] Scope coverage report identifies any synthesis items NOT covered in plan
- [ ] Traceability matrix can be generated from Judge output

## Planned Tasks
1. Design base Judge system prompt with critic mindset
2. Create L3 Synthesis Review prompt (compare against brain dump, verify completeness)
3. Create L4 Epic Review prompt (scope coverage, synthesis → epic traceability)
4. Create L5-L7 Planning Review prompts (feature/task/subtask completeness, scope coverage)
5. Create L9 Feature Review prompt (acceptance criteria, /chrome testing)
6. Create L10-L11 Integration/Final Review prompts (epic cohesion, ship-worthiness)
7. Implement scope coverage protocol (load synthesis, check traceability)
8. Define review output template and severity classification
9. Implement graduated rigor rules based on iteration count
10. Test all layer-specific prompts with sample artifacts

## Edge Cases
- **Perfect work**: Even good work should get thorough review - Judge shouldn't rubber-stamp
- **Many issues found**: Judge should prioritize rather than dump 50 issues at once
- **Subjective UX issues**: Some UX problems are taste-based - Judge should note confidence level
- **Tests pass but UX fails**: Judge must catch cases where code works but experience is poor
- **Iteration 3+ pragmatism**: Third iteration must focus only on blockers - Judge shouldn't add new minor issues

## Dependencies
- Epic 2 Feature 01 (Planner Agent) - Judge reviews Planner output
- Epic 2 Feature 02 (Builder Agent) - Judge reviews Builder output
- Epic 1 Feature 01 (LAYER_CAKE Data Audit) - need review layer specs (L9-L11)

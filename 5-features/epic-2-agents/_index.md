# Epic 2: Agent System Implementation - Feature Index

**Epic Goal:** Implement the Planner, Builder, and Judge agents as distinct Claude instances with role-specific prompts, tool permissions, and cognitive modes.

**Total Features:** 5

---

## Feature List

### Feature 01: Planner Agent Prompt and Context Package
Create the complete system prompt, context loading rules, and tool permissions for the Planner agent that handles L1-L7 and L12.

### Feature 02: Builder Agent Prompt and Context Package
Create the complete system prompt, context loading rules, and tool permissions for the Builder agent that handles L8 (implementation).

### Feature 03: Judge Agent Prompt and Context Package
Create the complete system prompt with **layer-specific review prompts** (L3, L4, L5, L6, L7, L9, L10, L11), **scope coverage verification**, and graduated rigor rules. Each review layer has specialized criteria and the Judge verifies that plans comprehensively cover the original synthesis.

### Feature 04: Agent Handoff Protocol
Define the protocol for transferring context and state between agents at layer transitions, ensuring no information is lost during handoffs.

### Feature 05: Tool Permission Enforcement
Implement the mechanism to enforce different tool permissions per agent role, ensuring agents can only use tools appropriate to their function.

---

## Dependencies
- Epic 1 (Service Blueprint) - Agents need LAYER_CAKE data for layer specifications and prompt templates

## Risk Level
Medium (prompt engineering iteration expected)

## Estimated Tasks
~15 tasks total (3+ per feature)

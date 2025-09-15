# TEMPLATE: Adding a New Feature

Use this exact template when requesting Claude Code to add a new feature.

---

## Feature Request: [FEATURE NAME]

### Pre-Implementation Requirements

Before writing any code, you MUST:
1. Read and acknowledge `.claude/ARCHITECTURE.md`
2. Read and acknowledge `.claude/RULES_ENGINE.md`
3. Read and acknowledge `.claude/PATTERNS.md`
4. Read and acknowledge `.claude/FORBIDDEN.md`

### Feature Description

[Describe what the feature should do, user stories, acceptance criteria]

### Architectural Analysis Required

BEFORE implementing, provide:

```
=== ARCHITECTURAL DESIGN ===
Feature: [Name]
Complexity: [Simple|Medium|Complex]

LAYER BREAKDOWN:
□ Domain Layer:
  - New models: [List any new entities/value objects]
  - New rules: [List any new business rules]
  - Modified rules: [List any rules that change]
  
□ Application Layer:
  - New commands: [List command handlers needed]
  - New queries: [List query handlers needed]
  - New ports: [List any new interfaces]
  
□ Infrastructure Layer:
  - Storage changes: [Any persistence changes]
  - External services: [Any new integrations]
  
□ Presentation Layer:
  - New components: [List UI components]
  - Modified components: [List UI changes]
  - New hooks: [List any custom hooks]

DEPENDENCY FLOW:
[Draw ASCII diagram showing dependencies]

AFFECTED EXISTING MODULES:
- [Module]: [How it's affected]
- [Module]: [How it's affected]

PATTERNS TO USE:
- [ ] Command Pattern for: [specify]
- [ ] Repository Pattern for: [specify]
- [ ] Factory Pattern for: [specify]
- [ ] Observer Pattern for: [specify]
- [ ] Strategy Pattern for: [specify]

VALIDATION RULES:
- [List all validation rules this feature needs]

TEST STRATEGY:
- Unit tests: [What to test]
- Integration tests: [What to test]
- E2E tests: [What to test]
===
```

### Implementation Order

Implement in this EXACT order:

#### Phase 1: Domain Layer
- [ ] Create/modify domain models
- [ ] Implement business rules
- [ ] Add domain services if needed
- [ ] Write domain unit tests
- [ ] Run tests - must pass

#### Phase 2: Application Layer
- [ ] Create command handlers
- [ ] Create query handlers
- [ ] Define ports/interfaces
- [ ] Write application tests
- [ ] Run tests - must pass

#### Phase 3: Infrastructure Layer
- [ ] Implement repository changes
- [ ] Add external service integrations
- [ ] Write infrastructure tests
- [ ] Run tests - must pass

#### Phase 4: Presentation Layer
- [ ] Create/modify UI components
- [ ] Add event handlers
- [ ] Connect to application layer
- [ ] Write component tests
- [ ] Run tests - must pass

#### Phase 5: Integration
- [ ] End-to-end testing
- [ ] Verify feature works completely
- [ ] Check for side effects
- [ ] Performance testing if needed

### Code Quality Checklist

Before considering the feature complete:

**Architecture**
- [ ] All code in correct layers
- [ ] No upward dependencies
- [ ] Single responsibility maintained
- [ ] Patterns correctly implemented

**Code Quality**
- [ ] No functions > 20 lines
- [ ] No classes > 100 lines
- [ ] No magic numbers/strings
- [ ] All constants defined
- [ ] No 'any' types
- [ ] No commented code
- [ ] No TODOs left

**Testing**
- [ ] Domain logic 100% tested
- [ ] Application logic 90% tested
- [ ] Infrastructure 80% tested
- [ ] UI components tested
- [ ] Integration tests pass

**Documentation**
- [ ] All public methods documented
- [ ] Complex logic explained
- [ ] API changes documented
- [ ] README updated if needed

### Validation Against Game Rules

Verify the feature against `.claude/RULES_ENGINE.md`:
- [ ] Does not violate any existing rules
- [ ] Correctly implements specified behavior
- [ ] Handles all edge cases
- [ ] Maintains game state consistency

### Anti-Pattern Check

Verify none of these from `.claude/FORBIDDEN.md`:
- [ ] No mixed concerns
- [ ] No god classes
- [ ] No circular dependencies
- [ ] No direct state mutation
- [ ] No inline complex logic

### Definition of Done

The feature is ONLY complete when:
1. ✅ All tests pass
2. ✅ Architecture is clean
3. ✅ No anti-patterns present
4. ✅ Documentation complete
5. ✅ Code review checklist passed
6. ✅ Feature works end-to-end
7. ✅ No console errors/warnings
8. ✅ Performance acceptable

### Example Usage

```
I need to add a chat feature for players.

[Then include all sections above filled out]
```

### DO NOT

- Skip the architectural design phase
- Mix concerns across layers
- Leave any TODOs
- Implement partial solutions
- Violate any rules in `.claude/`
- Take shortcuts

### Rollback Plan

If the feature causes issues:
1. How to disable it
2. How to revert changes
3. What data needs cleanup

---

## Notes for Claude Code

- You MUST complete the architectural design before coding
- You MUST follow the implementation order
- You MUST fix any issues immediately, not leave TODOs
- You MUST ensure all tests pass
- You MUST follow all patterns in `.claude/PATTERNS.md`
- You MUST avoid all anti-patterns in `.claude/FORBIDDEN.md`
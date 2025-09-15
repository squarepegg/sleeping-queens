# MANDATORY ARCHITECTURE RULES FOR CLAUDE CODE

## YOU MUST READ THIS BEFORE ANY CODE CHANGES

This file contains non-negotiable architectural rules. Every code modification MUST comply with these rules. If you cannot comply, STOP and explain why before proceeding.

## Layer Architecture

All code MUST belong to exactly ONE of these layers:

```
┌─────────────────────────────────┐
│    PRESENTATION (UI Only)       │
├─────────────────────────────────┤
│    APPLICATION (Use Cases)      │
├─────────────────────────────────┤
│    DOMAIN (Pure Business Logic) │
├─────────────────────────────────┤
│    INFRASTRUCTURE (External)    │
└─────────────────────────────────┘
```

### Layer Rules - STRICTLY ENFORCED

1. **Domain Layer** (Core Business Logic)
    - CANNOT import from ANY other layer
    - Contains pure business logic only
    - No framework-specific code
    - No UI concerns
    - No external dependencies
    - Location: `/src/domain/`

2. **Application Layer** (Use Cases & Orchestration)
    - Can import from Domain ONLY
    - Contains application-specific business rules
    - Orchestrates domain objects
    - Defines input/output ports
    - Location: `/src/application/`

3. **Infrastructure Layer** (External Concerns)
    - Can import from Domain and Application
    - Contains implementations of ports
    - Handles persistence, external APIs
    - Framework-specific code goes here
    - Location: `/src/infrastructure/`

4. **Presentation Layer** (UI)
    - Can import from Application and Domain
    - CANNOT contain business logic
    - Only UI rendering and user input handling
    - Location: `/src/presentation/`

### Dependency Direction Check

Before EVERY import statement, ask:
- "Is this import going upward in the layer hierarchy?"
- If YES → STOP and refactor using dependency injection

## File Placement Rules

| If your code... | Put it in... | Example |
|-----------------|--------------|---------|
| Defines game entities | `/src/domain/models/` | Card.ts, Queen.ts, Player.ts |
| Contains game rules | `/src/domain/rules/` | KnightRules.ts, WinConditions.ts |
| Calculates game values | `/src/domain/services/` | ScoreCalculator.ts |
| Handles user actions | `/src/application/commands/` | PlayKingCommand.ts |
| Queries game state | `/src/application/queries/` | GetValidActionsQuery.ts |
| Renders UI components | `/src/presentation/components/` | CardComponent.tsx |
| Manages UI state | `/src/presentation/hooks/` | useGameState.ts |
| Saves/loads data | `/src/infrastructure/persistence/` | GameRepository.ts |
| Handles external events | `/src/infrastructure/events/` | EventBus.ts |

## Required Folder Structure

```
src/
├── domain/                      # Pure business logic - NO framework code
│   ├── models/                 # Entities and aggregates
│   ├── rules/                  # Business rules and policies  
│   ├── services/               # Domain services
│   ├── valueObjects/           # Value objects
│   └── events/                 # Domain events
│
├── application/                 # Application business rules
│   ├── commands/               # Command handlers (write operations)
│   ├── queries/                # Query handlers (read operations)
│   ├── ports/                  # Interfaces for external systems
│   └── dto/                    # Data transfer objects
│
├── infrastructure/             # Frameworks and external concerns
│   ├── persistence/            # Database, storage implementations
│   ├── events/                 # Event bus, message queue
│   ├── api/                    # REST/GraphQL endpoints
│   └── config/                 # Configuration files
│
└── presentation/               # User interface
    ├── components/             # React/Vue/Angular components
    ├── hooks/                  # Custom hooks (React)
    ├── controllers/            # UI controllers
    ├── styles/                 # CSS/styling
    └── assets/                 # Images, fonts, etc.
```

## Before EVERY Change Checklist

You MUST complete this checklist before writing code:

- [ ] **Layer Identified**: Which layer does this belong to?
- [ ] **Single Responsibility**: Does this do exactly ONE thing?
- [ ] **Dependencies Checked**: Are all imports flowing downward?
- [ ] **Module Located**: Found or created appropriate module?
- [ ] **Tests Planned**: How will this be tested?
- [ ] **Documentation Added**: Is the purpose documented?

## Architectural Principles

### 1. Single Responsibility Principle
- Each module/class/function does ONE thing
- If you use "and" to describe it, split it

### 2. Dependency Inversion
- Depend on abstractions, not concretions
- High-level modules don't depend on low-level modules

### 3. Interface Segregation
- Many specific interfaces > one general interface
- Clients shouldn't depend on methods they don't use

### 4. Immutability First
- Prefer immutable data structures
- Return new states rather than mutating

### 5. Explicit Over Implicit
- Clear function names
- Obvious parameter purposes
- No hidden side effects

## Code Quality Standards

### Function Standards
- Maximum 20 lines per function
- Maximum 3 parameters (use objects for more)
- Single return point preferred
- Clear, verb-based names

### Class Standards
- Maximum 100 lines per class
- Maximum 5 public methods
- Clear, noun-based names
- Cohesive responsibilities

### File Standards
- Maximum 200 lines per file
- Single export preferred
- Related functionality only
- Clear file naming

## Testing Requirements

### Test Pyramid
```
         /\
        /UI\        <- Few E2E tests
       /----\
      /Integr\      <- Some integration tests  
     /--------\
    /   Unit   \    <- Many unit tests
   /____________\
```

### Test Coverage Minimums
- Domain Layer: 100% coverage required
- Application Layer: 90% coverage required
- Infrastructure Layer: 80% coverage required
- Presentation Layer: 70% coverage required

## Forbidden Practices

NEVER do these (Claude Code: these are absolute prohibitions):

1. ❌ Mix UI and business logic in same file
2. ❌ Create generic "utils" files with mixed concerns
3. ❌ Import upward in layer hierarchy
4. ❌ Add unrelated logic to existing files
5. ❌ Use magic numbers/strings inline
6. ❌ Skip proper abstractions for "quick fixes"
7. ❌ Use `any` type in TypeScript
8. ❌ Leave TODO comments - fix it now
9. ❌ Commit commented-out code
10. ❌ Create circular dependencies

## Enforcement

If you cannot follow these rules for any reason:
1. STOP immediately
2. Document why the rule cannot be followed
3. Propose alternative solution
4. Get approval before proceeding

Remember: These rules exist to maintain a clean, testable, maintainable codebase. Following them is not optional.
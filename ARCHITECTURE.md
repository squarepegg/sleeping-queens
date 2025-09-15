# Sleeping Queens - Architecture & Implementation Plan

## 🎯 Project Overview
A modern, production-ready implementation of the Sleeping Queens card game using Next.js 14, Supabase, and @dnd-kit for drag-and-drop functionality.

## 🏗️ Architecture Principles
- **SOLID Design Principles**
  - Single Responsibility: Each component has one clear purpose
  - Open/Closed: Extensible for new card types without modifying core
  - Liskov Substitution: All card types implement base Card interface
  - Interface Segregation: Specific interfaces for different game actions
  - Dependency Inversion: Game logic depends on abstractions, not implementations

- **Clean Architecture Layers**
  1. **Domain Layer** (Game Logic) - Pure TypeScript, no framework dependencies
  2. **Application Layer** (State Management) - React contexts and hooks
  3. **Infrastructure Layer** (API/Database) - Supabase integration
  4. **Presentation Layer** (UI Components) - React components with @dnd-kit

## 📦 Component Breakdown

### 1. Core Game Engine (`/src/game/engine/`)

#### GameEngine.ts
**Purpose**: Core game logic and rules enforcement
**Responsibilities**:
- Game state management
- Turn validation
- Move validation
- Win condition checking

**Tests Required**:
- [ ] Game initialization with correct deck
- [ ] Turn rotation logic
- [ ] Move validation for each card type
- [ ] Win condition detection (50+ points or 5 queens)
- [ ] Special card interactions

#### CardManager.ts
**Purpose**: Card deck management and shuffling
**Responsibilities**:
- Deck creation and shuffling
- Card drawing logic
- Discard pile management

**Tests Required**:
- [ ] Deck contains correct card distribution
- [ ] Shuffle produces different orders
- [ ] Draw reduces deck size correctly
- [ ] Discard pile recycling when deck empty

#### RuleEngine.ts
**Purpose**: Game rule validation
**Responsibilities**:
- Validate moves based on card type
- Check special card conditions
- Enforce game rules

**Tests Required**:
- [ ] King can wake queens
- [ ] Knight steals queens from opponents
- [ ] Dragon blocks knight attacks
- [ ] Wand puts queens back to sleep
- [ ] Potion can block wand or use wand effect
- [ ] Math equation validation

### 2. State Management (`/src/lib/context/`)

#### GameStateContext.tsx
**Purpose**: Global game state management
**Responsibilities**:
- Synchronize game state with Supabase
- Provide game state to components
- Handle optimistic updates

**Tests Required**:
- [ ] State updates propagate to all components
- [ ] Optimistic updates with rollback
- [ ] Real-time sync with other players
- [ ] Connection loss handling

#### DragDropContext.tsx
**Purpose**: Drag and drop state management
**Responsibilities**:
- Track dragging state
- Validate drop targets
- Handle drag previews

**Tests Required**:
- [ ] Drag state initialization
- [ ] Valid drop target detection
- [ ] Drag cancel handling
- [ ] Multi-touch support

### 3. UI Components (`/src/components/game/`)

#### GameBoard.tsx
**Purpose**: Main game board layout
**Responsibilities**:
- Render game areas
- Coordinate player positions
- Handle responsive layout

**Tests Required**:
- [ ] Renders all game areas
- [ ] Responsive for mobile/tablet/desktop
- [ ] Player positions update correctly
- [ ] Animation smoothness

#### Card.tsx
**Purpose**: Individual card rendering
**Responsibilities**:
- Display card face/back
- Handle card interactions
- Show card effects

**Tests Required**:
- [ ] Renders all card types correctly
- [ ] Face down/up toggle
- [ ] Hover and selection states
- [ ] Accessibility attributes

#### DraggableCard.tsx
**Purpose**: Draggable card wrapper
**Responsibilities**:
- Enable drag functionality
- Show drag preview
- Handle touch/mouse events

**Tests Required**:
- [ ] Card follows cursor/touch
- [ ] Drag preview visible
- [ ] Drop zones highlight
- [ ] Cancel drag on escape

#### DroppableArea.tsx
**Purpose**: Drop target areas
**Responsibilities**:
- Accept valid drops
- Reject invalid drops
- Visual feedback

**Tests Required**:
- [ ] Accepts valid card types
- [ ] Rejects invalid cards
- [ ] Highlight on drag over
- [ ] Drop animation

#### PlayerHand.tsx
**Purpose**: Player's hand display
**Responsibilities**:
- Show player cards
- Enable card selection
- Card organization

**Tests Required**:
- [ ] Shows correct cards
- [ ] Selection multi-select
- [ ] Card sorting options
- [ ] Max hand size enforcement

#### StagingArea.tsx
**Purpose**: Card staging for actions
**Responsibilities**:
- Stage cards for play
- Auto-play single numbers
- Show math equations

**Tests Required**:
- [ ] Auto-discard single numbers
- [ ] Math equation detection
- [ ] Action card staging
- [ ] Clear staged cards

#### QueenGrid.tsx
**Purpose**: Sleeping queens display
**Responsibilities**:
- Show sleeping queens
- Handle queen selection
- Queen wake animations

**Tests Required**:
- [ ] Grid layout (2x6)
- [ ] Selection for king/knight
- [ ] Wake/sleep animations
- [ ] Points display

### 4. API Layer (`/src/pages/api/games/`)

#### create.ts
**Purpose**: Game creation endpoint
**Tests Required**:
- [ ] Creates game with unique code
- [ ] Initializes correct game state
- [ ] Handles max players

#### join.ts
**Purpose**: Player joining endpoint
**Tests Required**:
- [ ] Adds player to game
- [ ] Validates room code
- [ ] Prevents duplicate joins
- [ ] Max player enforcement

#### move.ts
**Purpose**: Game move endpoint
**Tests Required**:
- [ ] Validates player turn
- [ ] Processes move correctly
- [ ] Updates game state
- [ ] Broadcasts to players

#### player-view.ts
**Purpose**: Player-specific view
**Tests Required**:
- [ ] Hides opponent cards
- [ ] Shows own hand
- [ ] Filters sensitive data

### 5. Database Layer (`/src/lib/supabase/`)

#### GameRepository.ts
**Purpose**: Game data persistence
**Responsibilities**:
- CRUD operations
- Real-time subscriptions
- Data validation

**Tests Required**:
- [ ] Create game record
- [ ] Update game state
- [ ] Query game by code
- [ ] Real-time updates

### 6. Utility Functions (`/src/lib/utils/`)

#### mathValidator.ts
**Purpose**: Math equation validation
**Tests Required**:
- [ ] Valid addition equations
- [ ] Valid subtraction equations
- [ ] Valid multiplication equations
- [ ] Invalid equation rejection

#### gameStateFilter.ts
**Purpose**: Filter game state for players
**Tests Required**:
- [ ] Hides opponent hands
- [ ] Shows public information
- [ ] Preserves own hand

## 🧪 Testing Strategy

### Unit Tests
- Each component tested in isolation
- Mock external dependencies
- Cover edge cases
- Aim for >90% coverage

### Integration Tests
- Test component interactions
- API endpoint testing
- Database operations
- Real-time sync

### E2E Tests
- Complete game flows
- Multiplayer scenarios
- Error recovery
- Performance under load

## 🎮 Game Flow Implementation

### Phase 1: Core Game Logic ✅
- [x] Game engine
- [x] Card management
- [x] Rule validation
- [x] State management

### Phase 2: UI Components 🚧
- [ ] Fix drag-and-drop with @dnd-kit
- [ ] Implement all card components
- [ ] Create game board layout
- [ ] Add animations

### Phase 3: Multiplayer 🚧
- [ ] Real-time sync
- [ ] Player authentication
- [ ] Room management
- [ ] Spectator mode

### Phase 4: Polish 📋
- [ ] Sound effects
- [ ] Animations
- [ ] Tutorial mode
- [ ] Statistics tracking

## 🔧 Technical Decisions

### Drag and Drop: @dnd-kit
**Reasons**:
- Better mobile support than react-beautiful-dnd
- Active maintenance
- Accessibility built-in
- Flexible API

### State Management: React Context + Supabase
**Reasons**:
- Simple for app size
- Real-time built into Supabase
- No need for Redux complexity

### Styling: Tailwind CSS
**Reasons**:
- Rapid development
- Consistent design system
- Mobile-first approach
- Small bundle size

## 📱 Responsive Design

### Mobile (320px - 768px)
- Vertical layout
- Touch-optimized controls
- Larger drop zones
- Simplified animations

### Tablet (768px - 1024px)
- Mixed layout
- Touch + mouse support
- Medium card sizes

### Desktop (1024px+)
- Full horizontal layout
- Hover states
- Keyboard shortcuts
- Rich animations

## 🔒 Security Considerations

### Client-Side
- Never trust client state
- Validate all moves server-side
- Sanitize user inputs
- Rate limiting

### Server-Side
- Validate player identity
- Check turn order
- Prevent cheating
- Audit logging

## 🚀 Performance Targets

- Initial load: <3s
- Move response: <100ms
- Animation FPS: 60
- Bundle size: <500KB
- Lighthouse score: >90

## 📊 Monitoring

### Metrics to Track
- Game completion rate
- Average game duration
- Error rates
- Performance metrics
- User engagement

## 🎯 Success Criteria

1. **Functional**: All game rules implemented correctly
2. **Reliable**: <0.1% error rate
3. **Performant**: Smooth on all devices
4. **Accessible**: WCAG 2.1 AA compliant
5. **Testable**: >90% test coverage
6. **Maintainable**: Clear documentation and code structure
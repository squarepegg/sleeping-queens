# SLEEPING QUEENS RULES - SOURCE OF TRUTH

This document is the SINGLE SOURCE OF TRUTH for game rules. Any code that contradicts this document is a BUG and must be fixed immediately.

## 1. Game Components

### 1.1 Card Types and Quantities

```
QUEENS (12 cards, green backs):
- Rose Queen: 5 points (SPECIAL POWER: wake additional queen)
- Cat Queen: (conflicts with Dog Queen)
- Dog Queen: (conflicts with Cat Queen)
- 9 other queens with various point values

POWER CARDS (red backs):
- Kings (8): Wake sleeping queens
- Knights (4): Steal awakened queens
- Dragons (3): Block knight attacks
- Jesters (5): Chance card for waking queens
- Sleeping Potions (4): Return queens to sleep
- Wands (3): Block sleeping potions

NUMBER CARDS (red backs):
- Four of each number 1 through 10 (40 total cards)
```

### 1.2 Game State Requirements

```javascript
GameState = {
  // Player information
  players: [{
    id: string,
    hand: Card[],         // Max 5 cards
    awakenedQueens: Queen[],
    score: number         // Sum of queen values
  }],
  
  // Board state
  sleepingQueens: Queen[],  // Face-down in center (starts with 12)
  drawPile: Card[],         // Red-backed cards
  discardPile: Card[],      // Face-up discard
  
  // Game flow
  currentPlayerIndex: number,
  gamePhase: 'setup' | 'playing' | 'defense_window' | 'ended',
  defenseWindow: null | {
    type: 'knight' | 'potion',
    attacker: PlayerId,
    defender: PlayerId,
    targetQueen: QueenId,
    timeoutMs: number     // Must be immediate
  },
  
  // End state
  winner: null | PlayerId,
  winReason: null | 'queens' | 'points' | 'all_awakened'
}
```

## 2. Setup Rules

```
SETUP_SEQUENCE:
1. Validate 2-5 players
2. Shuffle 12 queens separately → place face-down in 4x3 grid
3. Shuffle all red-backed cards together (power + number cards)
4. Deal 5 cards to each player from red deck
5. Remaining red cards become draw pile
6. Initialize empty discard pile
7. Randomly select starting player
```

## 3. Turn Structure

### 3.1 Turn Flow
```
EACH_TURN:
1. Current player MUST take exactly ONE action
2. After action completes, draw cards to refill hand to 5
3. Check win conditions
4. Pass turn clockwise to next player
```

### 3.2 Available Actions

#### ACTION A: Play King
```
RULES:
- Wakes ANY sleeping queen from center
- Rose Queen SPECIAL: When awakened, immediately wake another queen
- Rose Queen bonus ONLY triggers when awakened from center
- Rose Queen bonus does NOT trigger when stolen via Knight
```

#### ACTION B: Play Knight
```
RULES:
- Steals ANY awakened queen from ANY opponent
- Defender has IMMEDIATE defense window to play Dragon
- Dragon blocks knight → both players draw 1 card
- Defense does NOT count as defender's turn
- If no Dragon played immediately, steal succeeds
- Check Cat/Dog conflict after successful steal
```

#### ACTION C: Play Sleeping Potion
```
RULES:
- Returns ANY opponent's awakened queen to center
- Queen placed face-down in ANY empty sleeping position
- Defender has IMMEDIATE defense window to play Wand
- Wand blocks potion → both players draw 1 card
- Defense does NOT count as defender's turn
- If no Wand played immediately, queen returns to sleep
```

#### ACTION D: Play Jester
```
RULES:
- Reveal top card of draw pile
- IF power card (King/Knight/Dragon/Potion/Wand/Jester):
  → Add revealed card to hand (replacing the played Jester)
  → Player takes another turn immediately (play again)
- IF number card:
  → Count players from current player going left
  → Count equals the number on revealed card
  → Counted player wakes a sleeping queen
  → Discard the revealed number card
  → After queen selection, turn advances to next player in order
- Counting wraps around table if necessary
- IMPORTANT: Turn behavior differs based on revealed card type
```

#### ACTION E: Discard Cards
```
THREE DISCARD OPTIONS:

1. SINGLE DISCARD:
   - Discard any 1 card → draw 1 card

2. PAIR DISCARD:
   - Discard 2 identical number cards → draw 2 cards
   - Must be same number value

3. EQUATION DISCARD:
   - Discard 3+ number cards forming valid addition
   - Examples: 2+3=5, 2+3+4=9, 1+2+3+4=10
   - Must announce equation aloud
   - Draw same number of cards discarded
```

## 4. Special Rules

### 4.1 Cat/Dog Conflict
```
RULE: Cannot hold both Cat Queen and Dog Queen
RESOLUTION: 
- If acquiring second one, must return it to center
- Keep the one you had first
- Applies to both waking and stealing
```

### 4.2 Defense Windows
```
CRITICAL RULES:
- Defense is IMMEDIATE only - no delay allowed
- Miss the window = lose the chance
- Defense cards: Dragon blocks Knight, Wand blocks Potion
- After defense, both players draw 1 card
- Defense does NOT use defender's turn
```

### 4.3 Rose Queen Special Power
```
TRIGGERS WHEN:
✓ Awakened from center via King
✓ Awakened from center via Jester count

DOES NOT TRIGGER WHEN:
✗ Stolen via Knight
✗ Already awakened and changing hands
```

### 4.4 Draw Pile Management
```
WHEN DRAW PILE EMPTY:
1. Keep top card of discard pile
2. Shuffle remaining discard pile
3. Shuffled cards become new draw pile
4. Top card remains as start of new discard
```

## 5. Win Conditions

### 5.1 Victory Requirements
```
2-3 PLAYERS:
- 5 queens OR 50 points → immediate win
- Can exceed point threshold (e.g., 52 points wins)

4-5 PLAYERS:
- 4 queens OR 40 points → immediate win
- Can exceed point threshold

ALL PLAYER COUNTS:
- If all queens awakened → highest score wins
- Ties broken by: most queens, then shared victory
```

### 5.2 End Game Triggers
```
CHECK_AFTER_EVERY_TURN:
1. Did current player meet queen count?
2. Did current player meet point threshold?
3. Are all sleeping queens awakened?
```

## 6. Validation Rules

### 6.1 Action Validation

```
PLAY_KING:
✓ Player has King in hand
✓ At least 1 sleeping queen exists
✗ Cannot play if no sleeping queens

PLAY_KNIGHT:
✓ Player has Knight in hand
✓ At least 1 opponent has awakened queen
✗ Cannot steal from yourself
✗ Cannot play if no valid targets

PLAY_POTION:
✓ Player has Sleeping Potion in hand
✓ At least 1 opponent has awakened queen
✗ Cannot target your own queens
✗ Cannot play if no valid targets

PLAY_JESTER:
✓ Player has Jester in hand
✓ Draw pile not empty
✗ Cannot play with empty draw pile

DISCARD:
✓ Single: any card
✓ Pair: exactly 2 cards, same number value
✓ Equation: valid addition, all number cards
✗ Cannot discard if it leaves hand empty before draw
```

### 6.2 State Validation

```
ALWAYS_TRUE:
- Each player has 0-5 cards in hand
- Sleeping queens + all awakened queens = 12
- Draw pile + discard pile + all hands = initial card count
- Each queen appears exactly once
- Current player index valid (0 to playerCount-1)
```

## 7. Implementation Priorities

### CRITICAL (Must Have)
1. All 5 action types working correctly
2. Defense windows with immediate-only timing
3. Win condition checking
4. Rose Queen special power (center only)
5. Cat/Dog conflict
6. Proper turn order

### IMPORTANT (Should Have)
1. Draw pile reshuffling
2. Equation validation
3. Score calculation
4. Jester counting with wrap-around
5. State validation

### NICE TO HAVE
1. Animation for card movements
2. Sound effects
3. AI opponents
4. Undo/redo
5. Game replay

## 8. Common Rule Violations to Check

1. **Rose Queen giving bonus when stolen** - WRONG
2. **Defense cards played after delay** - WRONG
3. **Defense using defender's turn** - WRONG
4. **Jester turn handling** - IMPORTANT:
   - Number card: Turn advances to next player AFTER counted player selects queen
   - Power card: Current player gets another turn immediately
5. **Cat/Dog both kept** - WRONG
6. **Playing actions without required targets** - WRONG
7. **Hand not refilled to 5** - WRONG
8. **Win conditions not checked immediately** - WRONG

## Validation Checklist

Before modifying ANY game logic:
- [ ] Rule is explicitly defined in this document
- [ ] Implementation matches EXACTLY as specified
- [ ] All edge cases are handled
- [ ] Tests verify the rule works correctly
- [ ] No house rules or variations added
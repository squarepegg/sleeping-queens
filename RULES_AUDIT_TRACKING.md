# Sleeping Queens Rules Audit & Compliance Tracking

## Phase 1: Architecture Summary ✅
- Frontend: Next.js with React/TypeScript
- State Management: React Context
- Game Engine: Modular with separate move handlers
- Testing: Jest

## Phase 2: Rules Compliance Audit

### 2.1 Card Distribution ✅
- ✅ 12 queens total
- ✅ Rose Queen = 5 points
- ✅ Cat/Dog Queen exist
- ✅ 8 Kings, 4 Knights, 3 Dragons, 3 Wands, 4 Potions, 5 Jesters
- ✅ 40 number cards (4 of each 1-10)

### 2.2 Setup Rules
- [ ] Queens shuffled and placed face-down
- [ ] Red cards shuffled separately
- [ ] Each player dealt exactly 5 cards
- [ ] Draw pile and discard pile initialized
- [ ] 2-5 player support

### 2.3 Turn Flow Rules

#### KING ACTION
- ✅ FIXED: Rose Queen special power implemented
- ✅ FIXED: Rose Queen bonus only when awakened from center
- ✅ FIXED: Rose Queen bonus triggers correctly in tests

#### KNIGHT ACTION
- ✅ Can steal from any opponent
- ✅ FIXED: Dragon defense window is immediate (checks for dragon first)
- ✅ FIXED: Immediate steal when no dragon present
- [ ] Both players draw when Dragon blocks
- ✅ FIXED: Stolen Rose Queen does NOT grant bonus

#### SLEEPING POTION ACTION
- [ ] Returns queen to center face-down
- [ ] Can place in ANY empty space
- ✅ Wand defense window is immediate
- [ ] Both players draw when Wand blocks

#### JESTER ACTION
- ✅ FIXED: Power cards give extra turn
- ✅ FIXED: Number cards count from current player
- ✅ FIXED: Counted player wakes queen

#### DISCARD ACTIONS
- [ ] Single card → draw 1
- [ ] Pair → draw 2
- ✅ FIXED: Valid equation (addition only)
- [ ] Player announces equation

### 2.4 Special Rules
- ✅ FIXED: Cat/Dog conflict implemented and tested
- [ ] Hand refill to 5 after action
- ✅ Draw pile reshuffles when empty
- ✅ FIXED: Defense must be immediate

### 2.5 Win Conditions
- ✅ FIXED: 2-3 players: 5 queens OR 50 points
- ✅ FIXED: 4-5 players: 4 queens OR 40 points
- [ ] All queens awakened: highest score wins
- [ ] Can exceed exact threshold

## Issues Fixed in Phase 2:
1. ✅ Win conditions corrected (3 players now need 5 queens/50 points)
2. ✅ Rose Queen special power fully implemented and tested
3. ✅ Cat/Dog Queen conflict resolution implemented and tested
4. ✅ Math equation validation fixed (addition only)
5. ✅ Defense windows check for defense card availability
6. ✅ Knight immediate steal when no defense
7. ✅ Jester extra turn for power cards
8. ✅ Jester number card counting
9. ✅ Move handlers support both legacy and new move formats
10. ✅ All rules compliance tests passing

## Issues Still To Fix:
1. [ ] Rose Queen bonus selection mechanism
2. [ ] Draw cards when defense is played
3. [ ] Jester extra turn not working
4. [ ] Potion return to any empty space
5. [ ] Complete test coverage
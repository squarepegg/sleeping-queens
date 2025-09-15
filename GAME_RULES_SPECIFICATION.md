# Sleeping Queens Rules Engine Specification

## 1. Game Components

### 1.1 Card Types
```
QUEENS (12 cards, green backs):
- Each queen has a point value
- Special queens:
  - Rose Queen: 5 points, special power
  - Cat Queen: Conflicts with Dog Queen
  - Dog Queen: Conflicts with Cat Queen
  - Other queens: Various point values

POWER CARDS (red backs):
- Kings (8): Wake up sleeping queens
- Knights (4): Steal awakened queens
- Dragons (3): Block knight attacks
- Jesters (5): Chance card
- Sleeping Potions (4): Put queens back to sleep
- Wands (3): Block sleeping potions

NUMBER CARDS (red backs):
- Four of each number 1 through 10 (40 total)
```

### 1.2 Game State Variables
```
GLOBAL_STATE:
  - player_count: 2-5
  - current_player_index: 0 to (player_count - 1)
  - sleeping_queens: Array of face-down queens in center
  - draw_pile: Array of red-backed cards
  - discard_pile: Array of red-backed cards
  - game_ended: boolean
  - winner: player_id or null

PLAYER_STATE (for each player):
  - player_id: unique identifier
  - hand: Array of up to 5 cards
  - awakened_queens: Array of face-up queens
  - score: sum of queen point values
```

## 2. Setup Procedure

```
SETUP():
  1. VALIDATE player_count >= 2 AND player_count <= 5
  2. SEPARATE all cards by back color
  3. SHUFFLE 12 queen cards
  4. PLACE queens face-down in 4x3 grid (sleeping_queens array)
  5. SHUFFLE red-backed deck (kings, knights, dragons, jesters, potions, wands, numbers)
  6. FOR each player:
     - DEAL 5 cards from red deck to player.hand
  7. PLACE remaining red cards as draw_pile
  8. INITIALIZE discard_pile as empty
  9. SET current_player_index = 0
  10. SET game_ended = false
```

## 3. Turn Flow

### 3.1 Main Turn Structure
```
PLAYER_TURN(player):
  1. VALIDATE it is player's turn
  2. EXECUTE one action from available_actions
  3. DRAW cards to refill hand to 5
  4. CHECK win_conditions
  5. IF game not ended:
     - ADVANCE current_player_index clockwise
```

### 3.2 Available Actions

#### Action A: Play King
```
PLAY_KING(player, king_card):
  VALIDATE:
    - king_card is in player.hand
    - king_card.type == "King"
    - sleeping_queens is not empty

  EXECUTE:
    1. MOVE king_card from player.hand to discard_pile
    2. SELECT queen from sleeping_queens
    3. MOVE queen to player.awakened_queens
    4. UPDATE player.score += queen.points
    5. IF queen == "Rose Queen":
       - IF sleeping_queens not empty:
         - SELECT another queen from sleeping_queens
         - MOVE queen to player.awakened_queens
         - UPDATE player.score += queen.points
```

#### Action B: Play Knight
```
PLAY_KNIGHT(player, knight_card, target_player, target_queen):
  VALIDATE:
    - knight_card is in player.hand
    - knight_card.type == "Knight"
    - target_player != player
    - target_queen is in target_player.awakened_queens

  EXECUTE:
    1. MOVE knight_card from player.hand to discard_pile
    2. WAIT for defense window (immediate response only)
    3. IF target_player plays Dragon card:
       - MOVE dragon_card from target_player.hand to discard_pile
       - DRAW 1 card for player
       - DRAW 1 card for target_player
       - END action (knight blocked)
    4. ELSE:
       - MOVE target_queen from target_player.awakened_queens to player.awakened_queens
       - UPDATE scores accordingly
       - CHECK cat_dog_conflict(player)
```

#### Action C: Play Sleeping Potion
```
PLAY_SLEEPING_POTION(player, potion_card, target_player, target_queen):
  VALIDATE:
    - potion_card is in player.hand
    - potion_card.type == "Sleeping Potion"
    - target_player != player
    - target_queen is in target_player.awakened_queens

  EXECUTE:
    1. MOVE potion_card from player.hand to discard_pile
    2. WAIT for defense window (immediate response only)
    3. IF target_player plays Wand card:
       - MOVE wand_card from target_player.hand to discard_pile
       - DRAW 1 card for player
       - DRAW 1 card for target_player
       - END action (potion blocked)
    4. ELSE:
       - MOVE target_queen from target_player.awakened_queens to sleeping_queens
       - UPDATE target_player.score -= target_queen.points
```

#### Action D: Play Jester
```
PLAY_JESTER(player, jester_card):
  VALIDATE:
    - jester_card is in player.hand
    - jester_card.type == "Jester"
    - draw_pile is not empty

  EXECUTE:
    1. MOVE jester_card from player.hand to discard_pile
    2. REVEAL top card of draw_pile
    3. IF revealed_card.type in ["King", "Knight", "Dragon", "Potion", "Wand", "Jester"]:
       - ADD revealed_card to player.hand
       - GRANT player an additional turn immediately
    4. ELSE IF revealed_card.type == "Number":
       - COUNT players starting from current player, going left
       - COUNT number = revealed_card.value
       - counted_player = player at position (number % player_count)
       - IF sleeping_queens not empty:
         - counted_player SELECTS queen from sleeping_queens
         - MOVE queen to counted_player.awakened_queens
         - UPDATE counted_player.score
       - DISCARD revealed_card
```

#### Action E: Discard Cards
```
DISCARD_CARDS(player, cards_to_discard):
  VALIDATE one of:
    A. SINGLE: cards_to_discard.length == 1
    B. PAIR: cards_to_discard.length == 2
       AND cards are numbers
       AND cards have same value
    C. EQUATION: cards_to_discard.length >= 3
       AND all cards are numbers
       AND valid_addition_equation(cards_to_discard)

  EXECUTE:
    1. MOVE all cards_to_discard from player.hand to discard_pile
    2. DRAW cards_to_discard.length cards from draw_pile to player.hand
```

### 3.3 Special Rules

#### Cat/Dog Conflict
```
CHECK_CAT_DOG_CONFLICT(player):
  IF player.awakened_queens contains "Cat Queen"
     AND player.awakened_queens contains "Dog Queen":
    - RETURN last acquired queen to sleeping_queens
    - UPDATE player.score accordingly
```

#### Valid Addition Equation
```
VALID_ADDITION_EQUATION(number_cards):
  - Sort cards by value
  - Find if any subset sums to another card's value
  - Examples:
    - [2, 3, 5] valid because 2 + 3 = 5
    - [2, 3, 4, 9] valid because 2 + 3 + 4 = 9
  - Return true if valid equation exists
```

## 4. Win Conditions

```
CHECK_WIN_CONDITIONS():
  FOR each player:
    IF player_count in [2, 3]:
      IF player.awakened_queens.count >= 5 OR player.score >= 50:
        DECLARE player as winner
        SET game_ended = true
    ELSE IF player_count in [4, 5]:
      IF player.awakened_queens.count >= 4 OR player.score >= 40:
        DECLARE player as winner
        SET game_ended = true

  IF sleeping_queens is empty:
    FIND player with highest score
    DECLARE player as winner
    SET game_ended = true
```

## 5. Card Draw and Deck Management

```
DRAW_CARD(player):
  IF draw_pile is empty:
    SHUFFLE discard_pile into draw_pile
    CLEAR discard_pile

  IF draw_pile not empty:
    MOVE top card from draw_pile to player.hand
```

```
REFILL_HAND(player):
  WHILE player.hand.count < 5 AND draw_pile not empty:
    DRAW_CARD(player)
```

## 6. Defense Windows

```
DEFENSE_WINDOW(defending_player, attack_type):
  - This is an IMMEDIATE response only
  - No delay allowed after attack is declared

  IF attack_type == "Knight":
    RETURN defending_player chooses to play Dragon or null
  ELSE IF attack_type == "Sleeping Potion":
    RETURN defending_player chooses to play Wand or null
```

## 7. Turn Order

```
NEXT_PLAYER():
  current_player_index = (current_player_index + 1) % player_count
```

## 8. Edge Cases and Clarifications

1. **Rose Queen Special Case**: Only triggers extra queen when awakened from center, not when stolen
2. **Defense Timing**: Dragons/Wands must be played immediately or opportunity is lost
3. **Draw Pile Empty**: Reshuffle discard pile to form new draw pile
4. **Jester Number Count**: Wraps around table if number exceeds player count
5. **Win Condition Points**: Can exceed exact amount (e.g., 52 points wins in 2-3 player game)
6. **Cat/Dog Conflict**: Player must return the newly acquired queen, keeping the original

## 9. Implementation Notes

### State Validation
- Always validate player has required cards in hand
- Check target validity before executing actions
- Ensure defense windows are atomic operations

### Turn Sequencing
```
GAME_LOOP():
  WHILE not game_ended:
    current_player = players[current_player_index]
    action = GET_PLAYER_ACTION(current_player)
    EXECUTE_ACTION(action)
    REFILL_HAND(current_player)
    CHECK_WIN_CONDITIONS()
    IF not game_ended:
      NEXT_PLAYER()
```

### Error Handling
- Invalid action attempts should not change game state
- Provide clear error messages for invalid moves
- Allow re-selection of action if validation fails
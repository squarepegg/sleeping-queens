// Application command for Discard moves
import {GameState} from '@/domain/models/GameState';
import {GameMove, MoveValidationResult} from '@/domain/models/GameMove';
import {Command} from '../ports/Command';
import {TurnManager} from '@/domain/services/TurnManager';

export class PlayDiscardCommand implements Command<GameState> {
  constructor(
    private readonly state: GameState,
    private readonly move: GameMove
  ) {}

  validate(): MoveValidationResult {
    const player = this.state.players.find(p => p.id === this.move.playerId);
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    // Check turn validation first
    if (!TurnManager.canPlayerAct(this.state, this.move.playerId)) {
      return { isValid: false, error: 'Turn validation failed: Not your turn' };
    }

    const cards = this.move.cards || [];
    if (cards.length === 0) {
      return { isValid: false, error: 'No cards to discard' };
    }

    // Validate all cards exist in hand
    for (const card of cards) {
      if (!player.hand.find(c => c.id === card.id)) {
        return { isValid: false, error: 'Card not found in hand' };
      }
    }

    // Check for valid discard combinations
    if (cards.length === 2) {
      // Must be a pair
      if (cards[0].type !== 'number' || cards[1].type !== 'number') {
        return { isValid: false, error: 'Can only discard pairs of number cards' };
      }
      if ((cards[0] as any).value !== (cards[1] as any).value) {
        return { isValid: false, error: 'Cards must be a matching pair' };
      }
    }

    return { isValid: true };
  }

  canExecute(): boolean {
    return this.validate().isValid;
  }

  execute(): GameState {
    const playerIndex = this.state.players.findIndex(p => p.id === this.move.playerId);
    const player = this.state.players[playerIndex];
    const cards = this.move.cards || [];

    // Create new hand without discarded cards
    const newHand = player.hand.filter(c => !cards.some(card => card.id === c.id));

    // Create new deck and discard pile
    let newDeck = [...this.state.deck];
    let newDiscardPile = [...this.state.discardPile, ...cards];

    // Draw new cards
    for (let i = 0; i < cards.length; i++) {
      if (newDeck.length === 0) {
        // Reshuffle discard pile into deck
        newDeck = this.shuffleCards([...newDiscardPile]);
        newDiscardPile = [];
      }
      if (newDeck.length > 0) {
        newHand.push(newDeck.pop()!);
      }
    }

    // Create new players array with updated player
    const newPlayers = [...this.state.players];
    newPlayers[playerIndex] = {
      ...player,
      hand: newHand
    };

    // Cancel Rose Queen bonus if pending (player chose to discard instead)
    const roseQueenBonus = this.state.roseQueenBonus?.pending &&
                           this.state.roseQueenBonus?.playerId === this.move.playerId
      ? { ...this.state.roseQueenBonus, pending: false }
      : this.state.roseQueenBonus;

    // Return new state (orchestrator will handle turn advancement)
    return {
      ...this.state,
      players: newPlayers,
      deck: newDeck,
      discardPile: newDiscardPile,
      roseQueenBonus,
      updatedAt: Date.now()
    };
  }

  private shuffleCards(cards: any[]): any[] {
    const shuffled = [...cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

}
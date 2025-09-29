// Application command for Discard moves
import {GameState} from '@/domain/models/GameState';
import {GameMove, MoveValidationResult} from '@/domain/models/GameMove';
import {Command} from '../ports/Command';
import {TurnManager} from '@/domain/services/TurnManager';
import {CardShuffler} from '@/infrastructure/random/CardShuffler';

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
    if (cards.length === 1) {
      // Single cards can always be discarded
      return { isValid: true };
    } else if (cards.length === 2) {
      // Two cards must be a matching pair of number cards
      if (cards[0].type !== 'number' || cards[1].type !== 'number') {
        return { isValid: false, error: 'Can only discard pairs of number cards' };
      }
      if ((cards[0] as any).value !== (cards[1] as any).value) {
        return { isValid: false, error: 'Cards must be a matching pair' };
      }
    } else {
      // More than 2 cards not allowed for basic discard
      return { isValid: false, error: 'Can only discard 1 card or a matching pair' };
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

    // Track replacement cards drawn
    const replacementCards = [];

    // Draw new cards
    for (let i = 0; i < cards.length; i++) {
      if (newDeck.length === 0) {
        // Reshuffle discard pile into deck
        newDeck = [...CardShuffler.shuffle(newDiscardPile)];
        newDiscardPile = [];
      }
      if (newDeck.length > 0) {
        const drawnCard = newDeck.pop()!;
        newHand.push(drawnCard);
        replacementCards.push(drawnCard);
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
      ? undefined // Clear the Rose Queen bonus completely
      : this.state.roseQueenBonus;

    // Create action message for all players to see
    let message = '';
    if (cards.length === 1) {
      const cardName = cards[0].type === 'number' ? `${(cards[0] as any).value}` : cards[0].name;
      message = `discarded a ${cardName}`;
    } else if (cards.length === 2 && cards[0].type === 'number' && cards[1].type === 'number') {
      const value = (cards[0] as any).value;
      message = `discarded a pair of ${value}s`;
    } else {
      message = `discarded ${cards.length} cards`;
    }

    // Return new state (orchestrator will handle turn advancement)
    return {
      ...this.state,
      players: newPlayers,
      deck: newDeck,
      discardPile: newDiscardPile,
      roseQueenBonus,
      lastAction: {
        playerId: this.move.playerId,
        playerName: player.name,
        actionType: 'discard',
        cards: replacementCards, // Private: replacement cards picked up
        playedCards: cards, // Public: cards that were discarded
        drawnCount: replacementCards.length,
        message: `${player.name} ${message} and drew ${replacementCards.length} new card${replacementCards.length > 1 ? 's' : ''}`,
        timestamp: Date.now()
      },
      updatedAt: Date.now(),
      version: this.state.version + 1
    };
  }


}
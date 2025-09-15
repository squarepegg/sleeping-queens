// Application command for Jester moves
import {GameState} from '../../domain/models/GameState';
import {GameMove, MoveValidationResult} from '../../domain/models/GameMove';
import {Command} from '../ports/Command';
import {JesterRules} from '../../domain/rules/JesterRules';
import {ScoreCalculator} from '../../domain/services/ScoreCalculator';

export class PlayJesterCommand implements Command<GameState> {
  constructor(
    private readonly state: GameState,
    private readonly move: GameMove
  ) {}

  validate(): MoveValidationResult {
    return JesterRules.validate(this.move, this.state);
  }

  getMessage(): string | undefined {
    // Return message for successful jester reveal
    if (this.state.jesterReveal?.revealedCard?.type === 'number') {
      const value = (this.state.jesterReveal.revealedCard as any).value || 1;
      const targetPlayer = this.state.players.find(p => p.id === this.state.jesterReveal!.targetPlayerId);
      return `Revealed ${value}! ${targetPlayer?.name || 'Player'} gets to wake a queen!`;
    }
    return undefined;
  }

  canExecute(): boolean {
    return this.validate().isValid;
  }

  execute(): GameState {
    // Handle queen selection after jester reveal
    if (this.state.jesterReveal?.waitingForQueenSelection) {
      if (!this.move.targetCard && !this.move.targetQueenId && !this.move.targetQueen) {
        throw new Error('Queen selection required');
      }
      return this.completeJesterQueenSelection();
    }

    // Play new jester card
    return this.playJesterCard();
  }

  private playJesterCard(): GameState {
    const playerIndex = this.state.players.findIndex(p => p.id === this.move.playerId);
    const player = this.state.players[playerIndex];

    if (!player) {
      throw new Error('Player not found');
    }

    const cardId = this.move.cardId || this.move.cards?.[0]?.id;
    const cardIndex = player.hand.findIndex(c => c.id === cardId);

    if (cardIndex === -1) {
      throw new Error('Jester card not found in hand');
    }

    // Create new hand without jester
    const jesterCard = player.hand[cardIndex];
    const newHand = player.hand.filter(c => c.id !== cardId);
    let newDiscardPile = [...this.state.discardPile, jesterCard];
    let newDeck = [...this.state.deck];

    // Draw from deck
    if (newDeck.length === 0) {
      // Reshuffle
      newDeck = this.shuffleCards([...newDiscardPile]);
      newDiscardPile = [];
    }

    const revealedCard = newDeck.pop();
    if (!revealedCard) {
      throw new Error('No cards in deck');
    }

    let jesterReveal;

    // Handle revealed card
    if (revealedCard.type === 'number') {
      // Count players and set up jester reveal
      // Counting starts at 1 (yourself), so value 1 = same player, value 2 = next player, etc.
      const value = (revealedCard as any).value || 1;
      const targetIndex = (playerIndex + value - 1) % this.state.players.length;
      const targetPlayer = this.state.players[targetIndex];

      jesterReveal = {
        revealedCard,
        targetPlayerId: targetPlayer.id,
        originalPlayerId: this.move.playerId,
        waitingForQueenSelection: true
      };

      // Number card is revealed and then discarded - don't draw replacement yet
      // The player will draw a replacement after the queen selection is complete
      newDiscardPile.push(revealedCard);
    } else {
      // Power card - player keeps it and plays again
      newHand.push(revealedCard);
      jesterReveal = {
        revealedCard,
        targetPlayerId: this.move.playerId, // Player who revealed keeps the card
        originalPlayerId: this.move.playerId,
        waitingForQueenSelection: false, // Not waiting, just revealed for message
        powerCardRevealed: true // Flag to indicate this was a power card reveal
      };
    }

    // Create new players array with updated player
    const newPlayers = [...this.state.players];
    newPlayers[playerIndex] = {
      ...player,
      hand: newHand
    };

    return {
      ...this.state,
      players: newPlayers,
      deck: newDeck,
      discardPile: newDiscardPile,
      jesterReveal,
      updatedAt: Date.now()
    };
  }

  private completeJesterQueenSelection(): GameState {
    const targetQueenId = this.move.targetCard?.id || this.move.targetQueenId || this.move.targetQueen;
    const queenIndex = this.state.sleepingQueens.findIndex(q => q.id === targetQueenId);

    if (queenIndex === -1) {
      throw new Error('Queen not found');
    }

    // The player who gets the queen is determined by the jester reveal, not who sent the move
    const targetPlayerId = this.state.jesterReveal?.targetPlayerId || this.move.playerId;
    const targetPlayerIndex = this.state.players.findIndex(p => p.id === targetPlayerId);
    const targetPlayer = this.state.players[targetPlayerIndex];

    if (!targetPlayer) {
      throw new Error('Target player not found');
    }

    // Find the original jester player to give them a replacement card
    const originalJesterPlayerId = this.state.jesterReveal?.originalPlayerId;
    if (!originalJesterPlayerId) {
      throw new Error('Original jester player not found');
    }
    const jesterPlayerIndex = this.state.players.findIndex(p => p.id === originalJesterPlayerId);
    const jesterPlayer = this.state.players[jesterPlayerIndex];

    // Create new sleeping queens array without selected queen
    const newSleepingQueens = [...this.state.sleepingQueens];
    const [queen] = newSleepingQueens.splice(queenIndex, 1);

    // Create new queens array for target player
    const newQueens = [...targetPlayer.queens, { ...queen, isAwake: true }];
    const newScore = ScoreCalculator.calculatePlayerScore(newQueens);

    // Create new players array with updated player
    const newPlayers = [...this.state.players];
    newPlayers[targetPlayerIndex] = {
      ...targetPlayer,
      queens: newQueens,
      score: newScore
    };

    // Draw replacement card for original jester player (only if hand < 5)
    let newDeck = [...this.state.deck];
    let newDiscardPile = [...this.state.discardPile];

    if (jesterPlayer && jesterPlayerIndex !== -1) {
      // Get the current player state (might have been updated if they got the queen)
      const currentJesterPlayer = newPlayers[jesterPlayerIndex];
      const newJesterHand = [...currentJesterPlayer.hand];

      // Only draw if the jester player's hand is below 5 cards
      if (newJesterHand.length < 5) {
        // Draw a replacement card if available
        if (newDeck.length === 0 && newDiscardPile.length > 0) {
          newDeck = this.shuffleCards([...newDiscardPile]);
          newDiscardPile = [];
        }
        if (newDeck.length > 0) {
          newJesterHand.push(newDeck.pop()!);
        }
      }

      newPlayers[jesterPlayerIndex] = {
        ...currentJesterPlayer,
        hand: newJesterHand
      };
    }

    // Clear jester reveal and return (orchestrator handles turn advancement)
    return {
      ...this.state,
      players: newPlayers,
      sleepingQueens: newSleepingQueens,
      deck: newDeck,
      discardPile: newDiscardPile,
      jesterReveal: undefined,
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
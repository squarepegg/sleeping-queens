import { GameMove, Player } from '../game/types';

/**
 * Service for formatting game moves into human-readable messages.
 * Extracted from GameBoard.tsx to centralize move formatting logic.
 */
export class MoveFormatter {
  private static instance: MoveFormatter;

  public static getInstance(): MoveFormatter {
    if (!MoveFormatter.instance) {
      MoveFormatter.instance = new MoveFormatter();
    }
    return MoveFormatter.instance;
  }

  /**
   * Format a game move into a human-readable message
   */
  formatMove(move: any, players: Player[]): string | null {
    const playerName = players.find(p => p.id === move.playerId)?.name || 'Unknown';
    
    switch (move.type) {
      case 'play_king':
        return this.formatKingMove(move, playerName);
      
      case 'play_knight':
        return this.formatKnightMove(move, playerName, players);
      
      case 'play_potion':
        return this.formatPotionMove(move, playerName, players);
      
      case 'play_dragon':
        return this.formatDragonMove(move, playerName);
        
      case 'play_wand':
        return this.formatWandMove(move, playerName);
      
      case 'play_math':
        return this.formatMathMove(move, playerName);
      
      case 'play_jester':
        return this.formatJesterMove(move, playerName);
      
      case 'play':
        return this.formatPlayMove(move, playerName);
      
      case 'discard':
        return this.formatDiscardMove(move, playerName);
      
      case 'end_turn':
      case 'stage_card':
        // Skip these moves - they're not interesting for history
        return null;
      
      default:
        console.log('Unhandled move type:', move.type, move);
        return `${playerName} made a move`;
    }
  }

  private formatKingMove(move: any, playerName: string): string {
    if (!move.targetCard) return `${playerName} played a King`;
    
    const kingName = move.cards && move.cards[0] ? (move.cards[0].name || 'King') : 'King';
    return `${playerName} used the ${kingName} to wake up the ${move.targetCard.name}`;
  }

  private formatKnightMove(move: any, playerName: string, players: Player[]): string {
    if (!move.targetCard) return `${playerName} played a Knight`;
    
    const knightName = move.cards && move.cards[0] ? (move.cards[0].name || 'Knight') : 'Knight';
    const targetPlayerName = players.find(p => p.id === move.targetPlayer)?.name || 'someone';
    return `${playerName} used the ${knightName} to steal the ${move.targetCard.name} from ${targetPlayerName}`;
  }

  private formatPotionMove(move: any, playerName: string, players: Player[]): string {
    if (!move.targetCard) return `${playerName} played a Sleeping Potion`;
    
    const potionName = move.cards && move.cards[0] ? (move.cards[0].name || 'Sleeping Potion') : 'Sleeping Potion';
    const targetPlayerName = players.find(p => p.id === move.targetPlayer)?.name || 'someone';
    return `${playerName} used the ${potionName} to put ${targetPlayerName}'s ${move.targetCard.name} to sleep`;
  }

  private formatDragonMove(move: any, playerName: string): string {
    const dragonName = move.cards && move.cards[0] ? (move.cards[0].name || 'Dragon') : 'Dragon';
    return `${playerName} played the ${dragonName} to block the knight attack`;
  }

  private formatWandMove(move: any, playerName: string): string {
    const wandName = move.cards && move.cards[0] ? (move.cards[0].name || 'Magic Wand') : 'Magic Wand';
    return `${playerName} played the ${wandName} to block the sleeping potion`;
  }

  private formatMathMove(move: any, playerName: string): string {
    if (!move.mathEquation) {
      return `${playerName} played a math equation and drew cards`;
    }

    const equation = move.mathEquation;
    const equationString = `${equation.left} ${equation.operator} ${equation.right} = ${equation.result}`;
    const cardsDrawn = move.mathEquation.cards ? move.mathEquation.cards.length : 2;
    return `${playerName} played equation ${equationString} and drew ${cardsDrawn} cards`;
  }

  private formatJesterMove(move: any, playerName: string): string {
    const jesterName = move.cards && move.cards[0] ? (move.cards[0].name || 'Jester') : 'Jester';
    
    if (move.jesterResult) {
      // Jester revealed a card
      return `${playerName} played the ${jesterName} and revealed a ${move.jesterResult.revealedCard?.name || 'card'}`;
    }
    
    return `${playerName} played the ${jesterName}`;
  }

  private formatPlayMove(move: any, playerName: string): string {
    if (!move.cards || move.cards.length === 0) {
      return `${playerName} played cards`;
    }

    // Handle pairs
    if (move.cards.length === 2 && move.cards[0].value === move.cards[1].value) {
      return `${playerName} played a pair of ${move.cards[0].value}s and drew 2 cards`;
    }
    
    // Handle math equations
    if (move.cards.length >= 3) {
      return `${playerName} played a math equation and drew cards`;
    }
    
    // Generic card play
    return `${playerName} played ${move.cards.length} card(s)`;
  }

  private formatDiscardMove(move: any, playerName: string): string {
    if (!move.cards || move.cards.length === 0) {
      return `${playerName} discarded cards`;
    }

    if (move.cards.length === 1) {
      const cardName = move.cards[0].name || move.cards[0].type || 'a card';
      return `${playerName} discarded ${cardName}`;
    }
    
    return `${playerName} discarded ${move.cards.length} cards`;
  }

  /**
   * Format a list of moves for move history display
   */
  formatMoveHistory(moves: any[], players: Player[]): { message: string; timestamp: number; playerId: string }[] {
    return moves
      .map(moveRecord => {
        const move = moveRecord.move_data || moveRecord;
        const message = this.formatMove(move, players);
        
        if (!message) return null; // Skip null messages
        
        return {
          message,
          timestamp: moveRecord.created_at ? new Date(moveRecord.created_at).getTime() : Date.now(),
          playerId: move.playerId
        };
      })
      .filter((entry): entry is { message: string; timestamp: number; playerId: string } => entry !== null) // Remove null entries
      .slice(0, 5); // Keep last 5 moves
  }

  /**
   * Create a move history entry from a real-time move
   */
  createMoveHistoryEntry(move: any, players: Player[]): { message: string; timestamp: number; playerId: string } | null {
    const message = this.formatMove(move, players);
    
    if (!message) return null;
    
    return {
      message,
      timestamp: Date.now(),
      playerId: move.playerId
    };
  }
}

// Export singleton instance for easy use
export const moveFormatter = MoveFormatter.getInstance();
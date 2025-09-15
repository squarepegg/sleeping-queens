import { GameMove, GameState, MoveValidationResult, Queen, Player, Card } from '../types';
import { BaseMoveHandler } from './BaseMoveHandler';
import { debugLogger } from '../utils/DebugLogger';

/**
 * Handler for king moves - awakening sleeping queens.
 */
export class KingMoveHandler extends BaseMoveHandler {
  private static instance: KingMoveHandler;

  public static getInstance(): KingMoveHandler {
    if (!KingMoveHandler.instance) {
      KingMoveHandler.instance = new KingMoveHandler();
    }
    return KingMoveHandler.instance;
  }

  executeMove(move: GameMove, gameState: GameState): MoveValidationResult {
    // Trust that RuleEngine has already validated the move
    const player = this.getPlayer(gameState, move.playerId)!;

    // Use base method for card extraction (DRY principle)
    const kingCard = this.extractCardFromMove(move, player);
    if (!kingCard) {
      return { isValid: false, error: 'No card specified' };
    }

    // Use base method for target queen extraction (DRY principle)
    const targetQueen = this.extractTargetQueen(move, gameState);
    if (!targetQueen) {
      return { isValid: false, error: 'No target queen specified' };
    }

    // Find the target queen in sleeping queens
    const queenIndex = gameState.sleepingQueens.findIndex((q: Queen) => q.id === targetQueen.id);

    // Execute the move
    return this.executeKingMove(move, player, gameState, kingCard, queenIndex, targetQueen);
  }

  private executeKingMove(
    move: GameMove,
    player: Player,
    gameState: GameState,
    kingCard: Card,
    queenIndex: number,
    targetQueen: Queen
  ): MoveValidationResult {

    // Set game message and staged cards for transparency
    this.setGameMessage(
      `${player.name} played King to awaken ${targetQueen.name}`,
      [kingCard],
      gameState
    );

    // Remove king from hand and add to discard pile
    if (!this.removeCardsFromHand([kingCard], player)) {
      return { isValid: false, error: 'Failed to remove king from hand' };
    }
    this.discardCards([kingCard], gameState);

    // Wake up the queen
    const queen = gameState.sleepingQueens.splice(queenIndex, 1)[0];
    queen.isAwake = true;
    player.queens.push(queen);

    debugLogger.logCard(`Queen ${queen.name} awakened by ${player.name}'s King`);
    debugLogger.logPlayer(`${player.name} now has ${player.queens.length} queens`);

    // Check for Rose Queen special power - wake an additional queen
    if (queen.name === 'Rose Queen' && gameState.sleepingQueens.length > 0) {
      // Rose Queen allows waking an additional queen ONLY when awakened from center
      gameState.roseQueenBonus = {
        playerId: player.id,
        pending: true
      };
      this.setGameMessage(
        `${player.name} awakened the Rose Queen! Choose another queen to wake up.`,
        [],
        gameState
      );
    }

    // Update player score
    this.updatePlayerScore(player);
    debugLogger.logPlayer(`${player.name} score updated to ${player.score}`);

    // Check for Cat/Dog conflict
    this.checkCatDogConflict(player, gameState);

    // Refill hand and advance turn
    this.refillHand(player, gameState);
    this.completeMoveWithTurnAdvance(gameState);

    return { isValid: true };
  }
}

// Export singleton instance
export const kingMoveHandler = KingMoveHandler.getInstance();
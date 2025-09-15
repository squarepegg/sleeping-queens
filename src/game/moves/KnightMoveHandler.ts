import { GameMove, GameState, MoveValidationResult, Queen, Player, Card } from '../types';
import { BaseMoveHandler } from './BaseMoveHandler';

/**
 * Handler for knight moves - attacking other players' queens with dragon defense.
 */
export class KnightMoveHandler extends BaseMoveHandler {
  private static instance: KnightMoveHandler;
  static readonly DEFENSE_WINDOW_MS = 5000; // 5 seconds to play dragon defense

  public static getInstance(): KnightMoveHandler {
    if (!KnightMoveHandler.instance) {
      KnightMoveHandler.instance = new KnightMoveHandler();
    }
    return KnightMoveHandler.instance;
  }

  executeMove(move: GameMove, gameState: GameState): MoveValidationResult {
    // Trust that RuleEngine has already validated the move
    const player = this.getPlayer(gameState, move.playerId)!;

    // Use base methods for extraction (DRY principle)
    const targetPlayer = this.extractTargetPlayer(move, gameState);
    if (!targetPlayer) {
      return { isValid: false, error: 'No target player specified' };
    }

    const knightCard = this.extractCardFromMove(move, player);
    if (!knightCard) {
      return { isValid: false, error: 'No card specified' };
    }

    const targetQueen = this.extractTargetQueen(move, gameState, targetPlayer);
    if (!targetQueen) {
      return { isValid: false, error: 'No target queen specified' };
    }

    // Execute the knight attack
    return this.executeKnightAttack(move, player, targetPlayer, gameState, knightCard, targetQueen);
  }

  private executeKnightAttack(
    move: GameMove,
    player: Player,
    targetPlayer: Player,
    gameState: GameState,
    knightCard: Card,
    targetQueen: Queen
  ): MoveValidationResult {
    // Check if target has a dragon to defend
    const targetHasDragon = targetPlayer.hand.some((card: Card) => card.type === 'dragon');

    console.log('[KnightMoveHandler] Checking if target has dragon:', {
      targetHasDragon,
      targetPlayerName: targetPlayer.name,
      targetHand: targetPlayer.hand.map((c: Card) => c.type)
    });

    if (targetHasDragon) {
      // Give defense opportunity
      const now = Date.now();
      const pendingAttack = {
        attacker: move.playerId,
        target: targetPlayer.id,
        targetQueen: targetQueen,
        timestamp: now,
        defenseDeadline: now + KnightMoveHandler.DEFENSE_WINDOW_MS
      };

      console.log('[KnightMoveHandler] Creating pendingKnightAttack with defense window:', {
        pendingAttack,
        defenseWindowMs: KnightMoveHandler.DEFENSE_WINDOW_MS
      });

      gameState.pendingKnightAttack = pendingAttack;

      // Keep Knight staged during defense window
      this.setGameMessage(
        `${player.name} played Knight attacking ${targetPlayer.name}'s ${targetQueen.name}! They have 5 seconds to defend with a Dragon.`,
        [knightCard],
        gameState
      );

      return { isValid: true, requiresResponse: true };
    } else {
      // No dragon to defend - complete attack immediately
      console.log('[KnightMoveHandler] Target has no dragon, completing attack immediately');

      // Remove knight from attacker's hand
      const knightIndex = player.hand.findIndex((card: Card) => card.type === 'knight');
      if (knightIndex === -1) {
        return { isValid: false, error: 'Knight card not found in attacker hand' };
      }

      const knight = player.hand.splice(knightIndex, 1)[0];
      this.discardCards([knight], gameState);

      // Steal the queen
      const queenIndex = targetPlayer.queens.findIndex((q: Queen) => q.id === targetQueen.id);
      if (queenIndex === -1) {
        return { isValid: false, error: 'Target queen not found' };
      }

      const queen = targetPlayer.queens.splice(queenIndex, 1)[0];
      player.queens.push(queen);

      // Update scores
      this.updatePlayerScore(player);
      this.updatePlayerScore(targetPlayer);

      // Check for Cat/Dog conflict for the attacker who stole the queen
      this.checkCatDogConflict(player, gameState);

      // Refill attacker's hand
      this.refillHand(player, gameState);

      // Clear staged card
      gameState.stagedCard = undefined;
      gameState.stagedCards = [];

      // Set victory message
      this.setGameMessage(
        `${player.name} stole ${targetQueen.name} from ${targetPlayer.name}!`,
        [],
        gameState
      );

      // Advance turn and check for game end
      this.completeMoveWithTurnAdvance(gameState);

      return { isValid: true };
    }
  }

  /**
   * Complete a knight attack when no dragon defense is played or time expires
   */
  completeKnightAttack(gameState: GameState): MoveValidationResult {
    console.log('[KnightMoveHandler] completeKnightAttack called', {
      hasPendingAttack: !!gameState.pendingKnightAttack,
      pendingAttack: gameState.pendingKnightAttack
    });

    if (!gameState.pendingKnightAttack) {
      return { isValid: false, error: 'No pending knight attack' };
    }

    const attacker = this.getPlayer(gameState, gameState.pendingKnightAttack.attacker);
    const target = this.getPlayer(gameState, gameState.pendingKnightAttack.target);

    console.log('[KnightMoveHandler] Found players:', {
      attacker: attacker?.name,
      target: target?.name,
      attackerQueens: attacker?.queens?.length,
      targetQueens: target?.queens?.length
    });

    if (!attacker || !target) {
      gameState.pendingKnightAttack = undefined;
      return { isValid: false, error: 'Player not found for knight attack completion' };
    }

    // Remove knight from attacker's hand
    const knightIndex = attacker.hand.findIndex((card: Card) => card.type === 'knight');
    if (knightIndex === -1) {
      gameState.pendingKnightAttack = undefined;
      return { isValid: false, error: 'Knight card not found in attacker hand' };
    }

    const knight = attacker.hand.splice(knightIndex, 1)[0];
    this.discardCards([knight], gameState);

    // Steal the queen
    const queenIndex = target.queens.findIndex((q: Queen) => q.id === gameState.pendingKnightAttack!.targetQueen.id);
    if (queenIndex === -1) {
      gameState.pendingKnightAttack = undefined;
      return { isValid: false, error: 'Target queen not found for completion' };
    }

    const queen = target.queens.splice(queenIndex, 1)[0];
    attacker.queens.push(queen);
    
    // Update scores for both players
    this.updatePlayerScore(attacker);
    this.updatePlayerScore(target);

    // Refill attacker's hand
    this.refillHand(attacker, gameState);

    // Clear the pending attack and any staged cards
    gameState.pendingKnightAttack = undefined;
    gameState.stagedCard = undefined;
    gameState.stagedCards = [];

    // Advance turn and check for game end
    this.completeMoveWithTurnAdvance(gameState);

    return { isValid: true };
  }

  /**
   * Handle dragon defense against knight attack
   */
  handleDragonDefense(gameState: GameState, defenderId: string): MoveValidationResult {
    if (!gameState.pendingKnightAttack) {
      return { isValid: false, error: 'No knight attack to defend against' };
    }

    if (gameState.pendingKnightAttack.target !== defenderId) {
      return { isValid: false, error: 'You are not the target of this attack' };
    }

    const defender = this.getPlayer(gameState, defenderId);
    if (!defender) {
      return { isValid: false, error: 'Defender not found' };
    }

    // Remove dragon from defender's hand
    const dragonIndex = defender.hand.findIndex((card: Card) => card.type === 'dragon');
    if (dragonIndex === -1) {
      return { isValid: false, error: 'No dragon card found in defender hand' };
    }

    const dragon = defender.hand.splice(dragonIndex, 1)[0];
    this.discardCards([dragon], gameState);

    // Get the attacker to remove their knight
    const attacker = this.getPlayer(gameState, gameState.pendingKnightAttack.attacker);
    if (attacker) {
      const knightIndex = attacker.hand.findIndex((card: Card) => card.type === 'knight');
      if (knightIndex >= 0) {
        const knight = attacker.hand.splice(knightIndex, 1)[0];
        this.discardCards([knight], gameState);
      }
      // Refill attacker's hand since they played a card
      this.refillHand(attacker, gameState);
    }

    // Refill defender's hand
    this.refillHand(defender, gameState);

    // Set victory message
    this.setGameMessage(
      `${defender.name} played Dragon to block the Knight attack!`,
      [dragon],
      gameState
    );

    // Clear the pending attack and any staged cards
    gameState.pendingKnightAttack = undefined;
    gameState.stagedCard = undefined;
    gameState.stagedCards = [];

    // Advance turn from the original attacker
    this.completeMoveWithTurnAdvance(gameState);

    return { isValid: true };
  }
}

// Export singleton instance
export const knightMoveHandler = KnightMoveHandler.getInstance();
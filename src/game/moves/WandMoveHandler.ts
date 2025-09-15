import { GameMove, GameState, MoveValidationResult, Queen, Player, Card } from '../types';
import { BaseMoveHandler } from './BaseMoveHandler';
import { potionMoveHandler } from './PotionMoveHandler';

export class WandMoveHandler extends BaseMoveHandler {
    private static instance: WandMoveHandler;

    public static getInstance(): WandMoveHandler {
        if (!WandMoveHandler.instance) {
            WandMoveHandler.instance = new WandMoveHandler();
        }
        return WandMoveHandler.instance;
    }

    executeMove(move: GameMove, gameState: GameState): MoveValidationResult {
        console.log('[WandMoveHandler] executeMove called', {
            playerId: move.playerId,
            hasPendingPotionAttack: !!gameState.pendingPotionAttack,
            pendingTarget: gameState.pendingPotionAttack?.target
        });

        // Trust that RuleEngine has already validated the move
        const player = this.getPlayer(gameState, move.playerId)!;

        // Check if this is being used to block a potion attack
        if (gameState.pendingPotionAttack && gameState.pendingPotionAttack.target === move.playerId) {
            console.log('[WandMoveHandler] Using wand to block potion attack');
            return potionMoveHandler.handleWandDefense(gameState, move.playerId);
        }

        // This is a regular offensive wand usage - steal a queen from center
        const targetQueen = move.targetCard as Queen;
        const wandCard = move.cards![0];

        // Find wand in hand
        const wandIndex = player.hand.findIndex((card: Card) => card.type === 'wand');

        // Find target queen in sleeping queens
        const queenIndex = gameState.sleepingQueens.findIndex((q: Queen) => q.id === targetQueen.id);

        // Remove wand from hand
        const wand = player.hand.splice(wandIndex, 1)[0];
        this.discardCards([wand], gameState);

        // Wake up the queen
        const queen = gameState.sleepingQueens.splice(queenIndex, 1)[0];
        queen.isAwake = true;
        player.queens.push(queen);
        
        // Update score
        this.updatePlayerScore(player);

        // Refill hand
        this.refillHand(player, gameState);

        // Set victory message
        this.setGameMessage(
            `${player.name} used a Magic Wand to wake ${queen.name}!`,
            [],
            gameState
        );

        // Advance turn and check for game end
        this.completeMoveWithTurnAdvance(gameState);

        return { isValid: true };
    }
}

// Export singleton instance
export const wandMoveHandler = WandMoveHandler.getInstance();
import { GameMove, GameState, MoveValidationResult, Queen, Player, Card, PendingAttack } from '../types';
import { BaseMoveHandler } from './BaseMoveHandler';

export class PotionMoveHandler extends BaseMoveHandler {
    private static instance: PotionMoveHandler;

    public static getInstance(): PotionMoveHandler {
        if (!PotionMoveHandler.instance) {
            PotionMoveHandler.instance = new PotionMoveHandler();
        }
        return PotionMoveHandler.instance;
    }
    executeMove(move: GameMove, gameState: GameState): MoveValidationResult {
        // Trust that RuleEngine has already validated the move
        const player = this.getPlayer(gameState, move.playerId)!;

        // Use base methods for extraction (DRY principle)
        const targetPlayer = this.extractTargetPlayer(move, gameState);
        if (!targetPlayer) {
            return { isValid: false, error: 'No target player specified' };
        }

        const potionCard = this.extractCardFromMove(move, player);
        if (!potionCard) {
            return { isValid: false, error: 'No card specified' };
        }

        const targetQueen = this.extractTargetQueen(move, gameState, targetPlayer);
        if (!targetQueen) {
            return { isValid: false, error: 'No target queen specified' };
        }

        // Check if target has a wand to defend
        const targetHasWand = targetPlayer.hand.some((card: Card) => card.type === 'wand');

        console.log('[PotionMoveHandler] Checking if target has wand:', {
            targetHasWand,
            targetPlayerName: targetPlayer.name,
            targetHand: targetPlayer.hand.map(c => c.type)
        });

        if (targetHasWand) {
            // Stage the potion attack for defense window
            const pendingAttack: PendingAttack = {
                attacker: player.id,
                target: targetPlayer.id,
                targetQueen: targetQueen,
                timestamp: Date.now(),
                defenseDeadline: Date.now() + 5000 // 5 second defense window
            };

            console.log('[PotionMoveHandler] Creating pendingPotionAttack with defense window:', {
                pendingAttack,
                defenseWindowMs: 5000
            });

            gameState.pendingPotionAttack = pendingAttack;

            // Keep the potion card staged during defense window
            // Set up staged card for UI display - Potion stays staged during attack
            this.setGameMessage(
                `${player.name} played a Sleeping Potion targeting ${targetPlayer.name}'s ${targetQueen.name}! They have 5 seconds to defend with a Wand.`,
                [potionCard],
                gameState
            );

            return { isValid: true, requiresResponse: true };
        } else {
            // No wand to defend - complete attack immediately
            console.log('[PotionMoveHandler] Target has no wand, completing attack immediately');

            // Remove potion from hand and discard it immediately
            const potionIdx = player.hand.findIndex((card: Card) => card.type === 'potion');
            if (potionIdx >= 0) {
                const potion = player.hand.splice(potionIdx, 1)[0];
                this.discardCards([potion], gameState);
            }

            // First set up the pending attack so completePotionAttack can process it
            gameState.pendingPotionAttack = {
                attacker: player.id,
                target: targetPlayer.id,
                targetQueen: targetQueen,
                timestamp: Date.now(),
                defenseDeadline: Date.now()
            };

            // Complete the attack immediately (this will handle refilling hand)
            return this.completePotionAttack(gameState);
        }
    }

    /**
     * Complete the potion attack after defense window expires
     */
    completePotionAttack(gameState: GameState): MoveValidationResult {
        const attack = gameState.pendingPotionAttack;
        if (!attack) {
            return { isValid: false, error: 'No pending potion attack' };
        }

        const attacker = this.getPlayer(gameState, attack.attacker);
        const target = this.getPlayer(gameState, attack.target);

        if (!attacker || !target) {
            return { isValid: false, error: 'Players not found' };
        }

        // Remove potion from attacker's hand if it hasn't been removed yet
        // (it was kept staged during defense window)
        const potionIndex = attacker.hand.findIndex((card: Card) => card.type === 'potion');
        if (potionIndex >= 0) {
            const potion = attacker.hand.splice(potionIndex, 1)[0];
            this.discardCards([potion], gameState);
        }

        // Find and remove the queen from target player
        const queenIndex = target.queens.findIndex((q: Queen) => q.id === attack.targetQueen.id);
        if (queenIndex === -1) {
            // Queen already removed or not found
            gameState.pendingPotionAttack = undefined;
            return { isValid: false, error: 'Target queen not found' };
        }

        // Put queen back to sleep
        const queen = target.queens.splice(queenIndex, 1)[0];
        queen.isAwake = false;
        gameState.sleepingQueens.push(queen);

        // Update score
        this.updatePlayerScore(target);

        // Refill attacker's hand
        this.refillHand(attacker, gameState);

        // Clear pending attack and staged card
        gameState.pendingPotionAttack = undefined;
        gameState.stagedCard = undefined;
        gameState.stagedCards = [];

        // Set victory message
        this.setGameMessage(
            `${attacker.name}'s Sleeping Potion put ${queen.name} back to sleep!`,
            [],
            gameState
        );

        // Advance turn and check for game end
        this.completeMoveWithTurnAdvance(gameState);

        return { isValid: true };
    }

    /**
     * Handle wand defense against potion
     */
    handleWandDefense(gameState: GameState, defenderId: string): MoveValidationResult {
        console.log('[PotionMoveHandler] handleWandDefense called', {
            defenderId,
            hasPendingAttack: !!gameState.pendingPotionAttack,
            pendingAttack: gameState.pendingPotionAttack
        });

        const attack = gameState.pendingPotionAttack;
        if (!attack || attack.target !== defenderId) {
            console.log('[PotionMoveHandler] No valid attack to defend:', {
                hasAttack: !!attack,
                attackTarget: attack?.target,
                defenderId
            });
            return { isValid: false, error: 'No valid potion attack to defend against' };
        }

        const defender = this.getPlayer(gameState, defenderId);
        if (!defender) {
            return { isValid: false, error: 'Defender not found' };
        }

        const attacker = this.getPlayer(gameState, attack.attacker);
        if (!attacker) {
            return { isValid: false, error: 'Attacker not found' };
        }

        // Check for wand in hand
        const wandIndex = defender.hand.findIndex((card: Card) => card.type === 'wand');
        if (wandIndex === -1) {
            console.log('[PotionMoveHandler] No wand found in defender hand');
            return { isValid: false, error: 'No wand in hand to block potion' };
        }

        console.log('[PotionMoveHandler] Blocking potion with wand');

        // Remove potion from attacker's hand (it was kept staged until now)
        const potionIndex = attacker.hand.findIndex((card: Card) => card.type === 'potion');
        if (potionIndex >= 0) {
            const potion = attacker.hand.splice(potionIndex, 1)[0];
            this.discardCards([potion], gameState);
        }

        // Remove wand and discard it
        const wand = defender.hand.splice(wandIndex, 1)[0];
        this.discardCards([wand], gameState);

        // Refill both players' hands
        this.refillHand(attacker, gameState);
        this.refillHand(defender, gameState);

        // Set victory message
        this.setGameMessage(
            `${defender.name} blocked the Sleeping Potion with a Wand!`,
            [wand],
            gameState
        );

        // Clear the pending attack and any staged cards
        gameState.pendingPotionAttack = undefined;
        gameState.stagedCard = undefined;
        gameState.stagedCards = [];

        console.log('[PotionMoveHandler] Wand defense successful, attack cleared');

        // Advance turn from the original attacker
        this.completeMoveWithTurnAdvance(gameState);

        return { isValid: true };
    }
}

// Export singleton instance
export const potionMoveHandler = PotionMoveHandler.getInstance();
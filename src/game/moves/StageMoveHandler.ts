import { GameMove, GameState, MoveValidationResult, Card, Player } from '../types';
import { BaseMoveHandler } from './BaseMoveHandler';

export class StageMoveHandler extends BaseMoveHandler {
    private static instance: StageMoveHandler;

    public static getInstance(): StageMoveHandler {
        if (!StageMoveHandler.instance) {
            StageMoveHandler.instance = new StageMoveHandler();
        }
        return StageMoveHandler.instance;
    }
    executeMove(move: GameMove, gameState: GameState): MoveValidationResult {
        // Trust that RuleEngine has already validated the move
        const player = this.getPlayer(gameState, move.playerId)!;
        const cards = move.cards!;

        // Validate all cards are in player's hand
        for (const card of cards) {
            const cardInHand = player.hand.find((c: Card) => c.id === card.id);
            if (!cardInHand) {
                return { isValid: false, error: `Card ${card.id} not found in hand` };
            }
        }

        // Determine the action based on card type(s)
        let action = '';
        const firstCard = cards[0];
        
        if (cards.length === 1) {
            // Single card staging
            switch (firstCard.type) {
                case 'king':
                    action = 'play_king';
                    break;
                case 'knight':
                    action = 'play_knight';
                    break;
                case 'potion':
                    action = 'play_potion';
                    break;
                case 'wand':
                    action = 'play_wand';
                    break;
                case 'jester':
                    action = 'play_jester';
                    break;
                case 'dragon':
                    action = 'play_dragon';
                    break;
                default:
                    action = 'discard';
            }
        } else if (cards.length === 2 && cards.every((c: Card) => c.type === 'number')) {
            // Pair of numbers for discard
            if ((cards[0] as any).value === (cards[1] as any).value) {
                action = 'discard pair';
            } else {
                return { isValid: false, error: 'Can only stage matching number pairs' };
            }
        } else if (cards.length >= 3 && cards.every((c: Card) => c.type === 'number')) {
            // Math equation staging
            action = 'math equation';
        } else {
            return { isValid: false, error: 'Invalid card combination for staging' };
        }

        // Set staged cards in game state
        gameState.stagedCard = {
            cards: [...cards],
            playerId: player.id,
            action: action
        };

        // For backward compatibility, also set stagedCards array
        gameState.stagedCards = [...cards];

        // Create descriptive message
        const cardNames = cards.map((c: Card) =>
            c.type === 'number' ? (c as any).value : (c as any).name || c.type
        ).join(', ');
        
        gameState.gameMessage = `${player.name} staged ${cardNames} (${action})`;
        
        console.log('[StageMoveHandler] Staged card with action:', action, gameState.stagedCard);

        return { isValid: true };
    }

    /**
     * Clear staged cards
     */
    clearStagedCards(gameState: GameState): void {
        gameState.stagedCard = undefined;
        gameState.stagedCards = [];
    }

    /**
     * Validate if staged cards can be played
     */
    validateStagedCards(gameState: GameState): boolean {
        if (!gameState.stagedCard) return false;
        
        const player = gameState.players.find(p => p.id === gameState.stagedCard!.playerId);
        if (!player) return false;

        // Check all staged cards are still in player's hand
        for (const card of gameState.stagedCard.cards) {
            if (!player.hand.find(c => c.id === card.id)) {
                return false;
            }
        }

        return true;
    }
}

// Export singleton instance
export const stageMoveHandler = StageMoveHandler.getInstance();
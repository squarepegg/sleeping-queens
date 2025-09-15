import { GameMove, GameState, MoveValidationResult, Player, Card } from '../types';
import { BaseMoveHandler } from './BaseMoveHandler';

export class DiscardMoveHandler extends BaseMoveHandler {
    private static instance: DiscardMoveHandler;

    public static getInstance(): DiscardMoveHandler {
        if (!DiscardMoveHandler.instance) {
            DiscardMoveHandler.instance = new DiscardMoveHandler();
        }
        return DiscardMoveHandler.instance;
    }
    executeMove(move: GameMove, gameState: GameState): MoveValidationResult {
        // Trust that RuleEngine has already validated the move
        const player = this.getPlayer(gameState, move.playerId)!;
        const cards = move.cards!;

        // Remove cards from hand
        for (const card of cards) {
            const cardIndex = player.hand.findIndex((handCard: Card) => handCard.id === card.id);
            if (cardIndex >= 0) {
                const removedCard = player.hand.splice(cardIndex, 1)[0];
                this.discardCards([removedCard], gameState);
            }
        }

        // Draw replacement cards
        const cardsToReplace = cards.length;
        for (let i = 0; i < cardsToReplace; i++) {
            const newCard = this.drawCard(gameState);
            if (newCard) {
                player.hand.push(newCard);
            }
        }

        // Update game message
        const cardNames = cards.map((c: Card) => (c as any).name || (c as any).value || c.type).join(', ');
        const cardWord = cards.length === 1 ? 'card' : 'cards';
        this.setGameMessage(
            `${player.name} discarded ${cards.length} ${cardWord}: ${cardNames}`,
            cards,
            gameState
        );

        // Complete move - this will clear staged cards and advance turn
        this.completeMoveWithTurnAdvance(gameState);
        
        return { isValid: true };
    }
}

// Export singleton instance
export const discardMoveHandler = DiscardMoveHandler.getInstance();
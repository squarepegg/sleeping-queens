import { GameMove, GameState, MoveValidationResult, Queen, Player, Card } from '../types';
import { BaseMoveHandler } from './BaseMoveHandler';

export class JesterMoveHandler extends BaseMoveHandler {
    private static instance: JesterMoveHandler;

    public static getInstance(): JesterMoveHandler {
        if (!JesterMoveHandler.instance) {
            JesterMoveHandler.instance = new JesterMoveHandler();
        }
        return JesterMoveHandler.instance;
    }
    executeMove(move: GameMove, gameState: GameState): MoveValidationResult {
        console.log('[JesterMoveHandler] executeMove called - v3:', {
            playerId: move.playerId,
            hasTargetCard: !!move.targetCard,
            targetCard: move.targetCard,
            hasJesterReveal: !!gameState.jesterReveal,
            jesterReveal: gameState.jesterReveal,
            waitingForQueenSelection: gameState.jesterReveal?.waitingForQueenSelection,
            cardsLength: move.cards?.length,
            checkResult: !!(gameState.jesterReveal?.waitingForQueenSelection && move.targetCard)
        });

        const player = this.getPlayer(gameState, move.playerId);
        if (!player) {
            return { isValid: false, error: 'Player not found' };
        }

        // If this is a queen selection after jester reveal
        // Check if there's a jester reveal waiting AND we have a targetCard
        // The cards array will be empty since the jester was already played
        if (gameState.jesterReveal?.waitingForQueenSelection && move.targetCard) {
            console.log('[JesterMoveHandler] Completing jester queen selection');
            return this.completeJesterQueenSelection(move, gameState);
        }

        // Otherwise, this is playing a new jester card
        // Find jester in hand - handle both cards array and cardId
        let jesterIndex: number;
        if (move.cardId) {
            jesterIndex = player.hand.findIndex((card: Card) => card.id === move.cardId);
        } else {
            jesterIndex = player.hand.findIndex((card: Card) => card.type === 'jester');
        }
        if (jesterIndex === -1) {
            return { isValid: false, error: 'No jester in hand' };
        }

        // Remove jester from hand
        const jester = player.hand.splice(jesterIndex, 1)[0];
        gameState.discardPile.push(jester);

        // DON'T refill immediately - wait to see what card is revealed
        // We'll refill after handling the revealed card appropriately

        // Draw a card from deck to reveal
        if (gameState.deck.length === 0) {
            // Reshuffle discard pile if deck is empty
            this.reshuffleDeck(gameState);
        }

        if (gameState.deck.length === 0) {
            return { isValid: false, error: 'No cards left to draw' };
        }

        // Draw the top card (from the end of the array)
        const revealedCard = gameState.deck.pop()!;

        console.log('[JesterMoveHandler] Revealed card:', revealedCard);

        if (revealedCard.type === 'number') {
            // Count around players based on the number (starting from next player)
            const numberCard = revealedCard as Card;
            const value = (numberCard as any).value || 1;
            const playerIndex = gameState.players.findIndex((p: Player) => p.id === player.id);
            // Count clockwise from current player
            // The value represents how many positions to advance
            const targetIndex = (playerIndex + value) % gameState.players.length;
            const targetPlayer = gameState.players[targetIndex];
            
            // Target player gets to wake a queen
            gameState.jesterReveal = {
                revealedCard,
                targetPlayerId: targetPlayer.id,
                waitingForQueenSelection: true
            };

            // Refill the original player's hand (they played the jester)
            this.refillHand(player, gameState);

            // If the target player is different from current player, we need to temporarily
            // give them control without advancing the turn
            // (The turn will advance after they select a queen)

            gameState.gameMessage = `${player.name} revealed a ${value}! ${targetPlayer.name} gets to wake a queen.`;

            return {
                isValid: true,
                requiresResponse: true,
                message: `${player.name} revealed a ${value}! ${targetPlayer.name} gets to wake a queen.`
            };
        } else {
            // If power card (King/Knight/Dragon/Potion/Wand/Jester), player keeps it and plays again
            // The revealed card replaces the jester in their hand
            player.hand.push(revealedCard);
            gameState.jesterReveal = undefined;

            const cardName = revealedCard.name || revealedCard.type;
            gameState.gameMessage = `${player.name} revealed a ${cardName} with the Jester! They keep it and play again.`;

            // Hand is now correct size (jester out, revealed card in)
            // Don't advance turn - same player goes again
            return {
                isValid: true,
                message: `${player.name} revealed a ${cardName} with the Jester! ${player.name} keeps it and plays again.`
            };
        }
    }

    private completeJesterQueenSelection(move: GameMove, gameState: GameState): MoveValidationResult {
        if (!gameState.jesterReveal || !gameState.jesterReveal.waitingForQueenSelection) {
            return { isValid: false, error: 'No jester queen selection pending' };
        }

        // Verify the move is from the correct player
        if (move.playerId !== gameState.jesterReveal.targetPlayerId) {
            return { isValid: false, error: 'Only the target player can select a queen for jester' };
        }

        const targetQueen = move.targetCard as Queen;
        if (!targetQueen) {
            return { isValid: false, error: 'No queen selected' };
        }

        // Find the queen in sleeping queens
        const queenIndex = gameState.sleepingQueens.findIndex((q: Queen) => q.id === targetQueen.id);
        if (queenIndex === -1) {
            return { isValid: false, error: 'Selected queen not found in sleeping queens' };
        }

        // Get the player who is selecting the queen
        const targetPlayer = this.getPlayer(gameState, move.playerId);
        if (!targetPlayer) {
            return { isValid: false, error: 'Player not found for jester queen selection' };
        }

        // Wake the selected queen
        const queen = gameState.sleepingQueens.splice(queenIndex, 1)[0];
        queen.isAwake = true;
        targetPlayer.queens.push(queen);
        this.updatePlayerScore(targetPlayer);

        // Clear jester reveal state
        gameState.jesterReveal = undefined;

        gameState.gameMessage = `${targetPlayer.name} woke ${queen.name} with the Jester!`;

        // Now advance the turn to continue the game
        this.advanceTurn(gameState);
        this.checkGameEnd(gameState);

        return { isValid: true };
    }

    private reshuffleDeck(gameState: GameState): void {
        if (gameState.discardPile.length === 0) return;

        // Move all cards from discard to deck except the top card
        const topDiscard = gameState.discardPile.pop();
        gameState.deck = [...gameState.discardPile];
        gameState.discardPile = topDiscard ? [topDiscard] : [];

        // Shuffle the deck
        for (let i = gameState.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [gameState.deck[i], gameState.deck[j]] = [gameState.deck[j], gameState.deck[i]];
        }
    }
}

// Export singleton instance
export const jesterMoveHandler = JesterMoveHandler.getInstance();
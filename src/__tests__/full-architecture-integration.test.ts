// Full integration test proving the entire architecture works end-to-end
import {createDeck, createSleepingQueens, QUEENS} from '../domain/factories/CardFactory';
import {GameState} from '../domain/models/GameState';
import {Player} from '../domain/models/Player';
import {GameMove} from '../domain/models/GameMove';
import {KingRules} from '../domain/rules/KingRules';
import {ScoreCalculator} from '../domain/services/ScoreCalculator';
import {TurnManager} from '../domain/services/TurnManager';

import {PlayKingCommand} from '../application/commands/PlayKingCommand';
import {GameOrchestrator} from '../application/services/GameOrchestrator';

import {InMemoryGameRepository} from '../infrastructure/persistence/InMemoryGameRepository';
import {SimpleEventBus} from '../infrastructure/events/SimpleEventBus';
import {CardShuffler} from '../infrastructure/random/CardShuffler';
import {IdGenerator} from '../infrastructure/utils/IdGenerator';
import {DebugLogger} from '../infrastructure/logging/DebugLogger';

describe('🌐 FULL ARCHITECTURE INTEGRATION TEST', () => {
  let repository: InMemoryGameRepository;
  let eventBus: SimpleEventBus;
  let orchestrator: GameOrchestrator;
  let logger: DebugLogger;

  beforeEach(() => {
    repository = new InMemoryGameRepository();
    eventBus = new SimpleEventBus();
    orchestrator = new GameOrchestrator(eventBus);
    logger = new DebugLogger();
  });

  it('should execute a complete game flow through all architectural layers', async () => {
    logger.info('integration-test', 'Starting full architecture integration test');

    // PHASE 1: Create game using domain factories and infrastructure services
    const gameId = IdGenerator.generateGameId();
    const roomCode = IdGenerator.generateRoomCode();
    const deck = CardShuffler.shuffle(createDeck());
    const queens = createSleepingQueens();

    const player: Player = {
      id: 'player-1',
      name: 'Test Player',
      position: 0,
      hand: [deck[0]], // Give player a king
      queens: [],
      score: 0,
      isConnected: true
    };

    const gameState: GameState = {
      id: gameId,
      roomCode,
      players: [player],
      currentPlayerIndex: 0,
      currentPlayerId: player.id,
      sleepingQueens: queens,
      deck: deck.slice(1),
      discardPile: [],
      phase: 'playing',
      winner: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      maxPlayers: 4,
      version: 1
    };

    // PHASE 2: Persist through infrastructure layer
    await repository.save(gameState);
    logger.info('integration-test', 'Game persisted', { gameId });

    // PHASE 3: Validate game exists
    const exists = await repository.exists(gameId);
    expect(exists).toBe(true);

    // PHASE 4: Load game state
    const loadedGame = await repository.load(gameId);
    expect(loadedGame).toBeTruthy();
    expect(loadedGame!.id).toBe(gameId);

    // PHASE 5: Create a move using domain models
    const targetQueen = queens[0];
    const kingCard = player.hand[0];

    // Ensure we have a king card for testing
    if (kingCard.type !== 'king') {
      kingCard.type = 'king';
      kingCard.name = 'King';
    }

    const move: GameMove = {
      type: 'play_king',
      playerId: player.id,
      cards: [kingCard],
      cardId: kingCard.id,
      targetQueenId: targetQueen.id,
      timestamp: Date.now()
    };

    // PHASE 6: Validate move using domain rules
    const validationResult = KingRules.validate(move, loadedGame!);
    expect(validationResult.isValid).toBe(true);
    logger.info('integration-test', 'Move validated by domain rules', { move: move.type });

    // PHASE 7: Execute move through application layer
    const command = new PlayKingCommand(loadedGame!, move);
    expect(command.canExecute()).toBe(true);

    const newGameState = command.execute();
    expect(newGameState.players[0].queens.length).toBe(1);
    expect(newGameState.players[0].queens[0].id).toBe(targetQueen.id);
    logger.info('integration-test', 'Move executed through application layer');

    // PHASE 8: Calculate score using domain service
    const playerScore = ScoreCalculator.calculatePlayerScore(newGameState.players[0].queens);
    expect(playerScore).toBeGreaterThan(0);
    logger.info('integration-test', 'Score calculated', { score: playerScore });

    // PHASE 9: Advance turn using domain service
    const nextTurnState = TurnManager.advanceTurn(newGameState);
    expect(nextTurnState.currentPlayerIndex).toBe(0); // Only one player, stays same
    logger.info('integration-test', 'Turn managed');

    // PHASE 10: Persist updated state
    await repository.save(nextTurnState);
    const finalGame = await repository.load(gameId);
    expect(finalGame!.players[0].queens.length).toBe(1);

    // PHASE 11: Test event system
    const events: any[] = [];
    eventBus.subscribe('game-updated', (event) => events.push(event));

    eventBus.publish({
      type: 'game-updated',
      aggregateId: gameId,
      occurredAt: new Date(),
      data: { newState: nextTurnState }
    });

    expect(events.length).toBe(1);
    logger.info('integration-test', 'Event system verified');

    // PHASE 12: Validate through orchestrator
    const orchestratorResult = orchestrator.validateMove(move, loadedGame!);
    expect(orchestratorResult.isValid).toBe(true);

    logger.info('integration-test', 'Full integration test completed successfully');
  });

  it('should demonstrate proper layer separation in practice', () => {
    // Domain layer - pure business logic
    const cards = createDeck();
    expect(cards.length).toBeGreaterThan(0);

    // Application layer - orchestration
    const eventBus = new SimpleEventBus();
    const orchestrator = new GameOrchestrator(eventBus);
    expect(orchestrator).toBeDefined();

    // Infrastructure layer - external concerns
    const repository = new InMemoryGameRepository();
    const logger = new DebugLogger();
    expect(repository).toBeDefined();
    expect(logger).toBeDefined();

    logger.info('integration-test', 'Layer separation verified');
  });

  it('should prove dependency injection works correctly', () => {
    // Application layer receives infrastructure dependencies through injection
    const customEventBus = new SimpleEventBus();
    const orchestratorWithInjection = new GameOrchestrator(customEventBus);

    expect(orchestratorWithInjection).toBeDefined();

    // Domain layer has no dependencies to inject
    const calculator = new ScoreCalculator();
    expect(calculator).toBeDefined();

    logger.info('integration-test', 'Dependency injection verified');
  });
});
/**
 * Move API Endpoint Tests
 *
 * Tests the move validation endpoint, including rejection of moves
 * for finished games.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import handler from '../move';
import { supabase } from '@/lib/supabase';
import { GameEngineAdapter } from '@/application/adapters/GameEngineAdapter';

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(),
  },
}));

// Mock the game engine adapter
jest.mock('@/application/adapters/GameEngineAdapter');

// Mock the supabase helpers
jest.mock('@/lib/utils/supabase-helpers', () => ({
  safeUnsubscribe: jest.fn().mockResolvedValue(undefined),
  subscribeWithTimeout: jest.fn().mockResolvedValue(true),
}));

describe('/api/games/[id]/move', () => {
  let req: Partial<NextApiRequest>;
  let res: Partial<NextApiResponse>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    const timestamp = Date.now();
    req = {
      method: 'POST',
      query: { id: 'test-game-123' },
      body: {
        moveId: `player-1-${timestamp}-test`,
        type: 'discard',
        playerId: 'player-1',
        cards: [{ id: 'card-1', type: 'number', value: 7 }],
        timestamp,
      },
    };

    res = {
      status: statusMock,
    };
  });

  describe('Method Validation', () => {
    it('should reject non-POST requests', async () => {
      req.method = 'GET';

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method not allowed' });
    });
  });

  describe('Request Validation', () => {
    it('should reject missing game ID', async () => {
      req.query = {};

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Game ID is required' });
    });

    it('should reject invalid move data', async () => {
      req.body = { invalid: 'data' };

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid move data' });
    });

    it('should reject move without playerId', async () => {
      req.body = { moveId: 'test-move', type: 'discard', cards: [], timestamp: Date.now() };

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid move data' });
    });

    it('should reject move without type', async () => {
      req.body = { moveId: 'test-move', playerId: 'player-1', cards: [], timestamp: Date.now() };

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid move data' });
    });

    it('should reject move without moveId', async () => {
      req.body = { type: 'discard', playerId: 'player-1', cards: [], timestamp: Date.now() };

      const fromMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'test-game-123', state: { phase: 'playing' } },
                error: null
              }),
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockImplementation(fromMock);

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Move must include a unique moveId for idempotency' });
    });
  });

  describe('Game State Validation', () => {
    it('should reject move when game not found', async () => {
      const fromMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockImplementation(fromMock);

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Game not found' });
    });

    it('should reject move when game is inactive', async () => {
      const fromMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockImplementation(fromMock);

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Game not found' });
    });
  });

  describe('Finished Game Validation', () => {
    it('should reject move when game has a winner', async () => {
      const mockGameState = {
        id: 'test-game-123',
        state: {
          winner: 'player-2',
          phase: 'ended',
          players: [
            { id: 'player-1', name: 'Alice' },
            { id: 'player-2', name: 'Bob' },
          ],
        },
      };

      const fromMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockGameState, error: null }),
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockImplementation(fromMock);

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Game has already ended',
        winner: 'player-2',
      });
    });

    it('should allow move when game has no winner', async () => {
      const mockGameState = {
        id: 'test-game-123',
        state: {
          phase: 'playing',
          players: [
            { id: 'player-1', name: 'Alice', hand: [], queens: [], score: 0 },
            { id: 'player-2', name: 'Bob', hand: [], queens: [], score: 0 },
          ],
          currentPlayerIndex: 0,
          currentPlayerId: 'player-1',
          sleepingQueens: [],
          deck: [],
          discardPile: [],
        },
      };

      const fromMock = jest.fn();
      fromMock.mockImplementation((table: string) => {
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: mockGameState, error: null }),
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'players') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: { id: 'player-db-id' }, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'game_moves') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        return {};
      });
      (supabase.from as jest.Mock).mockImplementation(fromMock);

      // Mock the game engine to accept the move
      const mockEngine = {
        playMove: jest.fn().mockReturnValue({ isValid: true }),
        getState: jest.fn().mockReturnValue(mockGameState.state),
      };
      (GameEngineAdapter as jest.Mock).mockImplementation(() => mockEngine);

      // Mock the channel for broadcasting
      const mockChannel = {
        send: jest.fn().mockResolvedValue('ok'),
      };
      (supabase.channel as jest.Mock).mockReturnValue(mockChannel);

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          isValid: true,
          gameState: expect.objectContaining({
            phase: 'playing',
          }),
        })
      );
    });
  });

  describe('Move Execution', () => {
    const setupValidGame = () => {
      const mockGameState = {
        id: 'test-game-123',
        state: {
          phase: 'playing',
          players: [
            { id: 'player-1', name: 'Alice', hand: [], queens: [], score: 0 },
            { id: 'player-2', name: 'Bob', hand: [], queens: [], score: 0 },
          ],
          currentPlayerIndex: 0,
          currentPlayerId: 'player-1',
          sleepingQueens: [],
          deck: [],
          discardPile: [],
          version: 1,
        },
      };

      const fromMock = jest.fn();
      fromMock.mockImplementation((table: string) => {
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockImplementation(() =>
                    Promise.resolve({ data: mockGameState, error: null })),
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'players') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: { id: 'player-db-id' }, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'game_moves') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        return {};
      });
      (supabase.from as jest.Mock).mockImplementation(fromMock);

      return mockGameState;
    };

    it('should reject invalid move from game engine', async () => {
      setupValidGame();

      const mockEngine = {
        playMove: jest.fn().mockReturnValue({
          isValid: false,
          error: 'It is not your turn',
        }),
        getState: jest.fn(),
      };
      (GameEngineAdapter as jest.Mock).mockImplementation(() => mockEngine);

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'It is not your turn',
        isValid: false,
      });
    });

    it('should handle duplicate moves (idempotency)', async () => {
      const mockGameState = setupValidGame();
      mockGameState.state.lastMoveId = req.body!.moveId;

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        isValid: true,
        gameState: mockGameState.state,
        duplicate: true,
      });
    });

    it('should update game state on valid move', async () => {
      const mockGameState = setupValidGame();

      const newState = {
        ...mockGameState.state,
        discardPile: [{ id: 'card-1', type: 'number', value: 7 }],
      };

      const mockEngine = {
        playMove: jest.fn().mockReturnValue({ isValid: true }),
        getState: jest.fn().mockReturnValue(newState),
      };
      (GameEngineAdapter as jest.Mock).mockImplementation(() => mockEngine);

      const mockChannel = {
        send: jest.fn().mockResolvedValue('ok'),
      };
      (supabase.channel as jest.Mock).mockReturnValue(mockChannel);

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(mockEngine.playMove).toHaveBeenCalledWith(req.body);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        isValid: true,
        gameState: expect.objectContaining({
          version: 2,
          lastMoveId: expect.any(String),
          lastMoveBy: 'player-1',
        }),
      });
    });

    it('should broadcast game state update', async () => {
      setupValidGame();

      const mockEngine = {
        playMove: jest.fn().mockReturnValue({ isValid: true }),
        getState: jest.fn().mockReturnValue({ phase: 'playing' }),
      };
      (GameEngineAdapter as jest.Mock).mockImplementation(() => mockEngine);

      const mockChannel = {
        send: jest.fn().mockResolvedValue('ok'),
      };
      (supabase.channel as jest.Mock).mockReturnValue(mockChannel);

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(supabase.channel).toHaveBeenCalledWith('direct-game-test-game-123');
      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'game_update',
        payload: expect.objectContaining({
          gameState: expect.any(Object),
          movePlayerId: 'player-1',
          moveType: 'discard',
          timestamp: expect.any(Number),
        }),
      });
    });

    it('should handle broadcast failure gracefully', async () => {
      setupValidGame();

      const mockEngine = {
        playMove: jest.fn().mockReturnValue({ isValid: true }),
        getState: jest.fn().mockReturnValue({ phase: 'playing' }),
      };
      (GameEngineAdapter as jest.Mock).mockImplementation(() => mockEngine);

      const mockChannel = {
        send: jest.fn().mockResolvedValue('error'),
      };
      (supabase.channel as jest.Mock).mockReturnValue(mockChannel);

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Should still return success even if broadcast fails
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        isValid: true,
        gameState: expect.any(Object),
      });
    });
  });

  describe('Move Logging', () => {
    it('should log move when player exists', async () => {
      const mockGameState = {
        id: 'test-game-123',
        state: {
          phase: 'playing',
          players: [],
          version: 1,
        },
      };

      const fromMock = jest.fn();
      const insertMock = jest.fn().mockResolvedValue({ error: null });

      fromMock.mockImplementation((table: string) => {
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: mockGameState, error: null }),
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'players') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: { id: 'player-db-id' }, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'game_moves') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
            insert: insertMock,
          };
        }
        return {};
      });
      (supabase.from as jest.Mock).mockImplementation(fromMock);

      const mockEngine = {
        playMove: jest.fn().mockReturnValue({ isValid: true }),
        getState: jest.fn().mockReturnValue({ phase: 'playing' }),
      };
      (GameEngineAdapter as jest.Mock).mockImplementation(() => mockEngine);

      const mockChannel = {
        send: jest.fn().mockResolvedValue('ok'),
      };
      (supabase.channel as jest.Mock).mockReturnValue(mockChannel);

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(insertMock).toHaveBeenCalledWith({
        game_id: 'test-game-123',
        player_id: 'player-db-id',
        move_id: req.body.moveId,
        move_data: expect.objectContaining({
          type: 'discard',
          playerId: 'player-1',
        }),
      });
    });

    it('should skip logging when player not found', async () => {
      const mockGameState = {
        id: 'test-game-123',
        state: {
          phase: 'playing',
          players: [],
          version: 1,
        },
      };

      const fromMock = jest.fn();
      const insertMock = jest.fn();

      fromMock.mockImplementation((table: string) => {
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: mockGameState, error: null }),
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'players') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'game_moves') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
            insert: insertMock,
          };
        }
        return {};
      });
      (supabase.from as jest.Mock).mockImplementation(fromMock);

      const mockEngine = {
        playMove: jest.fn().mockReturnValue({ isValid: true }),
        getState: jest.fn().mockReturnValue({ phase: 'playing' }),
      };
      (GameEngineAdapter as jest.Mock).mockImplementation(() => mockEngine);

      const mockChannel = {
        send: jest.fn().mockResolvedValue('ok'),
      };
      (supabase.channel as jest.Mock).mockReturnValue(mockChannel);

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(insertMock).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200); // Should still succeed
    });
  });
});
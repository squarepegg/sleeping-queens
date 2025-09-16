import { IdGenerator } from '../IdGenerator';

describe('IdGenerator', () => {
  describe('generateGameId', () => {
    it('should generate a valid UUID v4', () => {
      const id = IdGenerator.generateGameId();

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidV4Regex);
    });

    it('should generate unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(IdGenerator.generateGameId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('generatePlayerId', () => {
    it('should generate a valid UUID v4', () => {
      const id = IdGenerator.generatePlayerId();

      const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidV4Regex);
    });

    it('should generate unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(IdGenerator.generatePlayerId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('generateRoomCode', () => {
    it('should generate a 6-character room code', () => {
      const code = IdGenerator.generateRoomCode();
      expect(code).toHaveLength(6);
    });

    it('should only contain uppercase letters and numbers', () => {
      const code = IdGenerator.generateRoomCode();
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('should generate different codes', () => {
      const codes = new Set();
      for (let i = 0; i < 50; i++) {
        codes.add(IdGenerator.generateRoomCode());
      }
      // Allow for some collisions in random 6-char codes
      expect(codes.size).toBeGreaterThan(45);
    });
  });
});
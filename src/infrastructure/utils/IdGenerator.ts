// Infrastructure utility for generating IDs
export class IdGenerator {
  static generateGameId(): string {
    // Use proper UUID for database compatibility
    return this.generateUUID();
  }

  static generatePlayerId(): string {
    // Use proper UUID for database compatibility
    return this.generateUUID();
  }

  static generateRoomCode(): string {
    // Generate a 6-character room code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static generateMoveId(): string {
    return `move-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // UUID v4 generator (simplified)
  static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
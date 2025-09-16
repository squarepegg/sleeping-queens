// Infrastructure utility for generating IDs
import { randomUUID } from 'crypto';

export class IdGenerator {
  static generateGameId(): string {
    // Use Node.js built-in crypto.randomUUID (available since Node 14.17)
    // Falls back to browser's crypto.randomUUID in client-side code
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return randomUUID();
  }

  static generatePlayerId(): string {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return randomUUID();
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
}
// Utility for building consistent compound action messages
import { Queen } from '@/domain/models/Card';

export interface CompoundActionParts {
  playerName: string;
  primaryAction: string; // e.g., "woke Cat Queen (15 points)", "stole Dog Queen (15 points) from Alice"
  cardsDrawn?: number;
  specialEffects?: string[]; // e.g., ["Rose Queen bonus activated!", "Cat/Dog conflict resolved"]
}

export class ActionMessageBuilder {
  static buildCompoundMessage(parts: CompoundActionParts): string {
    let message = `${parts.playerName} ${parts.primaryAction}`;

    // Add card draw information
    if (parts.cardsDrawn && parts.cardsDrawn > 0) {
      const cardText = parts.cardsDrawn === 1 ? 'card' : 'cards';
      message += ` and drew ${parts.cardsDrawn} replacement ${cardText}`;
    }

    message += '.';

    // Add special effects
    if (parts.specialEffects && parts.specialEffects.length > 0) {
      message += ' ' + parts.specialEffects.join(' ');
    }

    return message;
  }

  static formatQueenAction(queen: Queen, action: string): string {
    return `${action} ${queen.name} (${queen.points} points)`;
  }

  static formatQueenSteal(queen: Queen, fromPlayerName: string): string {
    return `stole ${queen.name} (${queen.points} points) from ${fromPlayerName}`;
  }

  static formatQueenSleep(queen: Queen, targetPlayerName: string): string {
    return `put ${targetPlayerName}'s ${queen.name} to sleep`;
  }
}
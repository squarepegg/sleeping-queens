/**
 * Debug logger for GameEngine that can be captured during tests
 * In production, debug messages are disabled
 */

export interface DebugMessage {
  timestamp: number;
  type: 'state' | 'action' | 'validation' | 'card' | 'player' | 'turn';
  message: string;
  data?: any;
}

class DebugLogger {
  private messages: DebugMessage[] = [];
  private enabled: boolean = false;
  private listeners: ((msg: DebugMessage) => void)[] = [];

  constructor() {
    // Enable debug logging only in test environment
    this.enabled = process.env.NODE_ENV === 'test';
  }

  /**
   * Enable or disable debug logging
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Clear all stored messages
   */
  clear() {
    this.messages = [];
  }

  /**
   * Get all messages or filter by type
   */
  getMessages(type?: DebugMessage['type']): DebugMessage[] {
    if (type) {
      return this.messages.filter(m => m.type === type);
    }
    return [...this.messages];
  }

  /**
   * Get the last N messages
   */
  getLastMessages(count: number): DebugMessage[] {
    return this.messages.slice(-count);
  }

  /**
   * Find messages containing specific text
   */
  findMessages(searchText: string): DebugMessage[] {
    return this.messages.filter(m => m.message.includes(searchText));
  }

  /**
   * Add a listener for new messages (useful for tests)
   */
  addListener(listener: (msg: DebugMessage) => void) {
    this.listeners.push(listener);
  }

  /**
   * Remove all listeners
   */
  clearListeners() {
    this.listeners = [];
  }

  /**
   * Log a debug message
   */
  private log(type: DebugMessage['type'], message: string, data?: any) {
    if (!this.enabled) return;

    const debugMsg: DebugMessage = {
      timestamp: Date.now(),
      type,
      message,
      data
    };

    this.messages.push(debugMsg);
    
    // Notify listeners
    this.listeners.forEach(listener => listener(debugMsg));

    // Also log to console in debug mode
    if (process.env.DEBUG === 'true') {
      console.log(`[DEBUG:${type}] ${message}`, data || '');
    }
  }

  // Specific logging methods for different types

  logState(message: string, data?: any) {
    this.log('state', message, data);
  }

  logAction(message: string, data?: any) {
    this.log('action', message, data);
  }

  logValidation(message: string, data?: any) {
    this.log('validation', message, data);
  }

  logCard(message: string, data?: any) {
    this.log('card', message, data);
  }

  logPlayer(message: string, data?: any) {
    this.log('player', message, data);
  }

  logTurn(message: string, data?: any) {
    this.log('turn', message, data);
  }

  /**
   * Create a test harness for capturing logs
   */
  createTestHarness() {
    const capturedMessages: DebugMessage[] = [];
    
    const listener = (msg: DebugMessage) => {
      capturedMessages.push(msg);
    };

    this.addListener(listener);

    return {
      messages: capturedMessages,
      findMessage: (text: string) => capturedMessages.find(m => m.message.includes(text)),
      hasMessage: (text: string) => capturedMessages.some(m => m.message.includes(text)),
      getLastMessage: () => capturedMessages[capturedMessages.length - 1],
      clear: () => capturedMessages.length = 0,
      cleanup: () => {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
          this.listeners.splice(index, 1);
        }
      }
    };
  }
}

// Export singleton instance
export const debugLogger = new DebugLogger();

// Export for testing
export type TestHarness = ReturnType<typeof debugLogger.createTestHarness>;
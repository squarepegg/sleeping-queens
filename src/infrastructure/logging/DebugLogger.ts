// Infrastructure service for debug logging
export interface LogEntry {
  readonly timestamp: number;
  readonly level: 'debug' | 'info' | 'warn' | 'error';
  readonly category: string;
  readonly message: string;
  readonly data?: any;
}

export class DebugLogger {
  private logs: LogEntry[] = [];
  private readonly maxLogs = 1000;
  private enabled = true;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  debug(category: string, message: string, data?: any): void {
    this.log('debug', category, message, data);
  }

  info(category: string, message: string, data?: any): void {
    this.log('info', category, message, data);
  }

  warn(category: string, message: string, data?: any): void {
    this.log('warn', category, message, data);
  }

  error(category: string, message: string, data?: any): void {
    this.log('error', category, message, data);
  }

  private log(level: LogEntry['level'], category: string, message: string, data?: any): void {
    if (!this.enabled) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      data
    };

    this.logs.push(entry);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Also log to console in development
    if (typeof console !== 'undefined') {
      const prefix = `[${category}]`;
      switch (level) {
        case 'debug':
          console.debug(prefix, message, data);
          break;
        case 'info':
          console.info(prefix, message, data);
          break;
        case 'warn':
          console.warn(prefix, message, data);
          break;
        case 'error':
          console.error(prefix, message, data);
          break;
      }
    }
  }

  getLogs(category?: string, level?: LogEntry['level']): ReadonlyArray<LogEntry> {
    let filtered = this.logs;

    if (category) {
      filtered = filtered.filter(log => log.category === category);
    }

    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }

    return filtered;
  }

  clear(): void {
    this.logs = [];
  }

  // Legacy methods for backward compatibility
  logAction(message: string, data?: any): void {
    this.info('action', message, data);
  }

  logValidation(message: string, data?: any): void {
    this.warn('validation', message, data);
  }

  logState(message: string, data?: any): void {
    this.debug('state', message, data);
  }

  logCard(message: string, data?: any): void {
    this.debug('card', message, data);
  }

  logTurn(message: string, data?: any): void {
    this.info('turn', message, data);
  }

  logPlayer(message: string, data?: any): void {
    this.info('player', message, data);
  }
}

// Singleton instance for backward compatibility
export const debugLogger = new DebugLogger();
import pino from 'pino';

// Define log levels
type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// Configure logger based on environment
const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

// Create base logger configuration
const baseConfig = {
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  // Disable logging in test environment unless explicitly enabled
  enabled: !isTest || process.env.ENABLE_TEST_LOGGING === 'true',
};

// Development configuration with pretty printing
const developmentConfig = {
  ...baseConfig,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
      translateTime: 'HH:MM:ss.l',
    },
  },
};

// Production configuration optimized for Vercel
const productionConfig = {
  ...baseConfig,
  // Vercel captures these automatically
  formatters: {
    level: (label: string) => {
      return { level: label };
    },
  },
  // Add request ID and other metadata if available
  mixin: () => {
    return {
      env: process.env.VERCEL_ENV || process.env.NODE_ENV,
      region: process.env.VERCEL_REGION,
      ...(process.env.VERCEL_URL && { url: process.env.VERCEL_URL }),
    };
  },
};

// Create the logger instance
const logger = pino(isDevelopment ? developmentConfig : productionConfig);

// Create domain-specific child loggers
export const gameLogger = logger.child({ module: 'game' });
export const apiLogger = logger.child({ module: 'api' });
export const wsLogger = logger.child({ module: 'websocket' });
export const dbLogger = logger.child({ module: 'database' });

// Helper function to create a logger for a specific component
export function createLogger(component: string) {
  return logger.child({ component });
}

// Export the base logger as default
export default logger;

// Type-safe logging functions
export const log = {
  trace: (msg: string, data?: any) => logger.trace(data, msg),
  debug: (msg: string, data?: any) => logger.debug(data, msg),
  info: (msg: string, data?: any) => logger.info(data, msg),
  warn: (msg: string, data?: any) => logger.warn(data, msg),
  error: (msg: string, error?: Error | any, data?: any) => {
    if (error instanceof Error) {
      logger.error({ err: error, ...data }, msg);
    } else {
      logger.error({ ...error, ...data }, msg);
    }
  },
  fatal: (msg: string, error?: Error | any, data?: any) => {
    if (error instanceof Error) {
      logger.fatal({ err: error, ...data }, msg);
    } else {
      logger.fatal({ ...error, ...data }, msg);
    }
  },
};

// Middleware for API routes
export function withLogger(handler: any) {
  return async (req: any, res: any) => {
    const start = Date.now();
    const requestId = req.headers?.['x-request-id'] || Math.random().toString(36).substring(7);

    // Create request-specific logger
    const requestLogger = logger.child({
      requestId,
      method: req.method,
      url: req.url,
      ip: req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress,
    });

    // Attach logger to request
    req.log = requestLogger;

    // Log request
    requestLogger.info('Request started');

    // Wrap res.end to log response
    const originalEnd = res.end;
    res.end = function(...args: any[]) {
      const duration = Date.now() - start;
      requestLogger.info({
        statusCode: res.statusCode,
        duration,
      }, 'Request completed');
      originalEnd.apply(res, args);
    };

    try {
      return await handler(req, res);
    } catch (error) {
      const duration = Date.now() - start;
      requestLogger.error({
        err: error,
        statusCode: 500,
        duration,
      }, 'Request failed');
      throw error;
    }
  };
}
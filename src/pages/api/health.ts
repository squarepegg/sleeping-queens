import type {NextApiRequest, NextApiResponse} from 'next';
import {supabase} from '../../lib/supabase';
import {apiLogger, withLogger} from '../../lib/logger';

const logger = apiLogger.child({ endpoint: 'health' });

/**
 * Health check endpoint to prevent Supabase from pausing due to inactivity.
 *
 * This endpoint performs a lightweight database operation (insert) to keep
 * the database active. It's designed to be pinged by external monitoring
 * services like UptimeRobot every 5-15 minutes.
 *
 * @route GET /api/health
 * @returns {Object} Status and timestamp
 */
async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const log = (req as any).log || logger;

  // Allow both GET and HEAD requests (some monitors use HEAD)
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    log.warn({ method: req.method }, 'Invalid HTTP method');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const source = (req.query.source as string) || 'external';
    const timestamp = new Date().toISOString();

    // Perform a lightweight database operation to prevent inactivity
    const { error } = await supabase
      .from('health_checks')
      .insert({
        source,
        checked_at: timestamp,
      });

    if (error) {
      log.error({ error, source }, 'Health check insert failed');
      return res.status(500).json({
        status: 'error',
        message: 'Database operation failed',
        timestamp
      });
    }

    log.debug({ source, timestamp }, 'Health check successful');

    // Return success response
    return res.status(200).json({
      status: 'healthy',
      timestamp,
      source,
      message: 'Database is active',
    });

  } catch (error) {
    log.error({ error }, 'Health check error');
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}

export default withLogger(handler);

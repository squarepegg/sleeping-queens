import type {NextApiRequest, NextApiResponse} from 'next';
import {supabase} from '../../../lib/supabase';
import {apiLogger, withLogger} from '../../../lib/logger';

const logger = apiLogger.child({ endpoint: 'login' });

function generateSessionToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const log = (req as any).log || logger;
  if (req.method !== 'POST') {
    log.warn({ method: req.method }, 'Invalid HTTP method');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username } = req.body;

    if (!username || typeof username !== 'string' || username.trim().length < 2) {
      log.warn({ username }, 'Invalid username');
      return res.status(400).json({ error: 'Valid username is required (at least 2 characters)' });
    }

    const cleanUsername = username.trim();
    log.info({ username: cleanUsername }, 'Login attempt')

    // Check if username already exists and is active
    const { data: existingUser, error: checkError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('username', cleanUsername)
      .eq('is_active', true)
      .maybeSingle();

    if (checkError) {
      log.error({ error: checkError, username: cleanUsername }, 'Database check error');
      return res.status(500).json({ error: 'Database error' });
    }

    let sessionData;

    if (existingUser) {
      // Update existing session with new token
      const newSessionToken = generateSessionToken();
      const { data, error } = await (supabase as any)
        .from('user_sessions')
        .update({ 
          session_token: newSessionToken,
          updated_at: new Date().toISOString(),
        })
        .eq('id', (existingUser as any).id)
        .select()
        .single();

      if (error) {
        log.error({ error, userId: (existingUser as any).id }, 'Session update error');
        return res.status(500).json({ error: 'Failed to update session' });
      }

      sessionData = data;
      log.info({ userId: data.id, username: cleanUsername }, 'Existing user session updated');
    } else {
      // Create new session
      const sessionToken = generateSessionToken();
      const { data, error } = await (supabase as any)
        .from('user_sessions')
        .insert({
          username: cleanUsername,
          session_token: sessionToken,
        })
        .select()
        .single();

      if (error) {
        log.error({ error, username: cleanUsername }, 'Session creation error');
        return res.status(500).json({ error: 'Failed to create session' });
      }

      sessionData = data;
      log.info({ userId: data.id, username: cleanUsername }, 'New user session created');
    }

    res.status(200).json({
      user: {
        id: sessionData.id,
        username: sessionData.username,
        sessionToken: sessionData.session_token,
      },
      success: true,
    });
  } catch (error) {
    log.error({ error, username }, 'Login error');
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default withLogger(handler);
import type {NextApiRequest, NextApiResponse} from 'next';
import {supabase} from '../../../lib/supabase';

function generateSessionToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username } = req.body;

    if (!username || typeof username !== 'string' || username.trim().length < 2) {
      return res.status(400).json({ error: 'Valid username is required (at least 2 characters)' });
    }

    const cleanUsername = username.trim();

    // Check if username already exists and is active
    const { data: existingUser, error: checkError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('username', cleanUsername)
      .eq('is_active', true)
      .maybeSingle();

    if (checkError) {
      console.error('Database check error:', checkError);
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
        console.error('Session update error:', error);
        return res.status(500).json({ error: 'Failed to update session' });
      }

      sessionData = data;
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
        console.error('Session creation error:', error);
        return res.status(500).json({ error: 'Failed to create session' });
      }

      sessionData = data;
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
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
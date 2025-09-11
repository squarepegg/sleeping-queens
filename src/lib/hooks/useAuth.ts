import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';

export interface User {
  id: string;
  username: string;
  sessionToken: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // Check for existing session on mount
    const sessionToken = localStorage.getItem('sleeping_queens_session');
    const username = localStorage.getItem('sleeping_queens_username');
    
    if (sessionToken && username) {
      // Verify session with database
      verifySession(sessionToken, username);
    } else {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const verifySession = useCallback(async (sessionToken: string, username: string) => {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('session_token', sessionToken)
        .eq('username', username)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        // Invalid session, clear storage
        localStorage.removeItem('sleeping_queens_session');
        localStorage.removeItem('sleeping_queens_username');
        setAuthState({
          user: null,
          loading: false,
          error: 'Session expired',
        });
        return;
      }

      // Valid session
      setAuthState({
        user: {
          id: data.id,
          username: data.username,
          sessionToken: data.session_token,
        },
        loading: false,
        error: null,
      });
    } catch (err) {
      setAuthState({
        user: null,
        loading: false,
        error: 'Failed to verify session',
      });
    }
  }, []);

  const login = useCallback(async (username: string): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Check if username already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('username', username)
        .eq('is_active', true)
        .maybeSingle();

      if (checkError) throw checkError;

      let sessionData;

      if (existingUser) {
        // Update existing session
        const newSessionToken = generateSessionToken();
        const { data, error } = await supabase
          .from('user_sessions')
          .update({ 
            session_token: newSessionToken,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingUser.id)
          .select()
          .single();

        if (error) throw error;
        sessionData = data;
      } else {
        // Create new session
        const sessionToken = generateSessionToken();
        const { data, error } = await supabase
          .from('user_sessions')
          .insert({
            username,
            session_token: sessionToken,
          })
          .select()
          .single();

        if (error) throw error;
        sessionData = data;
      }

      // Store in localStorage
      localStorage.setItem('sleeping_queens_session', sessionData.session_token);
      localStorage.setItem('sleeping_queens_username', sessionData.username);

      setAuthState({
        user: {
          id: sessionData.id,
          username: sessionData.username,
          sessionToken: sessionData.session_token,
        },
        loading: false,
        error: null,
      });

      return true;
    } catch (error: any) {
      setAuthState({
        user: null,
        loading: false,
        error: error.message || 'Login failed',
      });
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    if (!authState.user) return;

    try {
      // Deactivate session in database
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('id', authState.user.id);
    } catch (error) {
      console.error('Error deactivating session:', error);
    }

    // Clear localStorage
    localStorage.removeItem('sleeping_queens_session');
    localStorage.removeItem('sleeping_queens_username');

    setAuthState({
      user: null,
      loading: false,
      error: null,
    });
  }, [authState.user]);

  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  return useMemo(
    () => ({
      ...authState,
      login,
      logout,
      clearError,
      isAuthenticated: !!authState.user,
    }),
    [authState, login, logout, clearError]
  );
}

function generateSessionToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
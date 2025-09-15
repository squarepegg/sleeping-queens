import React from 'react';
import Head from 'next/head';
import { useAuth } from '../lib/hooks/useAuth';
import { GameStateProvider } from '../lib/context/GameStateContextNew';
import { NewGameBoard } from '../components/game/NewGameBoard';

/**
 * Test page for new modular components in isolation
 * Only accessible in development to test components safely
 */
export default function TestComponentsPage() {
  const { user, loading: authLoading } = useAuth();

  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-300">This page is only available in development</p>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Authentication Required</h1>
          <p className="text-gray-300 mb-6">Please log in to test components</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Component Testing - Sleeping Queens</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Warning banner */}
      <div className="bg-yellow-600 text-black p-2 text-center font-medium">
        ⚠️ DEVELOPMENT TESTING PAGE - New modular components in isolation
      </div>

      {/* Use a test game ID - this will create or join a test game */}
      <GameStateProvider gameId="test-components">
        <NewGameBoard />
      </GameStateProvider>
    </>
  );
}
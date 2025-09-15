import {useEffect, useState} from 'react';
import Head from 'next/head';
import {useRouter} from 'next/router';
import {AnimatePresence, motion} from 'framer-motion';
import {Crown, Hash, LogOut, Plus} from 'lucide-react';
import {Button} from '../presentation/components/ui/Button';
import {CreateGame} from '../presentation/components/lobby/CreateGame';
import {JoinGame} from '../presentation/components/lobby/JoinGame';
import {useAuth} from '../lib/hooks/useAuth';

export default function Lobby() {
  const router = useRouter();
  const { user, logout, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to home
  }

  return (
    <>
      <Head>
        <title>Game Lobby - Sleeping Queens</title>
        <meta name="description" content="Create or join a Sleeping Queens game" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-between mb-8 p-6 glass-effect rounded-xl"
          >
            <div className="flex items-center space-x-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Game Lobby</h1>
                <p className="text-purple-200">Welcome back, {user.username}!</p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="text-gray-300 hover:text-white"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </motion.div>

          {/* Tab Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex items-center justify-center mb-8"
          >
            <div className="flex p-1 glass-effect rounded-lg">
              <button
                onClick={() => setActiveTab('create')}
                className={`
                  flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200
                  ${activeTab === 'create'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white'
                  }
                `}
              >
                <Plus className="h-4 w-4" />
                <span>Create Game</span>
              </button>
              <button
                onClick={() => setActiveTab('join')}
                className={`
                  flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200
                  ${activeTab === 'join'
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white'
                  }
                `}
              >
                <Hash className="h-4 w-4" />
                <span>Join Game</span>
              </button>
            </div>
          </motion.div>

          {/* Tab Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <AnimatePresence mode="wait">
              {activeTab === 'create' && (
                <motion.div
                  key="create"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <CreateGame />
                </motion.div>
              )}
              
              {activeTab === 'join' && (
                <motion.div
                  key="join"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <JoinGame />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Game Rules Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-12 glass-effect rounded-xl p-6"
          >
            <h2 className="text-xl font-bold text-white mb-4">How to Play Sleeping Queens</h2>
            <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-300">
              <div>
                <h3 className="font-semibold text-white mb-2">🎯 Objective</h3>
                <p className="mb-4">
                  Be the first to collect the required number of queens or reach the point threshold:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>2 players: 5 queens or 50 points</li>
                  <li>3-5 players: 4 queens or 40 points</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-white mb-2">🃏 Card Types</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Kings:</strong> Wake up sleeping queens</li>
                  <li><strong>Knights:</strong> Steal opponents' queens</li>
                  <li><strong>Dragons:</strong> Block knight attacks</li>
                  <li><strong>Wands:</strong> Put queens back to sleep</li>
                  <li><strong>Potions:</strong> Put your own queens to sleep</li>
                  <li><strong>Numbers:</strong> Create math equations to draw cards</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-400/20 rounded-lg">
              <h3 className="font-semibold text-blue-300 mb-2">💡 Strategy Tips</h3>
              <p className="text-blue-200 text-sm">
                Balance collecting high-value queens with protecting them from knights. 
                Use math equations strategically to draw more cards when needed. 
                Save dragons to defend against attacks on your most valuable queens!
              </p>
            </div>
          </motion.div>

          {/* Background Elements */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
            <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl animate-pulse-slow"></div>
            <div className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full bg-pink-500/10 blur-3xl animate-pulse-slow delay-1000"></div>
          </div>
        </div>
      </div>
    </>
  );
}
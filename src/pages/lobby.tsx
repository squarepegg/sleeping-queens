import {useEffect, useState} from 'react';
import Head from 'next/head';
import {useRouter} from 'next/router';
import {AnimatePresence, motion} from 'framer-motion';
import {Crown, Hash, LogOut, Plus} from 'lucide-react';
import {Button} from '../presentation/components/ui/Button';
import {CreateGame} from '../presentation/components/lobby/CreateGame';
import {JoinGame} from '../presentation/components/lobby/JoinGame';
import {HowToPlay} from '../presentation/components/shared/HowToPlay';
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

      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-3 sm:p-4 safe-padding">
        <div className="container-responsive max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center sm:justify-between gap-4 mb-6 sm:mb-8 p-4 sm:p-6 glass-effect rounded-xl"
          >
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full">
                <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-xl-responsive sm:text-2xl font-bold text-white">Game Lobby</h1>
                <p className="text-purple-200 text-sm-responsive sm:text-base">Welcome, {user.username}!</p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="text-gray-300 hover:text-white touch-target"
              size="sm"
            >
              <LogOut className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
              <span className="sm:hidden">Exit</span>
            </Button>
          </motion.div>

          {/* Tab Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex items-center justify-center mb-6 sm:mb-8"
          >
            <div className="flex p-1 glass-effect rounded-lg">
              <button
                onClick={() => setActiveTab('create')}
                className={`
                  flex items-center space-x-1 sm:space-x-2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all duration-200 touch-target
                  text-sm-responsive sm:text-base
                  ${activeTab === 'create'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white'
                  }
                `}
              >
                <Plus className="h-4 w-4" />
                <span>Create</span>
              </button>
              <button
                onClick={() => setActiveTab('join')}
                className={`
                  flex items-center space-x-1 sm:space-x-2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all duration-200 touch-target
                  text-sm-responsive sm:text-base
                  ${activeTab === 'join'
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white'
                  }
                `}
              >
                <Hash className="h-4 w-4" />
                <span>Join</span>
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
                  <JoinGame isActive={true} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Game Rules Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8 sm:mt-12"
          >
            <HowToPlay />
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
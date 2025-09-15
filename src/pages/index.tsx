import {useEffect, useState} from 'react';
import Head from 'next/head';
import {useRouter} from 'next/router';
import {motion} from 'framer-motion';
import {Crown, Play, Sparkles, Users} from 'lucide-react';
import {Button} from '../presentation/components/ui/Button';
import {Card} from '../presentation/components/ui/Card';
import {useAuth} from '../lib/hooks/useAuth';

export default function Home() {
  const router = useRouter();
  const { user, login, loading, error, clearError } = useAuth();
  const [username, setUsername] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (user) {
      router.push('/lobby');
    }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || username.length < 2) return;

    setIsLoggingIn(true);
    clearError();
    
    const success = await login(username.trim());
    
    if (success) {
      router.push('/lobby');
    } else {
      setIsLoggingIn(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sleeping Queens - Multiplayer Card Game</title>
        <meta name="description" content="Play the magical Sleeping Queens card game online with friends!" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-6 shadow-xl">
              <Crown className="h-10 w-10 text-white" />
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 font-medieval">
              Sleeping Queens
            </h1>
            
            <p className="text-xl text-purple-200 mb-2">
              Wake the queens and win the game!
            </p>
            
            <p className="text-gray-300 text-sm">
              A magical multiplayer card game for 2-5 players
            </p>
          </motion.div>

          {/* Login Card */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          >
            <Card variant="glass" className="p-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-white mb-2">
                  Enter the Kingdom
                </h2>
                <p className="text-gray-300 text-sm">
                  Choose a username to begin your magical adventure
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-200 mb-2">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="game-input"
                    maxLength={20}
                    minLength={2}
                    required
                    disabled={loading || isLoggingIn}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Must be at least 2 characters long
                  </p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-red-500/10 border border-red-500/20 rounded-lg p-3"
                  >
                    <p className="text-red-300 text-sm">{error}</p>
                  </motion.div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  loading={loading || isLoggingIn}
                  disabled={!username.trim() || username.length < 2}
                  className="w-full"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Start Playing
                </Button>
              </form>
            </Card>
          </motion.div>

          {/* Features Section */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
            className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <Card variant="glass" padding="sm" className="text-center">
              <Users className="h-8 w-8 text-purple-300 mx-auto mb-2" />
              <h3 className="font-semibold text-white text-sm mb-1">Multiplayer</h3>
              <p className="text-xs text-gray-300">Play with 2-5 friends online</p>
            </Card>
            
            <Card variant="glass" padding="sm" className="text-center">
              <Sparkles className="h-8 w-8 text-pink-300 mx-auto mb-2" />
              <h3 className="font-semibold text-white text-sm mb-1">Real-time</h3>
              <p className="text-xs text-gray-300">Instant game updates</p>
            </Card>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="mt-8 text-center"
          >
            <p className="text-gray-400 text-xs">
              Built with Next.js, Supabase, and magic ✨
            </p>
          </motion.div>
        </div>

        {/* Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl animate-pulse-slow"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-pink-500/20 blur-3xl animate-pulse-slow delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl animate-pulse-slow delay-2000"></div>
        </div>
      </div>
    </>
  );
}
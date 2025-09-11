import Head from 'next/head';
import { useRouter } from 'next/router';
import { Crown, Home } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function Custom404() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Page Not Found - Sleeping Queens</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-500/20 rounded-full mb-6">
              <Crown className="h-10 w-10 text-purple-300" />
            </div>
            <h1 className="text-6xl font-bold text-white mb-4">404</h1>
            <h2 className="text-2xl font-semibold text-purple-200 mb-4">
              This queen is still sleeping
            </h2>
            <p className="text-gray-300 mb-8">
              The page you're looking for doesn't exist in our magical kingdom.
            </p>
          </div>

          <Button
            onClick={() => router.push('/')}
            size="lg"
            className="inline-flex items-center"
          >
            <Home className="h-5 w-5 mr-2" />
            Return to Kingdom
          </Button>
        </div>

        {/* Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full bg-pink-500/10 blur-3xl animate-pulse-slow delay-1000"></div>
        </div>
      </div>
    </>
  );
}
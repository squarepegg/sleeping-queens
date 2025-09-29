import React from 'react';
import { motion } from 'framer-motion';

export const HowToPlay: React.FC = () => {
  return (
    <div className="glass-effect rounded-xl p-4 sm:p-6">
      <h2 className="text-lg-responsive sm:text-xl font-bold text-white mb-3 sm:mb-4">How to Play</h2>

      {/* Objective */}
      <div className="mb-6">
        <h3 className="font-semibold text-white mb-2 text-sm-responsive sm:text-base flex items-center">
          🎯 Objective
        </h3>
        <p className="text-gray-300 text-xs sm:text-sm mb-2">
          Be the first to collect the required number of queens or reach the point threshold:
        </p>
        <div className="ml-4 space-y-1 text-gray-400 text-xs sm:text-sm">
          <p>• 2 players: 5 queens or 50 points</p>
          <p>• 3-5 players: 4 queens or 40 points</p>
        </div>
      </div>

      {/* Card Types Grid */}
      <div className="mb-6">
        <h3 className="font-semibold text-white mb-3 text-sm-responsive sm:text-base">🃏 Card Types</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          {/* Queens */}
          <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">👑</span>
              <div>
                <p className="text-white font-medium">Queens</p>
                <p className="text-xs text-purple-200">Collect these sleeping beauties to score points</p>
              </div>
            </div>
          </div>

          {/* Kings */}
          <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🤴</span>
              <div>
                <p className="text-white font-medium">Kings</p>
                <p className="text-xs text-blue-200">Wake up sleeping queens</p>
              </div>
            </div>
          </div>

          {/* Knights */}
          <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">⚔️</span>
              <div>
                <p className="text-white font-medium">Knights</p>
                <p className="text-xs text-red-200">Steal opponents&apos; queens</p>
              </div>
            </div>
          </div>

          {/* Dragons */}
          <div className="bg-orange-500/10 rounded-lg p-3 border border-orange-500/20">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🐉</span>
              <div>
                <p className="text-white font-medium">Dragons</p>
                <p className="text-xs text-orange-200">Block knight attacks</p>
              </div>
            </div>
          </div>

          {/* Potions */}
          <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🧪</span>
              <div>
                <p className="text-white font-medium">Potions</p>
                <p className="text-xs text-green-200">Put queens back to sleep</p>
              </div>
            </div>
          </div>

          {/* Wands */}
          <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🪄</span>
              <div>
                <p className="text-white font-medium">Wands</p>
                <p className="text-xs text-yellow-200">Block potion attacks</p>
              </div>
            </div>
          </div>

          {/* Jester */}
          <div className="bg-pink-500/10 rounded-lg p-3 border border-pink-500/20">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🃏</span>
              <div>
                <p className="text-white font-medium">Jester</p>
                <p className="text-xs text-pink-200">Draw from discard pile</p>
              </div>
            </div>
          </div>

          {/* Numbers */}
          <div className="bg-indigo-500/10 rounded-lg p-3 border border-indigo-500/20">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🔢</span>
              <div>
                <p className="text-white font-medium">Numbers</p>
                <p className="text-xs text-indigo-200">Make equations to draw cards</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tips Section */}
      <div className="p-3 sm:p-4 bg-blue-500/10 border border-blue-400/20 rounded-lg">
        <h3 className="font-semibold text-blue-300 mb-1 sm:mb-2 text-sm-responsive sm:text-base">💡 Tips</h3>
        <p className="text-blue-200 text-xs-responsive sm:text-sm">
          Balance collecting high-value queens with protecting them from knights.
          Use math equations strategically to draw more cards when needed.
          Save dragons to defend against attacks on your most valuable queens!
        </p>
      </div>
    </div>
  );
};
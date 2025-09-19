import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Plus, Sparkles } from 'lucide-react';
import { Card, isNumberCard } from '@/domain/models/Card';
import { NumberCard } from '@/domain/models/Card';

interface StagingAreaProps {
  cards: Card[];
  error: string | null;
  onClear: () => void;
}

export const StagingArea: React.FC<StagingAreaProps> = ({ cards, error, onClear }) => {
  // Only show staging area for number cards
  const numberCards = cards.filter(isNumberCard) as NumberCard[];
  
  if (numberCards.length === 0) {
    return null;
  }

  // Format the attempted equation
  const getEquationString = () => {
    if (numberCards.length === 2) {
      const [a, b] = numberCards.map(c => c.value);
      return `${a} + ${b} = ?`;
    } else if (numberCards.length >= 3) {
      const values = numberCards.map(c => c.value);
      const attempt = values.slice(0, -1).join(' + ') + ' = ' + values[values.length - 1];
      return attempt;
    }
    return numberCards.map(c => c.value).join(', ');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 25
        }}
        className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
      >
        <div className="relative pointer-events-auto">
          {/* Magical glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 blur-3xl" />

          <div className="relative bg-gradient-to-b from-purple-950/95 to-purple-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-purple-700/50 overflow-hidden">
            {/* Top gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500" />
            
            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {error ? (
                    <motion.div
                      initial={{ rotate: 0 }}
                      animate={{ rotate: [0, -10, 10, -10, 0] }}
                      transition={{ duration: 0.5 }}
                    >
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    </motion.div>
                  ) : (
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="w-5 h-5 text-yellow-400" />
                    </motion.div>
                  )}
                  
                  <div>
                    <h3 className="text-white font-semibold text-lg">
                      {error ? 'Invalid Equation' : 'Building Equation'}
                    </h3>
                    <p className="text-purple-300 text-sm mt-0.5">
                      {error || 'Combine number cards to form a valid math equation'}
                    </p>
                  </div>
                </div>
                
                {/* Close button */}
                <button
                  onClick={onClear}
                  className="p-2 hover:bg-purple-800/50 rounded-full transition-all hover:scale-110 group"
                  aria-label="Clear cards"
                >
                  <X className="w-5 h-5 text-purple-300 group-hover:text-white transition-colors" />
                </button>
              </div>
              
              {/* Cards Display */}
              <div className="bg-purple-950/50 rounded-2xl p-3 mb-3 border border-purple-800/30">
                {/* Equation Display */}
                <div className="text-center mb-3">
                  <motion.div 
                    className="text-2xl font-bold text-white font-mono"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    {getEquationString()}
                  </motion.div>
                </div>
                
                {/* Cards - with horizontal scroll for many cards */}
                <div className="flex justify-center gap-3 overflow-x-auto max-w-[80vw] pb-2">
                  <div className="flex gap-3">
                    {numberCards.map((card, idx) => (
                      <motion.div
                        key={card.id}
                        initial={{ y: 20, opacity: 0, scale: 0.8 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05, type: 'spring', stiffness: 300 }}
                        whileHover={{ y: -4, scale: 1.05 }}
                        className="relative flex-shrink-0"
                      >
                        {/* Card glow */}
                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/30 to-orange-400/30 blur-xl rounded-xl" />

                        {/* Card */}
                        <div className="relative bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg shadow-xl w-16 h-24 flex items-center justify-center border-2 border-yellow-300/50">
                          <div className="text-center">
                            <div className="text-3xl font-bold bg-gradient-to-b from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                              {card.value}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {/* Add more card hint - shows for 2 cards or if user can add more for longer equations */}
                    {(numberCards.length === 2 || (numberCards.length >= 3 && numberCards.length < 5)) && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative flex-shrink-0"
                      >
                        <div className="relative bg-gradient-to-br from-purple-900/50 to-purple-800/50 rounded-lg w-16 h-24 flex items-center justify-center border-2 border-dashed border-purple-500/50">
                          <div className="text-center">
                            <Plus className="w-6 h-6 text-purple-400 mb-1" />
                            <div className="text-xs text-purple-300">
                              {numberCards.length === 2 ? 'Add 1+' : 'Add more'}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Bottom Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={onClear}
                  className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg"
                >
                  Clear Cards
                </button>
                
                {/* Helpful hint */}
                <div className="text-purple-300 text-sm">
                  {numberCards.length === 2 ? (
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Drop 1 more card
                    </span>
                  ) : numberCards.length >= 3 ? (
                    error ? (
                      <span className="text-red-400 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Try different numbers
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-green-400">
                        <Sparkles className="w-4 h-4" />
                        Valid equation!
                      </span>
                    )
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
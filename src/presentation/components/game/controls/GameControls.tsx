import React, {useCallback, useState} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import {Beaker, Calculator, Crown, Hand, Play, RotateCcw, Shield, Sword, Trash2, Wand2, X} from 'lucide-react';
import {useGameState} from '../../../lib/context/GameStateContext';
import {useAuth} from '../../../lib/hooks/useAuth';
import {Card} from '../../../domain/models/Card';
import {GameMove} from '../../../domain/models/GameMove';

interface CardSelectionProps {
  cards: Card[];
  selectedCards: Card[];
  onCardSelect: (card: Card) => void;
  onCardDeselect: (card: Card) => void;
  disabled: boolean;
}

function CardSelection({ cards, selectedCards, onCardSelect, onCardDeselect, disabled }: CardSelectionProps) {
  const getCardIcon = (card: Card) => {
    switch (card.type) {
      case 'king': return <Crown className="h-3 w-3" />;
      case 'knight': return <Sword className="h-3 w-3" />;
      case 'dragon': return <Shield className="h-3 w-3" />;
      case 'wand': return <Wand2 className="h-3 w-3" />;
      case 'potion': return <Beaker className="h-3 w-3" />;
      case 'number': return <Calculator className="h-3 w-3" />;
      default: return null;
    }
  };

  const isSelected = (card: Card) => selectedCards.some(c => c.id === card.id);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
      {cards.map((card, index) => {
        const selected = isSelected(card);
        return (
          <motion.button
            key={card.id || index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            onClick={() => selected ? onCardDeselect(card) : onCardSelect(card)}
            disabled={disabled}
            className={`
              p-2 rounded-lg border-2 transition-all duration-200 text-xs
              ${selected 
                ? 'border-blue-400 bg-blue-400/20 text-blue-300' 
                : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-500'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
            `}
          >
            <div className="flex items-center justify-center space-x-1">
              {getCardIcon(card)}
              <span className="font-medium">
                {card.type === 'number' ? card.value : card.name || card.type}
              </span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

function ActionButton({ icon, label, onClick, disabled = false, variant = 'secondary' }: ActionButtonProps) {
  const baseClasses = "flex items-center space-x-2 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200";
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-600",
    secondary: "bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:bg-gray-800",
    danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-600"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function GameControls() {
  const { gameState, isMyTurn, playMove } = useGameState();
  const { user } = useAuth();
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentUserPlayer = gameState?.players.find(p => p.id === user?.id);

  const handleCardSelect = useCallback((card: Card) => {
    if (!isMyTurn) return;
    setSelectedCards(prev => [...prev, card]);
  }, [isMyTurn]);

  const handleCardDeselect = useCallback((card: Card) => {
    if (!isMyTurn) return;
    setSelectedCards(prev => prev.filter(c => c.id !== card.id));
  }, [isMyTurn]);

  const clearSelection = useCallback(() => {
    setSelectedCards([]);
  }, []);

  const handlePlayCards = useCallback(async () => {
    if (!selectedCards.length || !currentUserPlayer || !isMyTurn) return;

    setIsSubmitting(true);
    try {
      // Determine move type based on selected cards
      const moveType = selectedCards[0].type;
      let move: GameMove;

      switch (moveType) {
        case 'king':
          // For king moves, we need a target queen - this is simplified
          move = {
            type: 'play_king',
            playerId: currentUserPlayer.id,
            cards: selectedCards,
            timestamp: Date.now()
          };
          break;
        case 'knight':
          move = {
            type: 'play_knight',
            playerId: currentUserPlayer.id,
            cards: selectedCards,
            timestamp: Date.now()
          };
          break;
        case 'number':
          move = {
            type: 'play_math',
            playerId: currentUserPlayer.id,
            cards: selectedCards,
            timestamp: Date.now()
          };
          break;
        default:
          console.warn('Unsupported move type:', moveType);
          return;
      }

      const result = await playMove(move);
      if (result.isValid) {
        clearSelection();
      }
    } catch (error) {
      console.error('Error playing cards:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedCards, currentUserPlayer, isMyTurn, playMove, clearSelection]);

  const handleDiscard = useCallback(async () => {
    if (!selectedCards.length || !currentUserPlayer || !isMyTurn) return;

    setIsSubmitting(true);
    try {
      const move: GameMove = {
        type: 'discard',
        playerId: currentUserPlayer.id,
        cards: selectedCards,
        timestamp: Date.now()
      };

      const result = await playMove(move);
      if (result.isValid) {
        clearSelection();
      }
    } catch (error) {
      console.error('Error discarding cards:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedCards, currentUserPlayer, isMyTurn, playMove, clearSelection]);

  if (!gameState || !user || !currentUserPlayer) {
    return (
      <div className="glass-effect rounded-lg p-4 h-full">
        <div className="animate-pulse">
          <div className="h-4 bg-white/10 rounded mb-4"></div>
          <div className="h-32 bg-white/5 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-effect rounded-lg p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white flex items-center">
          <Hand className="h-5 w-5 mr-2" />
          Your Hand ({currentUserPlayer.hand.length})
        </h2>
        
        {isMyTurn ? (
          <div className="flex items-center space-x-1 text-green-400 text-sm">
            <Play className="h-4 w-4" />
            <span>Your Turn</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1 text-gray-400 text-sm">
            <RotateCcw className="h-4 w-4" />
            <span>Waiting</span>
          </div>
        )}
      </div>

      {/* Selected Cards Display */}
      <AnimatePresence>
        {selectedCards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 bg-blue-500/10 border border-blue-400/20 rounded-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-300 text-sm font-medium">
                Selected Cards ({selectedCards.length})
              </span>
              <button
                onClick={clearSelection}
                className="text-blue-400 hover:text-blue-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedCards.map((card, index) => (
                <div
                  key={card.id || index}
                  className="px-2 py-1 bg-blue-400/20 text-blue-200 text-xs rounded border border-blue-400/30"
                >
                  {card.type === 'number' ? card.value : card.name || card.type}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card Selection */}
      <div className="flex-1 mb-4">
        <h3 className="text-sm font-medium text-gray-300 mb-2">Select Cards to Play:</h3>
        <CardSelection
          cards={currentUserPlayer.hand}
          selectedCards={selectedCards}
          onCardSelect={handleCardSelect}
          onCardDeselect={handleCardDeselect}
          disabled={!isMyTurn || isSubmitting}
        />
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <ActionButton
            icon={<Play className="h-4 w-4" />}
            label="Play Cards"
            onClick={handlePlayCards}
            disabled={!isMyTurn || selectedCards.length === 0 || isSubmitting}
            variant="primary"
          />
          <ActionButton
            icon={<Trash2 className="h-4 w-4" />}
            label="Discard"
            onClick={handleDiscard}
            disabled={!isMyTurn || selectedCards.length === 0 || isSubmitting}
            variant="danger"
          />
        </div>
        
        {selectedCards.length > 0 && (
          <ActionButton
            icon={<X className="h-4 w-4" />}
            label="Clear Selection"
            onClick={clearSelection}
            disabled={isSubmitting}
            variant="secondary"
          />
        )}
      </div>

      {/* Turn Status */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="text-center text-sm">
          {isMyTurn ? (
            <span className="text-green-300">
              It's your turn! Select cards and choose an action.
            </span>
          ) : (
            <span className="text-gray-400">
              Waiting for {gameState.players[gameState.currentPlayerIndex]?.name}'s turn...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
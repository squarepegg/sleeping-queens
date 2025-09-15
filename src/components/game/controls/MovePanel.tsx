import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, 
  CheckCircle, 
  XCircle, 
  Crown, 
  Sword,
  Calculator,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { useGameState } from '../../../lib/context/GameStateContextNew';
import { useAuth } from '../../../lib/hooks/useAuth';
import { Card, GameMove, Queen } from '../../../game/types';
import { Button } from '../../ui/Button';

interface MovePanelProps {
  selectedCards: Card[];
  onClearSelection: () => void;
  onExecuteMove: (move: GameMove) => Promise<void>;
  isSubmitting: boolean;
}

interface TargetSelectionProps {
  targets: Queen[] | Card[];
  onTargetSelect: (target: Queen | Card) => void;
  selectedTarget?: Queen | Card;
  type: 'queen' | 'player';
}

function TargetSelection({ targets, onTargetSelect, selectedTarget, type }: TargetSelectionProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-300">
        Select {type === 'queen' ? 'Queen' : 'Target'}:
      </h4>
      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
        {targets.map((target, index) => (
          <button
            key={(target as any).id || index}
            onClick={() => onTargetSelect(target)}
            className={`
              p-2 text-xs rounded-lg border-2 transition-all duration-200
              ${selectedTarget === target
                ? 'border-green-400 bg-green-400/20 text-green-300'
                : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-500'
              }
            `}
          >
            <div className="text-center">
              <div className="font-medium">
                {type === 'queen' 
                  ? (target as Queen).name 
                  : `Player ${index + 1}`
                }
              </div>
              {type === 'queen' && (
                <div className="text-xs opacity-75">
                  {(target as Queen).points} points
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function MovePanel({ selectedCards, onClearSelection, onExecuteMove, isSubmitting }: MovePanelProps) {
  const { gameState, isMyTurn } = useGameState();
  const { user } = useAuth();
  const [selectedTarget, setSelectedTarget] = useState<Queen | Card | undefined>();
  const [movePreview, setMovePreview] = useState<string>('');
  const [isValidMove, setIsValidMove] = useState(false);
  const currentUserPlayer = gameState?.players.find(p => p.id === user?.id);

  // Reset when cards change
  useEffect(() => {
    setSelectedTarget(undefined);
    setMovePreview('');
    setIsValidMove(false);
  }, [selectedCards]);

  // Generate move preview and validation
  useEffect(() => {
    if (!selectedCards.length || !gameState || !currentUserPlayer) {
      setMovePreview('');
      setIsValidMove(false);
      return;
    }

    const firstCard = selectedCards[0];
    let preview = '';
    let valid = false;

    switch (firstCard.type) {
      case 'king':
        if (selectedCards.length === 1) {
          if (selectedTarget && 'points' in selectedTarget) {
            preview = `Wake ${(selectedTarget as Queen).name} with King`;
            valid = true;
          } else {
            preview = 'Select a sleeping queen to wake up';
            valid = false;
          }
        } else {
          preview = 'Kings must be played alone';
          valid = false;
        }
        break;

      case 'knight':
        if (selectedCards.length === 1) {
          preview = 'Attack another player\'s queen with Knight';
          valid = true; // Simplified - knight moves are complex
        } else {
          preview = 'Knights must be played alone';
          valid = false;
        }
        break;

      case 'number':
        if (selectedCards.length >= 2) {
          const numbers = selectedCards.map(c => c.value).filter(v => v !== undefined);
          if (numbers.length === selectedCards.length) {
            preview = `Math equation: ${numbers.join(' + ')} = ${numbers.reduce((a, b) => a + b, 0)}`;
            valid = true; // Simplified validation
          } else {
            preview = 'All cards must be numbers for math equations';
            valid = false;
          }
        } else {
          preview = 'Need at least 2 number cards for math equation';
          valid = false;
        }
        break;

      default:
        preview = `Play ${selectedCards.length} ${firstCard.type} card${selectedCards.length > 1 ? 's' : ''}`;
        valid = selectedCards.length > 0;
    }

    setMovePreview(preview);
    setIsValidMove(valid);
  }, [selectedCards, selectedTarget, gameState, currentUserPlayer]);

  const handleExecuteMove = async () => {
    if (!isValidMove || !selectedCards.length || !currentUserPlayer || !isMyTurn) return;

    const firstCard = selectedCards[0];
    let move: GameMove;

    switch (firstCard.type) {
      case 'king':
        move = {
          type: 'play_king',
          playerId: currentUserPlayer.id,
          cards: selectedCards,
          targetCard: selectedTarget as Queen,
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
        console.warn('Unsupported move type:', firstCard.type);
        return;
    }

    await onExecuteMove(move);
  };

  const getMoveIcon = (cardType: string) => {
    switch (cardType) {
      case 'king': return <Crown className="h-4 w-4" />;
      case 'knight': return <Sword className="h-4 w-4" />;
      case 'number': return <Calculator className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  if (!selectedCards.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="glass-effect rounded-lg p-4 border-2 border-blue-400/30"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white flex items-center">
          {getMoveIcon(selectedCards[0].type)}
          <span className="ml-2">Move Setup</span>
        </h3>
        <button
          onClick={onClearSelection}
          className="text-gray-400 hover:text-gray-200"
        >
          <XCircle className="h-5 w-5" />
        </button>
      </div>

      {/* Selected Cards Display */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Selected Cards:</h4>
        <div className="flex flex-wrap gap-2">
          {selectedCards.map((card, index) => (
            <div
              key={card.id || index}
              className="px-3 py-1 bg-blue-400/20 text-blue-200 text-sm rounded border border-blue-400/30"
            >
              {card.type === 'number' ? card.value : card.name || card.type}
            </div>
          ))}
        </div>
      </div>

      {/* Target Selection (for King moves) */}
      {selectedCards[0].type === 'king' && gameState && (
        <div className="mb-4">
          <TargetSelection
            targets={gameState.sleepingQueens}
            onTargetSelect={(target) => setSelectedTarget(target as Queen)}
            selectedTarget={selectedTarget as Queen}
            type="queen"
          />
        </div>
      )}

      {/* Move Preview */}
      <div className="mb-4 p-3 rounded-lg border border-white/20">
        <div className="flex items-start space-x-2">
          {isValidMove ? (
            <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
          )}
          <div>
            <div className={`text-sm font-medium ${isValidMove ? 'text-green-300' : 'text-yellow-300'}`}>
              {isValidMove ? 'Ready to Execute' : 'Move Invalid'}
            </div>
            <div className="text-xs text-gray-300 mt-1">
              {movePreview}
            </div>
          </div>
        </div>
      </div>

      {/* Turn Warning */}
      {!isMyTurn && (
        <div className="mb-4 p-2 bg-orange-500/10 border border-orange-400/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-orange-400" />
            <span className="text-orange-300 text-sm">Not your turn</span>
          </div>
        </div>
      )}

      {/* Execute Button */}
      <Button
        onClick={handleExecuteMove}
        disabled={!isValidMove || !isMyTurn || isSubmitting}
        loading={isSubmitting}
        variant="primary"
        size="sm"
        className="w-full"
      >
        {isSubmitting ? 'Executing...' : 'Execute Move'}
      </Button>
    </motion.div>
  );
}
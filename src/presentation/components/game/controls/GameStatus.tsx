import React from 'react';
import {motion} from 'framer-motion';
import {AlertCircle, Clock, Copy, Crown, Settings, Shield, Sword, Trophy, Users, Zap} from 'lucide-react';
import {useGameState} from '../../../lib/context/GameStateContext';
import {useAuth} from '../../../lib/hooks/useAuth';
import {Button} from '../../ui/Button';

interface DefenseStatusProps {
  pendingKnightAttack?: any;
  pendingPotionAttack?: any;
  canPlayDragon: boolean;
  canPlayWand: boolean;
}

function DefenseStatus({ pendingKnightAttack, pendingPotionAttack, canPlayDragon, canPlayWand }: DefenseStatusProps) {
  if (!pendingKnightAttack && !pendingPotionAttack) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center space-x-2 bg-red-500/20 text-red-300 px-3 py-1 rounded-full border border-red-500/30"
    >
      {pendingKnightAttack && (
        <>
          <Sword className="h-4 w-4" />
          <span className="text-sm font-medium">Knight Attack!</span>
          {canPlayDragon && <Shield className="h-4 w-4 text-green-400" />}
        </>
      )}
      {pendingPotionAttack && (
        <>
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Potion Attack!</span>
          {canPlayWand && <Shield className="h-4 w-4 text-green-400" />}
        </>
      )}
    </motion.div>
  );
}

interface QuickActionsProps {
  onCopyRoomCode: () => void;
  onShowSettings: () => void;
  roomCode: string;
}

function QuickActions({ onCopyRoomCode, onShowSettings, roomCode }: QuickActionsProps) {
  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={onCopyRoomCode}
        className="text-xs"
      >
        <Copy className="h-3 w-3 mr-1" />
        {roomCode}
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onShowSettings}
        className="text-xs"
      >
        <Settings className="h-3 w-3" />
      </Button>
    </div>
  );
}

interface GameProgressProps {
  currentPlayerIndex: number;
  totalPlayers: number;
  phase: string;
}

function GameProgress({ currentPlayerIndex, totalPlayers, phase }: GameProgressProps) {
  const progress = ((currentPlayerIndex + 1) / totalPlayers) * 100;

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-1 text-gray-300 text-sm">
        <Users className="h-4 w-4" />
        <span>{totalPlayers} Players</span>
      </div>
      
      <div className="flex items-center space-x-1 text-gray-300 text-sm">
        <Clock className="h-4 w-4" />
        <span className="capitalize">{phase} Phase</span>
      </div>

      <div className="hidden sm:flex items-center space-x-2">
        <div className="w-20 h-1 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
            className="h-full bg-blue-400 rounded-full"
          />
        </div>
        <span className="text-xs text-gray-400">
          {currentPlayerIndex + 1}/{totalPlayers}
        </span>
      </div>
    </div>
  );
}

interface WinProgressProps {
  playerQueens: number;
  playerScore: number;
  queensRequired: number;
  scoreRequired: number;
}

function WinProgress({ playerQueens, playerScore, queensRequired, scoreRequired }: WinProgressProps) {
  const queensProgress = (playerQueens / queensRequired) * 100;
  const scoreProgress = (playerScore / scoreRequired) * 100;
  const isClose = queensProgress > 75 || scoreProgress > 75;

  if (!isClose) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center space-x-2 bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full border border-yellow-500/30"
    >
      <Trophy className="h-4 w-4" />
      <span className="text-sm font-medium">Close to Victory!</span>
      <div className="text-xs">
        {playerQueens}/{queensRequired}Q | {playerScore}/{scoreRequired}P
      </div>
    </motion.div>
  );
}

export function GameStatus() {
  const { 
    gameState, 
    currentPlayer, 
    isMyTurn, 
    canPlayDragon, 
    getPendingKnightAttack,
    getPendingPotionAttack,
    canPlayWand 
  } = useGameState();
  const { user } = useAuth();
  const currentUserPlayer = gameState?.players.find(p => p.id === user?.id);

  const handleCopyRoomCode = async () => {
    if (!gameState?.roomCode) return;
    try {
      await navigator.clipboard.writeText(gameState.roomCode);
      // Could show a toast notification here
    } catch (error) {
      console.error('Failed to copy room code:', error);
    }
  };

  const handleShowSettings = () => {
    // Could open settings modal
    console.log('Settings clicked');
  };

  if (!gameState || !user || !currentUserPlayer) {
    return (
      <div className="flex items-center justify-center h-16">
        <div className="animate-pulse text-gray-400">Loading game status...</div>
      </div>
    );
  }

  const queensRequired = gameState.players.length <= 2 ? 5 : 4;
  const scoreRequired = gameState.players.length <= 2 ? 50 : 40;
  const pendingKnightAttack = getPendingKnightAttack();
  const pendingPotionAttack = getPendingPotionAttack();

  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      {/* Left Side - Current Turn Info */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Crown className="h-5 w-5 text-yellow-400" />
          <div>
            <div className="font-medium text-white">
              {currentPlayer?.name || 'Unknown'}'s Turn
            </div>
            <div className="text-sm text-gray-300">
              Turn {gameState.currentPlayerIndex + 1} of {gameState.players.length}
            </div>
          </div>
        </div>

        {/* Your Turn Indicator */}
        {isMyTurn && (
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex items-center space-x-2 bg-green-500/20 text-green-300 px-3 py-1 rounded-full border border-green-500/30"
          >
            <Zap className="h-4 w-4" />
            <span className="text-sm font-medium">Your Turn!</span>
          </motion.div>
        )}

        {/* Defense Status */}
        <DefenseStatus
          pendingKnightAttack={pendingKnightAttack}
          pendingPotionAttack={pendingPotionAttack}
          canPlayDragon={canPlayDragon(currentUserPlayer.id)}
          canPlayWand={canPlayWand(currentUserPlayer.id)}
        />

        {/* Win Progress */}
        <WinProgress
          playerQueens={currentUserPlayer.queens.length}
          playerScore={currentUserPlayer.score}
          queensRequired={queensRequired}
          scoreRequired={scoreRequired}
        />
      </div>

      {/* Center - Game Progress */}
      <div className="flex-1 flex justify-center">
        <GameProgress
          currentPlayerIndex={gameState.currentPlayerIndex}
          totalPlayers={gameState.players.length}
          phase={gameState.phase}
        />
      </div>

      {/* Right Side - Quick Actions */}
      <div className="flex items-center space-x-4">
        <QuickActions
          onCopyRoomCode={handleCopyRoomCode}
          onShowSettings={handleShowSettings}
          roomCode={gameState.roomCode}
        />

        {/* Player Stats */}
        <div className="hidden lg:flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1 text-purple-300">
            <Crown className="h-4 w-4" />
            <span>{currentUserPlayer.queens.length}</span>
          </div>
          <div className="flex items-center space-x-1 text-yellow-300">
            <Trophy className="h-4 w-4" />
            <span>{currentUserPlayer.score}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
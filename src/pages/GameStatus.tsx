import React, { useState, useEffect } from 'react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { MODULE_ADDRESS, MODULE_NAME } from '../App';

const config = new AptosConfig({ network: Network.TESTNET });
const client = new Aptos(config);

interface GameStatusProps {
  gameCreator: string;
}

interface GameState {
  status: string;
  currentPlayer?: string;
  ticketPrice?: string;
  lastMoveTimestamp?: string;
}

export function GameStatus({ gameCreator }: GameStatusProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [canBuy, setCanBuy] = useState(false);

  const fetchGameStatus = async () => {
    setLoading(true);
    setError("");
    try {
      // First get CreatorData to find resource account
      const resources = await client.getAccountResources({
        accountAddress: gameCreator
      });
      const creatorDataType = `${MODULE_ADDRESS}::${MODULE_NAME}::CreatorData`;
      const creatorData = resources.find(r => r.type === creatorDataType);
      
      if (!creatorData) {
        throw new Error("No game found");
      }

      // Get resource account address from CreatorData
      const resourceAddress = (creatorData.data as any).resource_address;
      
      // Get Game data from resource account
      const resourceResources = await client.getAccountResources({
        accountAddress: resourceAddress
      });
      const gameResourceType = `${MODULE_ADDRESS}::${MODULE_NAME}::Game`;
      const game = resourceResources.find(r => r.type === gameResourceType);

      if (!game) {
        throw new Error("No active game found");
      }

      const gameData = game.data as any;
      setGameState({
        status: gameData.started ? "In Progress" : "Waiting to Start",
        currentPlayer: gameData.last_buyer,
        ticketPrice: gameData.ticket_price.toString(),
        lastMoveTimestamp: gameData.timer_end.toString()
      });
      // Only allow buy if game is started and timer is running (not ended)
      const now = Math.floor(Date.now() / 1000);
      const timerEnd = parseInt(gameData.timer_end);
      if (gameData.started && timerEnd > now) {
        setCanBuy(true);
      } else {
        setCanBuy(false);
      }
    } catch (e) {
      console.error("Error fetching game status:", e);
      setError("Failed to fetch game status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGameStatus();
    // Set up polling interval
    const interval = setInterval(fetchGameStatus, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [gameCreator]);

  if (loading && !gameState) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 mt-4">
        <h2 className="text-2xl font-bold mb-4">Game Status</h2>
        <div className="flex justify-center">
          <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 mt-4">
        <h2 className="text-2xl font-bold mb-4">Game Status</h2>
        <div className="bg-red-900/50 text-red-200 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
  <div className="card game-status-bg">
  <h2 className="game-status-title">Game Status</h2>
      {gameState && (
        <div>
          <div className="game-status-grid">
            <div className="game-status-info-box">
              <span className="game-status-label">Status:</span>
              <span className="game-status-value">{gameState.status}</span>
            </div>
            {gameState.currentPlayer && (
              <div className="game-status-info-box">
                <span className="game-status-label">Current Player:</span>
                <span className="game-status-value game-status-player">{gameState.currentPlayer}</span>
              </div>
            )}
            {gameState.ticketPrice && (
              <div className="game-status-info-box">
                <span className="game-status-label">Ticket Price:</span>
                <span className="game-status-value game-status-price">{(parseInt(gameState.ticketPrice) / 100000000).toFixed(8)} APT</span>
              </div>
            )}
            {gameState.lastMoveTimestamp && (
              <div className="game-status-info-box">
                <span className="game-status-label">Last Move:</span>
                <span className="game-status-value">
                  {new Date(parseInt(gameState.lastMoveTimestamp) * 1000).toLocaleString()}
                </span>
              </div>
            )}
          </div>
          <div className="game-status-action">
            <button
              disabled={!canBuy}
              className="button game-status-buy-btn"
            >
              {canBuy ? 'Buy Ticket' : 'Not Available'}
            </button>
            <p className="game-status-desc">
              {canBuy
                ? "Join the game now for a chance to win the pool!"
                : "Ticket purchase is currently unavailable. Please wait for the next round or for the timer to start."
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

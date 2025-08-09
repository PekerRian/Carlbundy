import React, { useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
// ...existing code...
import { BuyTicket } from '../components/BuyTicket';
import { PlayGame } from '../components/PlayGameCard';
import { GameStatus } from './GameStatus';

export function GameContainer() {
  const { account } = useWallet();
  const [gameCreator, setGameCreator] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'create' | 'join' | null>(null);

  const handleGameCreated = (creator: string) => {
    setGameCreator(creator);
    setActiveView('join');
  };

  return (
    <div className="center-container">
      <div className="card">
        {!activeView && (
          <div>
            <button
              onClick={() => setActiveView('create')}
              className="button"
            >
              Create New Game
            </button>
            <button
              onClick={() => setActiveView('join')}
              className="button"
            >
              Join Existing Game
            </button>
          </div>
        )}

        {activeView === 'create' && (
          <div>
            <button
              onClick={() => setActiveView(null)}
              className="button"
              style={{ marginBottom: '1rem', background: '#374151', color: '#fff' }}
            >
              ← Back
            </button>
            {/* Game creation removed */}
          </div>
        )}

        {activeView === 'join' && (
          <div>
            <button
              onClick={() => {
                setActiveView(null);
                setGameCreator(null);
              }}
              className="button"
              style={{ marginBottom: '1rem', background: '#374151', color: '#fff' }}
            >
              ← Back
            </button>
            {!gameCreator && (
              <div className="card">
                <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Join Game</h2>
                <input
                  type="text"
                  placeholder="Enter Game Creator's Address"
                  className="input"
                  onChange={(e) => setGameCreator(e.target.value)}
                />
              </div>
            )}
            {gameCreator && (
              <div>
                <GameStatus gameCreator={gameCreator} />
                <BuyTicket gameCreator={gameCreator} />
                <PlayGame gameCreator={gameCreator} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

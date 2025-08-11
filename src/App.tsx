import React, { useRef, useEffect } from 'react';
import './styles/styles.css';
import './styles/lighting.css';
import './styles/wallet-states.css';
import { Routes, Route } from 'react-router-dom';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
// ...existing code...
import { PlayGame } from './pages/PlayGame';
import { CreateGame } from './pages/CreateGame';
import { WalletStatus } from './components/WalletStatus';
import { Navigation } from './components/Navigation';

// Contract configuration
export const MODULE_ADDRESS = "0x720757d34c77743730715fcf091f456e6840e32a077014d6883983ff7323c3ea";  // Account that published the module
export const MODULE_NAME = "carlbundy9";  
export const GAME_CREATOR = "0x030a49e550317d928495602ea9146550f90ec9808666fa5bd949e8ef9db5ff31";  // Account that created the game instance
const App: React.FC = () => {
  const { connected } = useWallet();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasInteractedRef = useRef(false);

  const playMusic = () => {
    if (audioRef.current && !hasInteractedRef.current) {
      audioRef.current.play();
      hasInteractedRef.current = true;
    }
  };

  useEffect(() => {
    const handleInteraction = () => playMusic();
    
    // Add event listeners for both mouse movement and touch
    document.addEventListener('mousemove', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);

    // Cleanup event listeners
    return () => {
      document.removeEventListener('mousemove', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  return (
    <div className={`text-text-primary app-fixed-bg ${connected ? 'wallet-connected' : 'wallet-disconnected'}`}>
      <audio ref={audioRef} loop>
        <source src="/C.A.R.L..mp3" type="audio/mpeg" />
      </audio>
      {/* Show different overlays based on wallet connection state */}
      {connected ? (
        <>
          <div className="dim-overlay"></div>
          <div className="light-effect"></div>
          <div className="light-beam"></div>
          <div className="noise-overlay"></div>
        </>
      ) : (
        <div className="disconnected-overlay"></div>
      )}
      <div className="wallet-status-fixed">
        <WalletStatus />
      </div>
      <Routes>
        <Route path="/" element={<PlayGame />} />
        <Route path="/create" element={<CreateGame />} />
      </Routes>
    </div>
  );
};

export default App;

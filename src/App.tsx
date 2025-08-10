import React, { useRef, useEffect } from 'react';
import './styles/styles.css';
import './styles/lighting.css';
import './styles/wallet-states.css';
import { Routes, Route } from 'react-router-dom';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
// ...existing code...
import { PlayGame } from './pages/PlayGame';
import { WalletStatus } from './components/WalletStatus';
import { Navigation } from './components/Navigation';

// Contract configuration
export const MODULE_ADDRESS = "0x720757d34c77743730715fcf091f456e6840e32a077014d6883983ff7323c3ea";  // Account that published the module
export const MODULE_NAME = "carlbundy8";  // Module name
export const GAME_CREATOR = "0x986e077e384095494bac3c00864a7541818e1606d9261ee3de6fb01c3ccbf3d5";  // Account that created the game instance
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
      </Routes>
    </div>
  );
};

export default App;

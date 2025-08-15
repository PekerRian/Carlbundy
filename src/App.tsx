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
export const GAME_CREATOR = "0x720757d34c77743730715fcf091f456e6840e32a077014d6883983ff7323c3ea";  // Account that created the game instance
const App: React.FC = () => {
  const { connected } = useWallet();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasInteractedRef = useRef(false);
  const [muted, setMuted] = React.useState(false);

  const playMusic = () => {
    if (audioRef.current && !hasInteractedRef.current) {
      audioRef.current.volume = 0.5;
      audioRef.current.muted = muted;
      audioRef.current.play();
      hasInteractedRef.current = true;
    }
  }

  useEffect(() => {
    const handleInteraction = () => playMusic();
    document.addEventListener('mousemove', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);
    return () => {
      document.removeEventListener('mousemove', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, [muted]);

  // Update mute state when toggled
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = muted;
    }
  }, [muted]);

  const muteBtnStyle: React.CSSProperties = {
    position: 'fixed',
    top: 20,
    right: 20,
    zIndex: 2000,
    background: muted ? '#222' : '#000',
    color: muted ? '#f44' : '#0ff',
    border: `2px solid ${muted ? '#f44' : '#0ff'}`,
    borderRadius: '50%',
    width: 48,
    height: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    fontFamily: 'Analog, monospace',
    boxShadow: muted ? '0 0 10px #f44' : '0 0 10px #0ff',
    cursor: 'pointer',
    transition: 'all 0.3s',
    outline: 'none',
  };

  return (
    <div className={`text-text-primary app-fixed-bg ${connected ? 'wallet-connected' : 'wallet-disconnected'}`}>
      <audio ref={audioRef} loop>
        <source src="/C.A.R.L..mp3" type="audio/mpeg" />
      </audio>
      <button
        style={muteBtnStyle}
        aria-label={muted ? 'Unmute music' : 'Mute music'}
        onClick={() => setMuted((m) => !m)}
      >
        {muted ? <span>&#128263;</span> : <span>&#128266;</span>}
      </button>
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

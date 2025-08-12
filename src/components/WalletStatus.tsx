import React, { useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

export function WalletStatus() {
  const { 
    connected,
    account,
    disconnect,
    connect,
    wallet,
    wallets
  } = useWallet();

  const [showModal, setShowModal] = useState(false);

  // Centered container for connect/disconnect button
  const clockStyle = "wallet-status-container";
  const punchBtnStyle = `futuristic-button connect-btn text-lg font-bold px-8 py-3 wallet-text ${connected ? 'wallet-connected' : 'wallet-disconnected'} transition-all duration-300`;
  const punchOutBtnStyle = `futuristic-button disconnect-btn text-lg font-bold px-8 py-3 wallet-text ${connected ? 'wallet-connected' : 'wallet-disconnected'} transition-all duration-300`;

  const modalStyle = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#000',
    border: '2px solid #0ff',
    padding: '20px',
    boxShadow: '0 0 20px #0ff',
    zIndex: 1000,
    fontFamily: 'Analog, monospace',
    color: '#0ff',
    maxWidth: '90%',
    width: '400px',
    borderRadius: '10px',
    letterSpacing: '2px',
  } as React.CSSProperties;

  const walletButtonStyle = {
    display: 'block',
    width: '100%',
    padding: '10px',
    margin: '5px 0',
    backgroundColor: '#001',
    border: '1px solid #0ff',
    color: '#0ff',
    cursor: 'pointer',
    fontFamily: 'Analog, monospace',
    borderRadius: '5px',
    transition: 'all 0.3s ease',
    letterSpacing: '2px',
    fontSize: '1.1em',
  } as React.CSSProperties;

  const handleConnectClick = () => {
    if (wallets.length === 0) {
      console.error('No wallets available');
      return;
    }
    
    if (wallets.length === 1) {
      connect(wallets[0].name);
    } else {
      setShowModal(true);
    }
  };

  if (!connected) {
    return (
      <>
        <div className={clockStyle}>
          <button
            onClick={handleConnectClick}
            className={punchBtnStyle}
          >
            Connect
          </button>
        </div>

        {showModal && (
          <div style={modalStyle}>
            <h2 style={{ color: '#0ff', marginBottom: '15px', textAlign: 'center' }}>
              Select Wallet
            </h2>
            {wallets.map((w) => (
              <button
                key={w.name}
                style={walletButtonStyle}
                onClick={() => {
                  connect(w.name);
                  setShowModal(false);
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#002';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#001';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {w.name}
              </button>
            ))}
            <button
              style={{
                ...walletButtonStyle,
                borderColor: '#f44',
                color: '#f44',
                marginTop: '15px'
              }}
              onClick={() => setShowModal(false)}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#200';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#001';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className={clockStyle}>
      <button 
        onClick={disconnect}
        className={punchOutBtnStyle}
      >
        Disconnect
      </button>
    </div>
  );
}

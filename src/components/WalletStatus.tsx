import React from 'react';
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

  // Centered container for connect/disconnect button
  const clockStyle = "wallet-status-container";
  const punchBtnStyle = `futuristic-button connect-btn text-lg font-bold px-8 py-3 wallet-text ${connected ? 'wallet-connected' : 'wallet-disconnected'} transition-all duration-300`;
  const punchOutBtnStyle = `futuristic-button disconnect-btn text-lg font-bold px-8 py-3 wallet-text ${connected ? 'wallet-connected' : 'wallet-disconnected'} transition-all duration-300`;

  if (!connected) {
    return (
      <div className={clockStyle}>
        <button
          onClick={() => {
            if (wallets.length > 0) {
              connect(wallets[0].name);
            }
          }}
          className={punchBtnStyle}
        >
          Connect
        </button>
      </div>
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

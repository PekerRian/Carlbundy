import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { PetraWallet } from 'petra-plugin-wallet-adapter';
import { AptosWalletAdapterProvider } from '@aptos-labs/wallet-adapter-react';
import { Network } from '@aptos-labs/ts-sdk';
import App from './App';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Failed to find root element');
}

const root = ReactDOM.createRoot(container);

const wallets = [new PetraWallet()];

root.render(
  <React.StrictMode>
    <AptosWalletAdapterProvider 
      plugins={wallets}
      autoConnect={true}
      dappConfig={{
        network: Network.TESTNET,
      }}
      onError={(error) => {
        console.error("Wallet adapter error:", error);
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AptosWalletAdapterProvider>
  </React.StrictMode>
);

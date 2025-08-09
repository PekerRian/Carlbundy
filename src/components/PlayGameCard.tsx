import React, { useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { MODULE_ADDRESS, MODULE_NAME } from '../App';

const config = new AptosConfig({ network: Network.TESTNET });
const client = new Aptos(config);

interface PlayGameProps {
  gameCreator: string;
}

export function PlayGame({ gameCreator }: PlayGameProps) {
  const { account, signAndSubmitTransaction, wallet, connected, isLoading: walletLoading } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleMove = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!connected || !account) {
      setError("Please connect your wallet first");
      return;
    }

    if (!wallet) {
      setError("No wallet found");
      return;
    }

    if (walletLoading) {
      setError("Wallet is busy. Please wait.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await signAndSubmitTransaction({
        data: {
          function: `${MODULE_ADDRESS}::${MODULE_NAME}::register_move`,
        typeArguments: [],
        functionArguments: [gameCreator]
      });
      
      if (!response?.hash) {
        throw new Error("Transaction failed - no hash returned");
      }

      
      try {
        await client.waitForTransaction({ transactionHash: response.hash });
        setSuccess("Move registered successfully! Transaction hash: " + response.hash);
      } catch (waitError) {
        console.error("Transaction confirmation error:", waitError);
        setError("Transaction was submitted but failed to confirm. Hash: " + response.hash);
      }
    } catch (e) {
      console.error("Register move error:", e);
      let errorMessage = "Failed to register move";
      
      if (e instanceof Error) {
        if (e.message.includes("rejected")) {
          errorMessage = "Transaction rejected by wallet";
        } else if (e.message.includes("user rejected")) {
          errorMessage = "Transaction was rejected by user";
        } else {
          errorMessage = e.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Make Your Move</h2>
      {error && (
        <div className="status-message error" style={{ marginBottom: '1rem' }}>{error}</div>
      )}
      {success && (
        <div className="status-message success" style={{ marginBottom: '1rem' }}>{success}</div>
      )}
      <form onSubmit={handleMove}>
        <button
          type="submit"
          disabled={loading || !connected}
          className="button"
          style={{ width: '100%', padding: '1rem', fontWeight: 'bold', fontSize: '1.1rem', background: '#eab308', color: '#fff' }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg style={{ animation: 'spin 1s linear infinite', height: '20px', width: '20px', marginRight: '12px' }} viewBox="0 0 24 24">
                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Making Move...
            </span>
          ) : 'Make Move'}
        </button>
      </form>
    </div>
  );
}

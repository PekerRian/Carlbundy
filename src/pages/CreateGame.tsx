import React, { useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { MODULE_ADDRESS, MODULE_NAME } from '../App';

const config = new AptosConfig({ network: Network.TESTNET });
const client = new Aptos(config);

export function CreateGame() {
  const { account, signAndSubmitTransaction, connected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ticketPrice, setTicketPrice] = useState('');
  const [initialDeposit, setInitialDeposit] = useState('');

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Create a unique game ID using current timestamp
      const gameId = new Date().getTime().toString();
      const encodedGameId = Array.from(new TextEncoder().encode(gameId));
      
      const response = await signAndSubmitTransaction({
        data: {
          function: `${MODULE_ADDRESS}::${MODULE_NAME}::initialize_game`,
          typeArguments: [],
          functionArguments: [
            Number(ticketPrice) * 100000000, // Convert APT to Octas
            Number(initialDeposit) * 100000000, // Convert APT to Octas
            encodedGameId
          ],
        },
        options: { maxGasAmount: 1000000 },
      });

      if (!response?.hash) throw new Error('Transaction failed - no hash returned');
      await client.waitForTransaction({ transactionHash: response.hash });
      setSuccess('Game created successfully!');
    } catch (e) {
      let errorMessage = 'Failed to create game';
      if (e instanceof Error) {
        if (e.message.includes('insufficient balance')) errorMessage = 'Insufficient balance for initial deposit';
        else if (e.message.includes('rejected')) errorMessage = 'Transaction rejected by wallet';
        else if (e.message.includes('user rejected')) errorMessage = 'Transaction was rejected by user';
        else errorMessage = e.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="center-container">
      <div className="center-content-inner">
        <div className="card max-w-lg mx-auto" style={{ background: 'none' }}>
          <h2 className="text-2xl font-bold mb-4">Create New Game</h2>
          
          {error && (
            <div className="bg-red-900/50 text-red-200 p-4 rounded-lg mb-6 text-center">{error}</div>
          )}
          
          {success && (
            <div className="bg-green-900/50 text-green-200 p-4 rounded-lg mb-6 text-center">{success}</div>
          )}

          <form onSubmit={handleCreateGame} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Ticket Price (APT)</label>
              <input
                type="number"
                step="0.1"
                value={ticketPrice}
                onChange={(e) => setTicketPrice(e.target.value)}
                className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                required
                min="0.1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Initial Deposit (APT)</label>
              <input
                type="number"
                step="0.1"
                value={initialDeposit}
                onChange={(e) => setInitialDeposit(e.target.value)}
                className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                required
                min="0"
              />
            </div>

            <button
              type="submit"
              disabled={!connected || loading}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Game'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

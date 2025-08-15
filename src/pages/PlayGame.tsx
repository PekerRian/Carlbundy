
import React, { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { MODULE_ADDRESS, MODULE_NAME, GAME_CREATOR } from '../App';
import { BuyTicketCard } from '../components/BuyTicketCard';
import { useGameEvents } from '../hooks/useGameEvents';

const config = new AptosConfig({ network: Network.TESTNET });
const client = new Aptos(config);

export function PlayGame() {
  const { account, signAndSubmitTransaction, connected } = useWallet();
  const [gameState, setGameState] = useState({
    isInitialized: false,
    totalDeposit: BigInt(0),
    ticketPrice: BigInt(0),
    timerEnd: BigInt(0),
    started: false,
    lastBuyer: '',
    winner: ''
  });

  // Use the real-time game events hook
    const {
      lastBuyer,
      prizePool,
      timeLeft,
      isGameActive: started,
      winner,
      ticketPrice
    } = useGameEvents(GAME_CREATOR);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch game state
  const fetchGameState = async () => {
    try {
      if (!MODULE_ADDRESS) {
        console.error('Module address is not set');
        return;
      }
      const resources = await client.getAccountResources({ accountAddress: GAME_CREATOR });
      const creatorDataType = `${MODULE_ADDRESS}::${MODULE_NAME}::CreatorData`;
      const creatorData = resources.find(r => r.type === creatorDataType);
      if (!creatorData) throw new Error('Creator data not found');
      const resourceAddress = (creatorData.data as any).resource_address;
      const resourceResources = await client.getAccountResources({ accountAddress: resourceAddress });
      const gameType = `${MODULE_ADDRESS}::${MODULE_NAME}::Game`;
      const gameResource = resourceResources.find(r => r.type === gameType);
      if (!gameResource) throw new Error('Game not found on resource account');
      const data = gameResource.data as any;
      setGameState({
        isInitialized: true,
        totalDeposit: BigInt(data.total_deposit),
        ticketPrice: BigInt(data.ticket_price),
        lastBuyer: data.last_buyer,
        timerEnd: BigInt(data.timer_end),
        started: data.started,
        winner: data.winner || '',
      });
    } catch (e) {
      console.error('Error fetching game state:', e);
      setGameState(prev => ({ ...prev, isInitialized: false }));
      if (e instanceof Error) {
        if (
          e.message.includes('404') ||
          e.message.includes('Game resource not found') ||
          e.message.includes('E_GAME_NOT_INITIALIZED')
        ) {
          setError("No active game found. Please go to the 'Create Game' page to start a new game.");
        } else {
          setError(`Failed to fetch game state: ${e.message}`);
        }
      }
    }
  };

  // Debug logging for state updates
  useEffect(() => {
    console.log('Game State Update:', {
      prizePool,
      timeLeft,
      started,
      lastBuyer,
      winner
    });
  }, [prizePool, timeLeft, started, lastBuyer, winner]);

  // Buy ticket
  const handleBuyTicket = async () => {
    if (!account) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await signAndSubmitTransaction({
        data: {
          function: `${MODULE_ADDRESS}::${MODULE_NAME}::buy_ticket`,
          typeArguments: [],
          functionArguments: [GAME_CREATOR],
        },
        options: { maxGasAmount: 1000000 },
      });
      if (!response?.hash) throw new Error('Transaction failed - no hash returned');
      await client.waitForTransaction({ transactionHash: response.hash });
      setSuccess('Ticket purchased successfully!');
      fetchGameState();
    } catch (e) {
      let errorMessage = 'Failed to buy ticket';
      if (e instanceof Error) {
        if (e.message.includes('insufficient balance')) errorMessage = 'Insufficient balance to buy ticket';
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
          {success && (
            <div className="bg-green-900/50 text-green-200 p-4 rounded-lg mb-6 text-center">{success}</div>
          )}
          <BuyTicketCard
            onBuyTicket={handleBuyTicket}
            isLoading={loading}
            disabled={!connected || loading}
            gameEnded={!started}
            gameStarted={started}
            prizePool={Number(prizePool)}
            ticketPrice={Number(ticketPrice) / 1e8}
            timeLeft={Number(timeLeft)}
            lastBuyer={lastBuyer || ''}
            winner={winner || ''}
          />
        </div>
      </div>
    </div>
  );
}


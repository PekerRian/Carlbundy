import { useEffect, useState } from 'react';
import { 
  Aptos, 
  AptosConfig, 
  Network, 
  InputViewRequestData 
} from '@aptos-labs/ts-sdk';
import { MODULE_ADDRESS, MODULE_NAME } from '../App';

declare global {
  interface ImportMeta {
    env: {
      VITE_APTOS_API_KEY: string;
    };
  }
}

// Initialize Aptos client with default testnet configuration
const config = new AptosConfig({ 
  network: Network.TESTNET 
});

const client = new Aptos(config);

export const useGameEvents = (gameId: string) => {
  const [lastBuyer, setLastBuyer] = useState<string | null>(null);
  const [prizePool, setPrizePool] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isGameActive, setIsGameActive] = useState<boolean>(false);
  const [winner, setWinner] = useState<string | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const fetchEvents = async () => {
      try {
        // First get the resource address
        const result = await client.view({
          payload: {
            function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_resource_address`,
            typeArguments: [],
            functionArguments: [gameId]
          }
        });

        const resourceAccount = result[0] as string;
        if (!resourceAccount) {
          console.error('Resource account not found');
          return;
        }

        // Then get the game state
        const stateResult = await client.view({
          payload: {
            function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_game_state`,
            typeArguments: [],
            functionArguments: [resourceAccount]
          }
        });

        if (stateResult && Array.isArray(stateResult)) {
          const [creator, total_deposit, ticket_price, timer_end, last_buyer, started] = stateResult;
          
          // Convert address to string
          const buyerAddress = (last_buyer as { address: string })?.address || null;
          setLastBuyer(buyerAddress);
          
          // Convert numbers
          setPrizePool(Number(total_deposit));
          
          // Calculate time left
          const currentTime = Math.floor(Date.now() / 1000);
          const timerEndNum = Number(timer_end);
          const timeRemaining = timerEndNum - currentTime;
          setTimeLeft(timeRemaining > 0 ? timeRemaining : 0);
          
          // Convert boolean
          setIsGameActive(Boolean(started));
          
          // If game is not active and we have a last buyer, they might be the winner
          if (!started && buyerAddress && buyerAddress !== gameId) {
            setWinner(buyerAddress);
          }
        }
      } catch (error) {
        console.error('Failed to fetch game state:', error);
      }
    };

    // Poll for events every 5 seconds
    intervalId = setInterval(fetchEvents, 5000);
    fetchEvents(); // Initial fetch

    // Cleanup on unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [gameId]);

  return {
    lastBuyer,
    prizePool,
    timeLeft,
    isGameActive,
    winner
  };
};

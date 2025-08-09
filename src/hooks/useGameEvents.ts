import { useEffect, useState } from 'react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { MODULE_ADDRESS, MODULE_NAME } from '../App';

// Initialize Aptos client
const config = new AptosConfig({ network: Network.MAINNET });
const aptos = new Aptos(config);

export const useGameEvents = (gameId: string) => {
  const [lastBuyer, setLastBuyer] = useState<string | null>(null);
  const [prizePool, setPrizePool] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isGameActive, setIsGameActive] = useState<boolean>(false);
  const [winner, setWinner] = useState<string | null>(null);

  useEffect(() => {
    let eventStream: EventSource | null = null;

    const subscribeToEvents = async () => {
      try {
        // Create event stream for game events
        const eventStreamUrl = await aptos.getEventStream({
          query: {
            addr: MODULE_ADDRESS,
            module: MODULE_NAME,
            eventType: 'GameEvent',
            start: BigInt(Date.now())
          }
        });

        eventStream = new EventSource(eventStreamUrl);

        // Listen for game events
        eventStream.onmessage = (event) => {
          const data = JSON.parse(event.data);
          
          // Handle different event types
          switch (data.type) {
            case 'ticket_purchase':
              setLastBuyer(data.buyer);
              setPrizePool(data.prize_pool);
              setTimeLeft(data.time_left);
              break;
            case 'game_start':
              setIsGameActive(true);
              setTimeLeft(data.duration);
              setPrizePool(0);
              setLastBuyer(null);
              setWinner(null);
              break;
            case 'game_end':
              setIsGameActive(false);
              setWinner(data.winner);
              break;
          }
        };

        // Handle connection errors
        eventStream.onerror = (error) => {
          console.error('EventStream error:', error);
          eventStream?.close();
          // Attempt to reconnect after a delay
          setTimeout(subscribeToEvents, 5000);
        };

      } catch (error) {
        console.error('Failed to subscribe to events:', error);
        // Attempt to reconnect after a delay
        setTimeout(subscribeToEvents, 5000);
      }
    };

    subscribeToEvents();

    // Cleanup on unmount
    return () => {
      if (eventStream) {
        eventStream.close();
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

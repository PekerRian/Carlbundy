import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { 
  Aptos, 
  AptosConfig, 
  Network,
  MoveValue
} from '@aptos-labs/ts-sdk';
import { MODULE_ADDRESS, MODULE_NAME, GAME_CREATOR } from '../App';
import debounce from 'lodash/debounce';

declare global {
  interface ImportMeta {
    env: {
      VITE_APTOS_API_KEY: string;
    };
  }
}

// Cache for resource addresses
const resourceAddressCache = new Map<string, string>();

// Initialize Aptos client with fallback nodes - using only one stable node to avoid rate limits
const FALLBACK_NODES = [
  "https://fullnode.mainnet.aptoslabs.com/v1"
];

let currentNodeIndex = 0;

const createClient = () => {
  const config = new AptosConfig({
    network: Network.MAINNET,
    fullnode: FALLBACK_NODES[currentNodeIndex],
    indexer: 'aptoslabs_iUyyvuxoBw6_PGJFR9c1aQREriFXBZTT1JUPdYX6kDhXV'
  });
  return new Aptos(config);
};

let client = createClient();

interface CreatorResourceData {
  resource_address: string;
  resource_signer_cap: any; // We don't use this in the frontend
}

interface GameResourceData {
  creator: string;
  total_deposit: string;
  ticket_price: string;
  timer_end: string;
  last_buyer: string;
  started: boolean;
  event_handle: any; // We don't use this in the frontend
}

interface GameState {
  lastBuyer: string | null;
  prizePool: number;
  timeLeft: number;
  isGameActive: boolean;
  winner: string | null;
  ticketPrice: number;
  error?: string;
}

export const useGameEvents = (gameId: string) => {
  // Move tryFallbackNode to the top of the hook
  const tryFallbackNode = useCallback(async () => {
    currentNodeIndex = (currentNodeIndex + 1) % FALLBACK_NODES.length;
    console.log(`Switching to fallback node: ${FALLBACK_NODES[currentNodeIndex]}`);
    client = createClient();
  }, []);
  const [gameState, setGameState] = useState<GameState>({
    lastBuyer: null,
    prizePool: 0,
    timeLeft: 0,
    isGameActive: false,
    winner: null,
    ticketPrice: 0
  });
  const [error, setError] = useState<string | null>(null);
  const retryCount = useRef(0);
  const maxRetries = 3;
  const backoffInterval = useRef(5000);
  const timerEndRef = useRef<number>(0); // Store the end time for live updates

  const fetchGameState = useCallback(async () => {
    let attempts = 0;
    const maxAttempts = FALLBACK_NODES.length;

    while (attempts < maxAttempts) {
      try {
        console.log('Fetching game state');
        
        console.log(`Fetching creator data from ${GAME_CREATOR}`);
        const resources = await client.getAccountResources({
          accountAddress: GAME_CREATOR,
        });

        console.log('Found resources:', resources.map(r => r.type));
        
        // First, get the CreatorData to find the resource address
        const creatorData = resources.find(r => 
          r.type === `${MODULE_ADDRESS}::${MODULE_NAME}::CreatorData`
        );
        
        const creatorResource = creatorData?.data as CreatorResourceData;
        if (!creatorResource?.resource_address) {
          throw new Error('Resource address not found in CreatorData');
        }

        const resourceAddress = creatorResource.resource_address;
        console.log(`Found resource address: ${resourceAddress}`);

        // Now get the Game resource from the resource address
        const gameResources = await client.getAccountResources({
          accountAddress: resourceAddress,
        });

        console.log('Found game resources:', gameResources.map(r => r.type));
        
        const gameResource = gameResources.find(r => 
          r.type === `${MODULE_ADDRESS}::${MODULE_NAME}::Game`
        );
        
        if (gameResource?.data) {
          console.log('Game resource found:', gameResource.data);
          const data = gameResource.data as GameResourceData;
          return {
            creator: data.creator,
            total_deposit: data.total_deposit,
            ticket_price: data.ticket_price,
            timer_end: data.timer_end,
            last_buyer: data.last_buyer,
            started: data.started
          };
        }
        throw new Error('Game resource not found at resource address');
      } catch (error) {
        console.error(`Failed to fetch game state (attempt ${attempts + 1}/${maxAttempts}):`, error);
        
        if (attempts < maxAttempts - 1) {
          await tryFallbackNode();
          attempts++;
        } else {
          throw error;
        }
      }
    }
  }, [tryFallbackNode]);

  const processGameState = useCallback((state: any) => {
    try {
      const currentTime = Math.floor(Date.now() / 1000);
      const timerEndNum = Number(state.timer_end);
      const timeRemaining = Math.max(0, timerEndNum - currentTime);
      const buyerAddress = state.last_buyer;

      console.log('Raw Game State:', state);
      
      console.log('Timer Debug:', {
        currentTime,
        timerEndNum,
        timeRemaining,
        started: state.started
      });

      // Update timer end reference for live updates
      timerEndRef.current = timerEndNum;
      
      // Check if game is ended
      const isEnded = state.started && timeRemaining <= 0;
      const isActive = Boolean(state.started) && !isEnded;
      
      const updatedState = {
        lastBuyer: buyerAddress,
        prizePool: Number(state.total_deposit), // Keep as Octas for precision
        timeLeft: timeRemaining,
        isGameActive: isActive,
        winner: (isEnded || !state.started) && buyerAddress && buyerAddress !== gameId ? buyerAddress : null,
        ticketPrice: Number(state.ticket_price) // Keep as Octas for precision
      };

      console.log('Updating game state:', updatedState);
      setGameState(updatedState);

      // Reset error state and retry count on success
      setError(null);
      retryCount.current = 0;
      backoffInterval.current = 5000;
    } catch (error) {
      console.error('Error processing game state:', error, state);
      throw error;
    }

    // Reset error state and retry count on success
    setError(null);
    retryCount.current = 0;
    backoffInterval.current = 5000;
  }, [gameId]);

  const fetchEvents = useCallback(async () => {
    try {
      const state = await fetchGameState();
      if (state) {
        processGameState(state);
      }
    } catch (error) {
      retryCount.current++;
      
      // Check if we hit rate limit
      const isRateLimit = error instanceof Error && error.message.includes('429');
      if (isRateLimit) {
        console.warn('Rate limit hit, waiting longer before retry');
        backoffInterval.current = Math.min(backoffInterval.current * 4, 60000); // Longer backoff for rate limits
      }
      
      if (retryCount.current <= maxRetries) {
        const delay = isRateLimit ? backoffInterval.current : Math.min(backoffInterval.current * 2, 30000);
        console.warn(`Retry attempt ${retryCount.current} in ${delay}ms`);
        
        // Schedule retry
        setTimeout(fetchEvents, delay);
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch game state';
        setError(errorMessage);
        console.error('Game state fetch error:', error);
      }
    }
  }, [fetchGameState, processGameState]);

  // Debounced fetch function to prevent too many calls
  const debouncedFetch = useMemo(
    () => debounce(fetchEvents, 1000, { leading: true, trailing: true }),
    [fetchEvents]
  );

  // Effect for live timer updates
  useEffect(() => {
    let timerInterval: NodeJS.Timeout | null = null;

    const updateTimer = () => {
      if (!gameState.isGameActive || timerEndRef.current <= 0) return;

      const currentTime = Math.floor(Date.now() / 1000);
      const timeLeft = Math.max(0, timerEndRef.current - currentTime);

      setGameState(prev => ({
        ...prev,
        timeLeft,
        isGameActive: timeLeft > 0 && prev.isGameActive
      }));
    };

    if (gameState.isGameActive) {
      timerInterval = setInterval(updateTimer, 1000);
      updateTimer(); // Initial update
    }

    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [gameState.isGameActive]);

  // Effect for polling blockchain state
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    let isPolling = true;

    const pollGameState = async () => {
      if (!isPolling) return;

      try {
        await fetchEvents();
      } catch (error) {
        console.error('Polling error:', error);
      }

      if (isPolling) {
        pollInterval = setTimeout(
          pollGameState,
          gameState.isGameActive ? 5000 : 10000 // Longer intervals to avoid rate limits
        );
      }
    };

    // Start polling
    pollGameState();

    // Cleanup
    return () => {
      isPolling = false;
      if (pollInterval) {
        clearTimeout(pollInterval);
      }
      debouncedFetch.cancel();
    };
  }, [gameState.isGameActive, fetchEvents, debouncedFetch]);

  return {
    ...gameState,
    error,
    isLoading: retryCount.current > 0,
    refetch: debouncedFetch
  };
};

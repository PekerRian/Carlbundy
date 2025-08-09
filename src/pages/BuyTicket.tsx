import React, { useState } from 'react';
// Custom hook to detect mobile view
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 600);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { MODULE_ADDRESS, MODULE_NAME } from '../App';

const config = new AptosConfig({ network: Network.TESTNET });
const client = new Aptos(config);

interface BuyTicketProps {
  gameCreator: string;
}

export function BuyTicket({ gameCreator }: BuyTicketProps) {
  const isMobile = useIsMobile();
  const { account, signAndSubmitTransaction, wallet, connected, isLoading: walletLoading } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isClockTwo, setIsClockTwo] = useState(false);

  const handleBuyTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Don't show errors until they try to interact
    if (!connected || !account) {
      return;
    }

    if (!wallet) {
      return;
    }

    if (walletLoading) {
      setError("Wallet is busy. Please wait.");
      return;
    }

    // Trigger background switch animation
    setIsClockTwo(true);
    setTimeout(() => setIsClockTwo(false), 500);

    setLoading(true);
    setError("");
    try {
      const response = await signAndSubmitTransaction({
        data: {
          function: `${MODULE_ADDRESS}::${MODULE_NAME}::buy_ticket`,
          typeArguments: [],
          functionArguments: [gameCreator]
        },
        options: {
          maxGasAmount: 1000000
        }
      });
      
      if (!response?.hash) {
        throw new Error("Transaction failed - no hash returned");
      }

      
      try {
        await client.waitForTransaction({ transactionHash: response.hash });
        setSuccess("Ticket bought successfully! Transaction hash: " + response.hash);
      } catch (waitError) {
        console.error("Transaction confirmation error:", waitError);
        setError("Transaction was submitted but failed to confirm. Hash: " + response.hash);
      }
    } catch (e) {
      console.error("Buy ticket error:", e);
      let errorMessage = "";
      
      if (e instanceof Error) {
        if (e.message.includes("insufficient balance")) {
          errorMessage = "Insufficient balance to buy ticket";
        } else if (e.message.includes("rejected")) {
          errorMessage = "Transaction rejected by wallet";
        } else if (e.message.includes("user rejected")) {
          errorMessage = "Transaction was rejected by user";
        }
        // Only set specific error messages, no generic fallback
      }
      
      if (errorMessage) {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="buy-ticket-outer">
      <style>{`
        .prize-price-mobile-row {
          gap: 4rem !important;
          display: flex !important;
        }
        @media (max-width: 600px) {
          div.prize-price-mobile-row {
            gap: 2rem !important;
            display: flex !important;
          }
          .prize-price-mobile-row .prize-col {
            transform: translateX(-20%) !important;
            transition: transform 0.2s;
          }
          .prize-price-mobile-row .price-col {
            transform: translateX(20%) !important;
            transition: transform 0.2s;
          }
        }
      `}</style>
  <div className="buy-ticket-card buy-ticket-card-main">
      {/* Common styles for consistent layout */}
  <div className="buy-ticket-card-inner">
  <div className="buy-ticket-content-col">
          {/* First row: Prize and Price as separate boxes on mobile, single box on desktop */}
          {isMobile ? (
            <div className="prize-price-mobile-row prize-price-mobile-row-col">
              <div className="boxa prize-price-nowrap">Prize: 0 APT</div>
              <div className="boxb prize-price-nowrap">Price: 0.1 APT</div>
            </div>
          ) : (
            <div className="white-box prize-price-mobile-row prize-price-mobile-row-row">
              <div className="console-text prize-col prize-price-nowrap prize-col-border">Prize: 0 APT</div>
              <div className="console-text price-col prize-price-nowrap">Price: 0.1 APT</div>
            </div>
          )}

          {/* Second row: Timer */}
          <div className="white-box buy-ticket-timer-box">
            <div className="console-text buy-ticket-timer-label">
              Timer: {"00:00"}
            </div>
          </div>

          {/* Third row: Last Buy/Winner */}
          <div className="white-box buy-ticket-lastbuy-box">
            <div className="console-text buy-ticket-lastbuy-label">
              {connected ? "Last Buy: 0x1234...5678" : "Winner: TBA"}
            </div>
          </div>
          {error && (
            <div className="text-red-200 p-4 rounded-lg text-center buy-ticket-msg-fullwidth">
              {error}
            </div>
          )}
          {success && (
            <div className="text-green-200 p-4 rounded-lg text-center buy-ticket-msg-fullwidth">
              {success}
            </div>
          )}
          {/* Console and Button Section */}
          <div className="white-box buy-ticket-console-box">
            {connected ? (
              <>
                <button
                  onClick={handleBuyTicket}
                  disabled={loading}
                  className={`font-bold transition duration-200 flex items-center justify-center buy-ticket-btn-main ${loading ? 'cursor-not-allowed text-gray-300' : 'scale-[1.02] active:scale-[0.98] text-white'}`}
                >
                  {loading ? (
                    <svg className="animate-spin h-14 w-14" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  )}
                </button>
                <div className="console-text buy-ticket-console-label">
                  Console: taking attendance
                </div>
              </>
            ) : (
              <>
                <button
                  className="font-bold cursor-not-allowed text-gray-300 flex items-center justify-center buy-ticket-btn-main buy-ticket-btn-disabled"
                  disabled
                >
                  <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0h-2m4-6l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                </button>
                <div className="console-text buy-ticket-console-label-disabled">
                  Console: no work today
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

import React, { useState, useRef } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { MODULE_ADDRESS, MODULE_NAME, GAME_CREATOR } from '../App';




interface BuyTicketCardProps {
  isClockTwo?: boolean;
  success?: string;
  onBuyTicket: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  loading?: boolean;
  gameStarted?: boolean;
  gameEnded?: boolean;
  prizePool?: number;
  ticketPrice?: number;
  timeLeft?: number;
  lastBuyer?: string;
  winner?: string;
}

export function BuyTicketCard({
  isClockTwo,
  success,
  onBuyTicket,
  disabled,
  isLoading,
  loading,
  gameStarted,
  gameEnded,
  prizePool,
  ticketPrice,
  timeLeft,
  lastBuyer,
  winner
}: BuyTicketCardProps) {
  const { connected } = useWallet();
  // Format address: first 10 and last 4 characters
  const formatAddress = (addr?: string) => {
    if (!addr) return 'N/A';
    if (addr.length <= 20) return addr;
    return `${addr.slice(0, 10)}..................${addr.slice(-10)}`;
  };
  // Format timeLeft as MM:SS
  const formatTime = (seconds?: number) => {
    const mins = Math.floor((seconds ?? 0) / 60);
    const secs = Math.floor((seconds ?? 0) % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const audioRef = useRef<HTMLAudioElement>(null);

  const handleClick = () => {
    if (audioRef.current) {
      audioRef.current.play();
    }
    onBuyTicket();
  };

  return (
    <div className="buy-ticket-wrapper">
      <audio ref={audioRef} src="/click.mp3" />
      <button
        onClick={handleClick}
        className={`button buy-ticket-btn wallet-text ${connected ? 'wallet-connected-bright' : 'wallet-disconnected'}`}
        disabled={disabled || isLoading}
      >
        {loading ? (
          <span className="buy-ticket-btn-loading">
            <svg className="buy-ticket-btn-spinner" viewBox="0 0 24 24">
              <circle className="buy-ticket-btn-spinner-bg" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="buy-ticket-btn-spinner-fg" fill="currentColor" d="M4 12a8 8 0 008-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="buy-ticket-btn-label-processing">Processing</span>
          </span>
        ) : (
          <span className="buy-ticket-btn-label">
            <svg className="buy-ticket-btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            <span>Buy</span>
          </span>
        )}
      </button>
      <div className="center-container">
        <div className="buy-ticket-outer-container">
          <div className="buy-ticket-container">
            {/* 3 boxes above the buy button and textbox */}
            <div className="buy-ticket-top-boxes">
              <div className="buy-ticket-box-row">
                <div className="buy-ticket-box">Prize Pool: {prizePool ?? 0} APT</div>
                <div className="buy-ticket-box">Ticket Price: {ticketPrice ?? 0} APT</div>
              </div>
              <div className="buy-ticket-box buy-ticket-timer-text">Timer: {formatTime(timeLeft)}</div>
              <div className="buy-ticket-box">
                {gameStarted && !gameEnded
                  ? `Last Buy: ${formatAddress(lastBuyer)}`
                  : `Winner: ${formatAddress(winner)}`}
              </div>
            </div>
            {/* Status message */}
            {success && (
              <div className="status-message success">
                <span className="buy-ticket-status-label">
                  <svg className="buy-ticket-status-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {success}
                </span>
              </div>
            )}
            {/* Buy button and text box row */}
            <div className="buy-ticket-row">
              {/* Text box beside the button */}
              <div className="white-box buy-ticket-sidebox">
                <span className="glow-fade-text buy-ticket-sidebox-label">
                  {gameStarted && !gameEnded
                    ? 'CONSOLE:\nCLOCKING IN'
                    : 'CONSOLE:\nNO WORK TODAY'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

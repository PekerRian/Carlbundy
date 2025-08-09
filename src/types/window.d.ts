interface Window {
  aptos?: {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): Promise<boolean>;
    account(): Promise<string>;
  };
}

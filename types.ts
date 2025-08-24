// Global types for the application

export interface IndexListEntry {
  id: number;
  name: string;
  symbol: string;
  description?: string;
  price?: number;
  change?: number;
  volume?: number;
  marketCap?: number;
  ticker?: string;
}

export interface VaultInfo {
  id: string;
  name: string;
  symbol: string;
  balance: number;
  value: number;
}

export interface NetworkInfo {
  id: string;
  name: string;
  chainId: number;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export interface UserProfile {
  address: string;
  ens?: string;
  avatar?: string;
  isWhitelisted: boolean;
  isAdmin: boolean;
}

// Add more types as needed
export type ComponentProps<T = {}> = T & {
  className?: string;
  children?: React.ReactNode;
};

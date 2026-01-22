import { Project } from "@/types/index";
import type { Vault } from "./types/vault";

export type VaultInfo = {
  id: string;
  name: string;
  icon: string;
  token: string;
  tokenIcon: string;
  totalSupply: string;
  totalSupplyUsd: string;
  instantApy: string;
  vaultApy: string;
  curator: string;
  curatorIcon: string;
  collateral: string[]; // Array of strings (icons)
  rewards: string;
  performanceFee: string;
};





export const projects: Project[] = [
  {
    id: 1,
    projectId: "symmio",
    name: "Symmio",
    description:
      "",
    icon: "aragon",
  },
  {
    id: 2,
    projectId: "TBD",
    name: "TBD Index",
    description:
      "TBD Index is a leading onchain index provider, enabling index providers to launch liquidity in minutes.",
    icon: "brahma",
  },
];

export interface VaultAllocation {
  id: string;
  percentage: string;
  vaultSupply: {
    amount: string;
    usdValue: string;
  };
  collateral: {
    name: string;
    icon?: string; // For the colored circle icons
  };
  liquidationLTV: string;
  netAPY: string;
  oracle?: string;
  supplyCap?: string;
  capPercentage?: string;
  supplyAPY?: string;
  rewards?: string;
  totalCollateral?: string;
  utilization?: string;
  rateAtUTarget?: string;
  marketId?: string;
}

export interface VaultAsset {
  id: number;
  ticker: string;
  listing: string;
  assetname: string;
  sector: string;
  market_cap: number;
  weights: number;
}

export type ReAllocation = {
  id: string;
  timestamp: string;
  user: string;
  hash: string;
  amount: number;
  currency: string;
  type: "Withdraw" | "Supply";
  market: string;
  letv?: number;
};

export type SupplyPosition = {
  id: string;
  indexName?: string;
  user: string;
  supply: string;
  supplyValueUSD: string;
  currency: string;
  share: number;
};


export type Activity = {
  id: string;
  dateTime: string;
  wallet: string;
  hash: string;
  transactionType: string;
  amount: {
    amount: number;
    currency: string;
    amountSummary: string;
  };
};
export const transactionTypes = [
  {
    id: "all",
    name: "All transaction types",
  },
  {
    id: "mint",
    name: "Index Mint",
  },
  {
    id: "collateral_deposit",
    name: "Collateral Deposit",
  },
  {
    id: "index_deposit",
    name: "Index deposit",
  },
  {
    id: "burn",
    name: "Index Burn",
  },
  {
    id: "bridge",
    name: "Index Bridge",
  },
  {
    id: "redeem",
    name: "Collateral Redeem",
  },
];


export const mockup_vaults = [
  {
    id: "1",
    name: "Symmio Index",
    icon: "",
    token: {
      symbol: "USDC",
      icon: "/logos/usd-coin.png",
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    },
    guardianAddress: "0x0000000000000000000000000000000000000000"
  }
];

// Base tokens - index tokens are now fetched from API
export const TOKEN_LIST = [
  {
    symbol: 'ETH',
    type: 'native',
    decimals: 18,
  },
  {
    symbol: 'USDC',
    type: 'erc20',
    address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    decimals: 6,
  },
];

export const TOKEN_METADATA: {
  [chainId: string]: { [key: string]: { address?: string; decimals: number; type: 'native' | 'erc20' } };
} = {
  "0xa4b1": {
    // Arbitrum One
    USDC: {
      type: 'erc20',
      address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC on Arbitrum
      decimals: 6,
    },
  },
  "0x6A11E3D": {
    // Custom Orbit Chain (111222333 decimal)
    USDC: {
      type: 'erc20',
      address: '0xE1AccDbE71393F582CD86a6F04872ed341B499e9', // Wrapped USDC on Orbit
      decimals: 6,
    },
  },
  "0x1": {
    // Ethereum mainnet
    // ETH: {
    //   type: 'native',
    //   decimals: 18,
    // },
    USDC: {
      type: 'erc20',
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC on Ethereum
      decimals: 6,
    },
    // USDT: {
    //   type: 'erc20',
    //   address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT on Ethereum
    //   decimals: 6,
    // },
  },
  '0x2105': {
    // Base mainnet - index tokens are now fetched from API
    USDC: {
      type: 'erc20',
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
      decimals: 6,
    },
  },
};

// ABI for ERC-20 balanceOf function
export const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
];
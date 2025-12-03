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

export const vaults: VaultInfo[] = [
  {
    id: "relend-eth",
    name: "Relend ETH",
    icon: "🟠",
    token: "ETH",
    tokenIcon: "🟠",
    totalSupply: "1.28 WETH",
    totalSupplyUsd: "$2080.80",
    instantApy: "5.38%",
    vaultApy: "5.38%",
    curator: "B.Protocol",
    curatorIcon: "⚡️",
    collateral: ["🔵", "🟣", "🟠"],
    rewards: "+1.16%",
    performanceFee: "0%",
  },
  {
    id: "mev-usdc",
    name: "MEV Capital Usual USDC",
    icon: "🔵",
    token: "USDC",
    tokenIcon: "🔵",
    totalSupply: "322,956,538.41 USDC",
    totalSupplyUsd: "$322.87M",
    instantApy: "6.41%",
    vaultApy: "5.25%",
    curator: "MEV Capital",
    curatorIcon: "⚡️",
    collateral: ["🟢", "🔴", "🔵", "+13"],
    rewards: "+1.16%",
    performanceFee: "10%",
  },
  {
    id: "spark-dai-1",
    name: "Steakhouse USDC",
    icon: "🔵",
    token: "USDC",
    tokenIcon: "🔵",
    totalSupply: "113,948,063.12 USDC",
    totalSupplyUsd: "$113.94M",
    instantApy: "6.78%",
    vaultApy: "5.36%",
    curator: "Steakhouse Financial",
    curatorIcon: "🥩",
    collateral: ["🟡", "🔵", "🟢", "+7"],
    rewards: "+1.16%",
    performanceFee: "5%",
  },
  {
    id: "spark-dai-2",
    name: "Smokehouse USDC",
    icon: "🔵",
    token: "USDC",
    tokenIcon: "🔵",
    totalSupply: "104,908,784.12 USDC",
    totalSupplyUsd: "$104.87M",
    instantApy: "5.76%",
    vaultApy: "4.60%",
    curator: "Steakhouse Financial",
    curatorIcon: "🥩",
    collateral: ["🟡", "🔵", "🟢"],
    rewards: "+1.16%",
    performanceFee: "5%",
  },
  {
    id: "spark-dai-3",
    name: "Steakhouse RUSD",
    icon: "🟠",
    token: "rUSD",
    tokenIcon: "🟠",
    totalSupply: "89,888,265.90 rUSD",
    totalSupplyUsd: "$89.86M",
    instantApy: "7.19%",
    vaultApy: "6.03%",
    curator: "Steakhouse Financial",
    curatorIcon: "🥩",
    collateral: ["🟡", "🔵", "🟢"],
    rewards: "+1.16%",
    performanceFee: "5%",
  },
  {
    id: "spark-dai-4",
    name: "Gauntlet USDC Core",
    icon: "🔵",
    token: "USDC",
    tokenIcon: "🔵",
    totalSupply: "83,017,026.08 USDC",
    totalSupplyUsd: "$82.96M",
    instantApy: "5.69%",
    vaultApy: "5.12%",
    curator: "Gauntlet",
    curatorIcon: "🛡️",
    collateral: ["🟡", "🔵", "🟢", "+9"],
    rewards: "+1.16%",
    performanceFee: "10%",
  },
  {
    id: "mev-usdc-1",
    name: "Hakutora USDC",
    icon: "🔵",
    token: "USDC",
    tokenIcon: "🔵",
    totalSupply: "52,719,107.98 USDC",
    totalSupplyUsd: "$52.71M",
    instantApy: "5.34%",
    vaultApy: "4.27%",
    curator: "Hakutora",
    curatorIcon: "🐯",
    collateral: ["🟢", "🔵", "🟣"],
    rewards: "+1.16%",
    performanceFee: "0%",
  },
  {
    id: "mev-usdc-2",
    name: "Gauntlet WETH Prime",
    icon: "🟣",
    token: "WETH",
    tokenIcon: "🟣",
    totalSupply: "29,157.98 WETH",
    totalSupplyUsd: "$83.82M",
    instantApy: "3.76%",
    vaultApy: "2.89%",
    curator: "Gauntlet",
    curatorIcon: "🛡️",
    collateral: ["🟡", "🔵", "🟢", "+9"],
    rewards: "+1.16%",
    performanceFee: "10%",
  },
  {
    id: "mev-usdc-3",
    name: "Steakhouse USDT",
    icon: "🟢",
    token: "USDT",
    tokenIcon: "🟢",
    totalSupply: "52,453,172.01 USDT",
    totalSupplyUsd: "$52.45M",
    instantApy: "4.74%",
    vaultApy: "3.36%",
    curator: "Steakhouse Financial",
    curatorIcon: "🥩",
    collateral: ["🟡", "🔵"],
    rewards: "+1.16%",
    performanceFee: "5%",
  },
  {
    id: "mev-usdc-5",
    name: "Gauntlet LBTC Core",
    icon: "🟡",
    token: "LBTC",
    tokenIcon: "🟡",
    totalSupply: "589.45 LBTC",
    totalSupplyUsd: "$32.80M",
    instantApy: "3.58%",
    vaultApy: "1.92%",
    curator: "Gauntlet",
    curatorIcon: "🛡️",
    collateral: ["🟡", "🔵", "🟢"],
    rewards: "+1.16%",
    performanceFee: "10%",
  },
];

export const mockup_vaults: Vault[] = [
  {
    id: "relend-eth",
    name: "Relend ETH",
    description:
      "The Spark DAI 1 vault curated by SparkDAO is intended to seamlessly allocate DAI liquidity from Maker to IndexMaker markets.",
    icon: "https://cdn.indexmaker.org/assets/logos/eth.svg",
    token: {
      symbol: "ETH",
      icon: "https://cdn.indexmaker.org/assets/logos/eth.svg",
      address: "0x6b175474e89094c44da98b954eedeac495271d0f",
    },
    curator: {
      name: "B.protocol",
      icon: "https://cdn.indexmaker.org/v2/assets/images/bprotocol.png",
      url: "https://spark.fi",
    },
    totalSupply: {
      amount: "525.00M DAI",
      usdValue: "$526.24M",
    },
    instantApy: "5.25%",
    performanceFee: "0%",
    vaultAddress: "0x73e6...ed9D",
    guardianAddress: "0x0000...0000",
    liquidity: {
      amount: "163.35M DAI",
      usdValue: "$163.74M",
    },
    collateral: ["🔵", "🟣", "🟠", "🟢", "🔴", "🔵", "+13"],
    documents: [
      {
        id: "whitepaper",
        name: "Technical details about the Spark DAI vault",
        url: "#",
        description: "Coming in v0.8",
      },
      {
        id: "audit",
        name: "Security Audit",
        url: "#",
        description: "Security audit report by ChainSecurity",
      },
    ],
  },
  {
    id: "mev-usdc",
    name: "MEV Capital Usual USDC",
    description:
      "MEV Capital's USDC vault optimizes yield through strategic market positioning and MEV capture techniques.",
    icon: "https://cdn.indexmaker.org/v2/assets/images/usual.svg",
    token: {
      symbol: "USDC",
      icon: "https://cdn.indexmaker.org/assets/logos/usdc.svg",
      address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    },
    curator: {
      name: "MEV Capital",
      icon: "https://cdn.indexmaker.org/v2/assets/images/mevcapital.png",
      url: "https://mev.capital",
    },
    totalSupply: {
      amount: "244.19M USDC",
      usdValue: "$244.13M",
    },
    instantApy: "8.45%",
    performanceFee: "2%",
    vaultAddress: "0x8a43...b721",
    guardianAddress: "0x9f72...e451",
    liquidity: {
      amount: "198.35M USDC",
      usdValue: "$198.31M",
    },
    collateral: ["🔵", "🟣", "🟠", "🟢", "🔴", "🔵", "+13"],
    documents: [
      {
        id: "whitepaper",
        name: "Whitepaper",
        url: "#",
        description: "Technical details about the MEV Capital USDC vault",
      },
    ],
  },
];



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
  {
    symbol: 'SYDF',
    type: 'erc20',
    address: '0xcdce4c5ffd9cd0025d536dbc69a12cf7ada82193', 
    decimals: 18,
  },
  {
    symbol: 'SYME',
    type: 'erc20',
    address: '0xbab03330d8b41b20eb540b6361ab30b59d8ee849', 
    decimals: 18,
  },
  {
    symbol: 'SYAI',
    type: 'erc20',
    address: '0x700892f09f8f8589ff3e69341b806adb06bb67fd', 
    decimals: 18,
  },
  {
    symbol: 'SYL2',
    type: 'erc20',
    address: '0x0cee77782fa57cfb66403c94c08e2e3e376dc388', 
    decimals: 18,
  },
  {
    symbol: 'SYAZ',
    type: 'erc20',
    address: '0x8a8cf8860f97d007fcf46ed790df794e008b3ce8', 
    decimals: 18,
  },
  {
    symbol: 'SY100',
    type: 'erc20',
    address: '0x1a64a446e31f19172c6eb3197a1e85ff664af380', 
    decimals: 18,
  },
];

export const TOKEN_METADATA: {
  [chainId: string]: { [key: string]: { address?: string; decimals: number; type: 'native' | 'erc20' } };
} = {
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
    // Base mainnet
    // ETH: {
    //   type: 'native',
    //   decimals: 18,
    // },
    USDC: {
      type: 'erc20',
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
      decimals: 6,
    },
    SYDF: {
      type: 'erc20',
      address: '0xcdce4c5ffd9cd0025d536dbc69a12cf7ada82193', 
      decimals: 18,
    },
    SYME: {
      type: 'erc20',
      address: '0xbab03330d8b41b20eb540b6361ab30b59d8ee849', 
      decimals: 18,
    },
    SYAI: {
      type: 'erc20',
      address: '0x700892f09f8f8589ff3e69341b806adb06bb67fd', 
      decimals: 18,
    },
    SYL2: {
      type: 'erc20',
      address: '0x0cee77782fa57cfb66403c94c08e2e3e376dc388', 
      decimals: 18,
    },
    SYAZ: {
      type: 'erc20',
      address: '0x8a8cf8860f97d007fcf46ed790df794e008b3ce8', 
      decimals: 18,
    },
    SY100: {      
      type: 'erc20',
      address: '0x1a64a446e31f19172c6eb3197a1e85ff664af380', 
      decimals: 18,
    },
    // USDT: {
    //   type: 'erc20',
    //   address: ' 0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', // USDT on Base (verify this address)
    //   decimals: 6,
    // },
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
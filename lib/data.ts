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
        name: "Technical details about the Spark DAI vaultTechnical details about the Spark DAI vaultTechnical details about the Spark DAI vaultTechnical details about the Spark DAI vaultTechnical details about the Spark DAI vaultTechnical details about the Spark DAI vault",
        url: "#",
        description: "Technical details about the Spark DAI vault",
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
    name: "Symmio Index",
    description:
      "Building full-stack onchain juridiction, enabling index providers to launch liquidity in minutes.",
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

export const vaultAllocations: VaultAllocation[] = [
  {
    id: "1",
    percentage: "46.12%",
    vaultSupply: {
      amount: "242,198,468.99 DAI",
      usdValue: "$242.1M",
    },
    collateral: {
      name: "PT-sUSDe-27MAR2025",
      icon: "green",
    },
    liquidationLTV: "91.5%",
    netAPY: "5.11%",
    oracle: "Chainlink",
    supplyCap: "500,000,000 DAI",
    capPercentage: "48.4%",
    supplyAPY: "5.25%",
    rewards: "None",
    totalCollateral: "264,698,874 PT-sUSDe",
    utilization: "91.5%",
    rateAtUTarget: "5.2%",
    marketId: "0x7a3e...e45d",
  },
  {
    id: "2",
    percentage: "22.48%",
    vaultSupply: {
      amount: "118,064,884.77 DAI",
      usdValue: "$118.01M",
    },
    collateral: {
      name: "PT-sUSDe-29MAY2025",
      icon: "green",
    },
    liquidationLTV: "91.5%",
    netAPY: "5.67%",
    oracle: "Chainlink",
    supplyCap: "200,000,000 DAI",
    capPercentage: "59.0%",
    supplyAPY: "5.80%",
    rewards: "None",
    totalCollateral: "129,032,660 PT-sUSDe",
    utilization: "91.5%",
    rateAtUTarget: "5.7%",
    marketId: "0x8b2c...f32a",
  },
  {
    id: "3",
    percentage: "9.52%",
    vaultSupply: {
      amount: "50,000,376.01 DAI",
      usdValue: "$49.98M",
    },
    collateral: {
      name: "PT-sUSDe-29MAY2025",
      icon: "yellow",
    },
    liquidationLTV: "91.5%",
    netAPY: "0.74%",
    oracle: "Chainlink",
    supplyCap: "100,000,000 DAI",
    capPercentage: "50.0%",
    supplyAPY: "0.85%",
    rewards: "None",
    totalCollateral: "54,644,127 PT-sUSDe",
    utilization: "91.5%",
    rateAtUTarget: "0.8%",
    marketId: "0x9c3d...a21b",
  },
  {
    id: "4",
    percentage: "7.38%",
    vaultSupply: {
      amount: "38,783,433.16 DAI",
      usdValue: "$38.78M",
    },
    collateral: {
      name: "PT-USDe-27MAR2025",
      icon: "yellow",
    },
    liquidationLTV: "91.5%",
    netAPY: "4.88%",
    oracle: "Chainlink",
    supplyCap: "100,000,000 DAI",
    capPercentage: "38.8%",
    supplyAPY: "5.00%",
    rewards: "None",
    totalCollateral: "42,386,266 PT-USDe",
    utilization: "91.5%",
    rateAtUTarget: "4.9%",
    marketId: "0x6d4e...b78c",
  },
  {
    id: "5",
    percentage: "4.94%",
    vaultSupply: {
      amount: "25,966,814.51 DAI",
      usdValue: "$25.95M",
    },
    collateral: {
      name: "0x000...00",
      icon: "gray",
    },
    liquidationLTV: "0%",
    netAPY: "0.00%",
    oracle: "None",
    supplyCap: "50,000,000 DAI",
    capPercentage: "51.9%",
    supplyAPY: "0.00%",
    rewards: "None",
    totalCollateral: "0",
    utilization: "0%",
    rateAtUTarget: "0.0%",
    marketId: "0x000...000",
  },
  {
    id: "6",
    percentage: "2.91%",
    vaultSupply: {
      amount: "15,306,285.73 DAI",
      usdValue: "$15.3M",
    },
    collateral: {
      name: "USDe",
      icon: "gray",
    },
    liquidationLTV: "86%",
    netAPY: "7.52%",
    oracle: "Chainlink",
    supplyCap: "30,000,000 DAI",
    capPercentage: "51.0%",
    supplyAPY: "7.65%",
    rewards: "None",
    totalCollateral: "17,798,007 USDe",
    utilization: "86%",
    rateAtUTarget: "7.5%",
    marketId: "0x3f2a...c45e",
  },
  {
    id: "7",
    percentage: "2.58%",
    vaultSupply: {
      amount: "13,575,735.31 DAI",
      usdValue: "$13.57M",
    },
    collateral: {
      name: "sUSDe",
      icon: "green",
    },
    liquidationLTV: "86%",
    netAPY: "4.72%",
    oracle: "Chainlink",
    supplyCap: "30,000,000 DAI",
    capPercentage: "45.3%",
    supplyAPY: "4.85%",
    rewards: "None",
    totalCollateral: "15,786,901 sUSDe",
    utilization: "86%",
    rateAtUTarget: "4.8%",
    marketId: "0x2e7b...a93d",
  },
  {
    id: "8",
    percentage: "1.9%",
    vaultSupply: {
      amount: "10,000,000.00 DAI",
      usdValue: "$9.99M",
    },
    collateral: {
      name: "PT-USDe-31JUL2025",
      icon: "yellow",
    },
    liquidationLTV: "91.5%",
    netAPY: "0.00%",
    oracle: "Chainlink",
    supplyCap: "20,000,000 DAI",
    capPercentage: "50.0%",
    supplyAPY: "0.00%",
    rewards: "None",
    totalCollateral: "10,928,962 PT-USDe",
    utilization: "91.5%",
    rateAtUTarget: "0.0%",
    marketId: "0x4a1c...e72f",
  },
  {
    id: "9",
    percentage: "1.87%",
    vaultSupply: {
      amount: "9,827,894.31 DAI",
      usdValue: "$9.82M",
    },
    collateral: {
      name: "sUSDe",
      icon: "green",
    },
    liquidationLTV: "91.5%",
    netAPY: "5.48%",
    oracle: "Chainlink",
    supplyCap: "20,000,000 DAI",
    capPercentage: "49.1%",
    supplyAPY: "5.60%",
    rewards: "None",
    totalCollateral: "10,740,868 sUSDe",
    utilization: "91.5%",
    rateAtUTarget: "5.5%",
    marketId: "0x5b3a...f12d",
  },
  {
    id: "10",
    percentage: "0.22%",
    vaultSupply: {
      amount: "1,188,638.93 DAI",
      usdValue: "$1.18M",
    },
    collateral: {
      name: "USDe",
      icon: "gray",
    },
    liquidationLTV: "91.5%",
    netAPY: "4.88%",
    oracle: "Chainlink",
    supplyCap: "10,000,000 DAI",
    capPercentage: "11.9%",
    supplyAPY: "5.00%",
    rewards: "None",
    totalCollateral: "1,298,512 USDe",
    utilization: "91.5%",
    rateAtUTarget: "4.9%",
    marketId: "0x7c2d...a45e",
  },
  {
    id: "11",
    percentage: "0.01%",
    vaultSupply: {
      amount: "83,076.39 DAI",
      usdValue: "$83.05K",
    },
    collateral: {
      name: "USDe",
      icon: "gray",
    },
    liquidationLTV: "77%",
    netAPY: "7.96%",
    oracle: "Chainlink",
    supplyCap: "1,000,000 DAI",
    capPercentage: "8.3%",
    supplyAPY: "8.10%",
    rewards: "None",
    totalCollateral: "107,891 USDe",
    utilization: "77%",
    rateAtUTarget: "8.0%",
    marketId: "0x8e1f...b23a",
  },
];

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

export const reallocations: ReAllocation[] = [
  {
    id: "tx-1",
    timestamp: "2 days ago",
    user: "0x298b...dFb5",
    hash: "0xfb33...31ca",
    amount: 7072894.47,
    currency: "DM",
    type: "Withdraw",
    market: "🌬️ IT+USDE-29MAY2025 / DM",
    letv: 91.5,
  },
  {
    id: "tx-2",
    timestamp: "2 days ago",
    user: "0x298b...dFb5",
    hash: "0xfb33...31ca",
    amount: 10060000.0,
    currency: "DM",
    type: "Supply",
    market: "🌬️ IT+USDe-31UA2025 / DM",
    letv: 91.5,
  },
  {
    id: "tx-3",
    timestamp: "2 days ago",
    user: "0x298b...dFb5",
    hash: "0xfb33...31ca",
    amount: 293085.97,
    currency: "DM",
    type: "Withdraw",
    market: "🌬️ USDe / DM",
    letv: 89.85,
  },
  {
    id: "tx-4",
    timestamp: "2 days ago",
    user: "0x298b...dFb5",
    hash: "0xfb33...31ca",
    amount: 37970287.26,
    currency: "DM",
    type: "Withdraw",
    market: "🌬️ IT+USDe-27MA20225 / DM",
    letv: 91.5,
  },
  {
    id: "tx-5",
    timestamp: "2 days ago",
    user: "0x298b...dFb5",
    hash: "0xfb33...31ca",
    amount: 1008372.67,
    currency: "DM",
    type: "Withdraw",
    market: "🌬️ USDe / DM",
    letv: 91.5,
  },
  {
    id: "tx-6",
    timestamp: "2 days ago",
    user: "0x298b...dFb5",
    hash: "0xfb33...31ca",
    amount: 50000000.0,
    currency: "DM",
    type: "Supply",
    market: "🌬️ IT+USDE-28MAY2025 / DM",
    letv: 91.5,
  },
  {
    id: "tx-7",
    timestamp: "2 days ago",
    user: "0x298b...dFb5",
    hash: "0xfb33...31ca",
    amount: 24752838.05,
    currency: "DM",
    type: "Withdraw",
    market: "🌬️ UGLI / DM",
    letv: 90,
  },
  {
    id: "tx-8",
    timestamp: "2 days ago",
    user: "0x298b...dFb5",
    hash: "0xfb33...31ca",
    amount: 475978.81,
    currency: "DM",
    type: "Withdraw",
    market: "🌬️ USDe / DM",
    letv: 91.5,
  },
  {
    id: "tx-9",
    timestamp: "2 days ago",
    user: "0x298b...dFb5",
    hash: "0xfb33...31ca",
    amount: 40975054.48,
    currency: "DM",
    type: "Withdraw",
    market: "🌬️ IT+USDE-27MA20225 / DM",
    letv: 91.5,
  },
  {
    id: "tx-10",
    timestamp: "2 days ago",
    user: "0x298b...dFb5",
    hash: "0xfb33...31ca",
    amount: 51077925.31,
    currency: "DM",
    type: "Supply",
    market: "🌬️ UGLI / DM",
    letv: 90,
  },
];

export type SupplyPosition = {
  id: string;
  indexName?: string;
  user: string;
  supply: string;
  supplyValueUSD: string;
  currency: string;
  share: number;
};

export const supplyPositions: SupplyPosition[] = [
  {
    id: "1",
    user: "0x298b...dFb5",
    supply: "525,078,765.05",
    supplyValueUSD: "$524.98M",
    currency: "DAI",
    share: 100,
  },
];

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
export const userActivities: Activity[] = [
  {
    id: "1",
    dateTime: "2 hours ago",
    wallet: "0x8fA2...3bC1",
    hash: "0x4a2d...9e1f",
    transactionType: "mint",
    amount: {
      amount: 12450.82,
      currency: "DAI",
      amountSummary: "$12.45k"
    }
  },
  {
    id: "2",
    dateTime: "1 day ago",
    wallet: "0x3Ee7...9dF2",
    hash: "0x7b3c...2a4d",
    transactionType: "collateral_deposit",
    amount: {
      amount: 87500.0,
      currency: "ETH",
      amountSummary: "$262.5k"
    }
  },
  {
    id: "3",
    dateTime: "3 days ago",
    wallet: "0x1B34...7eE5",
    hash: "0x9e2a...3b7c",
    transactionType: "index_deposit",
    amount: {
      amount: 42180.15,
      currency: "DAI",
      amountSummary: "$42.18k"
    }
  },
  {
    id: "4",
    dateTime: "1 week ago",
    wallet: "0x5D92...1fA3",
    hash: "0x3c4d...8e9f",
    transactionType: "burn",
    amount: {
      amount: 15600.75,
      currency: "USDC",
      amountSummary: "$15.6k"
    }
  },
  {
    id: "5",
    dateTime: "2 weeks ago",
    wallet: "0x7Ee1...4bC9",
    hash: "0x1a2b...3c4d",
    transactionType: "bridge",
    amount: {
      amount: 32800.0,
      currency: "DAI",
      amountSummary: "$32.8k"
    }
  },
  {
    id: "6",
    dateTime: "3 weeks ago",
    wallet: "0x2F45...6dE8",
    hash: "0x5e6f...7a8b",
    transactionType: "redeem",
    amount: {
      amount: 7450.25,
      currency: "ETH",
      amountSummary: "$22.35k"
    }
  },
  {
    id: "7",
    dateTime: "1 month ago",
    wallet: "0x9A23...1bE4",
    hash: "0x8c9d...0e1f",
    transactionType: "mint",
    amount: {
      amount: 58200.4,
      currency: "USDC",
      amountSummary: "$58.2k"
    }
  },
  {
    id: "8",
    dateTime: "6 weeks ago",
    wallet: "0x4B56...3cD7",
    hash: "0x2d3e...4f5a",
    transactionType: "collateral_deposit",
    amount: {
      amount: 125000.0,
      currency: "DAI",
      amountSummary: "$125k"
    }
  },
  {
    id: "9",
    dateTime: "2 months ago",
    wallet: "0x6C78...2eF9",
    hash: "0x0a1b...2c3d",
    transactionType: "index_deposit",
    amount: {
      amount: 87650.3,
      currency: "USDC",
      amountSummary: "$87.65k"
    }
  },
  {
    id: "10",
    dateTime: "3 months ago",
    wallet: "0x3D89...1fE2",
    hash: "0x4e5f...6a7b",
    transactionType: "bridge",
    amount: {
      amount: 215000.0,
      currency: "DAI",
      amountSummary: "$215k"
    }
  }
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
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC contract address (mainnet)
    decimals: 6,
  },
  {
    symbol: 'USDT',
    type: 'erc20',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT contract address (mainnet)
    decimals: 6,
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
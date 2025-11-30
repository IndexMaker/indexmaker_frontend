export interface IndexData {
  tokens: string[];
  weights: number[];
}

export interface RebalanceData {
  indexId: string;
  weights: number[];
  prices: Record<string, number>;
  timestamp: number;
}
export interface Lot {
  lot_id: string;
  symbol: string;
  price: number;
  assigned_quantity: number;
  assigned_fee: number;
  assigned_timestamp: string;
  original_quantity: number;
  remaining_quantity: number;
  original_fee: number;
  created_timestamp: string;
}

export type CollateralSide = {
  unconfirmed_balance: number | string;
  ready_balance: number | string;
  preauth_balance: number | string;
  spent_balance: number | string;
  open_lots: CollateralLot[];
  closed_lots: CollateralLot[];
};

export type CollateralLot = {
  payment_id: string;
  created_timestamp: number;
  unconfirmed_amount: number | string;
  ready_amount: number | string;
  preauth_amount: number | string;
  spent_amount: number | string;
  spends: Array<{
    timestamp: number;
    payment_id: string;
    client_order_id: string;
    preauth_amount: number | string;
    spent_amount: number | string;
  }>;
};

export type Position = {
  chain_id: number | string;
  address: string;
  side_dr: CollateralSide;
  side_cr: CollateralSide;
};

export interface MintInvoice {
  id: string;
  chain_id: string;
  address: string;
  client_order_id: string;
  payment_id: string;
  symbol: string;
  amount_paid: number;
  amount_remaining: number;
  exchange_fee: number;
  management_fee: number;
  assets_value: number;
  filled_quantity: number;
  fill_rate: number;
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
  updated_at: string;
  lots?: Lot[];
  position?: Position;
}
export interface IndexListEntry {
  indexId: number;
  name: string;
  address: string;
  ticker: string;
  curator: string;
  totalSupply: number;
  totalSupplyUSD: number;
  ytdReturn: number;
  collateral: { name: string; logo: string }[]; // URLs to token logos
  managementFee: number;
  assetClass?: string;
  inceptionDate?: string;
  category?: string;
  ratings?: {
    overallRating: string;
    expenseRating: string;
    riskRating: string;
  };
  performance?: {
    ytdReturn: number;
    oneYearReturn: number;
    threeYearReturn: number;
    fiveYearReturn: number;
    tenYearReturn: number;
  };
  indexPrice?: number;
}
export interface VaultAsset {
  id: number;
  ticker: string;
  listing: string;
  assetname: string;
  sector: string;
  market_cap: number;
  weights: string;
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  total_supply: number;
  circulating_supply: number;
  price_usd: number;
  market_cap: number;
  expected_inventory: number;
  thumb: string;
}

export interface MarketRow {
  id: string; // coingecko id (e.g. "bitcoin")
  symbol: string; // "btc"
  name: string; // "Bitcoin"
  current_price: number; // price_usd
  market_cap: number; // market_cap
  circulating_supply: number | null;
  total_supply: number | null;
  image: string; // we'll use this as "thumb"
}
export interface FundRating {
  overallRating: string; // e.g., "A+", "B-", "C+"
  expenseRating: string;
  riskRating: string;
}

export interface FundPerformance {
  ytdReturn: number;
  oneYearReturn: number;
  threeYearReturn: number;
  fiveYearReturn: number;
  tenYearReturn: number;
}

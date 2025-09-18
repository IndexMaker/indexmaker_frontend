export interface Project {
  id: number;
  projectId: string;
  name: string;
  description: string;
  icon: string;
  websiteUrl?: string;
  docsUrl?: string;
  twitterUrl?: string;
  discordUrl?: string;
  screenshots?: string[];
  overview?: string;
  integrationDetails?: string;
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
  category?: string;
  inceptionDate?: string;
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
  created_at: string;
  last_updated?: string;
}

export type InventoryResponse = {
  positions: Record<
    string,
    {
      actual_balance: string | number;
      inventory_position?: { symbol?: string };
    }
  >;
};
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
  created_timestamp: number; // seconds or ms; we'll normalize
  unconfirmed_amount: number | string;
  ready_amount: number | string;
  preauth_amount: number | string;
  spent_amount: number | string;
  spends: Array<{
    timestamp: number; // seconds or ms
    payment_id: string;
    client_order_id: string;
    preauth_amount: number | string;
    spent_amount: number | string;
  }>;
};

export type Position = {
  chain_id: number | string;
  address: string;
  side_dr: CollateralSide; // debits
  side_cr: CollateralSide; // credits
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
  status: "pending" | "completed" | "failed";
  timestamp: string;
  updated_at: string;
  lots: Lot[];
  position: Position;
}

export type TxBundle = {
  hash: string;
  status: "success" | "failed" | "pending";
  blockNumber?: number;
  timestamp?: number; // seconds
  from: string;
  to?: string;
  valueEth: number;
  gasPriceGwei?: number;
  effectiveGasPriceGwei?: number;
  gasUsed?: number;
  feeEth?: number;
};

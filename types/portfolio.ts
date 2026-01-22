/**
 * Portfolio Type Definitions
 *
 * Types for the portfolio view showing user's ITP holdings
 * across both Arbitrum (bridged) and Orbit (native) chains.
 *
 * @see Story 6.12 - Frontend Portfolio Tab
 */

/**
 * A single ITP position in the user's portfolio
 */
export interface PortfolioPosition {
  /** ITP identifier on the backend */
  itpId: number;
  /** Human-readable name (e.g., "Top 10 DeFi Index") */
  name: string;
  /** Token symbol (e.g., "DEFI10") */
  symbol: string;
  /** Balance on Arbitrum (bridged ITP) in raw units */
  arbitrumBalance: bigint;
  /** Formatted Arbitrum balance for display */
  arbitrumFormatted: string;
  /** Balance on Orbit (native ITP) in raw units */
  orbitBalance: bigint;
  /** Formatted Orbit balance for display */
  orbitFormatted: string;
  /** Total combined balance in raw units */
  totalBalance: bigint;
  /** Formatted total balance for display */
  totalFormatted: string;
  /** Current ITP price in USD */
  currentPrice: number;
  /** Total position value in USD (totalBalance * currentPrice) */
  value: number;
  /** Cost basis for P&L calculation (0 for MVP) */
  costBasis: number;
  /** Profit/Loss percentage ((value - costBasis) / costBasis * 100) */
  pnlPercent: number | null;
  /** Profit/Loss absolute value in USD */
  pnlAbsolute: number | null;
  /** Arbitrum bridged ITP token address */
  arbitrumAddress: `0x${string}`;
  /** Orbit native ITP token address */
  orbitAddress: `0x${string}`;
}

/**
 * Portfolio summary statistics
 */
export interface PortfolioSummary {
  /** Total portfolio value in USD */
  totalValue: number;
  /** Total P&L percentage (null for MVP without cost basis) */
  totalPnlPercent: number | null;
  /** Total P&L absolute value in USD (null for MVP) */
  totalPnlAbsolute: number | null;
  /** Number of unique ITP positions */
  positionCount: number;
  /** Timestamp of last data update */
  lastUpdated: number;
}

/**
 * Historical portfolio value data point for charts
 */
export interface PortfolioChartPoint {
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Portfolio value in USD at this point */
  value: number;
}

/**
 * ITP data from backend API
 */
export interface ItpListItem {
  /** ITP identifier */
  id: number;
  /** Human-readable name */
  name: string;
  /** Token symbol */
  symbol: string;
  /** Native ITP address on Orbit chain */
  orbit_address: `0x${string}`;
  /** Bridged ITP address on Arbitrum chain */
  arbitrum_address: `0x${string}`;
  /** Current price in USD */
  current_price: number;
  /** Total supply in raw units */
  total_supply: string;
}

/**
 * Backend API response for ITP list
 */
export interface ItpListResponse {
  /** Array of ITP items */
  itps: ItpListItem[];
  /** Total count */
  total: number;
}

/**
 * Portfolio hook return type
 */
export interface UsePortfolioReturn {
  /** Array of portfolio positions with non-zero balance */
  positions: PortfolioPosition[];
  /** Portfolio summary statistics */
  summary: PortfolioSummary | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Manually refresh portfolio data */
  refresh: () => Promise<void>;
  /** Last successful data fetch timestamp */
  lastUpdated: number | null;
}

/**
 * Portfolio history hook return type
 */
export interface UsePortfolioHistoryReturn {
  /** Array of historical portfolio values */
  history: PortfolioChartPoint[];
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Manually refresh history data */
  refresh: () => Promise<void>;
}

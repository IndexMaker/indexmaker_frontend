export interface ItpListEntry {
  id: number;
  name: string;
  symbol: string;
  orbit_address: string;
  arbitrum_address?: string;
  index_id?: number;
  current_price?: number | null;
  price_24h_change?: number | null;
  initial_price?: string;
  total_supply: string;
  methodology?: string;
  description?: string;
  assets?: string[];
  weights?: number[];
  aum?: number | null;
  created_at: number;
}

export interface ItpListResponse {
  itps: ItpListEntry[];
  total: number;
  limit: number;
  offset: number;
  total_aum?: number | null;
}

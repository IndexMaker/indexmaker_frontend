// src/api/indices.ts
import { Activity, SupplyPosition } from "@/lib/data";
import { log } from "@/lib/utils/logger";
import { IndexListEntry } from "@/types/index";
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API;

export const fetchAllIndicesProd = async (): Promise<IndexListEntry[]> => {
  const response = await fetch(`${API_BASE_URL}/indexes`);

  if (!response.ok) {
    log.error("Failed to fetch indices", { status: response.status, statusText: response.statusText });
    return []
  }

  const data = await response.json();
  return data.indexes || [];
}


export const fetchAllIndices = fetchAllIndicesProd;

export const deposit = async (address: string, amount: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/indices/deposit/${address}/${amount}`);

  if (!response.ok) {
    log.error("Failed to fetch indices", { status: response.status, statusText: response.statusText });
    return []
  }

  return response.json();
};

export const fetchRebalancesById = async (indexId: number): Promise<any[]> => {
  const response = await fetch(`${API_BASE_URL}/current-index-weight/${indexId}`);

  if (!response.ok) {
    log.error("Failed to fetch rebalances", { status: response.status, statusText: response.statusText });
    return []
  }

  return response.json();
};

export const fetchCurrentRebalanceById = async (indexId: number): Promise<any[]> => {
  const response = await fetch(`${API_BASE_URL}/current-index-weight/${indexId}`);

  if (!response.ok) {
    log.error("Failed to fetch rebalances", { status: response.status, statusText: response.statusText });
    return []
  }

  return response.json();
};

export const fetchCurrentIndexWeight = async (indexId: number): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/current-index-weight/${indexId}`);

  if (!response.ok) {
    log.error("Failed to fetch current index weight", { status: response.status, statusText: response.statusText, indexId });
    return null;
  }

  return response.json();
};

export const fetchIndexByTicker = async (
  ticker: string
): Promise<IndexListEntry> => {
  const response = await fetch(`${API_BASE_URL}/indices/by-ticker/${ticker}`);

  if (response.status === 404) {
    log.info("Index not found", { ticker });
  }

  if (!response.ok) {
    log.error("Failed to fetch index", { status: response.status, statusText: response.statusText, ticker });
  }

  return response.json();
};

export const fetchBtcHistoricalData = async (): Promise<any[]> => {
  const response = await fetch(
    `https://api2.indexmaker.global/fetch-coin-historical-data/bitcoin`
  );

  if (!response.ok) {
    log.error("Failed to fetch BTC historical data", { status: response.status, statusText: response.statusText });
    return [];
  }

  const result = await response.json();
  return result.data || [];
};

export const fetchEthHistoricalData = async (): Promise<any[]> => {
  const response = await fetch(
    `https://api2.indexmaker.global/fetch-coin-historical-data/ethereum`
  );

  if (!response.ok) {
    log.error("Failed to fetch ETH historical data", { status: response.status, statusText: response.statusText });
    return [];
  }

  const result = await response.json();
  return result.data || [];
};

export const fetchVaultAssets = async (indexId: number): Promise<any[]> => {
  const response = await fetch(
    `${API_BASE_URL}/fetch-vault-assets/${indexId}`
  );

  if (!response.ok) {
    log.error("Failed to fetch Index assets data", { status: response.status, statusText: response.statusText });
    return [];
  }

  const data = await response.json();
  
  // Transform API response to match VaultAsset interface (marketCap -> market_cap)
  return data.map((asset: any) => ({
    ...asset,
    market_cap: asset.marketCap,
    weights: parseFloat(asset.weights) || 0,
  }));
};

export const fetchHistoricalData = async (
  indexId: string | number
): Promise<any> => {
  const response = await fetch(
    `${API_BASE_URL}/fetch-index-historical-data/${indexId}`
  );

  if (!response.ok) {
    log.error("Failed to fetch historical data", { status: response.status, statusText: response.statusText });
    return null
  }
  else {
    return response.json();
  }
};

export const getIndexMakerInfo = async () => {
  const response = await fetch(
    `${API_BASE_URL}/get-index-maker-info`
  );

  if (!response.ok) {
    log.error("Failed to fetch deposit transaction data", { status: response.status, statusText: response.statusText });
    return null
  }

  return response.json();
}

export const fetchDepositTransactionData = async (
  indexId: string | number,
  address?: string
): Promise<SupplyPosition[]> => {
  const response = await fetch(
    `${API_BASE_URL}/get-deposit-transaction-data/${indexId}/${address}`
  );

  if (!response.ok) {
    log.error("Failed to fetch deposit transaction data", { status: response.status, statusText: response.statusText });
    return []
  }

  return response.json();
};

export const fetchUserTransactionData = async (
  indexId: string | number
): Promise<Activity[]> => {
  const response = await fetch(
    `${API_BASE_URL}/indexes/${indexId}/transactions`
  );

  if (!response.ok) {
    log.error("Failed to fetch user transaction data", { status: response.status, statusText: response.statusText });
    return []
  }

  return response.json();
};

export const downloadRebalanceData = async (
  indexId: string | number,
  indexName?: string
): Promise<void> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/current-index-weight/${indexId}`,
      {
        responseType: "blob", // Important for file downloads
      }
    );

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = `rebalance_data_${indexName ? indexName : indexId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    log.error("Failed to download rebalance data", {
      error: axios.isAxiosError(error) ? error.message : "Failed to download rebalance data"
    });
  }
};

export const downloadDailyPriceData = async (
  indexId: string | number,
  indexName?: string
): Promise<void> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/download-daily-price-data/${indexId}`,
      {
        responseType: "blob", // Important for file downloads
      }
    );

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily_price_data_${indexName ? indexName : indexId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    log.error("Failed to download daily price data", {
      error: axios.isAxiosError(error) ? error.message : "Failed to download rebalance data"
    });
  }
};

export const sendMintInvoiceToBackend = async (
  payload: any
): Promise<void> => {
  try {
    await axios.post(`${API_BASE_URL}/save-blockchain-event`, payload);
  } catch (error) {
    log.error("Failed to create deposit transaction", {
      error: axios.isAxiosError(error) ? error.message : "Failed to send mint invoice"
    });
  }
};

export const subscribeEmail = async (
  payload: any
): Promise<void> => {
  try {
    await axios.post(`${API_BASE_URL}/subscribe`, payload);
  } catch (error) {
    log.error("Failed to subscribe to index", {
      error: axios.isAxiosError(error) ? error.message : "Failed to send email"
    });
  }
};

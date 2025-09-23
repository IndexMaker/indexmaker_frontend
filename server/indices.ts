// src/api/indices.ts
import { Activity, SupplyPosition } from "@/lib/data";
import { log } from "@/lib/utils/logger";
import { IndexListEntry } from "@/types/index";
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API;

export const fetchAllIndicesProd = async (): Promise<IndexListEntry[]> => {
  const response = await fetch(`${API_BASE_URL}/indices/getIndexLists`);

  if (!response.ok) {
    log.error("Failed to fetch indices", { status: response.status, statusText: response.statusText });
    return []
  }

  return response.json();
}

export const fetchAllIndicesQa = async (): Promise<IndexListEntry[]> => {
  return [{
    "indexId": 21,
    "name": "SY100",
    "address": "0x9080dd35d88b7de97afd0498fc309784ef7ebc49",
    "ticker": "SY100",
    "curator": "0xF7F7d5C0d394f75307B4D981E8DE2Bab9639f90F",
    "totalSupply": 0.00002010588139611647,
    "totalSupplyUSD": 6.195548738217032,
    "ytdReturn": -11.49,
    "collateral": [
      { "name": "BTC", "logo": "https://coin-images.coingecko.com/coins/images/1/thumb/bitcoin.png?1696501400" },
      { "name": "ETH", "logo": "https://coin-images.coingecko.com/coins/images/279/thumb/ethereum.png?1696501628" },
      { "name": "XRP", "logo": "https://coin-images.coingecko.com/coins/images/44/thumb/xrp-symbol-white-128.png?1696501442" },
      { "name": "SOL", "logo": "https://coin-images.coingecko.com/coins/images/4128/thumb/solana.png?1718769756" },
      { "name": "BNB", "logo": "https://coin-images.coingecko.com/coins/images/825/thumb/bnb-icon2_2x.png?1696501970" },
      { "name": "DOGE", "logo": "" }
    ],
    "managementFee": 2,
    "assetClass": "Cryptocurrencies",
    "category": "Top 100 Market-Cap Tokens",
    "inceptionDate": "2019-01-01",
    "performance": {
      "ytdReturn": -11.49,
      "oneYearReturn": 76.38137132434154,
      "threeYearReturn": 237.1885256621526,
      "fiveYearReturn": 1738.3370284019127,
      "tenYearReturn": 0
    },
    "ratings": { "overallRating": "A+", "expenseRating": "B", "riskRating": "C+" },
    "indexPrice": 308146.09
  }];
};

export const fetchAllIndices = fetchAllIndicesQa;

export const deposit = async (address: string, amount: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/indices/deposit/${address}/${amount}`);

  if (!response.ok) {
    log.error("Failed to fetch indices", { status: response.status, statusText: response.statusText });
    return []
  }

  return response.json();
};

export const fetchRebalancesById = async (indexId: number): Promise<any[]> => {
  const response = await fetch(`${API_BASE_URL}/indices/getCalculatedRebalances/${indexId}`);

  if (!response.ok) {
    log.error("Failed to fetch rebalances", { status: response.status, statusText: response.statusText });
    return []
  }

  return response.json();
};

export const fetchCurrentRebalanceById = async (indexId: number): Promise<any[]> => {
  const response = await fetch(`${API_BASE_URL}/indices/fetchCurrentRebalanceById/${indexId}`);

  if (!response.ok) {
    log.error("Failed to fetch rebalances", { status: response.status, statusText: response.statusText });
    return []
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
    `${API_BASE_URL}/indices/fetchBtcHistoricalData`
  );

  if (!response.ok) {
    log.error("Failed to fetch BTC historical data", { status: response.status, statusText: response.statusText });
  }

  return response.json();
};

export const fetchEthHistoricalData = async (): Promise<any[]> => {
  const response = await fetch(
    `${API_BASE_URL}/indices/fetchEthHistoricalData`
  );

  if (!response.ok) {
    log.error("Failed to fetch ETH historical data", { status: response.status, statusText: response.statusText });
    return [];
  }

  return response.json();
};

export const fetchVaultAssets = async (indexId: number): Promise<any[]> => {
  const response = await fetch(
    `${API_BASE_URL}/indices/fetchVaultAssets/${indexId}`
  );

  if (!response.ok) {
    log.error("Failed to fetch Index assets data", { status: response.status, statusText: response.statusText });
    return [];
  }

  return response.json();
};

export const fetchHistoricalData = async (
  indexId: string | number
): Promise<any> => {
  const response = await fetch(
    `${API_BASE_URL}/indices/getHistoricalData/${indexId}`
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
    `${API_BASE_URL}/indices/getIndexMakerInfo`
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
    `${API_BASE_URL}/indices/getDepositTransactionData/${indexId}/${address}`
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
    `${API_BASE_URL}/indices/getUserTransactionData/${indexId}`
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
      `${API_BASE_URL}/indices/downloadRebalanceData/${indexId}`,
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
      `${API_BASE_URL}/indices/downloadDailyPriceData/${indexId}`,
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
    await axios.post(`${API_BASE_URL}/indices/deposit_transaction`, payload);
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
    await axios.post(`${API_BASE_URL}/indices/subscribe`, payload);
  } catch (error) {
    log.error("Failed to subscribe to index", {
      error: axios.isAxiosError(error) ? error.message : "Failed to send email"
    });
  }
};

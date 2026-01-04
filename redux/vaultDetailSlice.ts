import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { 
  fetchHistoricalData, 
  fetchBtcHistoricalData, 
  fetchEthHistoricalData,
  fetchVaultAssets,
  fetchCurrentIndexWeight,
  fetchDepositTransactionData,
  fetchUserTransactionData
} from "@/server/indices";
import { VaultAsset, SupplyPosition, Activity } from "@/lib/data";
import { IndexData } from "@/components/views/vault/vault-detail";

interface VaultDetailState {
  // Loading states
  historicalLoading: boolean;
  indexAssetLoading: boolean;
  depositTransactionLoading: boolean;
  userActivityLoading: boolean;
  
  // Data
  indexData: IndexData | null;
  btcData: any[];
  ethData: any[];
  indexAssets: VaultAsset[];
  currentIndexWeight: any;
  supplyPositions: SupplyPosition[];
  userActivities: Activity[];
  indexDescription: string;
  
  // UI State
  selectedPeriod: string;
  showComparison: boolean;
  showETHComparison: boolean;
  
  // Column visibility
  visibleColumns: { id: string; name: string; visible: boolean }[];
  visibleReAllocationColumns: { id: string; name: string; visible: boolean }[];
  visibleTransactionColumns: { id: string; name: string; visible: boolean }[];
  
  // Search
  searchQuery: string;
  
  // Error handling
  error: string | null;
}

const initialState: VaultDetailState = {
  historicalLoading: false,
  indexAssetLoading: false,
  depositTransactionLoading: false,
  userActivityLoading: false,
  
  indexData: null,
  btcData: [],
  ethData: [],
  indexAssets: [],
  currentIndexWeight: null,
  supplyPositions: [],
  userActivities: [],
  indexDescription: "",
  
  selectedPeriod: "5y",
  showComparison: false,
  showETHComparison: false,
  
  visibleColumns: [
    { id: "ticker", name: "Ticker", visible: true },
    { id: "assetname", name: "Asset Name", visible: true },
    { id: "sector", name: "Sector", visible: true },
    { id: "market_cap", name: "Market Cap", visible: true },
    { id: "weights", name: "Weight", visible: true },
  ],
  visibleReAllocationColumns: [
    { id: "timestamp", name: "Date & Time", visible: true },
    { id: "market", name: "Market", visible: true },
  ],
  visibleTransactionColumns: [
    { id: "dateTime", name: "Date & Time", visible: true },
    { id: "wallet", name: "Wallet", visible: true },
    { id: "hash", name: "Hash", visible: true },
    { id: "transactionType", name: "Transaction Types", visible: true },
    { id: "amount", name: "Amount", visible: true },
  ],
  
  searchQuery: "",
  error: null,
};

// Async thunks
export const loadHistoricalData = createAsyncThunk(
  "vaultDetail/loadHistoricalData",
  async (indexId: number) => {
    const data = await fetchHistoricalData(indexId);
    return data;
  }
);

export const loadBtcData = createAsyncThunk(
  "vaultDetail/loadBtcData",
  async () => {
    const data = await fetchBtcHistoricalData();
    return Array.isArray(data) ? data : [];
  }
);

export const loadEthData = createAsyncThunk(
  "vaultDetail/loadEthData",
  async () => {
    const data = await fetchEthHistoricalData();
    return Array.isArray(data) ? data : [];
  }
);

export const loadVaultAssets = createAsyncThunk(
  "vaultDetail/loadVaultAssets",
  async (indexId: number) => {
    const [assetsResponse, weightResponse] = await Promise.all([
      fetchVaultAssets(indexId),
      fetchCurrentIndexWeight(indexId)
    ]);
    
    return { assets: assetsResponse, weights: weightResponse };
  }
);

export const loadDepositTransactions = createAsyncThunk(
  "vaultDetail/loadDepositTransactions",
  async (indexId: number) => {
    const data = await fetchDepositTransactionData(indexId, "0x0000");
    return data;
  }
);

export const loadUserTransactions = createAsyncThunk(
  "vaultDetail/loadUserTransactions",
  async (indexId: number) => {
    const data = await fetchUserTransactionData(indexId);
    return data;
  }
);

// Load all data for a vault
export const loadVaultDetails = createAsyncThunk(
  "vaultDetail/loadVaultDetails",
  async (indexId: number, { dispatch }) => {
    await Promise.all([
      dispatch(loadHistoricalData(indexId)),
      dispatch(loadBtcData()),
      dispatch(loadEthData()),
      dispatch(loadVaultAssets(indexId)),
      dispatch(loadDepositTransactions(indexId)),
      dispatch(loadUserTransactions(indexId)),
    ]);
  }
);

const vaultDetailSlice = createSlice({
  name: "vaultDetail",
  initialState,
  reducers: {
    setSelectedPeriod(state, action: PayloadAction<string>) {
      state.selectedPeriod = action.payload;
    },
    setShowComparison(state, action: PayloadAction<boolean>) {
      state.showComparison = action.payload;
    },
    setShowETHComparison(state, action: PayloadAction<boolean>) {
      state.showETHComparison = action.payload;
    },
    setIndexDescription(state, action: PayloadAction<string>) {
      state.indexDescription = action.payload;
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    toggleColumnVisibility(
      state,
      action: PayloadAction<{ columnId: string; visible: boolean }>
    ) {
      const column = state.visibleColumns.find(
        (col) => col.id === action.payload.columnId
      );
      if (column) {
        column.visible = action.payload.visible;
      }
    },
    toggleReAllocationColumnVisibility(
      state,
      action: PayloadAction<{ columnId: string; visible: boolean }>
    ) {
      const column = state.visibleReAllocationColumns.find(
        (col) => col.id === action.payload.columnId
      );
      if (column) {
        column.visible = action.payload.visible;
      }
    },
    toggleActivityColumnVisibility(
      state,
      action: PayloadAction<{ columnId: string; visible: boolean }>
    ) {
      const column = state.visibleTransactionColumns.find(
        (col) => col.id === action.payload.columnId
      );
      if (column) {
        column.visible = action.payload.visible;
      }
    },
    resetVaultDetail(state) {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // Historical data
    builder
      .addCase(loadHistoricalData.pending, (state) => {
        state.historicalLoading = true;
        state.error = null;
      })
      .addCase(loadHistoricalData.fulfilled, (state, action) => {
        state.historicalLoading = false;
        state.indexData = action.payload;
      })
      .addCase(loadHistoricalData.rejected, (state, action) => {
        state.historicalLoading = false;
        state.error = action.error.message || "Failed to load historical data";
      });

    // BTC data
    builder
      .addCase(loadBtcData.pending, (state) => {
        state.error = null;
      })
      .addCase(loadBtcData.fulfilled, (state, action) => {
        state.btcData = action.payload;
      })
      .addCase(loadBtcData.rejected, (state, action) => {
        state.error = action.error.message || "Failed to load BTC data";
      });

    // ETH data
    builder
      .addCase(loadEthData.pending, (state) => {
        state.error = null;
      })
      .addCase(loadEthData.fulfilled, (state, action) => {
        state.ethData = action.payload;
      })
      .addCase(loadEthData.rejected, (state, action) => {
        state.error = action.error.message || "Failed to load ETH data";
      });

    // Vault assets
    builder
      .addCase(loadVaultAssets.pending, (state) => {
        state.indexAssetLoading = true;
        state.error = null;
      })
      .addCase(loadVaultAssets.fulfilled, (state, action) => {
        state.indexAssetLoading = false;
        state.currentIndexWeight = action.payload.weights;
        
        // Merge weight data with asset data
        if (
          action.payload.weights &&
          action.payload.weights.constituents &&
          Array.isArray(action.payload.weights.constituents)
        ) {
          const mergedAssets = action.payload.assets.map((asset: VaultAsset) => {
            const constituent = action.payload.weights.constituents.find(
              (c: any) => c.symbol?.toUpperCase() === asset.ticker?.toUpperCase()
            );
            
            if (constituent) {
              return {
                ...asset,
                currentWeight: constituent.weightPercentage || parseFloat(constituent.weight) || asset.weights,
                currentQuantity: constituent.quantity,
                currentPrice: constituent.price,
                currentValue: constituent.value
              };
            }
            return asset;
          });
          state.indexAssets = mergedAssets;
        } else {
          state.indexAssets = action.payload.assets;
        }
      })
      .addCase(loadVaultAssets.rejected, (state, action) => {
        state.indexAssetLoading = false;
        state.error = action.error.message || "Failed to load vault assets";
      });

    // Deposit transactions
    builder
      .addCase(loadDepositTransactions.pending, (state) => {
        state.depositTransactionLoading = true;
        state.error = null;
      })
      .addCase(loadDepositTransactions.fulfilled, (state, action) => {
        state.depositTransactionLoading = false;
        state.supplyPositions = action.payload;
      })
      .addCase(loadDepositTransactions.rejected, (state, action) => {
        state.depositTransactionLoading = false;
        state.error = action.error.message || "Failed to load deposit transactions";
      });

    // User transactions
    builder
      .addCase(loadUserTransactions.pending, (state) => {
        state.userActivityLoading = true;
        state.error = null;
      })
      .addCase(loadUserTransactions.fulfilled, (state, action) => {
        state.userActivityLoading = false;
        state.userActivities = action.payload;
      })
      .addCase(loadUserTransactions.rejected, (state, action) => {
        state.userActivityLoading = false;
        state.error = action.error.message || "Failed to load user transactions";
      });
  },
});

export const {
  setSelectedPeriod,
  setShowComparison,
  setShowETHComparison,
  setIndexDescription,
  setSearchQuery,
  toggleColumnVisibility,
  toggleReAllocationColumnVisibility,
  toggleActivityColumnVisibility,
  resetVaultDetail,
} = vaultDetailSlice.actions;

export default vaultDetailSlice.reducer;

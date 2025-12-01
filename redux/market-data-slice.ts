import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface MarketDataState {
  // Map of Ticker -> Price (e.g. { "SYDF": 1.05 })
  prices: Record<string, number>;
  // Map of Ticker -> Total Supply (e.g. { "SYDF": 50000 })
  supplies: Record<string, number | undefined>;
}

const initialState: MarketDataState = {
  prices: {},
  supplies: {},
};

const marketDataSlice = createSlice({
  name: "marketData",
  initialState,
  reducers: {
    // Action to update a single token's supply (used in the staggered fetch)
    setTokenSupply(
      state,
      action: PayloadAction<{ ticker: string; supply: number }>
    ) {
      const { ticker, supply } = action.payload;
      state.supplies[ticker] = supply;
    },
    // Action to update all prices at once (if syncing from context)
    setBatchPrices(state, action: PayloadAction<Record<string, number | string>>) {
      // Normalize values to numbers
      const numericPrices: Record<string, number> = {};
      Object.entries(action.payload).forEach(([key, value]) => {
        numericPrices[key] = Number(value);
      });
      state.prices = { ...state.prices, ...numericPrices };
    },
    // Action to update a single price
    setTokenPrice(
        state, 
        action: PayloadAction<{ ticker: string; price: number }>
    ) {
        state.prices[action.payload.ticker] = action.payload.price;
    }
  },
});

export const { setTokenSupply, setBatchPrices, setTokenPrice } = marketDataSlice.actions;
export default marketDataSlice.reducer;
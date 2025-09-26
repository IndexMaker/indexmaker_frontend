import { fetchMintInvoices } from "@/server/invoice";
import { MintInvoice } from "@/types";
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "./store";

interface MintInvoicesState {
  invoices: MintInvoice[];
  latestInvoice: MintInvoice | null;
  loading: boolean;
  error: string | null;
}

const initialState: MintInvoicesState = {
  invoices: [],
  latestInvoice: null,
  loading: false,
  error: null,
};

export const mintInvoicesSlice = createSlice({
  name: "mintInvoices",
  initialState,
  reducers: {
    setInvoices(state, action: PayloadAction<MintInvoice[]>) {
      state.invoices = action.payload;
    },
    setLatestInvoice(state, action: PayloadAction<MintInvoice | null>) {
      state.latestInvoice = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.loading = false;
    },
    clearInvoices(state) {
      state.invoices = [];
      state.latestInvoice = null;
      state.error = null;
      state.loading = false;
    },
  },
});

export const {
  setInvoices,
  setLatestInvoice,
  setLoading,
  setError,
  clearInvoices,
} = mintInvoicesSlice.actions;

// Selectors
export const selectMintInvoices = (state: RootState) =>
  state.mintInvoices.invoices;
export const selectLatestMintInvoice = (state: RootState) =>
  state.mintInvoices.latestInvoice;
export const selectMintInvoicesLoading = (state: RootState) =>
  state.mintInvoices.loading;
export const selectMintInvoicesError = (state: RootState) =>
  state.mintInvoices.error;

export default mintInvoicesSlice.reducer;

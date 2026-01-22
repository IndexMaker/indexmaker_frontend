import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { ItpListEntry } from "@/types/itp";

interface ItpState {
  itps: ItpListEntry[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: ItpState = {
  itps: [],
  loading: false,
  error: null,
  lastFetched: null,
};

const itpSlice = createSlice({
  name: "itp",
  initialState,
  reducers: {
    setItps: (state, action: PayloadAction<ItpListEntry[]>) => {
      state.itps = action.payload;
      state.lastFetched = Date.now();
    },
    setItpLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setItpError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearItps: (state) => {
      state.itps = [];
      state.lastFetched = null;
    },
  },
});

export const { setItps, setItpLoading, setItpError, clearItps } = itpSlice.actions;
export default itpSlice.reducer;

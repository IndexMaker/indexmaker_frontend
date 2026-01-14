// redux/networkSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type Network = {
  id: string;
  name: string;
  chainId: string;
  icon: string;
};

interface NetworkState {
  network: Network | null;
  selectedNetwork: string;
  currentChainId: string | null;
}

const initialState: NetworkState = {
  network: null,
  selectedNetwork: "0xa4b1", // Default to Arbitrum One
  currentChainId: null,
};

const networkSlice = createSlice({
  name: "network",
  initialState,
  reducers: {
    setNetwork: (state, action: PayloadAction<Network>) => {
      state.network = action.payload;
    },
    setSelectedNetwork: (state, action: PayloadAction<string>) => {
      state.selectedNetwork = action.payload;
    },
    setCurrentChainId: (state, action: PayloadAction<string | null>) => {
      state.currentChainId = action.payload;
    },
  },
});

export const { setNetwork, setSelectedNetwork, setCurrentChainId } =
  networkSlice.actions;
export default networkSlice.reducer;


import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Vault {
  name: string;
  ticker: string;
  address: string;
  amount: string;
}

interface VaultState {
  selectedVault: Vault[];
}

const initialState: VaultState = {
  selectedVault: [],
};

const vaultSlice = createSlice({
  name: "vault",
  initialState,
  reducers: {
    addSelectedVault(
      state,
      action: PayloadAction<{ name: string; ticker: string; address: string }>
    ) {
      const existingVault = state.selectedVault[0];

      // Use address as unique key - same address means same vault
      if (existingVault && existingVault.address === action.payload.address) {
        return;
      } else {
        state.selectedVault = [
          {
            name: action.payload.name,
            ticker: action.payload.ticker,
            address: action.payload.address,
            amount: existingVault?.amount || "",
          },
        ];
      }
    },
    removeSelectedVault(state, action: PayloadAction<string>) {
      // Remove by address
      state.selectedVault = state.selectedVault.filter(
        (vault) => vault.address !== action.payload
      );
    },
    updateVaultAmount(
      state,
      action: PayloadAction<{ address: string; amount: string }>
    ) {
      const vault = state.selectedVault.find(
        (v) => v.address === action.payload.address
      );
      if (vault) {
        vault.amount = action.payload.amount;
      }
    },
    clearSelectedVault(state) {
      state.selectedVault = [];
    },
  },
});

export const {
  addSelectedVault,
  removeSelectedVault,
  updateVaultAmount,
  clearSelectedVault,
} = vaultSlice.actions;
export default vaultSlice.reducer;

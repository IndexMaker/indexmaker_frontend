import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Vault {
  name: string;
  ticker: string;
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
      action: PayloadAction<{ name: string; ticker: string }>
    ) {
      const existingVault = state.selectedVault[0]; // Get the current vault

      // If we're adding the same vault name, do nothing or update the ticker?
      if (existingVault && existingVault.name === action.payload.name) {
        // Option 1: Do nothing (keep existing vault as is)
        return;

        // Option 2: Update the ticker but keep the amount
        // existingVault.ticker = action.payload.ticker;
      } else {
        // Different vault name - replace the existing one
        state.selectedVault = [
          {
            name: action.payload.name,
            ticker: action.payload.ticker,
            amount: existingVault?.amount || "", // Keep amount if you want, or reset to empty
          },
        ];
      }
    },
    removeSelectedVault(state, action: PayloadAction<string>) {
      state.selectedVault = state.selectedVault.filter(
        (vault) => vault.name !== action.payload
      );
    },
    updateVaultAmount(
      state,
      action: PayloadAction<{ name: string; amount: string }>
    ) {
      const vault = state.selectedVault.find(
        (v) => v.name === action.payload.name
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

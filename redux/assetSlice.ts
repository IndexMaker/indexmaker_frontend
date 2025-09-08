import { Asset } from "@/types";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AssetState {
  assets: Asset[];
}

const initialState: AssetState = {
  assets: [],
};

const assetSlice = createSlice({
  name: "asset",
  initialState,
  reducers: {
    // set all assets at once
    setAssets(state, action: PayloadAction<Asset[]>) {
      state.assets = action.payload;
    },

    // update a specific asset by id (partial patch)
    updateAsset(
      state,
      action: PayloadAction<{ id: string; changes: Partial<Asset> }>
    ) {
      const { id, changes } = action.payload;
      const idx = state.assets.findIndex((a) => a.id === id);
      if (idx !== -1) {
        state.assets[idx] = { ...state.assets[idx], ...changes };
      }
    },

    // (optional) replace a specific asset entirely by id
    replaceAsset(state, action: PayloadAction<Asset>) {
      const next = action.payload;
      const idx = state.assets.findIndex((a) => a.id === next.id);
      if (idx !== -1) {
        state.assets[idx] = next;
      }
    },
  },
});

export const { setAssets, updateAsset, replaceAsset } = assetSlice.actions;
export default assetSlice.reducer;

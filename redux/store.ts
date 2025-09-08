import { configureStore } from "@reduxjs/toolkit";
import calculatorReducer from "./calculatorSlice";
import indexReducer from "./indexSlice";
import networkReducer from './networkSlice';
import vaultReducer from "./vaultSlice";
import walletReducer from "./walletSlice";
import assetReducer from "./assetSlice";

export const store = configureStore({
  reducer: {
    wallet: walletReducer,
    network: networkReducer,
    vault: vaultReducer,
    index: indexReducer,
    calculator: calculatorReducer,
    assets: assetReducer
  },
});

// Export RootState type
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
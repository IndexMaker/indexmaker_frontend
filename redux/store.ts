import { configureStore } from "@reduxjs/toolkit";
import calculatorReducer from "./calculatorSlice";
import indexReducer from "./indexSlice";
import networkReducer from './networkSlice';
import vaultReducer from "./vaultSlice";
import walletReducer from "./walletSlice";
import assetReducer from "./assetSlice";
import mintInvoiceReducer from "./mintInvoicesSlice";
import marketDataReducer from './market-data-slice';

export const store = configureStore({
  reducer: {
    wallet: walletReducer,
    network: networkReducer,
    vault: vaultReducer,
    index: indexReducer,
    calculator: calculatorReducer,
    assets: assetReducer,
    mintInvoices: mintInvoiceReducer,
    marketData: marketDataReducer,
  },
});

// Export RootState type
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
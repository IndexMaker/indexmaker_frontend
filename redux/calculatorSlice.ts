import type {
    CalculationHistory,
    DefiConfig,
    InvestmentInput,
    TaxCalculationResult
} from "@/lib/calculator/types";
import { calculateTaxes, compareTaxImplications } from "@/lib/calculator/tax-calculations";
import { formatErrorForUser } from "@/lib/calculator/errors";
import { generateCalculationId } from "@/lib/calculator/utils";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";

// Calculator state interface
interface CalculatorState {
  // Form inputs
  selectedCountry: string;
  investmentInput: InvestmentInput;
  defiConfig: DefiConfig | null;
  
  // Calculation results
  currentResult: TaxCalculationResult | null;
  comparisonResult: { etf: TaxCalculationResult; crypto: TaxCalculationResult } | null;
  
  // History and persistence
  calculationHistory: CalculationHistory[];
  
  // UI state
  isCalculating: boolean;
  showDefiConfig: boolean;
  error: string | null;
  
  // Settings
  autoSave: boolean;
  defaultCountry: string;
}

// Initial state
const initialState: CalculatorState = {
  selectedCountry: "usa",
  investmentInput: {
    amount: 10000,
    holdingPeriod: 1,
    currentAge: 30,
    filingStatus: "single",
    additionalIncome: 50000,
    investmentType: "etf",
    enableDefi: false,
  },
  defiConfig: null,
  currentResult: null,
  comparisonResult: null,
  calculationHistory: [],
  isCalculating: false,
  showDefiConfig: false,
  error: null,
  autoSave: true,
  defaultCountry: "usa",
};

// Async thunks
export const calculateTaxImpact = createAsyncThunk(
  "calculator/calculateTaxImpact",
  async (
    { country, input }: { country: string; input: InvestmentInput },
    { rejectWithValue }
  ) => {
    const result = calculateTaxes(country, input);

    if (!result.success) {
      return rejectWithValue(formatErrorForUser(result.error));
    }

    return { result: result.data, country, input };
  }
);

export const compareInvestmentTypes = createAsyncThunk(
  "calculator/compareInvestmentTypes",
  async (
    { country, input }: { country: string; input: InvestmentInput },
    { rejectWithValue }
  ) => {
    const result = compareTaxImplications(country, input);

    if (!result.success) {
      return rejectWithValue(formatErrorForUser(result.error));
    }

    return { comparison: result.data, country, input };
  }
);

// Calculator slice
const calculatorSlice = createSlice({
  name: "calculator",
  initialState,
  reducers: {
    // Country selection
    setSelectedCountry: (state, action: PayloadAction<string>) => {
      state.selectedCountry = action.payload;
      state.error = null;
    },

    // Investment input updates
    updateInvestmentInput: (state, action: PayloadAction<Partial<InvestmentInput>>) => {
      state.investmentInput = { ...state.investmentInput, ...action.payload };
      state.error = null;
    },

    setInvestmentAmount: (state, action: PayloadAction<number>) => {
      state.investmentInput.amount = action.payload;
    },

    setHoldingPeriod: (state, action: PayloadAction<number>) => {
      state.investmentInput.holdingPeriod = action.payload;
    },

    setCurrentAge: (state, action: PayloadAction<number>) => {
      state.investmentInput.currentAge = action.payload;
    },

    setFilingStatus: (state, action: PayloadAction<InvestmentInput["filingStatus"]>) => {
      state.investmentInput.filingStatus = action.payload;
    },

    setAdditionalIncome: (state, action: PayloadAction<number>) => {
      state.investmentInput.additionalIncome = action.payload;
    },

    setInvestmentType: (state, action: PayloadAction<InvestmentInput["investmentType"]>) => {
      state.investmentInput.investmentType = action.payload;
    },

    toggleDefiEnabled: (state) => {
      state.investmentInput.enableDefi = !state.investmentInput.enableDefi;
      if (!state.investmentInput.enableDefi) {
        state.defiConfig = null;
      }
    },

    // DeFi configuration
    setDefiConfig: (state, action: PayloadAction<DefiConfig>) => {
      state.defiConfig = action.payload;
      state.investmentInput.enableDefi = true;
    },

    toggleDefiConfigModal: (state) => {
      state.showDefiConfig = !state.showDefiConfig;
    },

    // Results management
    clearResults: (state) => {
      state.currentResult = null;
      state.comparisonResult = null;
      state.error = null;
    },

    // History management
    addToHistory: (state, action: PayloadAction<{ result: TaxCalculationResult; input: InvestmentInput }>) => {
      const { result, input } = action.payload;
      const historyItem: CalculationHistory = {
        id: generateCalculationId(),
        date: new Date().toISOString(),
        country: state.selectedCountry,
        input: { ...input },
        result: { ...result },
      };
      
      state.calculationHistory.unshift(historyItem);
      
      // Keep only last 50 calculations
      if (state.calculationHistory.length > 50) {
        state.calculationHistory = state.calculationHistory.slice(0, 50);
      }
    },

    removeFromHistory: (state, action: PayloadAction<string>) => {
      state.calculationHistory = state.calculationHistory.filter(
        (item) => item.id !== action.payload
      );
    },

    clearHistory: (state) => {
      state.calculationHistory = [];
    },

    // Settings
    setAutoSave: (state, action: PayloadAction<boolean>) => {
      state.autoSave = action.payload;
    },

    setDefaultCountry: (state, action: PayloadAction<string>) => {
      state.defaultCountry = action.payload;
    },

    // Error handling
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },

    clearError: (state) => {
      state.error = null;
    },

    // Reset state
    resetCalculator: (state) => {
      return { ...initialState, calculationHistory: state.calculationHistory };
    },
  },
  extraReducers: (builder) => {
    // Calculate tax impact
    builder
      .addCase(calculateTaxImpact.pending, (state) => {
        state.isCalculating = true;
        state.error = null;
      })
      .addCase(calculateTaxImpact.fulfilled, (state, action) => {
        state.isCalculating = false;
        state.currentResult = action.payload.result;
        
        // Auto-save to history if enabled
        if (state.autoSave) {
          const historyItem: CalculationHistory = {
            id: generateCalculationId(),
            date: new Date().toISOString(),
            country: action.payload.country,
            input: { ...action.payload.input },
            result: { ...action.payload.result },
          };
          
          state.calculationHistory.unshift(historyItem);
          
          if (state.calculationHistory.length > 50) {
            state.calculationHistory = state.calculationHistory.slice(0, 50);
          }
        }
      })
      .addCase(calculateTaxImpact.rejected, (state, action) => {
        state.isCalculating = false;
        state.error = action.payload as string;
      });

    // Compare investment types
    builder
      .addCase(compareInvestmentTypes.pending, (state) => {
        state.isCalculating = true;
        state.error = null;
      })
      .addCase(compareInvestmentTypes.fulfilled, (state, action) => {
        state.isCalculating = false;
        state.comparisonResult = action.payload.comparison;
      })
      .addCase(compareInvestmentTypes.rejected, (state, action) => {
        state.isCalculating = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions
export const {
  setSelectedCountry,
  updateInvestmentInput,
  setInvestmentAmount,
  setHoldingPeriod,
  setCurrentAge,
  setFilingStatus,
  setAdditionalIncome,
  setInvestmentType,
  toggleDefiEnabled,
  setDefiConfig,
  toggleDefiConfigModal,
  clearResults,
  addToHistory,
  removeFromHistory,
  clearHistory,
  setAutoSave,
  setDefaultCountry,
  setError,
  clearError,
  resetCalculator,
} = calculatorSlice.actions;

// Export reducer
export default calculatorSlice.reducer;

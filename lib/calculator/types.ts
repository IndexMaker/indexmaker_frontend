// Calculator-specific types

export interface TaxBracket {
  min: number;
  max: number;
  rate: number;
}

export interface CountryTaxConfig {
  code: string;
  name: string;
  brackets: {
    single: TaxBracket[];
    marriedJoint: TaxBracket[];
    marriedSeparate: TaxBracket[];
    headOfHousehold: TaxBracket[];
  };
  capitalGainsRates: {
    shortTerm: number;
    longTerm: number;
  };
  standardDeduction: {
    single: number;
    marriedJoint: number;
    marriedSeparate: number;
    headOfHousehold: number;
  };
}

export interface InvestmentInput {
  amount: number;
  holdingPeriod: number;
  currentAge: number;
  filingStatus: "single" | "married-joint" | "married-separate" | "head-of-household";
  additionalIncome: number;
  investmentType: "etf" | "crypto";
  enableDefi: boolean;
}

export interface DefiConfig {
  protocol: string;
  yieldRate: number;
  stakingPeriod: number;
  allocations: string;
  compoundFrequency: "daily" | "weekly" | "monthly" | "quarterly";
  riskLevel: "low" | "medium" | "high";
}

export interface TaxCalculationResult {
  country: string;
  investmentType: "etf" | "crypto";
  totalTax: number;
  netReturn: number;
  effectiveRate: number;
  breakdown: {
    capitalGainsTax: number;
    ordinaryIncomeTax: number;
    defiYieldTax?: number;
  };
}

export interface CalculationHistory {
  id: string;
  date: string;
  country: string;
  input: InvestmentInput;
  result: TaxCalculationResult;
}

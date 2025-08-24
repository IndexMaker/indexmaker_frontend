// Country-specific tax modules and configurations

import type { CountryTaxConfig, TaxBracket } from "./types";

/**
 * Australia Tax Configuration
 */
export const AUSTRALIA_TAX_CONFIG: CountryTaxConfig = {
  code: "australia",
  name: "Australia",
  brackets: {
    single: [
      { min: 0, max: 18200, rate: 0.0 },
      { min: 18200, max: 45000, rate: 0.19 },
      { min: 45000, max: 120000, rate: 0.325 },
      { min: 120000, max: 180000, rate: 0.37 },
      { min: 180000, max: Infinity, rate: 0.45 },
    ],
    marriedJoint: [
      { min: 0, max: 18200, rate: 0.0 },
      { min: 18200, max: 45000, rate: 0.19 },
      { min: 45000, max: 120000, rate: 0.325 },
      { min: 120000, max: 180000, rate: 0.37 },
      { min: 180000, max: Infinity, rate: 0.45 },
    ],
    marriedSeparate: [
      { min: 0, max: 18200, rate: 0.0 },
      { min: 18200, max: 45000, rate: 0.19 },
      { min: 45000, max: 120000, rate: 0.325 },
      { min: 120000, max: 180000, rate: 0.37 },
      { min: 180000, max: Infinity, rate: 0.45 },
    ],
    headOfHousehold: [
      { min: 0, max: 18200, rate: 0.0 },
      { min: 18200, max: 45000, rate: 0.19 },
      { min: 45000, max: 120000, rate: 0.325 },
      { min: 120000, max: 180000, rate: 0.37 },
      { min: 180000, max: Infinity, rate: 0.45 },
    ],
  },
  capitalGainsRates: {
    shortTerm: 0.45, // Same as ordinary income
    longTerm: 0.225, // 50% discount on capital gains
  },
  standardDeduction: {
    single: 18200,
    marriedJoint: 18200,
    marriedSeparate: 18200,
    headOfHousehold: 18200,
  },
};

/**
 * Germany Tax Configuration
 */
export const GERMANY_TAX_CONFIG: CountryTaxConfig = {
  code: "germany",
  name: "Germany",
  brackets: {
    single: [
      { min: 0, max: 10908, rate: 0.0 },
      { min: 10908, max: 62810, rate: 0.14 }, // Progressive from 14% to 42%
      { min: 62810, max: 277826, rate: 0.42 },
      { min: 277826, max: Infinity, rate: 0.45 },
    ],
    marriedJoint: [
      { min: 0, max: 21816, rate: 0.0 },
      { min: 21816, max: 125620, rate: 0.14 },
      { min: 125620, max: 555652, rate: 0.42 },
      { min: 555652, max: Infinity, rate: 0.45 },
    ],
    marriedSeparate: [
      { min: 0, max: 10908, rate: 0.0 },
      { min: 10908, max: 62810, rate: 0.14 },
      { min: 62810, max: 277826, rate: 0.42 },
      { min: 277826, max: Infinity, rate: 0.45 },
    ],
    headOfHousehold: [
      { min: 0, max: 10908, rate: 0.0 },
      { min: 10908, max: 62810, rate: 0.14 },
      { min: 62810, max: 277826, rate: 0.42 },
      { min: 277826, max: Infinity, rate: 0.45 },
    ],
  },
  capitalGainsRates: {
    shortTerm: 0.45, // Same as ordinary income
    longTerm: 0.26375, // 25% + 5.5% solidarity surcharge
  },
  standardDeduction: {
    single: 10908,
    marriedJoint: 21816,
    marriedSeparate: 10908,
    headOfHousehold: 10908,
  },
};

/**
 * France Tax Configuration
 */
export const FRANCE_TAX_CONFIG: CountryTaxConfig = {
  code: "france",
  name: "France",
  brackets: {
    single: [
      { min: 0, max: 10777, rate: 0.0 },
      { min: 10777, max: 27478, rate: 0.11 },
      { min: 27478, max: 78570, rate: 0.30 },
      { min: 78570, max: 168994, rate: 0.41 },
      { min: 168994, max: Infinity, rate: 0.45 },
    ],
    marriedJoint: [
      { min: 0, max: 21554, rate: 0.0 },
      { min: 21554, max: 54956, rate: 0.11 },
      { min: 54956, max: 157140, rate: 0.30 },
      { min: 157140, max: 337988, rate: 0.41 },
      { min: 337988, max: Infinity, rate: 0.45 },
    ],
    marriedSeparate: [
      { min: 0, max: 10777, rate: 0.0 },
      { min: 10777, max: 27478, rate: 0.11 },
      { min: 27478, max: 78570, rate: 0.30 },
      { min: 78570, max: 168994, rate: 0.41 },
      { min: 168994, max: Infinity, rate: 0.45 },
    ],
    headOfHousehold: [
      { min: 0, max: 10777, rate: 0.0 },
      { min: 10777, max: 27478, rate: 0.11 },
      { min: 27478, max: 78570, rate: 0.30 },
      { min: 78570, max: 168994, rate: 0.41 },
      { min: 168994, max: Infinity, rate: 0.45 },
    ],
  },
  capitalGainsRates: {
    shortTerm: 0.45, // Same as ordinary income
    longTerm: 0.30, // Flat rate for capital gains
  },
  standardDeduction: {
    single: 10777,
    marriedJoint: 21554,
    marriedSeparate: 10777,
    headOfHousehold: 10777,
  },
};

/**
 * Japan Tax Configuration
 */
export const JAPAN_TAX_CONFIG: CountryTaxConfig = {
  code: "japan",
  name: "Japan",
  brackets: {
    single: [
      { min: 0, max: 1950000, rate: 0.05 },
      { min: 1950000, max: 3300000, rate: 0.10 },
      { min: 3300000, max: 6950000, rate: 0.20 },
      { min: 6950000, max: 9000000, rate: 0.23 },
      { min: 9000000, max: 18000000, rate: 0.33 },
      { min: 18000000, max: 40000000, rate: 0.40 },
      { min: 40000000, max: Infinity, rate: 0.45 },
    ],
    marriedJoint: [
      { min: 0, max: 1950000, rate: 0.05 },
      { min: 1950000, max: 3300000, rate: 0.10 },
      { min: 3300000, max: 6950000, rate: 0.20 },
      { min: 6950000, max: 9000000, rate: 0.23 },
      { min: 9000000, max: 18000000, rate: 0.33 },
      { min: 18000000, max: 40000000, rate: 0.40 },
      { min: 40000000, max: Infinity, rate: 0.45 },
    ],
    marriedSeparate: [
      { min: 0, max: 1950000, rate: 0.05 },
      { min: 1950000, max: 3300000, rate: 0.10 },
      { min: 3300000, max: 6950000, rate: 0.20 },
      { min: 6950000, max: 9000000, rate: 0.23 },
      { min: 9000000, max: 18000000, rate: 0.33 },
      { min: 18000000, max: 40000000, rate: 0.40 },
      { min: 40000000, max: Infinity, rate: 0.45 },
    ],
    headOfHousehold: [
      { min: 0, max: 1950000, rate: 0.05 },
      { min: 1950000, max: 3300000, rate: 0.10 },
      { min: 3300000, max: 6950000, rate: 0.20 },
      { min: 6950000, max: 9000000, rate: 0.23 },
      { min: 9000000, max: 18000000, rate: 0.33 },
      { min: 18000000, max: 40000000, rate: 0.40 },
      { min: 40000000, max: Infinity, rate: 0.45 },
    ],
  },
  capitalGainsRates: {
    shortTerm: 0.45, // Same as ordinary income
    longTerm: 0.20, // Separate taxation for capital gains
  },
  standardDeduction: {
    single: 480000,
    marriedJoint: 480000,
    marriedSeparate: 480000,
    headOfHousehold: 480000,
  },
};

// Export all country configurations
export const ALL_COUNTRY_CONFIGS = {
  australia: AUSTRALIA_TAX_CONFIG,
  germany: GERMANY_TAX_CONFIG,
  france: FRANCE_TAX_CONFIG,
  japan: JAPAN_TAX_CONFIG,
};

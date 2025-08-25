// Tax constants and configuration data

import type { CountryTaxConfig } from "./types";

export const USA_TAX_CONFIG: CountryTaxConfig = {
  code: "usa",
  name: "United States",
  brackets: {
    single: [
      { min: 0, max: 11000, rate: 0.10 },
      { min: 11000, max: 44725, rate: 0.12 },
      { min: 44725, max: 95375, rate: 0.22 },
      { min: 95375, max: 182050, rate: 0.24 },
      { min: 182050, max: 231250, rate: 0.32 },
      { min: 231250, max: 578125, rate: 0.35 },
      { min: 578125, max: Infinity, rate: 0.37 },
    ],
    marriedJoint: [
      { min: 0, max: 22000, rate: 0.10 },
      { min: 22000, max: 89450, rate: 0.12 },
      { min: 89450, max: 190750, rate: 0.22 },
      { min: 190750, max: 364200, rate: 0.24 },
      { min: 364200, max: 462500, rate: 0.32 },
      { min: 462500, max: 693750, rate: 0.35 },
      { min: 693750, max: Infinity, rate: 0.37 },
    ],
    marriedSeparate: [
      { min: 0, max: 11000, rate: 0.10 },
      { min: 11000, max: 44725, rate: 0.12 },
      { min: 44725, max: 95375, rate: 0.22 },
      { min: 95375, max: 182100, rate: 0.24 },
      { min: 182100, max: 231250, rate: 0.32 },
      { min: 231250, max: 346875, rate: 0.35 },
      { min: 346875, max: Infinity, rate: 0.37 },
    ],
    headOfHousehold: [
      { min: 0, max: 15700, rate: 0.10 },
      { min: 15700, max: 59850, rate: 0.12 },
      { min: 59850, max: 95350, rate: 0.22 },
      { min: 95350, max: 182050, rate: 0.24 },
      { min: 182050, max: 231250, rate: 0.32 },
      { min: 231250, max: 578100, rate: 0.35 },
      { min: 578100, max: Infinity, rate: 0.37 },
    ],
  },
  capitalGainsRates: {
    shortTerm: 0.37, // Same as ordinary income
    longTerm: 0.20, // Simplified - actual rates vary by income
  },
  standardDeduction: {
    single: 13850,
    marriedJoint: 27700,
    marriedSeparate: 13850,
    headOfHousehold: 20800,
  },
};

export const CANADA_TAX_CONFIG: CountryTaxConfig = {
  code: "canada",
  name: "Canada",
  brackets: {
    single: [
      { min: 0, max: 53359, rate: 0.15 },
      { min: 53359, max: 106717, rate: 0.205 },
      { min: 106717, max: 165430, rate: 0.26 },
      { min: 165430, max: 235675, rate: 0.29 },
      { min: 235675, max: Infinity, rate: 0.33 },
    ],
    marriedJoint: [
      { min: 0, max: 53359, rate: 0.15 },
      { min: 53359, max: 106717, rate: 0.205 },
      { min: 106717, max: 165430, rate: 0.26 },
      { min: 165430, max: 235675, rate: 0.29 },
      { min: 235675, max: Infinity, rate: 0.33 },
    ],
    marriedSeparate: [
      { min: 0, max: 53359, rate: 0.15 },
      { min: 53359, max: 106717, rate: 0.205 },
      { min: 106717, max: 165430, rate: 0.26 },
      { min: 165430, max: 235675, rate: 0.29 },
      { min: 235675, max: Infinity, rate: 0.33 },
    ],
    headOfHousehold: [
      { min: 0, max: 53359, rate: 0.15 },
      { min: 53359, max: 106717, rate: 0.205 },
      { min: 106717, max: 165430, rate: 0.26 },
      { min: 165430, max: 235675, rate: 0.29 },
      { min: 235675, max: Infinity, rate: 0.33 },
    ],
  },
  capitalGainsRates: {
    shortTerm: 0.33, // Same as ordinary income
    longTerm: 0.165, // 50% inclusion rate
  },
  standardDeduction: {
    single: 15000,
    marriedJoint: 15000,
    marriedSeparate: 15000,
    headOfHousehold: 15000,
  },
};

export const UK_TAX_CONFIG: CountryTaxConfig = {
  code: "uk",
  name: "United Kingdom",
  brackets: {
    single: [
      { min: 0, max: 12570, rate: 0.0 },
      { min: 12570, max: 50270, rate: 0.20 },
      { min: 50270, max: 125140, rate: 0.40 },
      { min: 125140, max: Infinity, rate: 0.45 },
    ],
    marriedJoint: [
      { min: 0, max: 12570, rate: 0.0 },
      { min: 12570, max: 50270, rate: 0.20 },
      { min: 50270, max: 125140, rate: 0.40 },
      { min: 125140, max: Infinity, rate: 0.45 },
    ],
    marriedSeparate: [
      { min: 0, max: 12570, rate: 0.0 },
      { min: 12570, max: 50270, rate: 0.20 },
      { min: 50270, max: 125140, rate: 0.40 },
      { min: 125140, max: Infinity, rate: 0.45 },
    ],
    headOfHousehold: [
      { min: 0, max: 12570, rate: 0.0 },
      { min: 12570, max: 50270, rate: 0.20 },
      { min: 50270, max: 125140, rate: 0.40 },
      { min: 125140, max: Infinity, rate: 0.45 },
    ],
  },
  capitalGainsRates: {
    shortTerm: 0.45, // Same as ordinary income
    longTerm: 0.20, // Basic rate: 10%, Higher rate: 20%
  },
  standardDeduction: {
    single: 12570,
    marriedJoint: 12570,
    marriedSeparate: 12570,
    headOfHousehold: 12570,
  },
};

import { ALL_COUNTRY_CONFIGS } from "./country-modules";

export const COUNTRY_CONFIGS = {
  usa: USA_TAX_CONFIG,
  canada: CANADA_TAX_CONFIG,
  uk: UK_TAX_CONFIG,
  ...ALL_COUNTRY_CONFIGS,
};

export const SUPPORTED_COUNTRIES = [
  { code: "usa", name: "United States", flag: "🇺🇸" },
  { code: "canada", name: "Canada", flag: "🇨🇦" },
  { code: "uk", name: "United Kingdom", flag: "🇬🇧" },
  { code: "australia", name: "Australia", flag: "🇦🇺" },
  { code: "germany", name: "Germany", flag: "🇩🇪" },
  { code: "france", name: "France", flag: "🇫🇷" },
  { code: "italy", name: "Italy", flag: "🇮🇹" },
  { code: "japan", name: "Japan", flag: "🇯🇵" },
  { code: "india", name: "India", flag: "🇮🇳" },
  { code: "brazil", name: "Brazil", flag: "🇧🇷" },
];

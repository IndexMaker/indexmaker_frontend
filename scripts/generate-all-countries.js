#!/usr/bin/env node

// scripts/generate-all-countries.js
// Generate TypeScript modules for all 53 countries from data.json

const fs = require('fs');
const path = require('path');

// Load the tax data from calculator directory
const dataPath = path.join(__dirname, '../../calculator/lib/tax/data.json');
const taxData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Country mapping from data.json to our module names
const countryMapping = {
  'United States': 'usa',
  'Canada': 'canada',
  'United Kingdom': 'uk',
  'Australia': 'australia',
  'Germany': 'germany',
  'France': 'france',
  'Japan': 'japan',
  'India': 'india',
  'Italy': 'italy',
  'Brazil': 'brazil',
  'China': 'china',
  'Russia': 'russia',
  'South Korea': 'southkorea',
  'Spain': 'spain',
  'Mexico': 'mexico',
  'Indonesia': 'indonesia',
  'Türkiye': 'turkey',
  'Netherlands': 'netherlands',
  'Saudi Arabia': 'saudiarabia',
  'Switzerland': 'switzerland',
  'Poland': 'poland',
  'Taiwan': 'taiwan',
  'Belgium': 'belgium',
  'Sweden': 'sweden',
  'Ireland': 'ireland',
  'Argentina': 'argentina',
  'UAE': 'uae',
  'Singapore': 'singapore',
  'Austria': 'austria',
  'Israel': 'israel',
  'Thailand': 'thailand',
  'Philippines': 'philippines',
  'Norway': 'norway',
  'Vietnam': 'vietnam',
  'Malaysia': 'malaysia',
  'Bangladesh': 'bangladesh',
  'Iran': 'iran',
  'Denmark': 'denmark',
  'Hong Kong SAR': 'hongkong',
  'Colombia': 'colombia',
  'South Africa': 'southafrica',
  'Romania': 'romania',
  'Pakistan': 'pakistan',
  'Chile': 'chile',
  'Czech Republic': 'czechrepublic',
  'Egypt': 'egypt',
  'Finland': 'finland',
  'Portugal': 'portugal',
  'Kazakhstan': 'kazakhstan',
  'Peru': 'peru',
  'Iraq': 'iraq',
  'Greece': 'greece',
  'Algeria': 'algeria',
};

// Generate setup type mapping
function getSetupType(schemeName, benefits) {
  const name = schemeName.toLowerCase();
  const benefitsLower = benefits.toLowerCase();

  // Tax-free schemes (TEE - Taxed, Exempt, Exempt)
  if (
    benefitsLower.includes('tax-free') ||
    benefitsLower.includes('tee') ||
    benefitsLower.includes('exempt-exempt-exempt') ||
    name.includes('roth') ||
    name.includes('tfsa') ||
    name.includes('isa') ||
    name.includes('nisa')
  ) {
    return 'taxfree';
  }

  // Deferred schemes (EET - Exempt, Exempt, Taxed)
  if (
    benefitsLower.includes('deductible') ||
    benefitsLower.includes('eet') ||
    benefitsLower.includes('tax-deferred') ||
    name.includes('traditional') ||
    name.includes('401k') ||
    name.includes('rrsp') ||
    name.includes('pension')
  ) {
    return 'deferred';
  }

  // Super schemes (Australia specific)
  if (name.includes('super')) {
    return 'super';
  }

  // Default to taxable
  return 'taxable';
}

// Extract penalty rate from holding periods or other details
function extractPenaltyRate(holdingPeriods, otherDetails) {
  const text = `${holdingPeriods} ${otherDetails}`.toLowerCase();

  // Look for percentage penalties
  const penaltyMatch = text.match(/(\d+(?:\.\d+)?)%\s*penalty/);
  if (penaltyMatch) {
    return Number.parseFloat(penaltyMatch[1]) / 100;
  }

  // Look for specific penalty rates
  if (text.includes('10% penalty')) return 0.1;
  if (text.includes('20% penalty')) return 0.2;
  if (text.includes('55% unauthorized')) return 0.55;

  return 0;
}

// Extract threshold age
function extractThresholdAge(holdingPeriods, otherDetails) {
  const text = `${holdingPeriods} ${otherDetails}`.toLowerCase();

  // Look for age requirements
  const ageMatch = text.match(/(?:age\s+|from\s+|until\s+)(\d+(?:\.\d+)?)/);
  if (ageMatch) {
    return Number.parseFloat(ageMatch[1]);
  }

  // Common retirement ages
  if (text.includes('retirement')) return 65;
  if (text.includes('59.5')) return 59.5;
  if (text.includes('60')) return 60;
  if (text.includes('62')) return 62;
  if (text.includes('65')) return 65;

  return Number.POSITIVE_INFINITY; // No age restriction
}

// Generate basic tax brackets (simplified for now)
function generateBasicBrackets(countryKey) {
  // This is a simplified version - each country would need specific brackets
  // For now, we'll use a basic progressive structure
  return {
    ordinary: {
      uppers: [50000, 100000, 200000, Number.POSITIVE_INFINITY],
      rates: [0.1, 0.2, 0.3, 0.4]
    },
    stdDed: 10000,
    niitThresh: 200000
  };
}

// Generate TypeScript module content
function generateCountryModule(countryData) {
  const countryKey = countryMapping[countryData.country];
  if (!countryKey) return null;

  const schemes = countryData.investment_tax_optimization_schemes || {};
  const setups = [];

  // Generate setups from investment schemes
  Object.entries(schemes).forEach(([schemeName, schemeData]) => {
    const setupType = getSetupType(schemeName, schemeData.tax_benefits || '');
    const penaltyRate = extractPenaltyRate(
      schemeData.holding_periods || '',
      schemeData.other_details || ''
    );
    const thresholdAge = extractThresholdAge(
      schemeData.holding_periods || '',
      schemeData.other_details || ''
    );

    setups.push({
      name: schemeName,
      type: setupType,
      fees: schemeData.tax_benefits || 'Tax benefits vary',
      penaltyRate,
      thresholdAge,
    });
  });

  // Always add a taxable account option
  if (!setups.some((s) => s.type === 'taxable')) {
    setups.push({
      name: 'Taxable Account',
      type: 'taxable',
      fees: 'No withdrawal restrictions',
      penaltyRate: 0,
      thresholdAge: Number.POSITIVE_INFINITY,
    });
  }

  return {
    countryKey,
    countryName: countryData.country,
    cryptoTax: countryData.crypto_tax,
    setups,
  };
}

// Generate TypeScript file content
function generateTSContent(moduleData) {
  const { countryKey, countryName, cryptoTax, setups } = moduleData;
  
  return `// lib/tax/${countryKey}.ts
import type { Brackets, CalcOut, CountryModule, Setup, TaxableParams, TaxParams } from './types';

// Helpers (local)
function calcProgressiveTax(income: number, uppers: readonly number[], rates: readonly number[]) {
  let tax = 0,
    prev = 0;
  const inc = Math.max(0, income);
  for (let i = 0; i < uppers.length; i++) {
    const upper = uppers[i],
      rate = rates[i];
    const seg = Math.min(inc, upper) - prev;
    if (seg > 0) tax += seg * rate;
    prev = upper;
    if (inc <= upper) break;
  }
  return tax;
}

function taxIncrement(
  uppers: readonly number[],
  rates: readonly number[],
  baseTaxable: number,
  delta: number
) {
  const d = Math.max(0, delta);
  const x0 = Math.max(0, baseTaxable);
  const x1 = Math.max(0, baseTaxable + d);
  return calcProgressiveTax(x1, uppers, rates) - calcProgressiveTax(x0, uppers, rates);
}

// Basic brackets - TODO: Implement country-specific tax brackets
function getBrackets(status: string): Brackets {
  return {
    ordinary: {
      uppers: [50000, 100000, 200000, Number.POSITIVE_INFINITY],
      rates: [0.1, 0.2, 0.3, 0.4]
    },
    stdDed: 10000,
    niitThresh: 200000
  };
}

const statuses = ['single'];

const setups: Setup[] = [
${setups.map(setup => `  {
    name: '${setup.name}',
    type: '${setup.type}',
    fees: '${setup.fees.replace(/'/g, "\\'")}',
    penaltyRate: ${setup.penaltyRate},
    thresholdAge: ${setup.thresholdAge === Number.POSITIVE_INFINITY ? 'Number.POSITIVE_INFINITY' : setup.thresholdAge},
  }`).join(',\n')}
];

function computeTaxable(p: TaxableParams): { readonly tax: number; readonly niit: number } {
  const { agiExcl, taxableAmount, brackets } = p;
  const { ordinary, stdDed, niitThresh } = brackets;

  // Basic implementation - TODO: Implement country-specific logic
  const ordinaryTaxable = Math.max(0, agiExcl - stdDed);
  const tax = taxIncrement(ordinary.uppers, ordinary.rates, ordinaryTaxable, taxableAmount);
  
  // Basic NIIT calculation
  const totalIncome = agiExcl + taxableAmount;
  let niit = 0;
  if (totalIncome > niitThresh) {
    niit = Math.min(taxableAmount, totalIncome - niitThresh) * 0.038;
  }

  return { tax, niit };
}

function computeDeferredFull(p: TaxableParams): { readonly tax: number; readonly niit: number } {
  const { agiExcl, taxableAmount, brackets } = p;
  const { ordinary, stdDed, niitThresh } = brackets;

  // For deferred accounts, everything is taxed as ordinary income
  const ordinaryTaxable = Math.max(0, agiExcl - stdDed);
  const tax = taxIncrement(ordinary.uppers, ordinary.rates, ordinaryTaxable, taxableAmount);
  
  // NIIT calculation
  const totalIncome = agiExcl + taxableAmount;
  let niit = 0;
  if (totalIncome > niitThresh) {
    niit = Math.min(taxableAmount, totalIncome - niitThresh) * 0.038;
  }

  return { tax, niit };
}

export const ${countryKey}: CountryModule = {
  key: '${countryKey}',
  name: '${countryName}',
  currency: 'USD', // TODO: Add proper currency mapping
  statuses,
  cryptoNote: '${cryptoTax.replace(/'/g, "\\'")}',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
`;
}

// Main execution
console.log('🚀 Generating TypeScript modules for all 53 countries...\n');

const outputDir = path.join(__dirname, '../lib/tax');
let generatedCount = 0;
let skippedCount = 0;

taxData.forEach((countryData) => {
  const moduleData = generateCountryModule(countryData);
  if (!moduleData) {
    console.log(`⚠️  Skipping ${countryData.country} - no mapping found`);
    skippedCount++;
    return;
  }

  const { countryKey, countryName } = moduleData;
  const filePath = path.join(outputDir, `${countryKey}.ts`);
  
  // Skip if file already exists (don't overwrite existing implementations)
  if (fs.existsSync(filePath)) {
    console.log(`⏭️  Skipping ${countryName} - file already exists`);
    skippedCount++;
    return;
  }

  const tsContent = generateTSContent(moduleData);
  fs.writeFileSync(filePath, tsContent);
  
  console.log(`✅ Generated ${countryName} (${countryKey}.ts)`);
  generatedCount++;
});

console.log(`\n🎉 Generation complete!`);
console.log(`📊 Generated: ${generatedCount} new modules`);
console.log(`⏭️  Skipped: ${skippedCount} existing modules`);
console.log(`\n📝 Next steps:`);
console.log(`1. Update lib/tax/index.ts to export all new modules`);
console.log(`2. Implement country-specific tax brackets and currencies`);
console.log(`3. Add proper tax calculation logic for each country`);
console.log(`4. Test the new modules in the calculator`);

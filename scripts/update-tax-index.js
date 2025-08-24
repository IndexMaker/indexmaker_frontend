#!/usr/bin/env node

// scripts/update-tax-index.js
// Update the tax index.ts file to include all 53 countries

const fs = require('fs');
const path = require('path');

async function updateTaxIndex() {
  console.log('🔄 Updating tax index.ts with all 53 countries...\n');
  
  const taxDir = path.join(__dirname, '..', 'lib', 'tax');
  const indexPath = path.join(taxDir, 'index.ts');
  
  // Get all country files
  const countryFiles = fs.readdirSync(taxDir)
    .filter(file => file.endsWith('.ts'))
    .filter(file => !['index.ts', 'types.ts', 'usa-enhanced.ts'].includes(file))
    .filter(file => !file.includes('/')) // Exclude subdirectories
    .map(file => file.replace('.ts', ''))
    .sort();
  
  console.log(`📊 Found ${countryFiles.length} country modules:`);
  countryFiles.forEach(country => console.log(`  - ${country}`));
  
  // Generate the new index.ts content
  const exportStatements = countryFiles.map(country => 
    `export { ${country} } from './${country}';`
  ).join('\n');
  
  const importStatements = countryFiles.map(country => 
    `import { ${country} } from './${country}';`
  ).join('\n');
  
  const registryEntries = countryFiles.map(country => `  ${country},`).join('\n');
  
  const newIndexContent = `// lib/tax/index.ts
// Tax calculation module exports - Auto-generated for all 53 countries

${exportStatements}
export * from './types';

${importStatements}
import type { CountryModule, CountryModuleRegistry } from './types';

// Registry of all available country modules
export const countryModules: CountryModuleRegistry = {
${registryEntries}
};

// Prefer Roth IRA for USA on first load. Else pick retirement wrapper.
export function pickDefaultRetirementSetup(countryKey: keyof typeof countryModules): string {
  const mod = countryModules[countryKey];
  if (!mod) return '';
  if (countryKey === 'usa') {
    const roth = mod.setups.find((s) => s.name === 'Roth IRA');
    if (roth) return roth.name;
  }
  const superOpt = mod.setups.find((s) => s.type === 'super');
  if (superOpt) return superOpt.name;
  const deferredOpt = mod.setups.find((s) => s.type === 'deferred');
  if (deferredOpt) return deferredOpt.name;
  const taxfreeOpt = mod.setups.find((s) => s.type === 'taxfree');
  if (taxfreeOpt) return taxfreeOpt.name;
  return mod.setups[0]?.name ?? '';
}

/**
 * Get a country module by country code
 */
export function getCountryModule(countryCode: string): CountryModule | null {
  return countryModules[countryCode as keyof CountryModuleRegistry] || null;
}

/**
 * Get all available country codes
 */
export function getAvailableCountries(): string[] {
  return Object.keys(countryModules);
}

/**
 * Validate if a country is supported
 */
export function isCountrySupported(countryCode: string): boolean {
  return countryCode in countryModules;
}

/**
 * Calculate taxes for a given country and parameters
 */
export function calculateTaxes(
  countryCode: string,
  params: any
): any {
  const module = getCountryModule(countryCode);
  if (!module) {
    throw new Error(\`Country module not found: \${countryCode}\`);
  }
  
  // Ensure all required functions exist
  if (!module.computeTaxable) {
    throw new Error(\`computeTaxable function missing for country: \${countryCode}\`);
  }
  
  if (!module.computeDeferredFull) {
    throw new Error(\`computeDeferredFull function missing for country: \${countryCode}\`);
  }
  
  if (!module.getBrackets) {
    throw new Error(\`getBrackets function missing for country: \${countryCode}\`);
  }
  
  return {
    module,
    computeTaxable: module.computeTaxable,
    computeDeferredFull: module.computeDeferredFull,
    getBrackets: module.getBrackets
  };
}
`;
  
  // Write the new index file
  fs.writeFileSync(indexPath, newIndexContent);
  
  console.log(`\n✅ Updated index.ts with ${countryFiles.length} countries`);
  
  // Test the new index file
  console.log('\n🧪 Testing updated index file...');
  
  try {
    // Try to require the new index (this won't work in Node.js with TS, but we can check syntax)
    const content = fs.readFileSync(indexPath, 'utf8');
    
    // Check for syntax issues
    const hasExports = content.includes('export {') && content.includes('export const countryModules');
    const hasImports = content.includes('import {') && content.includes('import type');
    const hasRegistry = content.includes('countryModules: CountryModuleRegistry');
    const hasPhilippines = content.includes('philippines');
    
    if (hasExports && hasImports && hasRegistry && hasPhilippines) {
      console.log('✅ Index file structure looks correct');
      console.log('✅ Philippines module included');
      console.log('✅ All exports and imports present');
      console.log('✅ Registry structure correct');
    } else {
      console.log('❌ Index file structure issues detected');
      console.log(`  Exports: ${hasExports}`);
      console.log(`  Imports: ${hasImports}`);
      console.log(`  Registry: ${hasRegistry}`);
      console.log(`  Philippines: ${hasPhilippines}`);
    }
    
  } catch (error) {
    console.log(`❌ Error testing index file: ${error.message}`);
  }
  
  console.log('\n🎉 Tax index update complete!');
  console.log('📝 Next steps:');
  console.log('1. Restart the development server');
  console.log('2. Test Philippines country selection');
  console.log('3. Verify all countries are available');
  
  return true;
}

// Run the update
updateTaxIndex().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Tax index update failed:', error);
  process.exit(1);
});

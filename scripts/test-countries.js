#!/usr/bin/env node

// scripts/test-countries.js
// Test script to validate all 53 country modules structure

const fs = require('fs');
const path = require('path');

async function testCountryModules() {
  console.log('🧪 Testing all 53 country modules...\n');

  try {
    // Check if TypeScript files exist
    const indexPath = path.join(__dirname, '..', 'lib', 'tax', 'index.ts');
    if (!fs.existsSync(indexPath)) {
      throw new Error('lib/tax/index.ts not found');
    }

    console.log('🔍 Testing country file structure and content...\n');
    await testCountryFileStructure();
    return;
    
    const countries = Object.keys(countryModules);
    console.log(`📊 Found ${countries.length} country modules\n`);
    
    let passCount = 0;
    let failCount = 0;
    const failures = [];
    
    for (const countryKey of countries.sort()) {
      try {
        const module = countryModules[countryKey];
        
        // Basic module structure validation
        const requiredFields = ['key', 'name', 'currency', 'statuses', 'cryptoNote', 'setups', 'getBrackets', 'computeTaxable', 'computeDeferredFull'];
        const missingFields = requiredFields.filter(field => !module[field]);
        
        if (missingFields.length > 0) {
          throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
        
        // Test getBrackets function
        const brackets = module.getBrackets(module.statuses[0]);
        if (!brackets || !brackets.ordinary || !brackets.ordinary.uppers || !brackets.ordinary.rates) {
          throw new Error('getBrackets returned invalid bracket structure');
        }
        
        // Test setups array
        if (!Array.isArray(module.setups) || module.setups.length === 0) {
          throw new Error('Invalid or empty setups array');
        }
        
        // Validate setup structure
        for (const setup of module.setups) {
          const requiredSetupFields = ['name', 'type', 'fees', 'penaltyRate', 'thresholdAge'];
          const missingSetupFields = requiredSetupFields.filter(field => setup[field] === undefined);
          if (missingSetupFields.length > 0) {
            throw new Error(`Setup "${setup.name}" missing fields: ${missingSetupFields.join(', ')}`);
          }
        }
        
        console.log(`✅ ${countryKey.padEnd(15)} - ${module.name}`);
        passCount++;
        
      } catch (error) {
        console.log(`❌ ${countryKey.padEnd(15)} - ERROR: ${error.message}`);
        failures.push({ country: countryKey, error: error.message });
        failCount++;
      }
    }
    
    console.log(`\n📈 Test Results:`);
    console.log(`✅ Passed: ${passCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📊 Success Rate: ${((passCount / countries.length) * 100).toFixed(1)}%`);
    
    if (failures.length > 0) {
      console.log(`\n🔍 Failure Details:`);
      failures.forEach(({ country, error }) => {
        console.log(`  ${country}: ${error}`);
      });
    }
    
    // Test basic tax calculation
    console.log(`\n🧮 Testing basic tax calculations...`);
    
    const testCountries = ['usa', 'uk', 'canada', 'australia', 'germany'];
    const testParams = {
      agiExcl: 50000,
      taxableAmount: 10000,
      brackets: null
    };
    
    for (const countryKey of testCountries) {
      if (countryModules[countryKey]) {
        try {
          const module = countryModules[countryKey];
          testParams.brackets = module.getBrackets(module.statuses[0]);
          
          const result = module.computeTaxable(testParams);
          if (typeof result.tax !== 'number' || result.tax < 0) {
            throw new Error('Invalid tax calculation result');
          }
          
          console.log(`✅ ${countryKey}: Tax on $10k gain = $${result.tax.toFixed(2)}`);
        } catch (error) {
          console.log(`❌ ${countryKey}: Calculation error - ${error.message}`);
        }
      }
    }
    
    console.log(`\n🎉 Country module testing complete!`);
    
    if (failCount === 0) {
      console.log(`🌟 All modules passed basic validation!`);
      return true;
    } else {
      console.log(`⚠️  ${failCount} modules need attention before Phase 1 implementation.`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Failed to load country modules:', error.message);
    console.error('Make sure you run this from the project root.');
    return false;
  }
}

async function testCountryFileStructure() {
  console.log('🔍 Testing country file structure...\n');

  const taxDir = path.join(__dirname, '..', 'lib', 'tax');
  const files = fs.readdirSync(taxDir)
    .filter(file => file.endsWith('.ts') && file !== 'types.ts' && file !== 'index.ts')
    .map(file => file.replace('.ts', ''))
    .sort();

  console.log(`📊 Found ${files.length} country TypeScript files\n`);

  let passCount = 0;
  let failCount = 0;
  const failures = [];
  const warnings = [];

  for (const countryKey of files) {
    try {
      const filePath = path.join(taxDir, `${countryKey}.ts`);
      const content = fs.readFileSync(filePath, 'utf8');

      // Check for required exports and structure
      const requiredPatterns = [
        { pattern: /export const \w+: CountryModule/, name: 'CountryModule export' },
        { pattern: /function getBrackets/, name: 'getBrackets function' },
        { pattern: /function computeTaxable/, name: 'computeTaxable function' },
        { pattern: /key: '\w+'/, name: 'country key' },
        { pattern: /name: '[^']+'/, name: 'country name' },
        { pattern: /currency: '\w+'/, name: 'currency' },
        { pattern: /cryptoNote:/, name: 'crypto note' }
      ];

      // Optional patterns (for new structure vs old structure)
      const optionalPatterns = [
        { pattern: /function computeDeferredFull/, name: 'computeDeferredFull function' },
        { pattern: /const setups.*Setup\[\]/, name: 'setups array' },
        { pattern: /const statuses/, name: 'statuses array' }
      ];

      const missingRequired = requiredPatterns.filter(req => !req.pattern.test(content));

      if (missingRequired.length > 0) {
        throw new Error(`Missing required: ${missingRequired.map(p => p.name).join(', ')}`);
      }

      // Check optional patterns and determine structure type
      const missingOptional = optionalPatterns.filter(req => !req.pattern.test(content));
      const hasNewStructure = missingOptional.length === 0;
      const hasOldStructure = content.includes('statuses: [') && !content.includes('const statuses');

      let structureType = 'unknown';
      if (hasNewStructure) {
        structureType = 'new';
      } else if (hasOldStructure) {
        structureType = 'old';
      } else if (missingOptional.length <= 2) {
        structureType = 'partial';
        warnings.push(`${countryKey}: Partial structure - missing ${missingOptional.map(p => p.name).join(', ')}`);
      }

      // Extract details for validation
      const exportMatch = content.match(/export const (\w+): CountryModule/);
      const nameMatch = content.match(/name: '([^']+)'/);
      const keyMatch = content.match(/key: '(\w+)'/);
      const currencyMatch = content.match(/currency: '(\w+)'/);
      const setupsMatch = content.match(/const setups.*?=\s*\[(.*?)\];/s);

      const exportName = exportMatch ? exportMatch[1] : 'unknown';
      const countryName = nameMatch ? nameMatch[1] : 'Unknown';
      const countryKeyInFile = keyMatch ? keyMatch[1] : 'unknown';
      const currency = currencyMatch ? currencyMatch[1] : 'unknown';

      // Validate consistency
      if (exportName !== countryKey) {
        warnings.push(`${countryKey}: Export name '${exportName}' doesn't match filename`);
      }

      if (countryKeyInFile !== countryKey) {
        warnings.push(`${countryKey}: Key '${countryKeyInFile}' doesn't match filename`);
      }

      if (currency === 'USD' && !['usa', 'uae', 'saudiarabia'].includes(countryKey)) {
        warnings.push(`${countryKey}: Using USD currency (may need local currency)`);
      }

      // Count setups
      const setupCount = setupsMatch ? (setupsMatch[1].match(/\{/g) || []).length : 0;
      const setupsFromStatuses = content.includes('statuses: [') ? 'inline' : setupCount;

      console.log(`✅ ${countryKey.padEnd(15)} - ${countryName.padEnd(20)} (${currency}, ${setupsFromStatuses} setups, ${structureType})`);
      passCount++;

    } catch (error) {
      console.log(`❌ ${countryKey.padEnd(15)} - ERROR: ${error.message}`);
      failures.push({ country: countryKey, error: error.message });
      failCount++;
    }
  }

  console.log(`\n📈 File Structure Test Results:`);
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`⚠️  Warnings: ${warnings.length}`);
  console.log(`📊 Success Rate: ${((passCount / files.length) * 100).toFixed(1)}%`);

  if (failures.length > 0) {
    console.log(`\n🔍 Failure Details:`);
    failures.forEach(({ country, error }) => {
      console.log(`  ${country}: ${error}`);
    });
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  Warnings:`);
    warnings.forEach(warning => {
      console.log(`  ${warning}`);
    });
  }

  // Test index.ts structure
  console.log(`\n🔍 Testing index.ts structure...`);
  const indexPath = path.join(taxDir, 'index.ts');
  const indexContent = fs.readFileSync(indexPath, 'utf8');

  const importCount = (indexContent.match(/import.*from/g) || []).length;
  const exportCount = (indexContent.match(/^\s*\w+,$/gm) || []).length;

  console.log(`📊 Index.ts: ${importCount} imports, ${exportCount} exports`);

  if (importCount !== files.length) {
    console.log(`⚠️  Import/file count mismatch: ${importCount} imports vs ${files.length} files`);
  } else {
    console.log(`✅ All country files properly imported in index.ts`);
  }

  return failCount === 0;
}

async function testCountryFiles(countryKeys) {
  // This would be used if tsx is available
  console.log('🧮 Testing with TypeScript execution...');
  console.log(`Found countries: ${countryKeys.join(', ')}`);
  return true;
}

// Run the test
testCountryModules().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});

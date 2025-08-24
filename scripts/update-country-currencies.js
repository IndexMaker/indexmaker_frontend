#!/usr/bin/env node

// scripts/update-country-currencies.js
// Update all country modules with correct local currencies

const fs = require('fs');
const path = require('path');

// Currency mapping (matching our TypeScript file)
const CURRENCY_MAPPING = {
  usa: 'USD', canada: 'CAD', mexico: 'MXN',
  germany: 'EUR', france: 'EUR', italy: 'EUR', spain: 'EUR', netherlands: 'EUR',
  belgium: 'EUR', austria: 'EUR', finland: 'EUR', ireland: 'EUR', portugal: 'EUR',
  greece: 'EUR', uk: 'GBP', switzerland: 'CHF', norway: 'NOK', sweden: 'SEK',
  denmark: 'DKK', poland: 'PLN', czechrepublic: 'CZK', romania: 'RON',
  japan: 'JPY', china: 'CNY', india: 'INR', southkorea: 'KRW', australia: 'AUD',
  singapore: 'SGD', hongkong: 'HKD', taiwan: 'TWD', thailand: 'THB',
  malaysia: 'MYR', indonesia: 'IDR', philippines: 'PHP', vietnam: 'VND',
  uae: 'AED', saudiarabia: 'SAR', israel: 'ILS', turkey: 'TRY', iran: 'IRR',
  iraq: 'IQD', egypt: 'EGP', southafrica: 'ZAR', algeria: 'DZD',
  brazil: 'BRL', argentina: 'ARS', chile: 'CLP', colombia: 'COP', peru: 'PEN',
  russia: 'RUB', kazakhstan: 'KZT', bangladesh: 'BDT', pakistan: 'PKR'
};

async function updateCountryCurrencies() {
  console.log('🔄 Updating country modules with correct currencies...\n');
  
  const taxDir = path.join(__dirname, '..', 'lib', 'tax');
  const files = fs.readdirSync(taxDir)
    .filter(file => file.endsWith('.ts') && file !== 'types.ts' && file !== 'index.ts')
    .filter(file => !file.includes('enhanced') && !file.includes('utils'))
    .map(file => file.replace('.ts', ''));
  
  console.log(`📊 Found ${files.length} country modules to update\n`);
  
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const updates = [];
  
  for (const countryKey of files.sort()) {
    try {
      const filePath = path.join(taxDir, `${countryKey}.ts`);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Get the correct currency for this country
      const correctCurrency = CURRENCY_MAPPING[countryKey];
      if (!correctCurrency) {
        console.log(`⚠️  ${countryKey.padEnd(15)} - No currency mapping found, skipping`);
        skippedCount++;
        continue;
      }
      
      // Check current currency in the file
      const currentCurrencyMatch = content.match(/currency: '(\w+)'/);
      const currentCurrency = currentCurrencyMatch ? currentCurrencyMatch[1] : 'unknown';
      
      if (currentCurrency === correctCurrency) {
        console.log(`✅ ${countryKey.padEnd(15)} - Already has correct currency (${correctCurrency})`);
        skippedCount++;
        continue;
      }
      
      // Update the currency
      const updatedContent = content.replace(
        /currency: '\w+'/,
        `currency: '${correctCurrency}'`
      );
      
      // Verify the update worked
      if (updatedContent === content) {
        console.log(`⚠️  ${countryKey.padEnd(15)} - Currency pattern not found, skipping`);
        skippedCount++;
        continue;
      }
      
      // Write the updated content
      fs.writeFileSync(filePath, updatedContent);
      
      console.log(`🔄 ${countryKey.padEnd(15)} - Updated ${currentCurrency} → ${correctCurrency}`);
      updates.push({
        country: countryKey,
        from: currentCurrency,
        to: correctCurrency
      });
      updatedCount++;
      
    } catch (error) {
      console.log(`❌ ${countryKey.padEnd(15)} - Error: ${error.message}`);
      errorCount++;
    }
  }
  
  console.log(`\n📈 Currency Update Results:`);
  console.log(`🔄 Updated: ${updatedCount}`);
  console.log(`⏭️  Skipped: ${skippedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  
  if (updates.length > 0) {
    console.log(`\n📋 Updated Countries:`);
    updates.forEach(update => {
      console.log(`  ${update.country}: ${update.from} → ${update.to}`);
    });
  }
  
  // Verify currency distribution
  console.log(`\n💰 Currency Distribution Analysis:`);
  const currencyStats = {};
  
  files.forEach(countryKey => {
    const currency = CURRENCY_MAPPING[countryKey] || 'USD';
    currencyStats[currency] = (currencyStats[currency] || 0) + 1;
  });
  
  Object.entries(currencyStats)
    .sort(([,a], [,b]) => b - a)
    .forEach(([currency, count]) => {
      console.log(`  ${currency}: ${count} countries`);
    });
  
  // Test a few updated files
  console.log(`\n🧪 Testing updated files...`);
  
  const testCountries = ['germany', 'japan', 'canada', 'australia'].filter(c => 
    updates.some(u => u.country === c)
  );
  
  testCountries.forEach(countryKey => {
    try {
      const filePath = path.join(taxDir, `${countryKey}.ts`);
      const content = fs.readFileSync(filePath, 'utf8');
      const currencyMatch = content.match(/currency: '(\w+)'/);
      const expectedCurrency = CURRENCY_MAPPING[countryKey];
      
      if (currencyMatch && currencyMatch[1] === expectedCurrency) {
        console.log(`✅ ${countryKey}: Currency correctly set to ${expectedCurrency}`);
      } else {
        console.log(`❌ ${countryKey}: Currency verification failed`);
      }
    } catch (error) {
      console.log(`❌ ${countryKey}: Test failed - ${error.message}`);
    }
  });
  
  console.log(`\n🎉 Currency update complete!`);
  console.log(`📝 Next steps:`);
  console.log(`1. Test the calculator with different countries`);
  console.log(`2. Verify currency formatting works correctly`);
  console.log(`3. Test currency conversion functionality`);
  console.log(`4. Update any hardcoded currency references in the UI`);
  
  return errorCount === 0;
}

// Run the update
updateCountryCurrencies().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Currency update failed:', error);
  process.exit(1);
});

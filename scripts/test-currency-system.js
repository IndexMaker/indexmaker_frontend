#!/usr/bin/env node

// scripts/test-currency-system.js
// Comprehensive testing for currency mapping, formatting, and conversion

const fs = require('fs');
const path = require('path');

// Import currency mapping (simulated since we can't import TS directly)
const CURRENCY_MAPPING = {
  usa: { code: 'USD', symbol: '$', decimals: 2, locale: 'en-US' },
  germany: { code: 'EUR', symbol: '€', decimals: 2, locale: 'de-DE' },
  japan: { code: 'JPY', symbol: '¥', decimals: 0, locale: 'ja-JP' },
  uk: { code: 'GBP', symbol: '£', decimals: 2, locale: 'en-GB' },
  canada: { code: 'CAD', symbol: 'C$', decimals: 2, locale: 'en-CA' },
  australia: { code: 'AUD', symbol: 'A$', decimals: 2, locale: 'en-AU' },
  india: { code: 'INR', symbol: '₹', decimals: 2, locale: 'en-IN' },
  china: { code: 'CNY', symbol: '¥', decimals: 2, locale: 'zh-CN' },
  brazil: { code: 'BRL', symbol: 'R$', decimals: 2, locale: 'pt-BR' },
  singapore: { code: 'SGD', symbol: 'S$', decimals: 2, locale: 'en-SG' }
};

async function testCurrencySystem() {
  console.log('🧪 Testing Currency System Comprehensive Suite...\n');
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  
  // Test 1: Currency Mapping Validation
  console.log('📊 Test 1: Currency Mapping Validation');
  console.log('=' .repeat(50));
  
  const testCountries = Object.keys(CURRENCY_MAPPING);
  
  testCountries.forEach(country => {
    totalTests++;
    const currency = CURRENCY_MAPPING[country];
    
    try {
      // Validate currency structure
      if (!currency.code || !currency.symbol || currency.decimals === undefined) {
        throw new Error('Missing required currency fields');
      }
      
      // Test number formatting
      const testAmount = 12345.67;
      const formatter = new Intl.NumberFormat(currency.locale, {
        style: 'currency',
        currency: currency.code,
        minimumFractionDigits: currency.decimals,
        maximumFractionDigits: currency.decimals
      });
      
      const formatted = formatter.format(testAmount);
      console.log(`✅ ${country.padEnd(12)} - ${currency.code} - ${formatted}`);
      passedTests++;
      
    } catch (error) {
      console.log(`❌ ${country.padEnd(12)} - ${currency.code} - Error: ${error.message}`);
      failedTests++;
    }
  });
  
  console.log('');
  
  // Test 2: Number Formatting Variations
  console.log('📊 Test 2: Number Formatting Variations');
  console.log('=' .repeat(50));
  
  const testAmounts = [0, 100, 1000, 10000, 100000, 1000000];
  const sampleCountries = ['usa', 'germany', 'japan', 'india'];
  
  sampleCountries.forEach(country => {
    console.log(`\n💰 ${country.toUpperCase()} (${CURRENCY_MAPPING[country].code}):`);
    
    testAmounts.forEach(amount => {
      totalTests++;
      try {
        const currency = CURRENCY_MAPPING[country];
        const formatter = new Intl.NumberFormat(currency.locale, {
          style: 'currency',
          currency: currency.code,
          minimumFractionDigits: currency.decimals,
          maximumFractionDigits: currency.decimals
        });
        
        const formatted = formatter.format(amount);
        console.log(`  ${amount.toString().padStart(8)}: ${formatted}`);
        passedTests++;
        
      } catch (error) {
        console.log(`  ${amount.toString().padStart(8)}: ❌ Error - ${error.message}`);
        failedTests++;
      }
    });
  });
  
  console.log('');
  
  // Test 3: Currency Conversion Logic
  console.log('📊 Test 3: Currency Conversion Logic');
  console.log('=' .repeat(50));
  
  // Fixed exchange rates for testing
  const FIXED_RATES = {
    USD: { EUR: 0.85, GBP: 0.79, JPY: 150, CAD: 1.35, AUD: 1.52, INR: 83, CNY: 7.25, BRL: 5.0, SGD: 1.34 }
  };
  
  const conversionTests = [
    { from: 'usa', to: 'germany', amount: 1000, expectedRange: [800, 900] },
    { from: 'usa', to: 'japan', amount: 1000, expectedRange: [140000, 160000] },
    { from: 'usa', to: 'uk', amount: 1000, expectedRange: [750, 850] },
    { from: 'usa', to: 'canada', amount: 1000, expectedRange: [1300, 1400] }
  ];
  
  conversionTests.forEach(test => {
    totalTests++;
    try {
      const fromCurrency = CURRENCY_MAPPING[test.from];
      const toCurrency = CURRENCY_MAPPING[test.to];
      const rate = FIXED_RATES.USD[toCurrency.code];
      
      if (!rate) {
        throw new Error(`No exchange rate for ${toCurrency.code}`);
      }
      
      const converted = test.amount * rate;
      const inRange = converted >= test.expectedRange[0] && converted <= test.expectedRange[1];
      
      if (inRange) {
        console.log(`✅ ${test.from} → ${test.to}: ${fromCurrency.symbol}${test.amount} = ${toCurrency.symbol}${converted.toFixed(toCurrency.decimals)}`);
        passedTests++;
      } else {
        console.log(`❌ ${test.from} → ${test.to}: ${converted.toFixed(2)} not in expected range ${test.expectedRange}`);
        failedTests++;
      }
      
    } catch (error) {
      console.log(`❌ ${test.from} → ${test.to}: Error - ${error.message}`);
      failedTests++;
    }
  });
  
  console.log('');
  
  // Test 4: Country Module Currency Validation
  console.log('📊 Test 4: Country Module Currency Validation');
  console.log('=' .repeat(50));
  
  const taxDir = path.join(__dirname, '..', 'lib', 'tax');
  const countryFiles = fs.readdirSync(taxDir)
    .filter(file => file.endsWith('.ts') && file !== 'types.ts' && file !== 'index.ts')
    .filter(file => !file.includes('enhanced') && !file.includes('utils'))
    .slice(0, 10); // Test first 10 files
  
  countryFiles.forEach(file => {
    totalTests++;
    const countryKey = file.replace('.ts', '');
    
    try {
      const filePath = path.join(taxDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Extract currency from file
      const currencyMatch = content.match(/currency: '(\w+)'/);
      if (!currencyMatch) {
        throw new Error('Currency field not found');
      }
      
      const fileCurrency = currencyMatch[1];
      
      // Check if it's a valid currency code
      const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'INR', 'CNY', 'BRL', 'SGD', 
                              'CHF', 'NOK', 'SEK', 'DKK', 'PLN', 'CZK', 'RON', 'KRW', 'HKD', 'TWD',
                              'THB', 'MYR', 'IDR', 'PHP', 'VND', 'AED', 'SAR', 'ILS', 'TRY', 'IRR',
                              'IQD', 'EGP', 'ZAR', 'DZD', 'ARS', 'CLP', 'COP', 'PEN', 'RUB', 'KZT',
                              'BDT', 'PKR'];
      
      if (validCurrencies.includes(fileCurrency)) {
        console.log(`✅ ${countryKey.padEnd(15)} - Currency: ${fileCurrency}`);
        passedTests++;
      } else {
        console.log(`❌ ${countryKey.padEnd(15)} - Invalid currency: ${fileCurrency}`);
        failedTests++;
      }
      
    } catch (error) {
      console.log(`❌ ${countryKey.padEnd(15)} - Error: ${error.message}`);
      failedTests++;
    }
  });
  
  console.log('');
  
  // Test 5: Percentage Formatting
  console.log('📊 Test 5: Percentage Formatting');
  console.log('=' .repeat(50));
  
  const percentageTests = [0.1, 0.15, 0.22, 0.37, 0.45];
  const percentageCountries = ['usa', 'germany', 'japan'];
  
  percentageCountries.forEach(country => {
    console.log(`\n📊 ${country.toUpperCase()}:`);
    
    percentageTests.forEach(rate => {
      totalTests++;
      try {
        const currency = CURRENCY_MAPPING[country];
        const formatter = new Intl.NumberFormat(currency.locale, {
          style: 'percent',
          minimumFractionDigits: 1,
          maximumFractionDigits: 1
        });
        
        const formatted = formatter.format(rate);
        console.log(`  ${(rate * 100).toFixed(1)}% → ${formatted}`);
        passedTests++;
        
      } catch (error) {
        console.log(`  ${(rate * 100).toFixed(1)}% → ❌ Error - ${error.message}`);
        failedTests++;
      }
    });
  });
  
  console.log('');
  
  // Test Summary
  console.log('📈 Currency System Test Results');
  console.log('=' .repeat(50));
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📊 Total: ${totalTests}`);
  console.log(`📊 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  if (failedTests === 0) {
    console.log('🎉 All tests passed! Currency system is working correctly.');
  } else {
    console.log(`⚠️  ${failedTests} tests failed. Review the errors above.`);
  }
  
  console.log('\n📝 Next Steps:');
  console.log('1. Integrate currency formatting into the calculator UI');
  console.log('2. Add currency conversion toggle for cross-country comparisons');
  console.log('3. Test with real tax calculations');
  console.log('4. Add currency selection dropdown for comparisons');
  
  return failedTests === 0;
}

// Run the comprehensive test
testCurrencySystem().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Currency system test failed:', error);
  process.exit(1);
});

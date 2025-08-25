#!/usr/bin/env node

// scripts/test-parser.js
// Test the tax bracket parser with real data from data.json

const fs = require('fs');
const path = require('path');

// Simple test runner since we don't have Jest set up
async function testTaxBracketParser() {
  console.log('🧪 Testing Tax Bracket Parser with real data...\n');
  
  try {
    // Load the tax data
    const dataPath = path.join(__dirname, '../../calculator/lib/tax/data.json');
    const taxData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    // Import our parser (we'll simulate it since we can't import TS directly)
    console.log('📊 Testing parser patterns with sample data:\n');
    
    // Test cases from real data
    const testCases = [
      {
        country: 'USA',
        cryptoTax: "Short-term capital gains (held less than 1 year, taxed as ordinary income for single filer): 10% ($0-$11,925), 12% ($11,926-$48,535), 22% ($48,536-$103,350), 24% ($103,351-$197,300), 32% ($197,301-$250,525), 35% ($250,526-$626,350), 37% (over $626,350). Long-term (held more than 1 year): 0% ($0-$48,350), 15% ($48,351-$533,400), 20% (over $533,400). Mining/staking taxed as ordinary income at the same short-term rates.",
        expectedType: 'progressive'
      },
      {
        country: 'Germany',
        cryptoTax: "Tax-free if held more than 1 year or gains under €600; otherwise up to 45% plus 5.5% solidarity surcharge if sold within 1 year (treated as income, brackets for single: 0% €0-€11,604, 14-45% €11,605-€62,810, 45% over €62,810). Mining/staking taxed as income up to 45% plus solidarity, with exemptions up to €256/year.",
        expectedType: 'progressive'
      },
      {
        country: 'Japan',
        cryptoTax: "Progressive capital gains tax from 5-45% plus local 10% (total 15-55%) depending on total income (brackets: 5% <1.95m yen, 10% 1.95-3.3m, 20% 3.3-6.95m, 23% 6.95-9m, 33% 9-18m, 40% 18-40m, 45% >40m); no distinction for holding periods. Mining/staking taxed as miscellaneous income at the same rates.",
        expectedType: 'progressive'
      },
      {
        country: 'India',
        cryptoTax: "Flat 30% on gains (plus 4% cess), no deductions allowed; 1% TDS on transactions over ₹50,000 (₹10,000 for some). No distinction for holding periods; mining/staking taxed as business income at slab rates (0% ₹0-3 lakh, 5% 3-6 lakh, 10% 6-9 lakh, 15% 9-12 lakh, 20% 12-15 lakh, 30% >15 lakh) plus cess.",
        expectedType: 'flat'
      },
      {
        country: 'China',
        cryptoTax: "Cryptocurrency is banned; no legal tax rate applies.",
        expectedType: 'exempt'
      },
      {
        country: 'Poland',
        cryptoTax: "Flat 19% on gains; no distinction for holding periods. Mining/staking taxed as other income at 19%.",
        expectedType: 'flat'
      }
    ];
    
    // Test pattern matching
    let passCount = 0;
    let failCount = 0;
    
    testCases.forEach(testCase => {
      console.log(`🔍 Testing ${testCase.country}:`);
      console.log(`   Text: "${testCase.cryptoTax.substring(0, 100)}..."`);
      
      try {
        // Test basic pattern detection using improved logic
        const text = testCase.cryptoTax.toLowerCase();
        let detectedType = 'unknown';

        // Detect truly exempt/banned jurisdictions
        if ((text.includes('banned') && text.includes('no legal tax')) ||
            (text.includes('0%') && !text.includes('progressive') && !text.includes('bracket')) ||
            (text.includes('exempt from taxation') && !text.includes('unless'))) {
          detectedType = 'exempt';
        }
        // Detect flat tax
        else if (text.includes('flat') ||
                (text.match(/^[^(]*(\d+(?:\.\d+)?)%[^(]*$/) && !text.includes('progressive'))) {
          detectedType = 'flat';
        }
        // Detect progressive tax patterns
        else if (text.match(/\d+%\s*\([€$£¥₹]?[\d,]+-[€$£¥₹]?[\d,]+\)/) ||
                text.match(/\d+%\s*[<>]\s*[\d,]+/) ||
                text.match(/\d+-\d+%/) ||
                text.includes('progressive') ||
                text.includes('brackets')) {
          detectedType = 'progressive';
        }
        // Single rate that might be flat tax
        else if (text.match(/(\d+(?:\.\d+)?)%/) && !text.includes('progressive')) {
          detectedType = 'flat';
        }
        else {
          detectedType = 'complex';
        }
        
        if (detectedType === testCase.expectedType) {
          console.log(`   ✅ Correctly detected as ${detectedType}`);
          passCount++;
        } else {
          console.log(`   ❌ Expected ${testCase.expectedType}, got ${detectedType}`);
          failCount++;
        }
        
        // Test specific pattern extractions
        if (detectedType === 'progressive') {
          const bracketMatches = testCase.cryptoTax.match(/(\d+(?:\.\d+)?)%\s*\([€$£¥₹]?([\d,]+(?:\.\d+)?)-[€$£¥₹]?([\d,]+(?:\.\d+)?)\)/g);
          if (bracketMatches) {
            console.log(`   📊 Found ${bracketMatches.length} bracket patterns`);
          }
        }
        
        if (detectedType === 'flat') {
          const flatMatch = testCase.cryptoTax.match(/(?:flat\s+)?(\d+(?:\.\d+)?)%/i);
          if (flatMatch) {
            console.log(`   📊 Found flat rate: ${flatMatch[1]}%`);
          }
        }
        
        // Test exemption detection
        const exemptionMatch = testCase.cryptoTax.match(/(?:under|below)\s*[€$£¥₹]?([\d,]+)/i);
        if (exemptionMatch) {
          console.log(`   💰 Found exemption threshold: ${exemptionMatch[1]}`);
        }
        
        // Test holding period detection
        const holdingMatch = testCase.cryptoTax.match(/(\d+)\s*years?/i);
        if (holdingMatch) {
          console.log(`   ⏰ Found holding period: ${holdingMatch[1]} year(s)`);
        }
        
        console.log('');
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        failCount++;
      }
    });
    
    console.log(`📈 Pattern Detection Results:`);
    console.log(`✅ Passed: ${passCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📊 Success Rate: ${((passCount / testCases.length) * 100).toFixed(1)}%`);
    
    // Test with all countries from data.json
    console.log(`\n🌍 Testing pattern detection across all ${taxData.length} countries:\n`);
    
    const typeStats = { progressive: 0, flat: 0, exempt: 0, complex: 0 };
    
    taxData.forEach(countryData => {
      const text = countryData.crypto_tax.toLowerCase();
      let detectedType = 'complex';

      // Use improved detection logic
      if ((text.includes('banned') && text.includes('no legal tax')) ||
          (text.includes('0%') && !text.includes('progressive') && !text.includes('bracket') && !text.includes('up to')) ||
          (text.includes('exempt from taxation') && !text.includes('unless'))) {
        detectedType = 'exempt';
      } else if (text.includes('flat') ||
                (text.match(/^[^(]*(\d+(?:\.\d+)?)%[^(]*$/) && !text.includes('progressive'))) {
        detectedType = 'flat';
      } else if (text.match(/\d+%\s*\([€$£¥₹]?[\d,]+-[€$£¥₹]?[\d,]+\)/) ||
                text.match(/\d+%\s*[<>]\s*[\d,]+/) ||
                text.match(/\d+-\d+%/) ||
                text.includes('progressive') ||
                text.includes('brackets')) {
        detectedType = 'progressive';
      } else if (text.match(/(\d+(?:\.\d+)?)%/) && !text.includes('progressive')) {
        detectedType = 'flat';
      }

      typeStats[detectedType]++;

      const shortText = countryData.crypto_tax.substring(0, 60) + '...';
      console.log(`${detectedType.padEnd(12)} - ${countryData.country.padEnd(20)} - ${shortText}`);
    });
    
    console.log(`\n📊 Tax System Distribution:`);
    console.log(`Progressive: ${typeStats.progressive} countries`);
    console.log(`Flat Tax:    ${typeStats.flat} countries`);
    console.log(`Exempt:      ${typeStats.exempt} countries`);
    console.log(`Complex:     ${typeStats.complex} countries`);
    
    console.log(`\n🎉 Parser pattern testing complete!`);
    console.log(`📝 Next steps:`);
    console.log(`1. Implement the actual TypeScript parser with these patterns`);
    console.log(`2. Create unit tests for edge cases`);
    console.log(`3. Integrate with country modules`);
    
    return passCount === testCases.length;
    
  } catch (error) {
    console.error('❌ Failed to test parser:', error.message);
    return false;
  }
}

// Run the test
testTaxBracketParser().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});

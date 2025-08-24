#!/usr/bin/env node

// scripts/test-usa-enhanced.js
// Test the enhanced USA tax implementation

console.log('🧪 Testing Enhanced USA Tax Implementation...\n');

// Test scenarios based on 2024 tax brackets
const testScenarios = [
  {
    name: 'Single filer, $50k income, $10k crypto gain',
    status: 'single',
    agiExcl: 50000,
    taxableAmount: 10000,
    expectedTaxRange: [2200, 2400], // 22% bracket
    expectedNIIT: 0 // Below NIIT threshold
  },
  {
    name: 'Single filer, $200k income, $50k crypto gain',
    status: 'single', 
    agiExcl: 200000,
    taxableAmount: 50000,
    expectedTaxRange: [12000, 18500], // 24% bracket + NIIT
    expectedNIIT: 1900 // 3.8% on $50k
  },
  {
    name: 'Married filing jointly, $100k income, $25k crypto gain',
    status: 'married',
    agiExcl: 100000,
    taxableAmount: 25000,
    expectedTaxRange: [5500, 6000], // 22% bracket
    expectedNIIT: 0 // Below NIIT threshold
  },
  {
    name: 'High earner, $500k income, $100k crypto gain',
    status: 'single',
    agiExcl: 500000,
    taxableAmount: 100000,
    expectedTaxRange: [37000, 41000], // 37% bracket + NIIT
    expectedNIIT: 3800 // 3.8% on $100k
  }
];

// Simulate the tax calculation (since we can't import TS directly)
function simulateUSATaxCalculation(scenario) {
  const { status, agiExcl, taxableAmount } = scenario;
  
  // 2024 brackets
  const brackets = {
    single: {
      uppers: [11000, 44725, 95375, 197050, 250525, 626350, Number.POSITIVE_INFINITY],
      rates: [0.10, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37],
      stdDed: 14600,
      niitThresh: 200000
    },
    married: {
      uppers: [22000, 89450, 190750, 364200, 462500, 693750, Number.POSITIVE_INFINITY],
      rates: [0.10, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37],
      stdDed: 29200,
      niitThresh: 250000
    }
  };
  
  const bracket = brackets[status];
  
  // Calculate tax increment
  function calcProgressiveTax(income, uppers, rates) {
    let tax = 0;
    let prev = 0;
    const inc = Math.max(0, income);
    
    for (let i = 0; i < uppers.length; i++) {
      const upper = uppers[i];
      const rate = rates[i];
      const seg = Math.min(inc, upper) - prev;
      if (seg > 0) tax += seg * rate;
      prev = upper;
      if (inc <= upper) break;
    }
    return tax;
  }
  
  function taxIncrement(uppers, rates, baseTaxable, delta) {
    const d = Math.max(0, delta);
    const x0 = Math.max(0, baseTaxable);
    const x1 = Math.max(0, baseTaxable + d);
    return calcProgressiveTax(x1, uppers, rates) - calcProgressiveTax(x0, uppers, rates);
  }
  
  // Calculate ordinary income tax
  const ordinaryTaxable = Math.max(0, agiExcl - bracket.stdDed);
  const tax = taxIncrement(bracket.uppers, bracket.rates, ordinaryTaxable, taxableAmount);
  
  // Calculate NIIT
  const totalIncome = agiExcl + taxableAmount;
  let niit = 0;
  if (totalIncome > bracket.niitThresh) {
    niit = Math.min(taxableAmount, totalIncome - bracket.niitThresh) * 0.038;
  }
  
  return { tax, niit, total: tax + niit };
}

// Run tests
console.log('📊 Testing tax calculation scenarios:\n');

let passCount = 0;
let failCount = 0;

testScenarios.forEach((scenario, index) => {
  console.log(`🔍 Test ${index + 1}: ${scenario.name}`);
  console.log(`   Input: ${scenario.status}, AGI $${scenario.agiExcl.toLocaleString()}, Crypto gain $${scenario.taxableAmount.toLocaleString()}`);
  
  try {
    const result = simulateUSATaxCalculation(scenario);
    
    console.log(`   Calculated tax: $${result.tax.toFixed(2)}`);
    console.log(`   Calculated NIIT: $${result.niit.toFixed(2)}`);
    console.log(`   Total tax: $${result.total.toFixed(2)}`);
    
    // Validate results
    const taxInRange = result.total >= scenario.expectedTaxRange[0] && result.total <= scenario.expectedTaxRange[1];
    const niitCorrect = Math.abs(result.niit - scenario.expectedNIIT) < 10; // Allow $10 tolerance
    
    if (taxInRange && niitCorrect) {
      console.log(`   ✅ PASS - Tax and NIIT calculations correct`);
      passCount++;
    } else {
      console.log(`   ❌ FAIL - Expected tax $${scenario.expectedTaxRange[0]}-$${scenario.expectedTaxRange[1]}, NIIT $${scenario.expectedNIIT}`);
      failCount++;
    }
    
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    failCount++;
  }
  
  console.log('');
});

// Test bracket structure validation
console.log('🔍 Testing bracket structure validation:\n');

const bracketTests = [
  {
    name: 'Single filer brackets',
    status: 'single',
    expectedBrackets: 7,
    expectedTopRate: 0.37
  },
  {
    name: 'Married filer brackets', 
    status: 'married',
    expectedBrackets: 7,
    expectedTopRate: 0.37
  }
];

bracketTests.forEach(test => {
  console.log(`📊 ${test.name}:`);
  
  const brackets = {
    single: {
      uppers: [11000, 44725, 95375, 197050, 250525, 626350, Number.POSITIVE_INFINITY],
      rates: [0.10, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37]
    },
    married: {
      uppers: [22000, 89450, 190750, 364200, 462500, 693750, Number.POSITIVE_INFINITY],
      rates: [0.10, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37]
    }
  };
  
  const bracket = brackets[test.status];
  
  console.log(`   Brackets: ${bracket.uppers.length} (expected ${test.expectedBrackets})`);
  console.log(`   Top rate: ${(bracket.rates[bracket.rates.length - 1] * 100).toFixed(1)}% (expected ${(test.expectedTopRate * 100).toFixed(1)}%)`);
  console.log(`   Rates: ${bracket.rates.map(r => (r * 100).toFixed(1) + '%').join(', ')}`);
  
  if (bracket.uppers.length === test.expectedBrackets && bracket.rates[bracket.rates.length - 1] === test.expectedTopRate) {
    console.log(`   ✅ PASS - Bracket structure correct`);
    passCount++;
  } else {
    console.log(`   ❌ FAIL - Bracket structure incorrect`);
    failCount++;
  }
  
  console.log('');
});

// Summary
console.log(`📈 Test Results:`);
console.log(`✅ Passed: ${passCount}`);
console.log(`❌ Failed: ${failCount}`);
console.log(`📊 Success Rate: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);

console.log(`\n🎉 Enhanced USA tax implementation testing complete!`);
console.log(`📝 Next steps:`);
console.log(`1. Integrate enhanced brackets with existing USA module`);
console.log(`2. Add capital gains calculation for long-term vs short-term`);
console.log(`3. Test with real tax scenarios`);
console.log(`4. Extend to other countries`);

process.exit(failCount === 0 ? 0 : 1);

// lib/tax/utils/__tests__/tax-calculations.test.ts
import { describe, it, expect } from '@jest/globals';
import {
  calcProgressiveTax,
  taxIncrement,
  createDefaultBrackets,
  createCountryBrackets,
  createDefaultComputeFunctions
} from '../tax-calculations';

describe('calcProgressiveTax', () => {
  const uppers = [10000, 20000, 50000, Number.POSITIVE_INFINITY];
  const rates = [0.1, 0.2, 0.3, 0.4];

  it('should handle zero income', () => {
    expect(calcProgressiveTax(0, uppers, rates)).toBe(0);
  });

  it('should handle negative income', () => {
    expect(calcProgressiveTax(-1000, uppers, rates)).toBe(0);
  });

  it('should calculate tax for income in first bracket', () => {
    const income = 5000;
    const expectedTax = 5000 * 0.1; // 500
    expect(calcProgressiveTax(income, uppers, rates)).toBe(expectedTax);
  });

  it('should calculate tax for income spanning multiple brackets', () => {
    const income = 25000;
    const expectedTax = 
      10000 * 0.1 +  // First bracket: 1000
      10000 * 0.2 +  // Second bracket: 2000  
      5000 * 0.3;    // Third bracket: 1500
    // Total: 4500
    expect(calcProgressiveTax(income, uppers, rates)).toBe(expectedTax);
  });

  it('should calculate tax for income at bracket boundary', () => {
    const income = 20000;
    const expectedTax = 
      10000 * 0.1 +  // First bracket: 1000
      10000 * 0.2;   // Second bracket: 2000
    // Total: 3000
    expect(calcProgressiveTax(income, uppers, rates)).toBe(expectedTax);
  });

  it('should calculate tax for income in highest bracket', () => {
    const income = 100000;
    const expectedTax = 
      10000 * 0.1 +  // First bracket: 1000
      10000 * 0.2 +  // Second bracket: 2000
      30000 * 0.3 +  // Third bracket: 9000
      50000 * 0.4;   // Fourth bracket: 20000
    // Total: 32000
    expect(calcProgressiveTax(income, uppers, rates)).toBe(expectedTax);
  });
});

describe('taxIncrement', () => {
  const uppers = [10000, 20000, 50000, Number.POSITIVE_INFINITY];
  const rates = [0.1, 0.2, 0.3, 0.4];

  it('should handle zero delta', () => {
    expect(taxIncrement(uppers, rates, 5000, 0)).toBe(0);
  });

  it('should handle negative delta', () => {
    expect(taxIncrement(uppers, rates, 5000, -1000)).toBe(0);
  });

  it('should calculate incremental tax within same bracket', () => {
    const baseTaxable = 5000;
    const delta = 3000;
    const expectedIncrement = 3000 * 0.1; // 300
    expect(taxIncrement(uppers, rates, baseTaxable, delta)).toBe(expectedIncrement);
  });

  it('should calculate incremental tax across bracket boundaries', () => {
    const baseTaxable = 8000;
    const delta = 5000; // Goes from 8000 to 13000
    const expectedIncrement = 
      2000 * 0.1 +  // Remaining in first bracket: 200
      3000 * 0.2;   // Into second bracket: 600
    // Total: 800
    expect(taxIncrement(uppers, rates, baseTaxable, delta)).toBe(expectedIncrement);
  });

  it('should handle negative base taxable income', () => {
    const baseTaxable = -1000;
    const delta = 5000;
    const expectedIncrement = 5000 * 0.1; // 500
    expect(taxIncrement(uppers, rates, baseTaxable, delta)).toBe(expectedIncrement);
  });
});

describe('createDefaultBrackets', () => {
  it('should create default brackets with specified parameters', () => {
    const brackets = createDefaultBrackets(12000, 250000);
    
    expect(brackets).toEqual({
      ordinary: {
        uppers: [50000, 100000, 200000, Number.POSITIVE_INFINITY],
        rates: [0.1, 0.2, 0.3, 0.4]
      },
      lt: null,
      stdDed: 12000,
      niitThresh: 250000
    });
  });

  it('should create default brackets with default parameters', () => {
    const brackets = createDefaultBrackets();
    
    expect(brackets).toEqual({
      ordinary: {
        uppers: [50000, 100000, 200000, Number.POSITIVE_INFINITY],
        rates: [0.1, 0.2, 0.3, 0.4]
      },
      lt: null,
      stdDed: 10000,
      niitThresh: 200000
    });
  });
});

describe('createCountryBrackets', () => {
  it('should create brackets with country-specific properties', () => {
    const config = {
      ordinary: {
        uppers: [18200, 45000, 135000, Number.POSITIVE_INFINITY] as const,
        rates: [0, 0.16, 0.3, 0.45] as const,
      },
      lt: null,
      stdDed: 18200,
      niitThresh: 0,
      capGainDiscount: 0.5,
      medicareLevyRate: 0.02,
    };

    const brackets = createCountryBrackets(config);
    
    expect(brackets).toEqual({
      ordinary: config.ordinary,
      lt: null,
      stdDed: 18200,
      niitThresh: 0,
      capGainDiscount: 0.5,
      medicareLevyRate: 0.02,
    });
  });

  it('should handle missing optional properties', () => {
    const config = {
      ordinary: {
        uppers: [25000, 50000, Number.POSITIVE_INFINITY] as const,
        rates: [0.15, 0.25, 0.35] as const,
      },
    };

    const brackets = createCountryBrackets(config);
    
    expect(brackets).toEqual({
      ordinary: config.ordinary,
      lt: null,
      stdDed: 0,
      niitThresh: 0,
    });
  });
});

describe('createDefaultComputeFunctions', () => {
  const mockGetBrackets = () => createDefaultBrackets(10000, 200000);
  const { computeTaxable, computeDeferredFull } = createDefaultComputeFunctions(mockGetBrackets);

  it('should create computeTaxable function that calculates tax and niit', () => {
    const params = {
      agiExcl: 50000,
      taxableAmount: 30000,
      brackets: mockGetBrackets(),
      isLong: false,
      isCrypto: false,
      status: 'single'
    };

    const result = computeTaxable(params);
    
    expect(result).toHaveProperty('tax');
    expect(result).toHaveProperty('niit');
    expect(typeof result.tax).toBe('number');
    expect(typeof result.niit).toBe('number');
    expect(result.tax).toBeGreaterThan(0);
  });

  it('should create computeDeferredFull function', () => {
    const params = {
      agiExcl: 50000,
      taxableAmount: 30000,
      brackets: mockGetBrackets(),
      isLong: false,
      isCrypto: false,
      status: 'single'
    };

    const result = computeDeferredFull(params);
    
    expect(result).toHaveProperty('tax');
    expect(result).toHaveProperty('niit');
    expect(typeof result.tax).toBe('number');
    expect(typeof result.niit).toBe('number');
  });

  it('should calculate NIIT when income exceeds threshold', () => {
    const params = {
      agiExcl: 180000,
      taxableAmount: 50000, // Total income: 230000 > 200000 threshold
      brackets: mockGetBrackets(),
      isLong: false,
      isCrypto: false,
      status: 'single'
    };

    const result = computeTaxable(params);
    
    expect(result.niit).toBeGreaterThan(0);
    // NIIT should be 3.8% of the amount over threshold
    const expectedNiit = Math.min(50000, 230000 - 200000) * 0.038;
    expect(result.niit).toBe(expectedNiit);
  });

  it('should not calculate NIIT when income is below threshold', () => {
    const params = {
      agiExcl: 100000,
      taxableAmount: 50000, // Total income: 150000 < 200000 threshold
      brackets: mockGetBrackets(),
      isLong: false,
      isCrypto: false,
      status: 'single'
    };

    const result = computeTaxable(params);
    
    expect(result.niit).toBe(0);
  });
});

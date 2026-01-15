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
    // When baseTaxable is negative, it's treated as 0
    // x0 = max(0, -1000) = 0, x1 = max(0, -1000 + 5000) = 4000
    // Tax on income 0 to 4000 = 4000 * 0.1 = 400
    const expectedIncrement = 4000 * 0.1; // 400
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

// Country-specific tests for tax data accuracy (Story 3.7)
// Updated with additional tests for code review fixes
describe('Country-specific tax calculations', () => {
  describe('USA long-term crypto gains', () => {
    const { usa } = require('../../usa');

    it('should apply LTCG rates to crypto held over 1 year', () => {
      const brackets = usa.getBrackets('single');
      // Test that crypto with isLong=true gets LTCG treatment
      const result = usa.computeTaxable({
        country: 'usa',
        status: 'single',
        agiExcl: 50000,
        taxableAmount: 20000,
        isLong: true, // Over 1 year
        brackets,
        isCrypto: true,
        years: 1.5,
      });
      // With $50k income and $20k LTCG, should be in 0% LTCG bracket
      // since total ($70k after deduction) is below $48,350 threshold
      expect(result.tax).toBeLessThan(20000 * 0.22); // Should be less than ordinary rate
    });

    it('should tax short-term crypto as ordinary income', () => {
      const brackets = usa.getBrackets('single');
      const result = usa.computeTaxable({
        country: 'usa',
        status: 'single',
        agiExcl: 50000,
        taxableAmount: 20000,
        isLong: false, // Short-term
        brackets,
        isCrypto: true,
        years: 0.5,
      });
      // Short-term should be taxed at ordinary income rates
      expect(result.tax).toBeGreaterThan(0);
    });
  });

  describe('Portugal crypto tax rules', () => {
    const { portugal } = require('../../portugal');

    it('should return zero tax for crypto held over 1 year', () => {
      const brackets = portugal.getBrackets('single');
      const result = portugal.computeTaxable({
        country: 'portugal',
        status: 'single',
        agiExcl: 30000,
        taxableAmount: 10000,
        isLong: true,
        brackets,
        isCrypto: true,
        years: 1.5, // Over 1 year
      });
      expect(result.tax).toBe(0);
    });

    it('should tax short-term crypto at 28%', () => {
      const brackets = portugal.getBrackets('single');
      const result = portugal.computeTaxable({
        country: 'portugal',
        status: 'single',
        agiExcl: 30000,
        taxableAmount: 10000,
        isLong: false,
        brackets,
        isCrypto: true,
        years: 0.5, // Under 1 year
      });
      expect(result.tax).toBe(10000 * 0.28); // 28% flat rate
    });

    it('should have computeSetupTax function', () => {
      expect(portugal.computeSetupTax).toBeDefined();
    });
  });

  describe('South Korea crypto postponement', () => {
    const { southkorea } = require('../../southkorea');

    it('should return zero tax for crypto while postponed (before 2026)', () => {
      const brackets = southkorea.getBrackets('single');
      // Mock the date check by verifying the postponedUntil bracket property
      expect(brackets.postponedUntil).toBe('2026-01-01');

      // Test the computation
      const result = southkorea.computeTaxable({
        country: 'southkorea',
        status: 'single',
        agiExcl: 50000000, // KRW
        taxableAmount: 10000000, // KRW 10M gain
        isLong: false,
        brackets,
        isCrypto: true,
        years: 0.5,
      });

      // Current date should be before 2026-01-01, so tax should be 0
      // (Note: This test will need updating after 2026-01-01)
      const currentDate = new Date();
      const postponedDate = new Date('2026-01-01');
      if (currentDate < postponedDate) {
        expect(result.tax).toBe(0);
      } else {
        // After 2026: 20% on gains over KRW 2.5M
        const expectedTax = (10000000 - 2500000) * 0.20;
        expect(result.tax).toBe(expectedTax);
      }
    });

    it('should have computeSetupTax function', () => {
      expect(southkorea.computeSetupTax).toBeDefined();
    });
  });


  describe('Germany crypto tax', () => {
    // Import Germany module
    const { germany } = require('../../germany');

    it('should have updated crypto small exemption of €1,000 (2024+)', () => {
      const brackets = germany.getBrackets('single');
      expect(brackets.cryptoSmallExempt).toBe(1000);
    });

    it('should have 1-year crypto hold exemption', () => {
      const brackets = germany.getBrackets('single');
      expect(brackets.cryptoHoldFree).toBe(1);
    });

    it('should return zero tax for crypto held over 1 year', () => {
      const brackets = germany.getBrackets('single');
      const result = germany.computeTaxable({
        country: 'germany',
        status: 'single',
        agiExcl: 50000,
        taxableAmount: 10000,
        isLong: true,
        brackets,
        isCrypto: true,
        years: 1.5, // Held for 1.5 years
      });
      expect(result.tax).toBe(0);
      expect(result.niit).toBe(0);
    });

    it('should return zero tax for crypto gains under €1,000 exemption', () => {
      const brackets = germany.getBrackets('single');
      const result = germany.computeTaxable({
        country: 'germany',
        status: 'single',
        agiExcl: 50000,
        taxableAmount: 800, // Under €1,000 exemption
        isLong: false,
        brackets,
        isCrypto: true,
        years: 0.5, // Short-term
      });
      expect(result.tax).toBe(0);
      expect(result.niit).toBe(0);
    });

    it('should tax crypto gains over €1,000 at progressive rates', () => {
      const brackets = germany.getBrackets('single');
      const result = germany.computeTaxable({
        country: 'germany',
        status: 'single',
        agiExcl: 50000,
        taxableAmount: 5000, // Over €1,000 exemption
        isLong: false,
        brackets,
        isCrypto: true,
        years: 0.5, // Short-term
      });
      expect(result.tax).toBeGreaterThan(0);
    });
  });

  describe('UK capital gains tax', () => {
    const { uk } = require('../../uk');

    it('should have £3,000 annual CGT exemption for 2025/26', () => {
      const brackets = uk.getBrackets();
      expect(brackets.annualExempt).toBe(3000);
    });

    it('should have 18% basic rate and 24% higher rate', () => {
      const brackets = uk.getBrackets();
      expect(brackets.capGainRateBasic).toBe(0.18);
      expect(brackets.capGainRateHigher).toBe(0.24);
    });

    it('should return zero tax for gains under £3,000 allowance', () => {
      const brackets = uk.getBrackets();
      const result = uk.computeTaxable({
        country: 'uk',
        status: 'single',
        agiExcl: 30000,
        taxableAmount: 2500, // Under £3,000 allowance
        isLong: true,
        brackets,
        isCrypto: false,
        years: 2,
      });
      expect(result.tax).toBe(0);
    });

    it('should tax gains over £3,000 at appropriate rates', () => {
      const brackets = uk.getBrackets();
      const result = uk.computeTaxable({
        country: 'uk',
        status: 'single',
        agiExcl: 30000, // Basic rate taxpayer
        taxableAmount: 10000, // £7,000 taxable after £3,000 allowance
        isLong: true,
        brackets,
        isCrypto: false,
        years: 2,
      });
      // Expected: £7,000 * 18% = £1,260
      expect(result.tax).toBe(7000 * 0.18);
    });
  });

  describe('India crypto tax', () => {
    const { india } = require('../../india');

    it('should tax crypto at flat 31.2% (30% + 4% cess)', () => {
      const brackets = india.getBrackets('single');
      const result = india.computeTaxable({
        country: 'india',
        status: 'single',
        agiExcl: 500000,
        taxableAmount: 100000, // ₹1 lakh crypto gain
        isLong: false,
        brackets,
        isCrypto: true,
        years: 0.5,
      });
      // Expected: ₹100,000 * 31.2% = ₹31,200
      expect(result.tax).toBe(100000 * 0.312);
    });

    it('should apply 1% TDS penalty for crypto over ₹50,000', () => {
      const brackets = india.getBrackets('single');
      const result = india.computeTaxable({
        country: 'india',
        status: 'single',
        agiExcl: 500000,
        taxableAmount: 100000, // Over ₹50,000 threshold
        isLong: false,
        brackets,
        isCrypto: true,
        years: 0.5,
      });
      expect(result.penalty).toBe(100000 * 0.01); // 1% TDS
    });
  });

  describe('USA retirement account limits', () => {
    const { usa } = require('../../usa');

    it('should have correct 2026 IRA contribution limit in description', () => {
      const iraSetup = usa.setups.find((s: any) => s.name === 'Traditional IRA');
      expect(iraSetup.fees).toContain('7,500');
    });

    it('should have correct 2026 401k contribution limit in description', () => {
      const setup = usa.setups.find((s: any) => s.name === '401k Traditional');
      expect(setup.fees).toContain('24,500');
    });

    it('should have 10% early withdrawal penalty', () => {
      const iraSetup = usa.setups.find((s: any) => s.name === 'Traditional IRA');
      expect(iraSetup.penaltyRate).toBe(0.1);
    });

    it('should have 59.5 threshold age for penalty-free withdrawal', () => {
      const iraSetup = usa.setups.find((s: any) => s.name === 'Roth IRA');
      expect(iraSetup.thresholdAge).toBe(59.5);
    });
  });

  describe('Australia CGT discount', () => {
    const { australia } = require('../../australia');

    it('should have 50% CGT discount for holdings over 12 months', () => {
      const brackets = australia.getBrackets();
      expect(brackets.capGainDiscount).toBe(0.5);
    });

    it('should apply 50% discount for long-term gains', () => {
      const brackets = australia.getBrackets();
      const result = australia.computeTaxable({
        country: 'australia',
        status: 'single',
        agiExcl: 50000,
        taxableAmount: 20000,
        isLong: true, // Over 12 months
        brackets,
        isCrypto: true,
        years: 1.5,
      });
      // With 50% discount, only $10,000 is taxable
      // Tax should be calculated on $10,000 at marginal rates
      expect(result.tax).toBeLessThan(20000 * 0.45); // Should be less than max rate on full amount
    });
  });
});

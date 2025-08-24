// tests/tax/bracket-parser.test.ts
// Unit tests for the tax bracket parser

import { TaxBracketParser } from '../../lib/tax/parsers/bracket-parser';

describe('TaxBracketParser', () => {
  describe('parse', () => {
    test('should parse USA progressive brackets', () => {
      const cryptoTax = "Short-term capital gains (held less than 1 year, taxed as ordinary income for single filer): 10% ($0-$11,925), 12% ($11,926-$48,535), 22% ($48,536-$103,350), 24% ($103,351-$197,300), 32% ($197,301-$250,525), 35% ($250,526-$626,350), 37% (over $626,350). Long-term (held more than 1 year): 0% ($0-$48,350), 15% ($48,351-$533,400), 20% (over $533,400).";
      
      const result = TaxBracketParser.parse(cryptoTax, 'USD');
      
      expect(result.type).toBe('progressive');
      expect(result.brackets).toBeDefined();
      expect(result.brackets!.uppers).toEqual([11925, 48535, 103350, 197300, 250525, 626350, Number.POSITIVE_INFINITY]);
      expect(result.brackets!.rates).toEqual([0.10, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37]);
    });

    test('should parse Germany exemption and progressive brackets', () => {
      const cryptoTax = "Tax-free if held more than 1 year or gains under €600; otherwise up to 45% plus 5.5% solidarity surcharge if sold within 1 year (treated as income, brackets for single: 0% €0-€11,604, 14-45% €11,605-€62,810, 45% over €62,810).";
      
      const result = TaxBracketParser.parse(cryptoTax, 'EUR');
      
      expect(result.type).toBe('progressive');
      expect(result.exemptions).toBeDefined();
      expect(result.exemptions!.annualThreshold).toBe(600);
      expect(result.holdingPeriodMonths).toBe(12);
      expect(result.brackets).toBeDefined();
    });

    test('should parse Japan progressive brackets with yen millions', () => {
      const cryptoTax = "Progressive capital gains tax from 5-45% plus local 10% (total 15-55%) depending on total income (brackets: 5% <1.95m yen, 10% 1.95-3.3m, 20% 3.3-6.95m, 23% 6.95-9m, 33% 9-18m, 40% 18-40m, 45% >40m yen).";
      
      const result = TaxBracketParser.parse(cryptoTax, 'JPY');
      
      expect(result.type).toBe('progressive');
      expect(result.brackets).toBeDefined();
      expect(result.brackets!.uppers[0]).toBe(1950000); // 1.95m yen
    });

    test('should parse India flat tax with exemptions', () => {
      const cryptoTax = "Flat 30% on gains (plus 4% cess), no deductions allowed; 1% TDS on transactions over ₹50,000.";
      
      const result = TaxBracketParser.parse(cryptoTax, 'INR');
      
      expect(result.type).toBe('flat');
      expect(result.flatRate).toBe(0.30);
    });

    test('should parse banned/exempt jurisdictions', () => {
      const cryptoTax = "Cryptocurrency is banned; no legal tax rate applies.";
      
      const result = TaxBracketParser.parse(cryptoTax, 'CNY');
      
      expect(result.type).toBe('exempt');
      expect(result.specialRules).toContain('Tax-free or banned jurisdiction');
    });

    test('should parse holding period requirements', () => {
      const cryptoTax = "Tax-free if held more than 1 year or gains under €600.";
      
      const result = TaxBracketParser.parse(cryptoTax, 'EUR');
      
      expect(result.holdingPeriodMonths).toBe(12);
      expect(result.exemptions!.annualThreshold).toBe(600);
    });

    test('should handle complex mining/staking rules', () => {
      const cryptoTax = "Mining/staking taxed as ordinary income at progressive rates. Special exemptions up to €256/year.";
      
      const result = TaxBracketParser.parse(cryptoTax, 'EUR');
      
      expect(result.specialRules).toContain('Special mining tax rules apply');
    });
  });

  describe('parseAmount', () => {
    test('should parse various amount formats', () => {
      // Access private method for testing
      const parseAmount = (TaxBracketParser as any).parseAmount;
      
      expect(parseAmount('11,925')).toBe(11925);
      expect(parseAmount('1.95m')).toBe(1950000);
      expect(parseAmount('50k')).toBe(50000);
      expect(parseAmount('600')).toBe(600);
    });
  });

  describe('extractFlatRate', () => {
    test('should extract flat tax rates', () => {
      const extractFlatRate = (TaxBracketParser as any).extractFlatRate;
      
      expect(extractFlatRate('Flat 30% on gains')).toBe(0.30);
      expect(extractFlatRate('19% on all gains')).toBe(0.19);
      expect(extractFlatRate('27.5% capital gains tax')).toBe(0.275);
    });
  });

  describe('extractHoldingPeriod', () => {
    test('should extract holding periods', () => {
      const extractHoldingPeriod = (TaxBracketParser as any).extractHoldingPeriod;
      
      expect(extractHoldingPeriod('held more than 1 year')).toBe(12);
      expect(extractHoldingPeriod('held for 3 years')).toBe(36);
      expect(extractHoldingPeriod('6 months holding period')).toBe(6);
    });
  });

  describe('extractExemptions', () => {
    test('should extract exemption thresholds', () => {
      const extractExemptions = (TaxBracketParser as any).extractExemptions;
      
      const result1 = extractExemptions('gains under €600', 'EUR');
      expect(result1.annualThreshold).toBe(600);
      expect(result1.currency).toBe('EUR');
      
      const result2 = extractExemptions('below $1,000', 'USD');
      expect(result2.annualThreshold).toBe(1000);
    });
  });
});

// Integration tests with real data
describe('TaxBracketParser Integration', () => {
  test('should parse real country data correctly', () => {
    const testCases = [
      {
        country: 'USA',
        cryptoTax: "Short-term capital gains: 10% ($0-$11,925), 12% ($11,926-$48,535), 22% ($48,536-$103,350), 37% (over $626,350).",
        expectedType: 'progressive',
        expectedBrackets: 4
      },
      {
        country: 'Germany', 
        cryptoTax: "Tax-free if held more than 1 year or gains under €600; otherwise up to 45%.",
        expectedType: 'progressive',
        expectedExemption: 600,
        expectedHoldingPeriod: 12
      },
      {
        country: 'Poland',
        cryptoTax: "Flat 19% on gains.",
        expectedType: 'flat',
        expectedRate: 0.19
      }
    ];

    testCases.forEach(testCase => {
      const result = TaxBracketParser.parse(testCase.cryptoTax, 'USD');
      
      expect(result.type).toBe(testCase.expectedType);
      
      if (testCase.expectedBrackets) {
        expect(result.brackets!.uppers.length).toBe(testCase.expectedBrackets);
      }
      
      if (testCase.expectedExemption) {
        expect(result.exemptions!.annualThreshold).toBe(testCase.expectedExemption);
      }
      
      if (testCase.expectedHoldingPeriod) {
        expect(result.holdingPeriodMonths).toBe(testCase.expectedHoldingPeriod);
      }
      
      if (testCase.expectedRate) {
        expect(result.flatRate).toBe(testCase.expectedRate);
      }
    });
  });
});

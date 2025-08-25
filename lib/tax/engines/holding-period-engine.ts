// lib/tax/engines/holding-period-engine.ts
// Holding period calculation engine for time-based tax benefits


export interface HoldingPeriodConfig {
  countryKey: string;
  shortTermMonths: number;
  longTermMonths: number;
  exemptionMonths?: number;
  discountMonths?: number;
  discountRate?: number;
  exemptionRules?: {
    fullExemption: boolean;
    partialExemption?: number;
    conditions?: string[];
  };
}

export interface HoldingPeriodResult {
  isShortTerm: boolean;
  isLongTerm: boolean;
  isExempt: boolean;
  hasDiscount: boolean;
  holdingMonths: number;
  discountApplied?: number;
  exemptionReason?: string;
  taxTreatment: 'short-term' | 'long-term' | 'exempt' | 'discounted';
}

export class HoldingPeriodEngine {
  /**
   * Calculate holding period treatment for a given holding duration
   */
  static calculateHoldingPeriod(
    config: HoldingPeriodConfig,
    holdingMonths: number
  ): HoldingPeriodResult {
    const {
      shortTermMonths,
      longTermMonths,
      exemptionMonths,
      discountMonths,
      discountRate,
      exemptionRules
    } = config;

    // Determine basic classification
    const isShortTerm = holdingMonths < longTermMonths;
    const isLongTerm = holdingMonths >= longTermMonths;

    // Check for exemption
    let isExempt = false;
    let exemptionReason: string | undefined;

    if (exemptionMonths && holdingMonths >= exemptionMonths) {
      if (exemptionRules?.fullExemption) {
        isExempt = true;
        exemptionReason = `Held for ${holdingMonths} months (≥${exemptionMonths} months required for exemption)`;
      }
    }

    // Check for discount
    let hasDiscount = false;
    let discountApplied: number | undefined;

    if (discountMonths && discountRate && holdingMonths >= discountMonths && !isExempt) {
      hasDiscount = true;
      discountApplied = discountRate;
    }

    // Determine tax treatment
    let taxTreatment: HoldingPeriodResult['taxTreatment'];
    if (isExempt) {
      taxTreatment = 'exempt';
    } else if (hasDiscount) {
      taxTreatment = 'discounted';
    } else if (isLongTerm) {
      taxTreatment = 'long-term';
    } else {
      taxTreatment = 'short-term';
    }

    return {
      isShortTerm,
      isLongTerm,
      isExempt,
      hasDiscount,
      holdingMonths,
      discountApplied,
      exemptionReason,
      taxTreatment
    };
  }

  /**
   * Get holding period configurations for different countries
   */
  static getHoldingPeriodConfigs(): Record<string, HoldingPeriodConfig> {
    return {
      usa: {
        countryKey: 'usa',
        shortTermMonths: 0,
        longTermMonths: 12,
        // No exemption, but different rates for short vs long term
      },
      germany: {
        countryKey: 'germany',
        shortTermMonths: 0,
        longTermMonths: 12,
        exemptionMonths: 12,
        exemptionRules: {
          fullExemption: true,
          conditions: ['Personal investment', 'Not business trading']
        }
      },
      australia: {
        countryKey: 'australia',
        shortTermMonths: 0,
        longTermMonths: 12,
        discountMonths: 12,
        discountRate: 0.5 // 50% discount on capital gains
      },
      france: {
        countryKey: 'france',
        shortTermMonths: 0,
        longTermMonths: 12,
        exemptionMonths: 96, // 8 years
        exemptionRules: {
          fullExemption: true,
          conditions: ['Personal investment', 'Annual allowance applies']
        }
      },
      portugal: {
        countryKey: 'portugal',
        shortTermMonths: 0,
        longTermMonths: 12,
        exemptionMonths: 12,
        exemptionRules: {
          fullExemption: true,
          conditions: ['Personal investment', 'Not frequent trading']
        }
      },
      czechrepublic: {
        countryKey: 'czechrepublic',
        shortTermMonths: 0,
        longTermMonths: 36, // 3 years
        exemptionMonths: 36,
        exemptionRules: {
          fullExemption: true
        }
      },
      switzerland: {
        countryKey: 'switzerland',
        shortTermMonths: 0,
        longTermMonths: 12,
        exemptionMonths: 12,
        exemptionRules: {
          fullExemption: true,
          conditions: ['Private wealth management', 'Not professional trading']
        }
      },
      belgium: {
        countryKey: 'belgium',
        shortTermMonths: 0,
        longTermMonths: 12,
        exemptionMonths: 12,
        exemptionRules: {
          fullExemption: true,
          conditions: ['Good family man profile', 'Not speculative trading']
        }
      },
      uk: {
        countryKey: 'uk',
        shortTermMonths: 0,
        longTermMonths: 12,
        // Annual exemption allowance but no holding period exemption
      },
      canada: {
        countryKey: 'canada',
        shortTermMonths: 0,
        longTermMonths: 12,
        // 50% inclusion rate for capital gains (effectively 50% discount)
        discountMonths: 0, // Applies to all capital gains
        discountRate: 0.5
      }
    };
  }

  /**
   * Calculate holding period from purchase and sale dates
   */
  static calculateHoldingMonths(purchaseDate: Date, saleDate: Date): number {
    const diffTime = saleDate.getTime() - purchaseDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 30.44); // Average days per month
  }

  /**
   * Get tax treatment description for UI display
   */
  static getTaxTreatmentDescription(result: HoldingPeriodResult, countryKey: string): string {
    const { taxTreatment, holdingMonths, discountApplied, exemptionReason } = result;

    switch (taxTreatment) {
      case 'exempt':
        return exemptionReason || `Tax-free (held ${holdingMonths} months)`;
      
      case 'discounted':
        const discountPercent = ((discountApplied || 0) * 100).toFixed(0);
        return `${discountPercent}% discount applied (held ${holdingMonths} months)`;
      
      case 'long-term':
        return `Long-term capital gains rate (held ${holdingMonths} months)`;
      
      case 'short-term':
        return `Short-term capital gains rate (held ${holdingMonths} months)`;
      
      default:
        return `Held ${holdingMonths} months`;
    }
  }

  /**
   * Validate holding period configuration
   */
  static validateConfig(config: HoldingPeriodConfig): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!config.countryKey) {
      issues.push('Country key is required');
    }

    if (config.shortTermMonths < 0) {
      issues.push('Short term months cannot be negative');
    }

    if (config.longTermMonths <= config.shortTermMonths) {
      issues.push('Long term months must be greater than short term months');
    }

    if (config.exemptionMonths && config.exemptionMonths < config.longTermMonths) {
      issues.push('Exemption months should be greater than or equal to long term months');
    }

    if (config.discountRate && (config.discountRate < 0 || config.discountRate > 1)) {
      issues.push('Discount rate must be between 0 and 1');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Get recommended holding periods for tax optimization
   */
  static getOptimalHoldingPeriods(countryKey: string): {
    shortTerm: number;
    longTerm: number;
    optimal?: number;
    description: string;
  } {
    const configs = this.getHoldingPeriodConfigs();
    const config = configs[countryKey];

    if (!config) {
      return {
        shortTerm: 0,
        longTerm: 12,
        description: 'No specific holding period rules'
      };
    }

    const optimal = config.exemptionMonths || config.discountMonths || config.longTermMonths;
    
    let description = '';
    if (config.exemptionMonths) {
      description = `Hold for ${config.exemptionMonths} months for tax exemption`;
    } else if (config.discountMonths && config.discountRate) {
      const discountPercent = (config.discountRate * 100).toFixed(0);
      description = `Hold for ${config.discountMonths} months for ${discountPercent}% discount`;
    } else {
      description = `Hold for ${config.longTermMonths} months for long-term rates`;
    }

    return {
      shortTerm: config.shortTermMonths,
      longTerm: config.longTermMonths,
      optimal,
      description
    };
  }

  /**
   * Calculate tax savings from holding longer
   */
  static calculateHoldingSavings(
    countryKey: string,
    gainAmount: number,
    currentHoldingMonths: number,
    shortTermRate: number,
    longTermRate: number
  ): {
    currentTax: number;
    optimizedTax: number;
    savings: number;
    recommendedHolding: number;
  } {
    const config = this.getHoldingPeriodConfigs()[countryKey];
    if (!config) {
      return {
        currentTax: gainAmount * shortTermRate,
        optimizedTax: gainAmount * longTermRate,
        savings: gainAmount * (shortTermRate - longTermRate),
        recommendedHolding: 12
      };
    }

    const currentResult = this.calculateHoldingPeriod(config, currentHoldingMonths);
    const currentTax = this.calculateTaxForHoldingPeriod(gainAmount, currentResult, shortTermRate, longTermRate);

    // Calculate optimal holding period
    const optimalMonths = config.exemptionMonths || config.discountMonths || config.longTermMonths;
    const optimalResult = this.calculateHoldingPeriod(config, optimalMonths);
    const optimizedTax = this.calculateTaxForHoldingPeriod(gainAmount, optimalResult, shortTermRate, longTermRate);

    return {
      currentTax,
      optimizedTax,
      savings: currentTax - optimizedTax,
      recommendedHolding: optimalMonths
    };
  }

  /**
   * Calculate tax amount based on holding period result
   */
  private static calculateTaxForHoldingPeriod(
    gainAmount: number,
    holdingResult: HoldingPeriodResult,
    shortTermRate: number,
    longTermRate: number
  ): number {
    if (holdingResult.isExempt) {
      return 0;
    }

    let effectiveRate = holdingResult.isLongTerm ? longTermRate : shortTermRate;
    
    if (holdingResult.hasDiscount && holdingResult.discountApplied) {
      effectiveRate *= (1 - holdingResult.discountApplied);
    }

    return gainAmount * effectiveRate;
  }
}

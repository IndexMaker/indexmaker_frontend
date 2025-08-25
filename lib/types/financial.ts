// lib/types/financial.ts
// Financial type definitions with branded types for type safety

/**
 * Branded type for monetary amounts
 */
export type Amount = number & { readonly __brand: 'Amount' };

/**
 * Branded type for tax rates (as decimals, e.g., 0.25 for 25%)
 */
export type TaxRate = number & { readonly __brand: 'TaxRate' };

/**
 * Branded type for age values
 */
export type Age = number & { readonly __brand: 'Age' };

/**
 * Branded type for year durations
 */
export type Years = number & { readonly __brand: 'Years' };

/**
 * Branded type constructors
 */
export function createAmount(value: number): Amount {
  if (value < 0) {
    throw new Error(`Amount cannot be negative: ${value}`);
  }
  if (!Number.isFinite(value)) {
    throw new Error(`Amount must be finite: ${value}`);
  }
  return value as Amount;
}

export function createTaxRate(value: number): TaxRate {
  if (value < 0 || value > 1) {
    throw new Error(`Tax rate must be between 0 and 1: ${value}`);
  }
  if (!Number.isFinite(value)) {
    throw new Error(`Tax rate must be finite: ${value}`);
  }
  return value as TaxRate;
}

export function createAge(value: number): Age {
  if (value < 0 || value > 150) {
    throw new Error(`Age must be between 0 and 150: ${value}`);
  }
  if (!Number.isFinite(value)) {
    throw new Error(`Age must be finite: ${value}`);
  }
  return value as Age;
}

export function createYears(value: number): Years {
  if (value < 0) {
    throw new Error(`Years cannot be negative: ${value}`);
  }
  if (!Number.isFinite(value)) {
    throw new Error(`Years must be finite: ${value}`);
  }
  return value as Years;
}

/**
 * Branded type unwrappers
 */
export function unwrapAmount(amount: Amount): number {
  return amount as number;
}

export function unwrapTaxRate(rate: TaxRate): number {
  return rate as number;
}

export function unwrapAge(age: Age): number {
  return age as number;
}

export function unwrapYears(years: Years): number {
  return years as number;
}

/**
 * Safe arithmetic operations for branded types
 */
export function addAmounts(a: Amount, b: Amount): Amount {
  return createAmount(unwrapAmount(a) + unwrapAmount(b));
}

export function subtractAmounts(a: Amount, b: Amount): Amount {
  return createAmount(unwrapAmount(a) - unwrapAmount(b));
}

export function multiplyAmount(amount: Amount, multiplier: number): Amount {
  return createAmount(unwrapAmount(amount) * multiplier);
}

export function multiplyAmountByRate(amount: Amount, rate: TaxRate): Amount {
  return createAmount(unwrapAmount(amount) * unwrapTaxRate(rate));
}

/**
 * Comparison functions
 */
export function compareAmounts(a: Amount, b: Amount): number {
  return unwrapAmount(a) - unwrapAmount(b);
}

export function maxAmount(a: Amount, b: Amount): Amount {
  return compareAmounts(a, b) >= 0 ? a : b;
}

export function minAmount(a: Amount, b: Amount): Amount {
  return compareAmounts(a, b) <= 0 ? a : b;
}

/**
 * Common financial calculations
 */
export function calculatePercentage(amount: Amount, percentage: number): Amount {
  return createAmount(unwrapAmount(amount) * (percentage / 100));
}

export function calculateCompoundInterest(
  principal: Amount,
  rate: TaxRate,
  years: Years,
  compoundingFrequency = 1
): Amount {
  const p = unwrapAmount(principal);
  const r = unwrapTaxRate(rate);
  const t = unwrapYears(years);
  const n = compoundingFrequency;

  const result = p * Math.pow(1 + r / n, n * t);
  return createAmount(result);
}

/**
 * Type guards
 */
export function isValidAmount(value: unknown): value is Amount {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function isValidTaxRate(value: unknown): value is TaxRate {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

export function isValidAge(value: unknown): value is Age {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 150;
}

export function isValidYears(value: unknown): value is Years {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

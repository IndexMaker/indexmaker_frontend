// lib/tax/index.ts
// Tax calculation module exports

export { australia } from './australia';
export { brazil } from './brazil';
export { canada } from './canada';
export { france } from './france';
export { germany } from './germany';
export { india } from './india';
export { italy } from './italy';
export { japan } from './japan';
export * from './types';
export { uk } from './uk';
export { usa } from './usa';

import { australia } from './australia';
import { brazil } from './brazil';
import { canada } from './canada';
import { france } from './france';
import { germany } from './germany';
import { india } from './india';
import { italy } from './italy';
import { japan } from './japan';
import type { CountryModule, CountryModuleRegistry } from './types';
import { uk } from './uk';
import { usa } from './usa';

// Registry of all available country modules
export const countryModules: CountryModuleRegistry = {
  usa,
  canada,
  uk,
  australia,
  germany,
  france,
  japan,
  india,
  italy,
  brazil,
};

// Prefer Roth IRA for USA on first load. Else pick retirement wrapper.
export function pickDefaultRetirementSetup(countryKey: keyof typeof countryModules): string {
  const mod = countryModules[countryKey];
  if (!mod) return '';
  if (countryKey === 'usa') {
    const roth = mod.setups.find((s) => s.name === 'Roth IRA');
    if (roth) return roth.name;
  }
  const superOpt = mod.setups.find((s) => s.type === 'super');
  if (superOpt) return superOpt.name;
  const deferredOpt = mod.setups.find((s) => s.type === 'deferred');
  if (deferredOpt) return deferredOpt.name;
  const taxfreeOpt = mod.setups.find((s) => s.type === 'taxfree');
  if (taxfreeOpt) return taxfreeOpt.name;
  return mod.setups[0]?.name ?? '';
}

/**
 * Get a country module by country code
 */
export function getCountryModule(countryCode: string): CountryModule | null {
  return countryModules[countryCode as keyof CountryModuleRegistry] || null;
}

/**
 * Get all available country codes
 */
export function getAvailableCountries(): string[] {
  return Object.keys(countryModules);
}

/**
 * Validate if a country is supported
 */
export function isCountrySupported(countryCode: string): boolean {
  return countryCode in countryModules;
}

// lib/tax/index.ts
// Tax calculation module exports - Auto-generated for all 53 countries

export { algeria } from './algeria';
export { argentina } from './argentina';
export { australia } from './australia';
export { austria } from './austria';
export { bangladesh } from './bangladesh';
export { belgium } from './belgium';
export { brazil } from './brazil';
export { canada } from './canada';
export { chile } from './chile';
export { china } from './china';
export { colombia } from './colombia';
export { czechrepublic } from './czechrepublic';
export { denmark } from './denmark';
export { egypt } from './egypt';
export { finland } from './finland';
export { france } from './france';
export { germany } from './germany';
export { greece } from './greece';
export { hongkong } from './hongkong';
export { india } from './india';
export { indonesia } from './indonesia';
export { iran } from './iran';
export { iraq } from './iraq';
export { ireland } from './ireland';
export { israel } from './israel';
export { italy } from './italy';
export { japan } from './japan';
export { kazakhstan } from './kazakhstan';
export { malaysia } from './malaysia';
export { mexico } from './mexico';
export { netherlands } from './netherlands';
export { norway } from './norway';
export { pakistan } from './pakistan';
export { peru } from './peru';
export { philippines } from './philippines';
export { poland } from './poland';
export { portugal } from './portugal';
export { romania } from './romania';
export { russia } from './russia';
export { saudiarabia } from './saudiarabia';
export { singapore } from './singapore';
export { southafrica } from './southafrica';
export { southkorea } from './southkorea';
export { spain } from './spain';
export { sweden } from './sweden';
export { switzerland } from './switzerland';
export { taiwan } from './taiwan';
export { thailand } from './thailand';
export { turkey } from './turkey';
export { uae } from './uae';
export { uk } from './uk';
export { usa } from './usa';
export { vietnam } from './vietnam';
export * from './types';

import { algeria } from './algeria';
import { argentina } from './argentina';
import { australia } from './australia';
import { austria } from './austria';
import { bangladesh } from './bangladesh';
import { belgium } from './belgium';
import { brazil } from './brazil';
import { canada } from './canada';
import { chile } from './chile';
import { china } from './china';
import { colombia } from './colombia';
import { czechrepublic } from './czechrepublic';
import { denmark } from './denmark';
import { egypt } from './egypt';
import { finland } from './finland';
import { france } from './france';
import { germany } from './germany';
import { greece } from './greece';
import { hongkong } from './hongkong';
import { india } from './india';
import { indonesia } from './indonesia';
import { iran } from './iran';
import { iraq } from './iraq';
import { ireland } from './ireland';
import { israel } from './israel';
import { italy } from './italy';
import { japan } from './japan';
import { kazakhstan } from './kazakhstan';
import { malaysia } from './malaysia';
import { mexico } from './mexico';
import { netherlands } from './netherlands';
import { norway } from './norway';
import { pakistan } from './pakistan';
import { peru } from './peru';
import { philippines } from './philippines';
import { poland } from './poland';
import { portugal } from './portugal';
import { romania } from './romania';
import { russia } from './russia';
import { saudiarabia } from './saudiarabia';
import { singapore } from './singapore';
import { southafrica } from './southafrica';
import { southkorea } from './southkorea';
import { spain } from './spain';
import { sweden } from './sweden';
import { switzerland } from './switzerland';
import { taiwan } from './taiwan';
import { thailand } from './thailand';
import { turkey } from './turkey';
import { uae } from './uae';
import { uk } from './uk';
import { usa } from './usa';
import { vietnam } from './vietnam';
import type { CountryModule, CountryModuleRegistry } from './types';

// Registry of all available country modules
export const countryModules: any = {
  algeria,
  argentina,
  australia,
  austria,
  bangladesh,
  belgium,
  brazil,
  canada,
  chile,
  china,
  colombia,
  czechrepublic,
  denmark,
  egypt,
  finland,
  france,
  germany,
  greece,
  hongkong,
  india,
  indonesia,
  iran,
  iraq,
  ireland,
  israel,
  italy,
  japan,
  kazakhstan,
  malaysia,
  mexico,
  netherlands,
  norway,
  pakistan,
  peru,
  philippines,
  poland,
  portugal,
  romania,
  russia,
  saudiarabia,
  singapore,
  southafrica,
  southkorea,
  spain,
  sweden,
  switzerland,
  taiwan,
  thailand,
  turkey,
  uae,
  uk,
  usa,
  vietnam,
};

// Prefer Roth IRA for USA on first load. Else pick retirement wrapper.
export function pickDefaultRetirementSetup(countryKey: keyof typeof countryModules): string {
  const mod = countryModules[countryKey];
  if (!mod) return '';
  if (countryKey === 'usa') {
    const roth = mod.setups.find((s: any) => s.name === 'Roth IRA');
    if (roth) return roth.name;
  }
  const superOpt = mod.setups.find((s: any) => s.type === 'super');
  if (superOpt) return superOpt.name;
  const deferredOpt = mod.setups.find((s: any) => s.type === 'deferred');
  if (deferredOpt) return deferredOpt.name;
  const taxfreeOpt = mod.setups.find((s: any) => s.type === 'taxfree');
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

/**
 * Calculate taxes for a given country and parameters
 */
export function calculateTaxes(
  countryCode: string,
  params: any
): any {
  const module = getCountryModule(countryCode);
  if (!module) {
    throw new Error(`Country module not found: ${countryCode}`);
  }
  
  // Ensure all required functions exist
  if (!module.computeTaxable) {
    throw new Error(`computeTaxable function missing for country: ${countryCode}`);
  }
  
  if (!module.computeDeferredFull) {
    throw new Error(`computeDeferredFull function missing for country: ${countryCode}`);
  }
  
  if (!module.getBrackets) {
    throw new Error(`getBrackets function missing for country: ${countryCode}`);
  }
  
  return {
    module,
    computeTaxable: module.computeTaxable,
    computeDeferredFull: module.computeDeferredFull,
    getBrackets: module.getBrackets
  };
}

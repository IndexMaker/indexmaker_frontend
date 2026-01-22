/**
 * Bridge Contract Addresses
 *
 * These are deployed contract addresses on Arbitrum Mainnet.
 * Addresses can be overridden via environment variables for different deployments.
 */

export const ARBITRUM_CHAIN_ID = 42161;

/**
 * Validates and returns a hex address string.
 * Throws if the address is not a valid 40-character hex string prefixed with 0x.
 */
function validateAddress(
  address: string | undefined,
  fallback: `0x${string}`,
  name: string
): `0x${string}` {
  const value = address || fallback;
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(
      `Invalid ${name} address: "${value}". Expected 0x followed by 40 hex characters.`
    );
  }
  return value as `0x${string}`;
}

// Contract addresses deployed on Arbitrum Mainnet
// Updated to match deployed contracts (2026-01-18)
export const BRIDGE_PROXY_ADDRESS = validateAddress(
  process.env.NEXT_PUBLIC_BRIDGE_PROXY_ADDRESS,
  '0xD39238ba5E44B0109BaF7D399A4db67C5fb54B14',
  'BRIDGE_PROXY'
);

export const BRIDGED_ITP_FACTORY_ADDRESS = validateAddress(
  process.env.NEXT_PUBLIC_BRIDGED_ITP_FACTORY_ADDRESS,
  '0xC8f7B4B4834b8DDfad604cA48e95280ef3e95150',
  'BRIDGED_ITP_FACTORY'
);

export const USDC_ADDRESS = validateAddress(
  process.env.NEXT_PUBLIC_USDC_ADDRESS,
  '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  'USDC'
);

// Orbit Chain Configuration
export const ORBIT_CHAIN_ID = 111222333;
export const ORBIT_RPC_URL = process.env.NEXT_PUBLIC_ORBIT_RPC_URL || 'https://index.rpc.zeeve.net';
export const ORBIT_EXPLORER_URL = process.env.NEXT_PUBLIC_ORBIT_EXPLORER_URL || 'https://index.explorer.zeeve.net';

// Orbit Contract Addresses
// Updated to match deployed contracts (2026-01-18)
export const ORBIT_VAULT_ADDRESS = validateAddress(
  process.env.NEXT_PUBLIC_ORBIT_VAULT_ADDRESS,
  '0xC71b518779176868F47E52a8c6ae4Ac4D7bAC934',
  'ORBIT_VAULT'
);

export const ORBIT_CASTLE_ADDRESS = validateAddress(
  process.env.NEXT_PUBLIC_ORBIT_CASTLE_ADDRESS,
  '0x1409a0ce0770e6e428add1ef73c6d872319557d8',
  'ORBIT_CASTLE'
);

export const ORBIT_COLLATERAL_ADDRESS = validateAddress(
  process.env.NEXT_PUBLIC_ORBIT_COLLATERAL_ADDRESS,
  '0xffA6368900de929Db7a988eaFbddC44CD12d85b9',
  'ORBIT_COLLATERAL'
);

export const ORBIT_CUSTODY_ADDRESS = validateAddress(
  process.env.NEXT_PUBLIC_ORBIT_CUSTODY_ADDRESS,
  '0xC0D3C9E530ca6d71469bB678E6592274154D9caD',
  'ORBIT_CUSTODY'
);

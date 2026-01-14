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
export const BRIDGE_PROXY_ADDRESS = validateAddress(
  process.env.NEXT_PUBLIC_BRIDGE_PROXY_ADDRESS,
  '0xABCFB96dfB5e872921D20ba392E324bE0525D139',
  'BRIDGE_PROXY'
);

export const BRIDGED_ITP_FACTORY_ADDRESS = validateAddress(
  process.env.NEXT_PUBLIC_BRIDGED_ITP_FACTORY_ADDRESS,
  '0xdd236e1584c0e35DAd4e0dacF27c9831FdeD52ba',
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
export const ORBIT_VAULT_ADDRESS = validateAddress(
  process.env.NEXT_PUBLIC_ORBIT_VAULT_ADDRESS,
  '0x621f5f30d4902ab75d8bd50820cc0a09cc563559',
  'ORBIT_VAULT'
);

export const ORBIT_CASTLE_ADDRESS = validateAddress(
  process.env.NEXT_PUBLIC_ORBIT_CASTLE_ADDRESS,
  '0xddb1b34d67a86949fdf5cbeb761fa1122c659426',
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

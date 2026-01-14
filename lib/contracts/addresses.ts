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

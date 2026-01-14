/**
 * Bridge Contract Utilities - Barrel Export
 *
 * Re-exports all contract utilities for convenient imports:
 *
 * @example
 * import {
 *   useBridgeWallet,
 *   BRIDGE_PROXY_ADDRESS,
 *   getBridgeProxyRead,
 * } from '@/lib/contracts';
 */

// Addresses
export {
  ARBITRUM_CHAIN_ID,
  BRIDGE_PROXY_ADDRESS,
  BRIDGED_ITP_FACTORY_ADDRESS,
  USDC_ADDRESS,
} from './addresses';

// ABIs
export { bridgeProxyAbi } from './abis/bridge-proxy';
export { bridgedItpFactoryAbi } from './abis/bridged-itp-factory';
export { erc20Abi } from './abis/erc20';

// Contract instance factories
export { getBridgeProxyRead, getBridgeProxyWrite } from './bridge-proxy';
export { getBridgedItpFactoryRead, getBridgedItpFactoryWrite } from './bridged-itp-factory';
export { getUsdcRead, getUsdcWrite } from './usdc';

// Balance and approval utilities
export {
  checkUsdcBalance,
  checkItpBalance,
  hasApproval,
  hasSufficientUsdcBalance,
  hasSufficientItpBalance,
  USDC_DECIMALS,
  ITP_DECIMALS,
  type BalanceResult,
  type ApprovalResult,
} from './balance-utils';

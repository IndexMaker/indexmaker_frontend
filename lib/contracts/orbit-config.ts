/**
 * Orbit Chain Configuration for viem
 *
 * Defines the IndexMaker Orbit chain for use with viem clients.
 * Used for dual-chain balance queries (Arbitrum + Orbit).
 */

import { defineChain } from 'viem';
import { ORBIT_CHAIN_ID, ORBIT_RPC_URL } from './addresses';

/**
 * IndexMaker Orbit chain definition
 * Chain ID: 111222333
 * Native token: IND (Index Token)
 */
export const orbitChain = defineChain({
  id: ORBIT_CHAIN_ID,
  name: 'IndexMaker Orbit',
  network: 'indexmaker-orbit',
  nativeCurrency: {
    name: 'Index Token',
    symbol: 'IND',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [ORBIT_RPC_URL] },
    public: { http: [ORBIT_RPC_URL] },
  },
});

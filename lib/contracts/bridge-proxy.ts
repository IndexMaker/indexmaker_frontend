import { getContract, type PublicClient, type WalletClient } from 'viem';
import { bridgeProxyAbi } from './abis/bridge-proxy';
import { BRIDGE_PROXY_ADDRESS } from './addresses';

/**
 * Get a read-only BridgeProxy contract instance
 */
export function getBridgeProxyRead(publicClient: PublicClient) {
  return getContract({
    address: BRIDGE_PROXY_ADDRESS,
    abi: bridgeProxyAbi,
    client: publicClient,
  });
}

/**
 * Get a read-write BridgeProxy contract instance
 */
export function getBridgeProxyWrite(
  publicClient: PublicClient,
  walletClient: WalletClient
) {
  return getContract({
    address: BRIDGE_PROXY_ADDRESS,
    abi: bridgeProxyAbi,
    client: { public: publicClient, wallet: walletClient },
  });
}

export { bridgeProxyAbi, BRIDGE_PROXY_ADDRESS };

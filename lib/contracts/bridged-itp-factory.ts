import { getContract, type PublicClient, type WalletClient } from 'viem';
import { bridgedItpFactoryAbi } from './abis/bridged-itp-factory';
import { BRIDGED_ITP_FACTORY_ADDRESS } from './addresses';

/**
 * Get a read-only BridgedItpFactory contract instance
 */
export function getBridgedItpFactoryRead(publicClient: PublicClient) {
  return getContract({
    address: BRIDGED_ITP_FACTORY_ADDRESS,
    abi: bridgedItpFactoryAbi,
    client: publicClient,
  });
}

/**
 * Get a read-write BridgedItpFactory contract instance
 */
export function getBridgedItpFactoryWrite(
  publicClient: PublicClient,
  walletClient: WalletClient
) {
  return getContract({
    address: BRIDGED_ITP_FACTORY_ADDRESS,
    abi: bridgedItpFactoryAbi,
    client: { public: publicClient, wallet: walletClient },
  });
}

export { bridgedItpFactoryAbi, BRIDGED_ITP_FACTORY_ADDRESS };

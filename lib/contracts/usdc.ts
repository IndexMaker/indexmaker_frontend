import { getContract, type PublicClient, type WalletClient } from 'viem';
import { erc20Abi } from './abis/erc20';
import { USDC_ADDRESS } from './addresses';

/**
 * Get a read-only USDC (ERC20) contract instance
 */
export function getUsdcRead(publicClient: PublicClient) {
  return getContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    client: publicClient,
  });
}

/**
 * Get a read-write USDC (ERC20) contract instance
 */
export function getUsdcWrite(
  publicClient: PublicClient,
  walletClient: WalletClient
) {
  return getContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    client: { public: publicClient, wallet: walletClient },
  });
}

export { erc20Abi, USDC_ADDRESS };

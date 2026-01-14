'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  type WalletClient,
  type EIP1193Provider,
} from 'viem';
import { arbitrum } from 'viem/chains';
import onboard from '@/lib/blocknative/web3-onboard';
import { getBridgeProxyRead, getBridgeProxyWrite, BRIDGE_PROXY_ADDRESS } from '@/lib/contracts/bridge-proxy';
import { getBridgedItpFactoryRead, getBridgedItpFactoryWrite, BRIDGED_ITP_FACTORY_ADDRESS } from '@/lib/contracts/bridged-itp-factory';
import { getUsdcRead, getUsdcWrite, USDC_ADDRESS } from '@/lib/contracts/usdc';
import { ARBITRUM_CHAIN_ID } from '@/lib/contracts/addresses';

type OnboardWallet = {
  label: string;
  accounts: { address: string }[];
  provider: EIP1193Provider;
  chains?: { id: string }[];
};

/**
 * Get the connected wallet's EIP-1193 provider from web3-onboard
 */
function getActiveWalletProvider(): EIP1193Provider | null {
  const connected = onboard.state.get().wallets as OnboardWallet[];
  if (!connected || connected.length === 0) return null;
  return connected[0].provider;
}

/**
 * Get the connected wallet's address from web3-onboard
 */
function getActiveWalletAccount(): `0x${string}` | null {
  const connected = onboard.state.get().wallets as OnboardWallet[];
  if (!connected || connected.length === 0) return null;
  const acc = connected[0].accounts?.[0]?.address;
  return acc ? (acc as `0x${string}`) : null;
}

/**
 * Get the connected wallet's current chain ID
 */
function getActiveWalletChainId(): number | null {
  const connected = onboard.state.get().wallets as OnboardWallet[];
  if (!connected || connected.length === 0) return null;
  const chainHex = connected[0].chains?.[0]?.id;
  if (!chainHex) return null;
  return parseInt(chainHex, 16);
}

/**
 * Hook that provides bridge contract instances for Arbitrum Mainnet operations.
 *
 * REACTIVE: This hook subscribes to web3-onboard state changes and will
 * automatically update when wallet connects, disconnects, or changes chain.
 *
 * Returns:
 * - publicClient: Viem public client for read operations
 * - walletClient: Viem wallet client for write operations (null if not connected)
 * - address: Connected wallet address (null if not connected)
 * - bridgeProxy: BridgeProxy contract instance (read or read-write)
 * - bridgedItpFactory: BridgedItpFactory contract instance (read or read-write)
 * - usdc: USDC ERC20 contract instance for approvals (read or read-write)
 * - isConnected: Whether a wallet is connected
 * - isCorrectChain: Whether the wallet is on Arbitrum (chainId 42161)
 * - chainId: Current chain ID (null if not connected)
 */
export function useBridgeWallet() {
  // Track wallet state changes via subscription
  const [walletState, setWalletState] = useState(() => ({
    provider: getActiveWalletProvider(),
    address: getActiveWalletAccount(),
    chainId: getActiveWalletChainId(),
  }));

  // Subscribe to web3-onboard wallet state changes
  useEffect(() => {
    const walletsSubscription = onboard.state.select('wallets').subscribe((wallets) => {
      const connected = wallets as OnboardWallet[];
      if (!connected || connected.length === 0) {
        setWalletState({ provider: null, address: null, chainId: null });
      } else {
        const wallet = connected[0];
        const chainHex = wallet.chains?.[0]?.id;
        setWalletState({
          provider: wallet.provider,
          address: wallet.accounts?.[0]?.address as `0x${string}` | null,
          chainId: chainHex ? parseInt(chainHex, 16) : null,
        });
      }
    });

    return () => {
      walletsSubscription.unsubscribe();
    };
  }, []);

  // Memoize contract instances based on wallet state
  const result = useMemo(() => {
    const { provider, address, chainId } = walletState;

    // Create public client for read operations (always available)
    const publicClient = createPublicClient({
      chain: arbitrum,
      transport: http(),
    });

    const isConnected = !!address;
    const isCorrectChain = chainId === ARBITRUM_CHAIN_ID;

    // If wallet is connected, create wallet client for write operations
    let walletClient: WalletClient | null = null;
    if (provider && address) {
      walletClient = createWalletClient({
        account: address,
        chain: arbitrum,
        transport: custom(provider),
      });
    }

    // Create contract instances (read-write if connected, read-only otherwise)
    const bridgeProxy = walletClient
      ? getBridgeProxyWrite(publicClient, walletClient)
      : getBridgeProxyRead(publicClient);

    const bridgedItpFactory = walletClient
      ? getBridgedItpFactoryWrite(publicClient, walletClient)
      : getBridgedItpFactoryRead(publicClient);

    const usdc = walletClient
      ? getUsdcWrite(publicClient, walletClient)
      : getUsdcRead(publicClient);

    return {
      publicClient,
      walletClient,
      address,
      chainId,
      bridgeProxy,
      bridgedItpFactory,
      usdc,
      isConnected,
      isCorrectChain,
    };
  }, [walletState]);

  return result;
}

// Re-export contract addresses for convenience
export {
  BRIDGE_PROXY_ADDRESS,
  BRIDGED_ITP_FACTORY_ADDRESS,
  USDC_ADDRESS,
  ARBITRUM_CHAIN_ID,
};

export { getActiveWalletProvider, getActiveWalletAccount, getActiveWalletChainId };

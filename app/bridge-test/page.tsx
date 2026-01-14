'use client';

import { useState, useEffect } from 'react';
import { useBridgeWallet } from '@/hooks/useBridgeWallet';
import { useWallet } from '@/contexts/wallet-context';
import { Button } from '@/components/ui/button';
import { BRIDGE_PROXY_ADDRESS, BRIDGED_ITP_FACTORY_ADDRESS, USDC_ADDRESS, ORBIT_VAULT_ADDRESS, ORBIT_RPC_URL, ORBIT_CHAIN_ID } from '@/lib/contracts/addresses';
// Story 3.2 imports - Balance utilities and hooks
import {
  checkUsdcBalance,
  checkItpBalance,
  hasSufficientUsdcBalance,
  hasSufficientItpBalance,
  hasApproval,
  USDC_DECIMALS,
  ITP_DECIMALS,
  // Story 3.4 imports - Dual-chain balance utilities
  fetchDualChainBalances,
  checkOrbitItpBalance,
  createOrbitClient,
  createArbitrumClient,
} from '@/lib/contracts/balance-utils';
import { useArbitrumBuy } from '@/hooks/useArbitrumBuy';
import { useArbitrumSell } from '@/hooks/useArbitrumSell';
// Story 3.3 imports - Transaction status monitoring
import { useOrbitEventMonitor } from '@/hooks/useOrbitEventMonitor';
// Story 3.4 imports - Dual-chain balance hooks
import { useBridgedItpRegistry } from '@/hooks/useBridgedItpRegistry';
import { useDualChainBalances } from '@/hooks/useDualChainBalances';
// Story 3.4 imports - BridgedItpFactory utilities
import { fetchAllBridgedItps, fetchBridgedItpRegistryFromEvents, type BridgedItpInfo } from '@/lib/contracts/bridged-itp-factory';
// Story 3.4 imports - Orbit VAULT utilities
import { fetchOrbitItpMetadata, fetchOrbitItpPrice } from '@/lib/contracts/orbit-vault';
import { parseUnits, formatUnits } from 'viem';

export default function BridgeTestPage() {
  const { bridgeProxy, bridgedItpFactory, usdc, isConnected, address, publicClient, chainId, isCorrectChain } = useBridgeWallet();
  const { connectWallet, disconnectWallet, connecting, switchNetwork } = useWallet();

  // Story 3.2 Hooks
  const arbitrumBuy = useArbitrumBuy();
  const arbitrumSell = useArbitrumSell();

  // Story 3.3 Hooks - Transaction Status Monitoring
  const orbitMonitor = useOrbitEventMonitor();

  // Story 3.4 Hooks - Dual-Chain Balances
  const bridgedItpRegistry = useBridgedItpRegistry();

  const [results, setResults] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [testAmount, setTestAmount] = useState('100'); // Test amount for balance checks
  const [testItpAddress, setTestItpAddress] = useState(''); // ITP address for sell tests
  const [testOrbitItpAddress, setTestOrbitItpAddress] = useState(''); // Orbit ITP for dual-chain tests
  const [bridgedItpList, setBridgedItpList] = useState<BridgedItpInfo[]>([]);

  const handleConnect = async () => {
    try {
      await connectWallet();
    } catch (e) {
      setError(`Failed to connect: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectWallet();
    } catch (e) {
      setError(`Failed to disconnect: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleSwitchToArbitrum = async () => {
    try {
      await switchNetwork('0xa4b1'); // Arbitrum One in hex
    } catch (e) {
      setError(`Failed to switch network: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const addResult = (key: string, value: string) => {
    setResults(prev => ({ ...prev, [key]: value }));
  };

  const setLoadingState = (key: string, state: boolean) => {
    setLoading(prev => ({ ...prev, [key]: state }));
  };

  // Test BridgeProxy.owner()
  const testBridgeProxyOwner = async () => {
    setLoadingState('bridgeProxyOwner', true);
    setError(null);
    try {
      const owner = await bridgeProxy.read.owner();
      addResult('bridgeProxyOwner', owner);
    } catch (e) {
      setError(`BridgeProxy.owner() failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoadingState('bridgeProxyOwner', false);
  };

  // Test BridgeProxy.factory()
  const testBridgeProxyFactory = async () => {
    setLoadingState('bridgeProxyFactory', true);
    setError(null);
    try {
      const factory = await bridgeProxy.read.factory();
      addResult('bridgeProxyFactory', factory);
    } catch (e) {
      setError(`BridgeProxy.factory() failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoadingState('bridgeProxyFactory', false);
  };

  // Test BridgeProxy.usdc()
  const testBridgeProxyUsdc = async () => {
    setLoadingState('bridgeProxyUsdc', true);
    setError(null);
    try {
      const usdcAddr = await bridgeProxy.read.usdc();
      addResult('bridgeProxyUsdc', usdcAddr);
    } catch (e) {
      setError(`BridgeProxy.usdc() failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoadingState('bridgeProxyUsdc', false);
  };

  // Test BridgedItpFactory.bridgedItpCount()
  const testItpCount = async () => {
    setLoadingState('itpCount', true);
    setError(null);
    try {
      const count = await bridgedItpFactory.read.bridgedItpCount();
      addResult('itpCount', count.toString());
    } catch (e) {
      setError(`BridgedItpFactory.bridgedItpCount() failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoadingState('itpCount', false);
  };

  // Test BridgedItpFactory.getAllBridgedItps()
  const testGetAllItps = async () => {
    setLoadingState('allItps', true);
    setError(null);
    try {
      const itps = await bridgedItpFactory.read.getAllBridgedItps();
      addResult('allItps', itps.length > 0 ? itps.join(', ') : '(none)');
    } catch (e) {
      setError(`BridgedItpFactory.getAllBridgedItps() failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoadingState('allItps', false);
  };

  // Test USDC.totalSupply()
  const testUsdcSupply = async () => {
    setLoadingState('usdcSupply', true);
    setError(null);
    try {
      const supply = await usdc.read.totalSupply();
      // USDC has 6 decimals
      const formatted = (Number(supply) / 1e6).toLocaleString();
      addResult('usdcSupply', `${formatted} USDC`);
    } catch (e) {
      setError(`USDC.totalSupply() failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoadingState('usdcSupply', false);
  };

  // Test USDC.allowance() - requires connected wallet
  const testUsdcAllowance = async () => {
    if (!address) {
      setError('Wallet not connected - cannot check allowance');
      return;
    }
    setLoadingState('usdcAllowance', true);
    setError(null);
    try {
      const allowance = await usdc.read.allowance([address, BRIDGE_PROXY_ADDRESS]);
      const formatted = (Number(allowance) / 1e6).toLocaleString();
      addResult('usdcAllowance', `${formatted} USDC`);
    } catch (e) {
      setError(`USDC.allowance() failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoadingState('usdcAllowance', false);
  };

  // ============================================
  // Story 3.2 Tests - Balance Utilities & Hooks
  // ============================================

  // Test checkUsdcBalance (AC #3 prerequisite)
  const testCheckUsdcBalance = async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }
    setLoadingState('checkUsdcBalance', true);
    setError(null);
    try {
      const balance = await checkUsdcBalance(publicClient, address);
      addResult('checkUsdcBalance', `${balance.formatted} USDC (raw: ${balance.raw})`);
    } catch (e) {
      setError(`checkUsdcBalance failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoadingState('checkUsdcBalance', false);
  };

  // Test checkItpBalance (AC #4 prerequisite)
  const testCheckItpBalance = async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }
    if (!testItpAddress) {
      setError('Enter an ITP token address first');
      return;
    }
    setLoadingState('checkItpBalance', true);
    setError(null);
    try {
      const balance = await checkItpBalance(publicClient, address, testItpAddress as `0x${string}`);
      addResult('checkItpBalance', `${balance.formatted} ITP (raw: ${balance.raw})`);
    } catch (e) {
      setError(`checkItpBalance failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoadingState('checkItpBalance', false);
  };

  // Test hasSufficientUsdcBalance (AC #3 - Insufficient USDC balance error)
  const testHasSufficientUsdcBalance = async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }
    setLoadingState('hasSufficientUsdcBalance', true);
    setError(null);
    try {
      const amountWei = parseUnits(testAmount, USDC_DECIMALS);
      const result = await hasSufficientUsdcBalance(publicClient, address, amountWei);
      const shortfallFormatted = formatUnits(result.shortfall, USDC_DECIMALS);
      addResult(
        'hasSufficientUsdcBalance',
        `${result.isSufficient ? '✓ Sufficient' : '✗ Insufficient'} (balance: ${result.balance.formatted}, shortfall: ${shortfallFormatted})`
      );
    } catch (e) {
      setError(`hasSufficientUsdcBalance failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoadingState('hasSufficientUsdcBalance', false);
  };

  // Test hasSufficientItpBalance (AC #4 - Insufficient ITP balance error)
  const testHasSufficientItpBalance = async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }
    if (!testItpAddress) {
      setError('Enter an ITP token address first');
      return;
    }
    setLoadingState('hasSufficientItpBalance', true);
    setError(null);
    try {
      const amountWei = parseUnits(testAmount, ITP_DECIMALS);
      const result = await hasSufficientItpBalance(publicClient, address, testItpAddress as `0x${string}`, amountWei);
      const shortfallFormatted = formatUnits(result.shortfall, ITP_DECIMALS);
      addResult(
        'hasSufficientItpBalance',
        `${result.isSufficient ? '✓ Sufficient' : '✗ Insufficient'} (balance: ${result.balance.formatted}, shortfall: ${shortfallFormatted})`
      );
    } catch (e) {
      setError(`hasSufficientItpBalance failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoadingState('hasSufficientItpBalance', false);
  };

  // Test USDC approval for BridgeProxy
  const testHasApproval = async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }
    setLoadingState('hasApproval', true);
    setError(null);
    try {
      const amountWei = parseUnits(testAmount, USDC_DECIMALS);
      const result = await hasApproval(publicClient, address, USDC_ADDRESS, BRIDGE_PROXY_ADDRESS, amountWei);
      const allowanceFormatted = formatUnits(result.currentAllowance, USDC_DECIMALS);
      addResult(
        'hasApproval',
        `${result.hasApproval ? '✓ Approved' : '✗ Not Approved'} (allowance: ${allowanceFormatted} USDC)`
      );
    } catch (e) {
      setError(`hasApproval failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoadingState('hasApproval', false);
  };

  // Test useArbitrumBuy hook (AC #1 - Buy flow)
  const testArbitrumBuyHook = async () => {
    setLoadingState('arbitrumBuyHook', true);
    setError(null);
    try {
      addResult('arbitrumBuyHook',
        `Status: ${arbitrumBuy.status} | Error: ${arbitrumBuy.error || 'none'} | ` +
        `TxHash: ${arbitrumBuy.txHash || 'none'} | ` +
        `Connected: ${isConnected} | Correct Chain: ${isCorrectChain}`
      );
    } catch (e) {
      setError(`useArbitrumBuy test failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoadingState('arbitrumBuyHook', false);
  };

  // Test useArbitrumSell hook (AC #2 - Sell flow)
  const testArbitrumSellHook = async () => {
    setLoadingState('arbitrumSellHook', true);
    setError(null);
    try {
      addResult('arbitrumSellHook',
        `Status: ${arbitrumSell.status} | Error: ${arbitrumSell.error || 'none'} | ` +
        `TxHash: ${arbitrumSell.txHash || 'none'} | ` +
        `Connected: ${isConnected} | Correct Chain: ${isCorrectChain}`
      );
    } catch (e) {
      setError(`useArbitrumSell test failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoadingState('arbitrumSellHook', false);
  };

  // Simulate Buy Flow (AC #1) - Tests the full sequence without submitting
  const testBuyFlowSimulation = async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }
    setLoadingState('buyFlowSim', true);
    setError(null);
    try {
      const amountWei = parseUnits(testAmount, USDC_DECIMALS);

      // Step 1: Check USDC balance
      const balanceResult = await hasSufficientUsdcBalance(publicClient, address, amountWei);
      if (!balanceResult.isSufficient) {
        addResult('buyFlowSim', `❌ BLOCKED at Step 1: Insufficient USDC (need ${formatUnits(balanceResult.shortfall, USDC_DECIMALS)} more)`);
        setLoadingState('buyFlowSim', false);
        return;
      }

      // Step 2: Check approval
      const approvalResult = await hasApproval(publicClient, address, USDC_ADDRESS, BRIDGE_PROXY_ADDRESS, amountWei);
      if (!approvalResult.hasApproval) {
        addResult('buyFlowSim', `⚠️ Step 2: Would need approval (current: ${formatUnits(approvalResult.currentAllowance, USDC_DECIMALS)} USDC)`);
      }

      // Step 3: Simulate transaction (blocked until contracts deployed)
      addResult('buyFlowSim',
        `✓ Step 1: Balance OK (${balanceResult.balance.formatted} USDC) | ` +
        `${approvalResult.hasApproval ? '✓' : '⚠️'} Step 2: Approval ${approvalResult.hasApproval ? 'OK' : 'needed'} | ` +
        `⏳ Step 3: TX blocked (contracts not deployed)`
      );
    } catch (e) {
      setError(`Buy flow simulation failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoadingState('buyFlowSim', false);
  };

  // Simulate Sell Flow (AC #2) - Tests the full sequence without submitting
  const testSellFlowSimulation = async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }
    if (!testItpAddress) {
      setError('Enter an ITP token address first');
      return;
    }
    setLoadingState('sellFlowSim', true);
    setError(null);
    try {
      const amountWei = parseUnits(testAmount, ITP_DECIMALS);

      // Step 1: Check ITP balance
      const balanceResult = await hasSufficientItpBalance(publicClient, address, testItpAddress as `0x${string}`, amountWei);
      if (!balanceResult.isSufficient) {
        addResult('sellFlowSim', `❌ BLOCKED at Step 1: Insufficient ITP (need ${formatUnits(balanceResult.shortfall, ITP_DECIMALS)} more)`);
        setLoadingState('sellFlowSim', false);
        return;
      }

      // Step 2: Check ITP approval for BridgeProxy
      const approvalResult = await hasApproval(publicClient, address, testItpAddress as `0x${string}`, BRIDGE_PROXY_ADDRESS, amountWei);
      if (!approvalResult.hasApproval) {
        addResult('sellFlowSim', `⚠️ Step 2: Would need ITP approval (current: ${formatUnits(approvalResult.currentAllowance, ITP_DECIMALS)} ITP)`);
      }

      // Step 3: Simulate transaction (blocked until contracts deployed)
      addResult('sellFlowSim',
        `✓ Step 1: Balance OK (${balanceResult.balance.formatted} ITP) | ` +
        `${approvalResult.hasApproval ? '✓' : '⚠️'} Step 2: Approval ${approvalResult.hasApproval ? 'OK' : 'needed'} | ` +
        `⏳ Step 3: TX blocked (contracts not deployed)`
      );
    } catch (e) {
      setError(`Sell flow simulation failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoadingState('sellFlowSim', false);
  };

  // Run all Story 3.2 tests
  const runStory32Tests = async () => {
    if (!address) {
      setError('Connect wallet first to run Story 3.2 tests');
      return;
    }
    await testCheckUsdcBalance();
    await testHasSufficientUsdcBalance();
    await testHasApproval();
    await testArbitrumBuyHook();
    await testArbitrumSellHook();
    await testBuyFlowSimulation();
  };

  // ============================================
  // Story 3.3 Tests - Transaction Status Monitoring
  // ============================================

  // Test useOrbitEventMonitor hook status
  const testOrbitMonitorStatus = async () => {
    setLoadingState('orbitMonitorStatus', true);
    setError(null);
    try {
      addResult('orbitMonitorStatus',
        `Status: ${orbitMonitor.status} | ` +
        `Event: ${orbitMonitor.eventData ? JSON.stringify(orbitMonitor.eventData) : 'none'} | ` +
        `Error: ${orbitMonitor.error || 'none'}`
      );
    } catch (e) {
      setError(`Orbit monitor status failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoadingState('orbitMonitorStatus', false);
  };

  // Start monitoring for buy completion
  const testStartBuyMonitoring = async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }
    setLoadingState('startBuyMonitoring', true);
    setError(null);
    try {
      orbitMonitor.startMonitoring({
        userAddress: address as `0x${string}`,
        operationType: 'buy',
        timeout: 60000, // 1 minute for testing
      });
      addResult('startBuyMonitoring', `Started monitoring buy events for ${address.slice(0, 10)}... (timeout: 60s)`);
    } catch (e) {
      setError(`Start buy monitoring failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoadingState('startBuyMonitoring', false);
  };

  // Start monitoring for sell completion
  const testStartSellMonitoring = async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }
    setLoadingState('startSellMonitoring', true);
    setError(null);
    try {
      orbitMonitor.startMonitoring({
        userAddress: address as `0x${string}`,
        operationType: 'sell',
        timeout: 60000, // 1 minute for testing
      });
      addResult('startSellMonitoring', `Started monitoring sell events for ${address.slice(0, 10)}... (timeout: 60s)`);
    } catch (e) {
      setError(`Start sell monitoring failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoadingState('startSellMonitoring', false);
  };

  // Stop monitoring
  const testStopMonitoring = () => {
    orbitMonitor.stopMonitoring();
    addResult('stopMonitoring', 'Monitoring stopped');
  };

  // Reset monitor
  const testResetMonitor = () => {
    orbitMonitor.reset();
    addResult('resetMonitor', 'Monitor reset to idle');
  };

  // ============================================
  // Story 3.4 Tests - Dual-Chain Balance Display
  // ============================================

  // Test fetching all bridged ITPs from factory
  const testFetchAllBridgedItps = async () => {
    setLoadingState('fetchAllBridgedItps', true);
    setError(null);
    try {
      const itps = await fetchAllBridgedItps();
      addResult('fetchAllBridgedItps', itps.length > 0 ? `Found ${itps.length} bridged ITPs: ${itps.slice(0, 3).join(', ')}${itps.length > 3 ? '...' : ''}` : 'No bridged ITPs found');
    } catch (e) {
      setError(`fetchAllBridgedItps failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoadingState('fetchAllBridgedItps', false);
  };

  // Test fetching bridged ITP registry from events
  const testFetchBridgedRegistry = async () => {
    setLoadingState('fetchBridgedRegistry', true);
    setError(null);
    try {
      const registry = await fetchBridgedItpRegistryFromEvents();
      setBridgedItpList(registry);
      if (registry.length > 0) {
        addResult('fetchBridgedRegistry',
          `Found ${registry.length} ITPs: ` +
          registry.map(r => `${r.symbol} (Arb: ${r.arbitrumAddress.slice(0, 8)}..., Orbit: ${r.orbitAddress.slice(0, 8)}...)`).join(' | ')
        );
        // Auto-populate test addresses if available
        if (registry[0] && !testItpAddress) {
          setTestItpAddress(registry[0].arbitrumAddress);
        }
        if (registry[0] && !testOrbitItpAddress) {
          setTestOrbitItpAddress(registry[0].orbitAddress);
        }
      } else {
        addResult('fetchBridgedRegistry', 'No bridged ITP events found');
      }
    } catch (e) {
      setError(`fetchBridgedRegistry failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoadingState('fetchBridgedRegistry', false);
  };

  // Test useBridgedItpRegistry hook
  const testBridgedItpRegistryHook = async () => {
    setLoadingState('bridgedItpRegistryHook', true);
    setError(null);
    try {
      await bridgedItpRegistry.refresh();
      addResult('bridgedItpRegistryHook',
        `Registry: ${bridgedItpRegistry.registry.length} ITPs | ` +
        `Loading: ${bridgedItpRegistry.isLoading} | ` +
        `Error: ${bridgedItpRegistry.error || 'none'}`
      );
    } catch (e) {
      setError(`bridgedItpRegistryHook failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoadingState('bridgedItpRegistryHook', false);
  };

  // Test checkOrbitItpBalance
  const testCheckOrbitItpBalance = async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }
    if (!testOrbitItpAddress) {
      setError('Enter an Orbit ITP address first');
      return;
    }
    setLoadingState('checkOrbitItpBalance', true);
    setError(null);
    try {
      const balance = await checkOrbitItpBalance(address as `0x${string}`, testOrbitItpAddress as `0x${string}`);
      addResult('checkOrbitItpBalance', `${balance.formatted} ITP on Orbit (raw: ${balance.raw})`);
    } catch (e) {
      setError(`checkOrbitItpBalance failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoadingState('checkOrbitItpBalance', false);
  };

  // Test fetchDualChainBalances
  const testFetchDualChainBalances = async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }
    if (!testItpAddress || !testOrbitItpAddress) {
      setError('Enter both Arbitrum ITP and Orbit ITP addresses');
      return;
    }
    setLoadingState('fetchDualChainBalances', true);
    setError(null);
    try {
      const balances = await fetchDualChainBalances(
        address as `0x${string}`,
        testItpAddress as `0x${string}`,
        testOrbitItpAddress as `0x${string}`
      );
      addResult('fetchDualChainBalances',
        `Arbitrum: ${balances.arbitrum.formatted} | ` +
        `Orbit: ${balances.orbit.formatted} | ` +
        `Total: ${balances.total.formatted}`
      );
    } catch (e) {
      setError(`fetchDualChainBalances failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoadingState('fetchDualChainBalances', false);
  };

  // Test Orbit RPC connectivity
  const testOrbitRpcConnectivity = async () => {
    setLoadingState('orbitRpcConnectivity', true);
    setError(null);
    try {
      const orbitClient = createOrbitClient();
      const blockNumber = await orbitClient.getBlockNumber();
      addResult('orbitRpcConnectivity', `✓ Orbit RPC OK - Block: ${blockNumber} (Chain ID: ${ORBIT_CHAIN_ID})`);
    } catch (e) {
      addResult('orbitRpcConnectivity', `✗ Orbit RPC Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoadingState('orbitRpcConnectivity', false);
  };

  // Test Orbit VAULT read
  const testOrbitVaultRead = async () => {
    if (!testOrbitItpAddress) {
      setError('Enter an Orbit ITP address first');
      return;
    }
    setLoadingState('orbitVaultRead', true);
    setError(null);
    try {
      const metadata = await fetchOrbitItpMetadata(testOrbitItpAddress as `0x${string}`);
      addResult('orbitVaultRead',
        `${metadata.name} (${metadata.symbol}) - Supply: ${formatUnits(metadata.totalSupply, 18)}`
      );
    } catch (e) {
      setError(`orbitVaultRead failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoadingState('orbitVaultRead', false);
  };

  // Run all Story 3.3 tests
  const runStory33Tests = async () => {
    await testOrbitMonitorStatus();
  };

  // Run all Story 3.4 tests
  const runStory34Tests = async () => {
    await testOrbitRpcConnectivity();
    await testFetchAllBridgedItps();
    await testFetchBridgedRegistry();
    await testBridgedItpRegistryHook();
    if (address && testItpAddress && testOrbitItpAddress) {
      await testCheckOrbitItpBalance();
      await testFetchDualChainBalances();
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setResults({});
    setError(null);
    await testBridgeProxyOwner();
    await testBridgeProxyFactory();
    await testBridgeProxyUsdc();
    await testItpCount();
    await testGetAllItps();
    await testUsdcSupply();
    // Story 3.3 & 3.4 tests (don't require wallet)
    await runStory33Tests();
    await runStory34Tests();
    if (address) {
      await testUsdcAllowance();
      // Also run Story 3.2 tests
      await runStory32Tests();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Bridge Contract Test Page</h1>
        <p className="text-gray-400 mb-8">Testing Stories 3.1-3.4 - Bridge wallet, buy/sell flows, transaction monitoring, and dual-chain balances</p>

        {/* Connection Status */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-xl font-semibold mb-2">Connection Status</h2>
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <span className="text-gray-400">Wallet Connected:</span>{' '}
              <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                {isConnected ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Address:</span>{' '}
              <span className="font-mono">{address || 'Not connected'}</span>
            </div>
            <div>
              <span className="text-gray-400">Chain ID:</span>{' '}
              <span className="font-mono">{chainId || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">On Arbitrum:</span>{' '}
              <span className={isCorrectChain ? 'text-green-400' : 'text-yellow-400'}>
                {isCorrectChain ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {!isConnected ? (
              <Button onClick={handleConnect} disabled={connecting} className="bg-blue-600 hover:bg-blue-700">
                {connecting ? 'Connecting...' : 'Connect Wallet'}
              </Button>
            ) : (
              <>
                <Button onClick={handleDisconnect} variant="outline" className="border-red-500 text-red-400 hover:bg-red-500/20">
                  Disconnect
                </Button>
                {!isCorrectChain && (
                  <Button onClick={handleSwitchToArbitrum} className="bg-orange-600 hover:bg-orange-700">
                    Switch to Arbitrum
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Contract Addresses */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-xl font-semibold mb-2">Contract Addresses</h2>
          <div className="grid grid-cols-2 gap-4">
            {/* Arbitrum Addresses */}
            <div>
              <h3 className="text-sm font-semibold text-blue-400 mb-2">Arbitrum Mainnet</h3>
              <div className="space-y-2 text-sm font-mono">
                <div>
                  <span className="text-gray-400">BridgeProxy:</span>{' '}
                  <a href={`https://arbiscan.io/address/${BRIDGE_PROXY_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                    {BRIDGE_PROXY_ADDRESS.slice(0, 10)}...
                  </a>
                </div>
                <div>
                  <span className="text-gray-400">BridgedItpFactory:</span>{' '}
                  <a href={`https://arbiscan.io/address/${BRIDGED_ITP_FACTORY_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                    {BRIDGED_ITP_FACTORY_ADDRESS.slice(0, 10)}...
                  </a>
                </div>
                <div>
                  <span className="text-gray-400">USDC:</span>{' '}
                  <a href={`https://arbiscan.io/address/${USDC_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                    {USDC_ADDRESS.slice(0, 10)}...
                  </a>
                </div>
              </div>
            </div>
            {/* Orbit Addresses */}
            <div>
              <h3 className="text-sm font-semibold text-purple-400 mb-2">Orbit Chain ({ORBIT_CHAIN_ID})</h3>
              <div className="space-y-2 text-sm font-mono">
                <div>
                  <span className="text-gray-400">VAULT:</span>{' '}
                  <span className="text-purple-400">{ORBIT_VAULT_ADDRESS.slice(0, 10)}...</span>
                </div>
                <div>
                  <span className="text-gray-400">RPC:</span>{' '}
                  <span className="text-purple-400 text-xs">{ORBIT_RPC_URL}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Test Buttons */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-xl font-semibold mb-4">Contract Read Tests</h2>

          <div className="mb-4">
            <Button onClick={runAllTests} className="bg-green-600 hover:bg-green-700">
              Run All Tests
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-300">BridgeProxy</h3>
              <Button onClick={testBridgeProxyOwner} disabled={loading['bridgeProxyOwner']} variant="outline" size="sm" className="w-full">
                {loading['bridgeProxyOwner'] ? 'Loading...' : 'Test owner()'}
              </Button>
              <Button onClick={testBridgeProxyFactory} disabled={loading['bridgeProxyFactory']} variant="outline" size="sm" className="w-full">
                {loading['bridgeProxyFactory'] ? 'Loading...' : 'Test factory()'}
              </Button>
              <Button onClick={testBridgeProxyUsdc} disabled={loading['bridgeProxyUsdc']} variant="outline" size="sm" className="w-full">
                {loading['bridgeProxyUsdc'] ? 'Loading...' : 'Test usdc()'}
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-gray-300">BridgedItpFactory</h3>
              <Button onClick={testItpCount} disabled={loading['itpCount']} variant="outline" size="sm" className="w-full">
                {loading['itpCount'] ? 'Loading...' : 'Test bridgedItpCount()'}
              </Button>
              <Button onClick={testGetAllItps} disabled={loading['allItps']} variant="outline" size="sm" className="w-full">
                {loading['allItps'] ? 'Loading...' : 'Test getAllBridgedItps()'}
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-gray-300">USDC (ERC20)</h3>
              <Button onClick={testUsdcSupply} disabled={loading['usdcSupply']} variant="outline" size="sm" className="w-full">
                {loading['usdcSupply'] ? 'Loading...' : 'Test totalSupply()'}
              </Button>
              <Button onClick={testUsdcAllowance} disabled={loading['usdcAllowance'] || !isConnected} variant="outline" size="sm" className="w-full">
                {loading['usdcAllowance'] ? 'Loading...' : 'Test allowance()'}
              </Button>
            </div>
          </div>
        </div>

        {/* Story 3.2 Tests - Balance Utilities & Hooks */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-xl font-semibold mb-2">Story 3.2 Tests - Buy/Sell Integration</h2>
          <p className="text-gray-400 text-sm mb-4">Testing balance checking, approval utilities, and Arbitrum buy/sell hooks per Story 3.2 acceptance criteria</p>

          {/* Test Inputs */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Test Amount (USDC/ITP)</label>
              <input
                type="text"
                value={testAmount}
                onChange={(e) => setTestAmount(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded text-white font-mono text-sm"
                placeholder="100"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">ITP Token Address (for sell tests)</label>
              <input
                type="text"
                value={testItpAddress}
                onChange={(e) => setTestItpAddress(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded text-white font-mono text-sm"
                placeholder="0x..."
              />
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <Button onClick={runStory32Tests} disabled={!isConnected} className="bg-purple-600 hover:bg-purple-700">
              Run All Story 3.2 Tests
            </Button>
            <Button onClick={testBuyFlowSimulation} disabled={!isConnected || loading['buyFlowSim']} className="bg-green-600 hover:bg-green-700">
              {loading['buyFlowSim'] ? 'Simulating...' : 'Simulate Buy Flow (AC #1)'}
            </Button>
            <Button onClick={testSellFlowSimulation} disabled={!isConnected || !testItpAddress || loading['sellFlowSim']} className="bg-orange-600 hover:bg-orange-700">
              {loading['sellFlowSim'] ? 'Simulating...' : 'Simulate Sell Flow (AC #2)'}
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* USDC Balance Tests (AC #3) */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-300">USDC Balance (AC #3)</h3>
              <Button onClick={testCheckUsdcBalance} disabled={loading['checkUsdcBalance'] || !isConnected} variant="outline" size="sm" className="w-full">
                {loading['checkUsdcBalance'] ? 'Loading...' : 'checkUsdcBalance()'}
              </Button>
              <Button onClick={testHasSufficientUsdcBalance} disabled={loading['hasSufficientUsdcBalance'] || !isConnected} variant="outline" size="sm" className="w-full">
                {loading['hasSufficientUsdcBalance'] ? 'Loading...' : 'hasSufficientUsdcBalance()'}
              </Button>
              <Button onClick={testHasApproval} disabled={loading['hasApproval'] || !isConnected} variant="outline" size="sm" className="w-full">
                {loading['hasApproval'] ? 'Loading...' : 'hasApproval() - USDC'}
              </Button>
            </div>

            {/* ITP Balance Tests (AC #4) */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-300">ITP Balance (AC #4)</h3>
              <Button onClick={testCheckItpBalance} disabled={loading['checkItpBalance'] || !isConnected || !testItpAddress} variant="outline" size="sm" className="w-full">
                {loading['checkItpBalance'] ? 'Loading...' : 'checkItpBalance()'}
              </Button>
              <Button onClick={testHasSufficientItpBalance} disabled={loading['hasSufficientItpBalance'] || !isConnected || !testItpAddress} variant="outline" size="sm" className="w-full">
                {loading['hasSufficientItpBalance'] ? 'Loading...' : 'hasSufficientItpBalance()'}
              </Button>
              <p className="text-xs text-yellow-400 mt-2">Requires ITP address above</p>
            </div>

            {/* Hook Status (AC #1, #2) */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-300">Hooks (AC #1, #2)</h3>
              <Button onClick={testArbitrumBuyHook} disabled={loading['arbitrumBuyHook']} variant="outline" size="sm" className="w-full">
                {loading['arbitrumBuyHook'] ? 'Loading...' : 'useArbitrumBuy status'}
              </Button>
              <Button onClick={testArbitrumSellHook} disabled={loading['arbitrumSellHook']} variant="outline" size="sm" className="w-full">
                {loading['arbitrumSellHook'] ? 'Loading...' : 'useArbitrumSell status'}
              </Button>
              <p className="text-xs text-yellow-400 mt-2">TX blocked until contract deploy</p>
            </div>
          </div>
        </div>

        {/* Story 3.3 Tests - Transaction Status Monitoring */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6 border-l-4 border-cyan-500">
          <h2 className="text-xl font-semibold mb-2">Story 3.3 Tests - Transaction Status Monitoring</h2>
          <p className="text-gray-400 text-sm mb-4">Testing Orbit chain event monitoring for bridge operation completion (useOrbitEventMonitor hook)</p>

          <div className="flex gap-2 mb-4">
            <Button onClick={runStory33Tests} className="bg-cyan-600 hover:bg-cyan-700">
              Run Story 3.3 Tests
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Monitor Status */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-300">Monitor Status</h3>
              <Button onClick={testOrbitMonitorStatus} disabled={loading['orbitMonitorStatus']} variant="outline" size="sm" className="w-full">
                {loading['orbitMonitorStatus'] ? 'Loading...' : 'Check Monitor Status'}
              </Button>
              <div className="mt-2 p-2 bg-gray-700/50 rounded text-xs">
                <span className="text-gray-400">Current Status: </span>
                <span className={orbitMonitor.status === 'idle' ? 'text-gray-400' : orbitMonitor.status === 'watching' ? 'text-yellow-400' : orbitMonitor.status === 'completed' ? 'text-green-400' : 'text-red-400'}>
                  {orbitMonitor.status}
                </span>
              </div>
            </div>

            {/* Monitor Controls */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-300">Monitor Controls</h3>
              <Button onClick={testStartBuyMonitoring} disabled={!isConnected || loading['startBuyMonitoring']} variant="outline" size="sm" className="w-full">
                {loading['startBuyMonitoring'] ? 'Starting...' : 'Start Buy Monitor'}
              </Button>
              <Button onClick={testStartSellMonitoring} disabled={!isConnected || loading['startSellMonitoring']} variant="outline" size="sm" className="w-full">
                {loading['startSellMonitoring'] ? 'Starting...' : 'Start Sell Monitor'}
              </Button>
              <div className="flex gap-2">
                <Button onClick={testStopMonitoring} variant="outline" size="sm" className="flex-1 text-orange-400 border-orange-400">
                  Stop
                </Button>
                <Button onClick={testResetMonitor} variant="outline" size="sm" className="flex-1 text-gray-400">
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Story 3.4 Tests - Dual-Chain Balance Display */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6 border-l-4 border-purple-500">
          <h2 className="text-xl font-semibold mb-2">Story 3.4 Tests - Dual-Chain Balance Display</h2>
          <p className="text-gray-400 text-sm mb-4">Testing Arbitrum + Orbit dual-chain balance queries, ITP registry, and VAULT reads</p>

          {/* Test Inputs for Story 3.4 */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Arbitrum ITP Address (bridged)</label>
              <input
                type="text"
                value={testItpAddress}
                onChange={(e) => setTestItpAddress(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded text-white font-mono text-sm"
                placeholder="0x... (auto-populated from registry)"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Orbit ITP Address (native)</label>
              <input
                type="text"
                value={testOrbitItpAddress}
                onChange={(e) => setTestOrbitItpAddress(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded text-white font-mono text-sm"
                placeholder="0x... (auto-populated from registry)"
              />
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <Button onClick={runStory34Tests} className="bg-purple-600 hover:bg-purple-700">
              Run All Story 3.4 Tests
            </Button>
            <Button onClick={testOrbitRpcConnectivity} disabled={loading['orbitRpcConnectivity']} className="bg-purple-600/50 hover:bg-purple-700/50">
              {loading['orbitRpcConnectivity'] ? 'Testing...' : 'Test Orbit RPC'}
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* ITP Registry Tests */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-300">ITP Registry (AC #3)</h3>
              <Button onClick={testFetchAllBridgedItps} disabled={loading['fetchAllBridgedItps']} variant="outline" size="sm" className="w-full">
                {loading['fetchAllBridgedItps'] ? 'Loading...' : 'fetchAllBridgedItps()'}
              </Button>
              <Button onClick={testFetchBridgedRegistry} disabled={loading['fetchBridgedRegistry']} variant="outline" size="sm" className="w-full">
                {loading['fetchBridgedRegistry'] ? 'Loading...' : 'Fetch Registry (events)'}
              </Button>
              <Button onClick={testBridgedItpRegistryHook} disabled={loading['bridgedItpRegistryHook']} variant="outline" size="sm" className="w-full">
                {loading['bridgedItpRegistryHook'] ? 'Loading...' : 'useBridgedItpRegistry'}
              </Button>
            </div>

            {/* Dual-Chain Balance Tests */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-300">Dual-Chain Balances (AC #1, #2)</h3>
              <Button onClick={testCheckOrbitItpBalance} disabled={loading['checkOrbitItpBalance'] || !isConnected || !testOrbitItpAddress} variant="outline" size="sm" className="w-full">
                {loading['checkOrbitItpBalance'] ? 'Loading...' : 'Orbit Balance'}
              </Button>
              <Button onClick={testFetchDualChainBalances} disabled={loading['fetchDualChainBalances'] || !isConnected || !testItpAddress || !testOrbitItpAddress} variant="outline" size="sm" className="w-full">
                {loading['fetchDualChainBalances'] ? 'Loading...' : 'Dual-Chain Balance'}
              </Button>
              <p className="text-xs text-purple-400 mt-2">Queries Arb + Orbit in parallel</p>
            </div>

            {/* Orbit VAULT Tests */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-300">Orbit VAULT (AC #3)</h3>
              <Button onClick={testOrbitVaultRead} disabled={loading['orbitVaultRead'] || !testOrbitItpAddress} variant="outline" size="sm" className="w-full">
                {loading['orbitVaultRead'] ? 'Loading...' : 'ITP Metadata'}
              </Button>
              <p className="text-xs text-gray-400 mt-2">Reads name, symbol, supply from Orbit</p>
            </div>
          </div>

          {/* Display discovered ITPs */}
          {bridgedItpList.length > 0 && (
            <div className="mt-4 p-3 bg-gray-700/30 rounded">
              <h4 className="text-sm font-semibold text-purple-300 mb-2">Discovered ITPs ({bridgedItpList.length})</h4>
              <div className="space-y-1 text-xs font-mono">
                {bridgedItpList.map((itp, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-gray-300">{itp.symbol} ({itp.name})</span>
                    <div className="flex gap-2">
                      <span className="text-blue-400">Arb: {itp.arbitrumAddress.slice(0, 8)}...</span>
                      <span className="text-purple-400">Orbit: {itp.orbitAddress.slice(0, 8)}...</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {Object.keys(results).length > 0 && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Results</h2>
            <div className="space-y-2 text-sm">
              {results['bridgeProxyOwner'] && (
                <div className="flex justify-between">
                  <span className="text-gray-400">BridgeProxy.owner():</span>
                  <span className="font-mono text-green-400">{results['bridgeProxyOwner']}</span>
                </div>
              )}
              {results['bridgeProxyFactory'] && (
                <div className="flex justify-between">
                  <span className="text-gray-400">BridgeProxy.factory():</span>
                  <span className="font-mono text-green-400">{results['bridgeProxyFactory']}</span>
                </div>
              )}
              {results['bridgeProxyUsdc'] && (
                <div className="flex justify-between">
                  <span className="text-gray-400">BridgeProxy.usdc():</span>
                  <span className="font-mono text-green-400">{results['bridgeProxyUsdc']}</span>
                </div>
              )}
              {results['itpCount'] && (
                <div className="flex justify-between">
                  <span className="text-gray-400">BridgedItpFactory.bridgedItpCount():</span>
                  <span className="font-mono text-green-400">{results['itpCount']}</span>
                </div>
              )}
              {results['allItps'] && (
                <div className="flex justify-between">
                  <span className="text-gray-400">BridgedItpFactory.getAllBridgedItps():</span>
                  <span className="font-mono text-green-400">{results['allItps']}</span>
                </div>
              )}
              {results['usdcSupply'] && (
                <div className="flex justify-between">
                  <span className="text-gray-400">USDC.totalSupply():</span>
                  <span className="font-mono text-green-400">{results['usdcSupply']}</span>
                </div>
              )}
              {results['usdcAllowance'] && (
                <div className="flex justify-between">
                  <span className="text-gray-400">USDC.allowance():</span>
                  <span className="font-mono text-green-400">{results['usdcAllowance']}</span>
                </div>
              )}

              {/* Story 3.2 Results */}
              {(results['checkUsdcBalance'] || results['hasSufficientUsdcBalance'] || results['hasApproval'] ||
                results['checkItpBalance'] || results['hasSufficientItpBalance'] ||
                results['arbitrumBuyHook'] || results['arbitrumSellHook'] ||
                results['buyFlowSim'] || results['sellFlowSim']) && (
                <>
                  <div className="border-t border-gray-600 my-3 pt-3">
                    <span className="text-purple-400 font-semibold">Story 3.2 Results:</span>
                  </div>

                  {/* Flow Simulations */}
                  {results['buyFlowSim'] && (
                    <div className="mb-2 p-2 bg-gray-700/50 rounded">
                      <span className="text-gray-400 block text-xs mb-1">Buy Flow Simulation (AC #1):</span>
                      <span className="font-mono text-sm text-green-400">{results['buyFlowSim']}</span>
                    </div>
                  )}
                  {results['sellFlowSim'] && (
                    <div className="mb-2 p-2 bg-gray-700/50 rounded">
                      <span className="text-gray-400 block text-xs mb-1">Sell Flow Simulation (AC #2):</span>
                      <span className="font-mono text-sm text-orange-400">{results['sellFlowSim']}</span>
                    </div>
                  )}

                  {/* USDC Balance Tests (AC #3) */}
                  {results['checkUsdcBalance'] && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">checkUsdcBalance():</span>
                      <span className="font-mono text-green-400">{results['checkUsdcBalance']}</span>
                    </div>
                  )}
                  {results['hasSufficientUsdcBalance'] && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">hasSufficientUsdcBalance():</span>
                      <span className="font-mono text-green-400">{results['hasSufficientUsdcBalance']}</span>
                    </div>
                  )}
                  {results['hasApproval'] && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">hasApproval() - USDC:</span>
                      <span className="font-mono text-green-400">{results['hasApproval']}</span>
                    </div>
                  )}

                  {/* ITP Balance Tests (AC #4) */}
                  {results['checkItpBalance'] && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">checkItpBalance():</span>
                      <span className="font-mono text-orange-400">{results['checkItpBalance']}</span>
                    </div>
                  )}
                  {results['hasSufficientItpBalance'] && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">hasSufficientItpBalance():</span>
                      <span className="font-mono text-orange-400">{results['hasSufficientItpBalance']}</span>
                    </div>
                  )}

                  {/* Hook Status */}
                  {results['arbitrumBuyHook'] && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">useArbitrumBuy:</span>
                      <span className="font-mono text-yellow-400 text-xs">{results['arbitrumBuyHook']}</span>
                    </div>
                  )}
                  {results['arbitrumSellHook'] && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">useArbitrumSell:</span>
                      <span className="font-mono text-yellow-400 text-xs">{results['arbitrumSellHook']}</span>
                    </div>
                  )}
                </>
              )}

              {/* Story 3.3 Results - Transaction Status Monitoring */}
              {(results['orbitMonitorStatus'] || results['startBuyMonitoring'] || results['startSellMonitoring'] ||
                results['stopMonitoring'] || results['resetMonitor']) && (
                <>
                  <div className="border-t border-gray-600 my-3 pt-3">
                    <span className="text-cyan-400 font-semibold">Story 3.3 Results (Transaction Status):</span>
                  </div>
                  {results['orbitMonitorStatus'] && (
                    <div className="mb-2 p-2 bg-gray-700/50 rounded">
                      <span className="text-gray-400 block text-xs mb-1">Orbit Monitor Status:</span>
                      <span className="font-mono text-sm text-cyan-400">{results['orbitMonitorStatus']}</span>
                    </div>
                  )}
                  {results['startBuyMonitoring'] && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Start Buy Monitor:</span>
                      <span className="font-mono text-cyan-400 text-xs">{results['startBuyMonitoring']}</span>
                    </div>
                  )}
                  {results['startSellMonitoring'] && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Start Sell Monitor:</span>
                      <span className="font-mono text-cyan-400 text-xs">{results['startSellMonitoring']}</span>
                    </div>
                  )}
                  {results['stopMonitoring'] && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Stop Monitoring:</span>
                      <span className="font-mono text-orange-400 text-xs">{results['stopMonitoring']}</span>
                    </div>
                  )}
                  {results['resetMonitor'] && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Reset Monitor:</span>
                      <span className="font-mono text-gray-400 text-xs">{results['resetMonitor']}</span>
                    </div>
                  )}
                </>
              )}

              {/* Story 3.4 Results - Dual-Chain Balance Display */}
              {(results['orbitRpcConnectivity'] || results['fetchAllBridgedItps'] || results['fetchBridgedRegistry'] ||
                results['bridgedItpRegistryHook'] || results['checkOrbitItpBalance'] || results['fetchDualChainBalances'] ||
                results['orbitVaultRead']) && (
                <>
                  <div className="border-t border-gray-600 my-3 pt-3">
                    <span className="text-purple-400 font-semibold">Story 3.4 Results (Dual-Chain Balances):</span>
                  </div>

                  {/* Connectivity */}
                  {results['orbitRpcConnectivity'] && (
                    <div className="mb-2 p-2 bg-gray-700/50 rounded">
                      <span className="text-gray-400 block text-xs mb-1">Orbit RPC Connectivity:</span>
                      <span className="font-mono text-sm text-purple-400">{results['orbitRpcConnectivity']}</span>
                    </div>
                  )}

                  {/* Registry */}
                  {results['fetchAllBridgedItps'] && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">fetchAllBridgedItps():</span>
                      <span className="font-mono text-purple-400 text-xs">{results['fetchAllBridgedItps']}</span>
                    </div>
                  )}
                  {results['fetchBridgedRegistry'] && (
                    <div className="mb-2 p-2 bg-gray-700/50 rounded">
                      <span className="text-gray-400 block text-xs mb-1">Bridged ITP Registry (events):</span>
                      <span className="font-mono text-xs text-purple-400 break-all">{results['fetchBridgedRegistry']}</span>
                    </div>
                  )}
                  {results['bridgedItpRegistryHook'] && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">useBridgedItpRegistry:</span>
                      <span className="font-mono text-purple-400 text-xs">{results['bridgedItpRegistryHook']}</span>
                    </div>
                  )}

                  {/* Balances */}
                  {results['checkOrbitItpBalance'] && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Orbit ITP Balance:</span>
                      <span className="font-mono text-purple-400">{results['checkOrbitItpBalance']}</span>
                    </div>
                  )}
                  {results['fetchDualChainBalances'] && (
                    <div className="mb-2 p-2 bg-gray-700/50 rounded">
                      <span className="text-gray-400 block text-xs mb-1">Dual-Chain Balances (Arb + Orbit):</span>
                      <span className="font-mono text-sm text-purple-400">{results['fetchDualChainBalances']}</span>
                    </div>
                  )}

                  {/* VAULT */}
                  {results['orbitVaultRead'] && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Orbit VAULT ITP Metadata:</span>
                      <span className="font-mono text-purple-400">{results['orbitVaultRead']}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 text-sm text-gray-500">
          <p><strong>Instructions:</strong></p>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Click "Connect Wallet" to connect your MetaMask or other wallet</li>
            <li>Switch to Arbitrum network if not already on it</li>
            <li>Click "Run All Tests" to test all contract read functions</li>
            <li>Each button tests a specific contract function</li>
            <li>Green results = success, Red banner = error</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

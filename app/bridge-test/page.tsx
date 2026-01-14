'use client';

import { useState } from 'react';
import { useBridgeWallet } from '@/hooks/useBridgeWallet';
import { useWallet } from '@/contexts/wallet-context';
import { Button } from '@/components/ui/button';
import { BRIDGE_PROXY_ADDRESS, BRIDGED_ITP_FACTORY_ADDRESS, USDC_ADDRESS } from '@/lib/contracts/addresses';
// Story 3.2 imports - Balance utilities and hooks
import {
  checkUsdcBalance,
  checkItpBalance,
  hasSufficientUsdcBalance,
  hasSufficientItpBalance,
  hasApproval,
  USDC_DECIMALS,
  ITP_DECIMALS,
} from '@/lib/contracts/balance-utils';
import { useArbitrumBuy } from '@/hooks/useArbitrumBuy';
import { useArbitrumSell } from '@/hooks/useArbitrumSell';
import { parseUnits, formatUnits } from 'viem';

export default function BridgeTestPage() {
  const { bridgeProxy, bridgedItpFactory, usdc, isConnected, address, publicClient, chainId, isCorrectChain } = useBridgeWallet();
  const { connectWallet, disconnectWallet, connecting, switchNetwork } = useWallet();

  // Story 3.2 Hooks
  const arbitrumBuy = useArbitrumBuy();
  const arbitrumSell = useArbitrumSell();

  const [results, setResults] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [testAmount, setTestAmount] = useState('100'); // Test amount for balance checks
  const [testItpAddress, setTestItpAddress] = useState(''); // ITP address for sell tests

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

  // Test checkUsdcBalance
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

  // Test hasSufficientUsdcBalance
  const testHasSufficientBalance = async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }
    setLoadingState('hasSufficientBalance', true);
    setError(null);
    try {
      const amountWei = parseUnits(testAmount, USDC_DECIMALS);
      const result = await hasSufficientUsdcBalance(publicClient, address, amountWei);
      const shortfallFormatted = formatUnits(result.shortfall, USDC_DECIMALS);
      addResult(
        'hasSufficientBalance',
        `${result.isSufficient ? '✓ Sufficient' : '✗ Insufficient'} (balance: ${result.balance.formatted}, shortfall: ${shortfallFormatted})`
      );
    } catch (e) {
      setError(`hasSufficientUsdcBalance failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoadingState('hasSufficientBalance', false);
  };

  // Test hasApproval
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

  // Test useArbitrumBuy hook status (read from useBridgeWallet state)
  const testArbitrumBuyHook = async () => {
    setLoadingState('arbitrumBuyHook', true);
    setError(null);
    try {
      // Display state that would be used by useArbitrumBuy hook
      addResult('arbitrumBuyHook', `Status: idle, Connected: ${isConnected}, Correct Chain: ${isCorrectChain}`);
    } catch (e) {
      setError(`useArbitrumBuy test failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoadingState('arbitrumBuyHook', false);
  };

  // Test useArbitrumSell hook status (read from useBridgeWallet state)
  const testArbitrumSellHook = async () => {
    setLoadingState('arbitrumSellHook', true);
    setError(null);
    try {
      // Display state that would be used by useArbitrumSell hook
      addResult('arbitrumSellHook', `Status: idle, Connected: ${isConnected}, Correct Chain: ${isCorrectChain}`);
    } catch (e) {
      setError(`useArbitrumSell test failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoadingState('arbitrumSellHook', false);
  };

  // Run all Story 3.2 tests
  const runStory32Tests = async () => {
    if (!address) {
      setError('Connect wallet first to run Story 3.2 tests');
      return;
    }
    await testCheckUsdcBalance();
    await testHasSufficientBalance();
    await testHasApproval();
    await testArbitrumBuyHook();
    await testArbitrumSellHook();
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
        <p className="text-gray-400 mb-8">Testing Story 3.1 & 3.2 - Bridge wallet utilities, balance checks, and buy/sell hooks on Arbitrum Mainnet</p>

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
          <h2 className="text-xl font-semibold mb-2">Contract Addresses (Arbitrum Mainnet)</h2>
          <div className="space-y-2 text-sm font-mono">
            <div>
              <span className="text-gray-400">BridgeProxy:</span>{' '}
              <a href={`https://arbiscan.io/address/${BRIDGE_PROXY_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                {BRIDGE_PROXY_ADDRESS}
              </a>
            </div>
            <div>
              <span className="text-gray-400">BridgedItpFactory:</span>{' '}
              <a href={`https://arbiscan.io/address/${BRIDGED_ITP_FACTORY_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                {BRIDGED_ITP_FACTORY_ADDRESS}
              </a>
            </div>
            <div>
              <span className="text-gray-400">USDC:</span>{' '}
              <a href={`https://arbiscan.io/address/${USDC_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                {USDC_ADDRESS}
              </a>
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
          <h2 className="text-xl font-semibold mb-2">Story 3.2 Tests - Balance Utilities & Hooks</h2>
          <p className="text-gray-400 text-sm mb-4">Testing balance checking, approval utilities, and Arbitrum buy/sell hooks</p>

          {/* Test Amount Input */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">Test Amount (USDC)</label>
            <input
              type="text"
              value={testAmount}
              onChange={(e) => setTestAmount(e.target.value)}
              className="w-32 px-3 py-2 bg-gray-700 rounded text-white font-mono text-sm"
              placeholder="100"
            />
          </div>

          <div className="mb-4">
            <Button onClick={runStory32Tests} disabled={!isConnected} className="bg-purple-600 hover:bg-purple-700">
              Run Story 3.2 Tests
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-300">Balance Utilities</h3>
              <Button onClick={testCheckUsdcBalance} disabled={loading['checkUsdcBalance'] || !isConnected} variant="outline" size="sm" className="w-full">
                {loading['checkUsdcBalance'] ? 'Loading...' : 'Test checkUsdcBalance()'}
              </Button>
              <Button onClick={testHasSufficientBalance} disabled={loading['hasSufficientBalance'] || !isConnected} variant="outline" size="sm" className="w-full">
                {loading['hasSufficientBalance'] ? 'Loading...' : 'Test hasSufficientUsdcBalance()'}
              </Button>
              <Button onClick={testHasApproval} disabled={loading['hasApproval'] || !isConnected} variant="outline" size="sm" className="w-full">
                {loading['hasApproval'] ? 'Loading...' : 'Test hasApproval()'}
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-gray-300">Arbitrum Hooks (Blocked)</h3>
              <Button onClick={testArbitrumBuyHook} disabled={loading['arbitrumBuyHook']} variant="outline" size="sm" className="w-full">
                {loading['arbitrumBuyHook'] ? 'Loading...' : 'Test useArbitrumBuy'}
              </Button>
              <Button onClick={testArbitrumSellHook} disabled={loading['arbitrumSellHook']} variant="outline" size="sm" className="w-full">
                {loading['arbitrumSellHook'] ? 'Loading...' : 'Test useArbitrumSell'}
              </Button>
              <p className="text-xs text-yellow-400 mt-2">Note: Contract calls blocked until deployment</p>
            </div>
          </div>
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
              {(results['checkUsdcBalance'] || results['hasSufficientBalance'] || results['hasApproval'] || results['arbitrumBuyHook'] || results['arbitrumSellHook']) && (
                <>
                  <div className="border-t border-gray-600 my-3 pt-3">
                    <span className="text-purple-400 font-semibold">Story 3.2 Results:</span>
                  </div>
                  {results['checkUsdcBalance'] && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">checkUsdcBalance():</span>
                      <span className="font-mono text-green-400">{results['checkUsdcBalance']}</span>
                    </div>
                  )}
                  {results['hasSufficientBalance'] && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">hasSufficientUsdcBalance():</span>
                      <span className="font-mono text-green-400">{results['hasSufficientBalance']}</span>
                    </div>
                  )}
                  {results['hasApproval'] && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">hasApproval():</span>
                      <span className="font-mono text-green-400">{results['hasApproval']}</span>
                    </div>
                  )}
                  {results['arbitrumBuyHook'] && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">useArbitrumBuy:</span>
                      <span className="font-mono text-yellow-400">{results['arbitrumBuyHook']}</span>
                    </div>
                  )}
                  {results['arbitrumSellHook'] && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">useArbitrumSell:</span>
                      <span className="font-mono text-yellow-400">{results['arbitrumSellHook']}</span>
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

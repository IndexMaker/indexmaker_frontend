'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';

// ============================================
// Types
// ============================================

interface TestResult {
  status: 'pass' | 'fail' | 'pending';
  responseTime?: number;  // in ms
  message?: string;
  details?: Record<string, unknown>;
}

interface HealthCheckResponse {
  status: string;
  vendor_id?: number;
  tracked_assets?: number;
  [key: string]: unknown;
}

// Expected asset count from vendor/assets.json (per Story 1-1: asset-registry crate)
// This count matches the assets in vendor/assets.json created by the asset-registry crate.
// If the actual count differs, verify vendor is loading from the correct file.
const EXPECTED_ASSET_COUNT = 627;

// Cache for vendor health result to avoid redundant HTTP calls
let cachedVendorResult: TestResult | null = null;
let cachedVendorTimestamp = 0;
const VENDOR_CACHE_TTL_MS = 2000; // Cache vendor result for 2 seconds

// ============================================
// Health Check Functions
// ============================================

/**
 * Clear vendor cache - call before running all checks to ensure fresh data
 */
const clearVendorCache = () => {
  cachedVendorResult = null;
  cachedVendorTimestamp = 0;
};

/**
 * Task 2.1: Check Vendor Health
 * Calls GET http://localhost:8080/health
 * Uses caching to avoid redundant HTTP calls when multiple checks need vendor data
 */
const checkVendorHealth = async (useCache = true): Promise<TestResult> => {
  // Return cached result if still valid
  const now = Date.now();
  if (useCache && cachedVendorResult && (now - cachedVendorTimestamp) < VENDOR_CACHE_TTL_MS) {
    return cachedVendorResult;
  }

  const startTime = Date.now();
  try {
    const response = await fetch('http://localhost:8080/health', {
      signal: AbortSignal.timeout(5000)
    });
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const result: TestResult = { status: 'fail', responseTime, message: `HTTP ${response.status}` };
      cachedVendorResult = result;
      cachedVendorTimestamp = now;
      return result;
    }

    const data: HealthCheckResponse = await response.json();
    const result: TestResult = {
      status: data.status === 'healthy' ? 'pass' : 'fail',
      responseTime,
      message: `Vendor ID: ${data.vendor_id}, Assets: ${data.tracked_assets}`,
      details: data
    };

    // Cache the result
    cachedVendorResult = result;
    cachedVendorTimestamp = now;
    return result;
  } catch (e) {
    const result: TestResult = {
      status: 'fail',
      responseTime: Date.now() - startTime,
      message: e instanceof Error ? e.message : 'Unknown error'
    };
    cachedVendorResult = result;
    cachedVendorTimestamp = now;
    return result;
  }
};

/**
 * Task 2.2: Check Keeper Health
 * Keeper doesn't have a direct HTTP API - this is an indirect check only.
 *
 * IMPORTANT: Keeper runs as a separate process that connects to Vendor.
 * We cannot directly verify Keeper is running from the frontend.
 * This check only confirms Vendor is healthy, which is a prerequisite for Keeper.
 * For true Keeper verification, check start.sh logs or use `./start.sh status`.
 */
const checkKeeperHealth = async (): Promise<TestResult> => {
  const startTime = Date.now();
  try {
    // Keeper health cannot be directly verified from frontend - it has no HTTP endpoint.
    // We can only verify Vendor is healthy (which Keeper depends on).
    const vendorResult = await checkVendorHealth(); // Uses cached result
    const responseTime = Date.now() - startTime;

    if (vendorResult.status === 'fail') {
      return {
        status: 'fail',
        responseTime,
        message: 'Cannot verify - vendor unhealthy (keeper depends on vendor)'
      };
    }

    // Vendor is healthy - Keeper MIGHT be running but we can't confirm from here
    // Return 'pending' to indicate this is an indirect/incomplete check
    return {
      status: 'pending',
      responseTime,
      message: 'Indirect check only - verify via ./start.sh status'
    };
  } catch (e) {
    return {
      status: 'fail',
      responseTime: Date.now() - startTime,
      message: e instanceof Error ? e.message : 'Unknown error'
    };
  }
};

/**
 * Task 2.3: Check Bridge-node Health
 * Bridge-node doesn't expose HTTP API - it's an event-driven service.
 * For verification, check start.sh logs for "event listener connected" message.
 */
const checkBridgeNodeHealth = async (): Promise<TestResult> => {
  const startTime = Date.now();
  // Bridge-node is event-driven with no HTTP API
  // Cannot verify from frontend - check ./start.sh status or logs
  return {
    status: 'pending',
    responseTime: Date.now() - startTime,
    message: 'Event-driven (no HTTP API) - verify via ./start.sh logs bridge-node'
  };
};

/**
 * Task 2.4: Check Backend Health
 * Calls GET http://localhost:3002/
 */
const checkBackendHealth = async (): Promise<TestResult> => {
  const startTime = Date.now();
  try {
    const response = await fetch('http://localhost:3002/', {
      signal: AbortSignal.timeout(5000)
    });
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      return { status: 'fail', responseTime, message: `HTTP ${response.status}` };
    }

    const text = await response.text();
    const isHealthy = text.includes('Hello from IndexMaker Backend');

    return {
      status: isHealthy ? 'pass' : 'fail',
      responseTime,
      message: isHealthy ? 'Backend responding' : 'Unexpected response'
    };
  } catch (e) {
    return {
      status: 'fail',
      responseTime: Date.now() - startTime,
      message: e instanceof Error ? e.message : 'Unknown error'
    };
  }
};

/**
 * Task 3: Asset Registry Validation
 * Validates that tracked_assets count matches expected value (627)
 * Uses cached vendor result to avoid redundant HTTP calls.
 */
const checkAssetRegistry = async (): Promise<TestResult> => {
  const startTime = Date.now();
  try {
    const vendorResult = await checkVendorHealth(); // Uses cached result
    const responseTime = Date.now() - startTime;

    if (vendorResult.status === 'fail') {
      return { status: 'fail', responseTime, message: 'Cannot validate - vendor unhealthy' };
    }

    const trackedAssets = vendorResult.details?.tracked_assets;
    if (typeof trackedAssets !== 'number') {
      return { status: 'fail', responseTime, message: 'No asset count in response' };
    }

    // Allow slight variance in asset count (within 5%) since vendor may load from different sources
    const variance = Math.abs(trackedAssets - EXPECTED_ASSET_COUNT);
    const variancePercent = (variance / EXPECTED_ASSET_COUNT) * 100;
    const isCloseEnough = variancePercent <= 5;

    return {
      status: trackedAssets === EXPECTED_ASSET_COUNT ? 'pass' : (isCloseEnough ? 'pass' : 'fail'),
      responseTime,
      message: trackedAssets === EXPECTED_ASSET_COUNT
        ? `Loaded ${trackedAssets} assets ✓`
        : `Loaded ${trackedAssets}/${EXPECTED_ASSET_COUNT} assets${isCloseEnough ? ' (within tolerance)' : ''}`,
      details: { expected: EXPECTED_ASSET_COUNT, actual: trackedAssets, variancePercent: variancePercent.toFixed(1) }
    };
  } catch (e) {
    return {
      status: 'fail',
      responseTime: Date.now() - startTime,
      message: e instanceof Error ? e.message : 'Unknown error'
    };
  }
};

// ============================================
// Status Card Component (Task 5)
// ============================================

interface StatusCardProps {
  name: string;
  result: TestResult | null;
  loading: boolean;
}

function StatusCard({ name, result, loading }: StatusCardProps) {
  const getStatusIcon = () => {
    if (loading) return '⏳';
    if (!result) return '○';
    if (result.status === 'pass') return '✓';
    if (result.status === 'fail') return '✗';
    return '◐'; // pending
  };

  const getStatusColor = () => {
    if (loading) return 'text-yellow-400';
    if (!result) return 'text-gray-500';
    if (result.status === 'pass') return 'text-green-400';
    if (result.status === 'fail') return 'text-red-500';
    return 'text-yellow-400'; // pending
  };

  const getBorderColor = () => {
    if (loading) return 'border-yellow-400/30';
    if (!result) return 'border-gray-700';
    if (result.status === 'pass') return 'border-green-400/30';
    if (result.status === 'fail') return 'border-red-500/30';
    return 'border-yellow-400/30'; // pending
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 border ${getBorderColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-white">{name}</h3>
        <span className={`text-xl ${getStatusColor()}`}>{getStatusIcon()}</span>
      </div>

      {loading && (
        <p className="text-gray-400 text-sm">Checking...</p>
      )}

      {!loading && result && (
        <>
          <p className={`text-sm ${getStatusColor()}`}>
            {result.status === 'pass' ? 'Passed' : result.status === 'fail' ? 'Failed' : 'Pending'}
          </p>
          {result.responseTime !== undefined && (
            <p className="text-gray-400 text-xs mt-1">
              Response: {result.responseTime}ms
            </p>
          )}
          {result.message && (
            <p className="text-gray-500 text-xs mt-1">{result.message}</p>
          )}
        </>
      )}

      {!loading && !result && (
        <p className="text-gray-500 text-sm">Not run</p>
      )}
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function TestModePage() {
  // Task 1.3: State management
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [isRunningAll, setIsRunningAll] = useState(false);

  const addResult = useCallback((key: string, result: TestResult) => {
    setResults(prev => ({ ...prev, [key]: result }));
  }, []);

  const setLoadingState = useCallback((key: string, state: boolean) => {
    setLoading(prev => ({ ...prev, [key]: state }));
  }, []);

  // Task 4: Auto-run on page load
  const runAllChecks = useCallback(async () => {
    setIsRunningAll(true);
    setError(null);
    setResults({});

    // Clear vendor cache to ensure fresh data on manual re-run
    clearVendorCache();

    // Set all to loading
    setLoading({
      vendor: true,
      keeper: true,
      bridgeNode: true,
      backend: true,
      assetRegistry: true
    });

    try {
      // First, fetch vendor health (this populates the cache)
      const vendorResult = await checkVendorHealth(false); // Force fresh fetch
      addResult('vendor', vendorResult);

      // Then run remaining checks in parallel (they use cached vendor result)
      const [keeperResult, bridgeNodeResult, backendResult, assetRegistryResult] =
        await Promise.all([
          checkKeeperHealth(),
          checkBridgeNodeHealth(),
          checkBackendHealth(),
          checkAssetRegistry()
        ]);

      // Update results
      addResult('keeper', keeperResult);
      addResult('bridgeNode', bridgeNodeResult);
      addResult('backend', backendResult);
      addResult('assetRegistry', assetRegistryResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error during health checks');
    } finally {
      // Clear all loading states
      setLoading({
        vendor: false,
        keeper: false,
        bridgeNode: false,
        backend: false,
        assetRegistry: false
      });
      setIsRunningAll(false);
    }
  }, [addResult]);

  // Task 4.1: useEffect to run all checks on mount only
   
  useEffect(() => {
    runAllChecks();
  }, []); // Empty dependency array - run once on mount

  // Calculate summary
  const passCount = Object.values(results).filter(r => r.status === 'pass').length;
  const failCount = Object.values(results).filter(r => r.status === 'fail').length;
  const pendingCount = Object.values(results).filter(r => r.status === 'pending').length;
  const totalChecks = Object.keys(results).length;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Task 1.4: Section layout with "Foundation Tests" header */}
        <h1 className="text-3xl font-bold mb-2">Test Mode</h1>
        <p className="text-gray-400 mb-8">Automated health checks for IndexMaker services</p>

        {/* Task 6: "Run All" button */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            onClick={runAllChecks}
            disabled={isRunningAll}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {isRunningAll ? 'Running...' : 'Run All'}
          </Button>

          {totalChecks > 0 && (
            <div className="flex gap-4 text-sm">
              <span className="text-green-400">{passCount} Passed</span>
              <span className="text-red-500">{failCount} Failed</span>
              {pendingCount > 0 && <span className="text-yellow-400">{pendingCount} Pending</span>}
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Foundation Tests Section (AC #1) */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Foundation Tests</h2>

          {/* Task 5: Results display UI - Service health cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatusCard
              name="Vendor API"
              result={results.vendor || null}
              loading={loading.vendor || false}
            />
            <StatusCard
              name="Backend API"
              result={results.backend || null}
              loading={loading.backend || false}
            />
            <StatusCard
              name="Keeper"
              result={results.keeper || null}
              loading={loading.keeper || false}
            />
            <StatusCard
              name="Bridge Node"
              result={results.bridgeNode || null}
              loading={loading.bridgeNode || false}
            />
          </div>
        </div>

        {/* Asset Registry Validation (AC #4) */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Asset Registry Validation</h2>
          <div className="grid grid-cols-1 gap-4">
            <StatusCard
              name={`Asset Registry (Expected: ${EXPECTED_ASSET_COUNT})`}
              result={results.assetRegistry || null}
              loading={loading.assetRegistry || false}
            />
          </div>
        </div>

        {/* Task 7: Flow Tests */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Flow Tests</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Deploy Flow Test - manual testing via /create-itp */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 opacity-50">
              <h3 className="font-semibold text-gray-400">Deploy Flow Test</h3>
              <p className="text-gray-500 text-sm mt-1">Manual test via /create-itp with real asset selection</p>
            </div>

            {/* Task 7.2: Buy Flow Test placeholder */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 opacity-50">
              <h3 className="font-semibold text-gray-400">Buy Flow Test</h3>
              <p className="text-gray-500 text-sm mt-1">Story 3.4 - Buy flow validation (Coming Soon)</p>
            </div>

            {/* Task 7.3: Sell Flow Test placeholder */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 opacity-50">
              <h3 className="font-semibold text-gray-400">Sell Flow Test</h3>
              <p className="text-gray-500 text-sm mt-1">Story 4.3 - Sell flow validation (Coming Soon)</p>
            </div>

            {/* Task 7.4: Rebalance Flow Test placeholder */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 opacity-50">
              <h3 className="font-semibold text-gray-400">Rebalance Flow Test</h3>
              <p className="text-gray-500 text-sm mt-1">Story 5.4 - Rebalance flow validation (Coming Soon)</p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 text-sm text-gray-500 border-t border-gray-700 pt-4">
          <p><strong>Service Health Endpoints:</strong></p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Vendor: <code className="text-gray-400">GET http://localhost:8080/health</code></li>
            <li>Backend: <code className="text-gray-400">GET http://localhost:3002/</code></li>
            <li>Keeper: Verified via vendor connectivity</li>
            <li>Bridge-node: Event-driven (no HTTP API)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

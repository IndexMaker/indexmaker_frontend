'use client';

/**
 * Portfolio Page
 *
 * Main portfolio view showing user's ITP holdings across both chains.
 * Layout matches keeper-charts page pattern with Dashboard wrapper.
 *
 * @see Story 6.12 - Task 7
 */

import { Suspense, useCallback } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { usePortfolio } from '@/hooks/usePortfolio';
import { usePortfolioHistory } from '@/hooks/usePortfolioHistory';
import { downloadPortfolioCSV } from '@/lib/portfolio-export';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Dashboard from '@/components/views/Dashboard/dashboard';

// Portfolio Components
import { PortfolioSummaryCard } from '@/components/portfolio/PortfolioSummaryCard';
import { PortfolioChart } from '@/components/portfolio/PortfolioChart';
import { PortfolioTable } from '@/components/portfolio/PortfolioTable';
import { EmptyPortfolio } from '@/components/portfolio/EmptyPortfolio';

import type { PortfolioPosition } from '@/types/portfolio';

function PortfolioPageContent() {
  const { isConnected, connectWallet, connecting } = useWallet();
  const {
    positions,
    summary,
    isLoading: portfolioLoading,
    error: portfolioError,
    refresh: refreshPortfolio,
  } = usePortfolio();
  const {
    history,
    isLoading: historyLoading,
    error: historyError,
  } = usePortfolioHistory();

  // Handle CSV export
  const handleExport = useCallback(() => {
    downloadPortfolioCSV(positions);
  }, [positions]);

  // Handle bridge action (MVP: placeholder)
  const handleBridge = useCallback((position: PortfolioPosition) => {
    console.log('Bridge requested for:', position.symbol);
    // MVP: Bridge functionality coming soon
  }, []);

  // Wallet not connected state
  if (!isConnected) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">Portfolio</h1>
            <p className="text-sm text-secondary">
              View your ITP holdings across Arbitrum and Orbit chains
            </p>
          </div>
        </div>

        {/* Connect Wallet Card */}
        <Card className="bg-foreground border border-accent shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold text-primary mb-2">
                Connect Your Wallet
              </h3>
              <p className="text-sm text-secondary mb-6">
                Connect your wallet to view your ITP holdings across both chains.
              </p>
              <Button
                onClick={connectWallet}
                disabled={connecting}
                size="lg"
              >
                {connecting ? 'Connecting...' : 'Connect Wallet'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (portfolioError && !portfolioLoading) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">Portfolio</h1>
            <p className="text-sm text-secondary">
              View your ITP holdings across Arbitrum and Orbit chains
            </p>
          </div>
        </div>

        {/* Error Card */}
        <Card className="bg-foreground border border-accent shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold text-red-500 mb-2">
                Error Loading Portfolio
              </h3>
              <p className="text-sm text-secondary mb-6">{portfolioError}</p>
              <Button onClick={refreshPortfolio} variant="outline">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (portfolioLoading && positions.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">Portfolio</h1>
            <p className="text-sm text-secondary">
              View your ITP holdings across Arbitrum and Orbit chains
            </p>
          </div>
        </div>

        {/* Loading Skeletons */}
        <Card className="bg-foreground border border-accent shadow-sm">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-foreground border border-accent shadow-sm">
          <CardContent className="pt-6">
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>

        <Card className="bg-foreground border border-accent shadow-sm">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty state (connected but no holdings)
  if (!portfolioLoading && positions.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">Portfolio</h1>
            <p className="text-sm text-secondary">
              View your ITP holdings across Arbitrum and Orbit chains
            </p>
          </div>
        </div>

        {/* Empty State */}
        <EmptyPortfolio />
      </div>
    );
  }

  // Main portfolio view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Portfolio</h1>
          <p className="text-sm text-secondary">
            View your ITP holdings across Arbitrum and Orbit chains
          </p>
        </div>
        <Button
          onClick={refreshPortfolio}
          variant="outline"
          size="sm"
          disabled={portfolioLoading}
        >
          {portfolioLoading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Portfolio Summary */}
      <PortfolioSummaryCard
        summary={summary}
        isLoading={portfolioLoading}
        onExport={positions.length > 0 ? handleExport : undefined}
      />

      {/* Portfolio Chart */}
      <PortfolioChart
        history={history}
        isLoading={historyLoading}
        error={historyError}
      />

      {/* Portfolio Table */}
      <PortfolioTable
        positions={positions}
        isLoading={portfolioLoading}
        onBridge={handleBridge}
      />
    </div>
  );
}

function PortfolioPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Card className="bg-foreground border border-accent">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </CardContent>
      </Card>
      <Card className="bg-foreground border border-accent">
        <CardContent className="pt-6">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
      <Card className="bg-foreground border border-accent">
        <CardContent className="pt-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function PortfolioPage() {
  return (
    <Dashboard>
      <Suspense fallback={<PortfolioPageSkeleton />}>
        <PortfolioPageContent />
      </Suspense>
    </Dashboard>
  );
}

'use client';

/**
 * EmptyPortfolio Component
 *
 * Friendly empty state for users with no ITP holdings.
 * Shows a message and CTA button to explore ITPs.
 *
 * @see Story 6.12 - Task 8 (AC #8)
 */

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface EmptyPortfolioProps {
  /** Custom title (default: "No ITP holdings yet") */
  title?: string;
  /** Custom description */
  description?: string;
  /** Show explore CTA button (default: true) */
  showExploreButton?: boolean;
  /** Custom CTA href (default: "/") */
  exploreHref?: string;
}

export function EmptyPortfolio({
  title = 'No ITP holdings yet',
  description = "You don't have any Index Token Products in your wallet. Explore and purchase ITPs to start building your portfolio.",
  showExploreButton = true,
  exploreHref = '/',
}: EmptyPortfolioProps) {
  return (
    <Card className="bg-foreground border border-accent shadow-sm">
      <CardContent className="py-12">
        <div className="text-center space-y-4">
          {/* Icon/Illustration */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center">
              <svg
                className="w-10 h-10 text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-primary">{title}</h3>
            <p className="text-secondary max-w-md mx-auto">{description}</p>
          </div>

          {/* CTA Button */}
          {showExploreButton && (
            <div className="pt-4">
              <Link href={exploreHref}>
                <Button size="lg">Explore ITPs</Button>
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default EmptyPortfolio;

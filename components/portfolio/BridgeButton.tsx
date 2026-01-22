'use client';

/**
 * BridgeButton Component
 *
 * Button to initiate bridging ITP tokens between Arbitrum and Orbit chains.
 * MVP: Shows as disabled with "Bridge coming soon" tooltip.
 *
 * Future implementation will:
 * - Open a modal to select direction (Arb → Orbit or Orbit → Arb)
 * - Allow amount input with max button
 * - Call existing bridge hooks (useArbitrumBuy/useArbitrumSell patterns)
 *
 * @see Story 6.12 - Task 5
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PortfolioPosition } from '@/types/portfolio';

interface BridgeButtonProps {
  position: PortfolioPosition;
  disabled?: boolean;
}

export function BridgeButton({
  position,
  disabled = true, // MVP: Always disabled
}: BridgeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  // MVP: Bridge functionality not yet implemented
  const handleBridge = () => {
    if (disabled) return;
    setIsOpen(true);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleBridge}
        disabled={disabled}
        title={disabled ? 'Bridge coming soon' : `Bridge ${position.symbol}`}
      >
        Bridge
      </Button>

      {/* Bridge Modal - Future Implementation */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bridge {position.symbol}</DialogTitle>
            <DialogDescription>
              Transfer tokens between Arbitrum and Orbit chains.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Direction Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Direction</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="p-3 border rounded hover:bg-muted transition-colors"
                  disabled
                >
                  <p className="font-medium">Arbitrum → Orbit</p>
                  <p className="text-xs text-muted-foreground">
                    Available: {position.arbitrumFormatted}
                  </p>
                </button>
                <button
                  className="p-3 border rounded hover:bg-muted transition-colors"
                  disabled
                >
                  <p className="font-medium">Orbit → Arbitrum</p>
                  <p className="text-xs text-muted-foreground">
                    Available: {position.orbitFormatted}
                  </p>
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="0.00"
                  className="flex-1 px-3 py-2 border rounded bg-background"
                  disabled
                />
                <Button variant="outline" size="sm" disabled>
                  Max
                </Button>
              </div>
            </div>

            {/* Coming Soon Notice */}
            <div className="p-3 bg-muted rounded text-center">
              <p className="text-sm text-muted-foreground">
                Bridge functionality coming soon
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button disabled>
              Bridge
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default BridgeButton;

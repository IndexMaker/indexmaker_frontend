"use client";

import DefiYieldConfigurator from "@/components/defi/defi-yield-configurator";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { DefiConfig } from "@/lib/calculator/types";
import { selectShowDefiConfig } from "@/redux/calculatorSelectors";
import { setDefiConfig, toggleDefiConfigModal } from "@/redux/calculatorSlice";
import type { AppDispatch } from "@/redux/store";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";

type YieldConfig = {
  allocations: Array<{
    assetKey: string;
    allocation: number;
    customRate?: number;
  }>;
  totalYield: number;
  weightedYield: number;
};

export function DefiConfigurator() {
  const dispatch = useDispatch<AppDispatch>();
  const open = useSelector(selectShowDefiConfig);

  const [yieldConfig, setYieldConfig] = useState<YieldConfig | null>(null);

  const handleConfigChange = (config: YieldConfig) => {
    setYieldConfig(config);
  };

  const handleSave = () => {
    if (yieldConfig) {
      // Convert the yield configurator output to DefiConfig format
      const defiConfig: DefiConfig = {
        protocol: "custom",
        yieldRate: yieldConfig.weightedYield * 100,
        stakingPeriod: 12,
        allocations: "Custom allocation",
        compoundFrequency: "daily",
        riskLevel: "medium",
      };
      dispatch(setDefiConfig(defiConfig));
    }
    dispatch(toggleDefiConfigModal());
  };

  const handleClose = () => {
    dispatch(toggleDefiConfigModal());
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-foreground overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crypto Investment Tax Comparison</DialogTitle>
          <DialogDescription>
            Configure crypto investment options to compare against tax-advantaged traditional investments.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <DefiYieldConfigurator onConfigChange={handleConfigChange} />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!yieldConfig}>
              Apply Configuration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

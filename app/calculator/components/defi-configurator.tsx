"use client";

import DefiYieldConfigurator from "@/components/defi/defi-yield-configurator";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { DefiConfig } from "@/lib/calculator/types";
import { selectDefiConfig, selectShowDefiConfig } from "@/redux/calculatorSelectors";
import { setDefiConfig, toggleDefiConfigModal } from "@/redux/calculatorSlice";
import type { AppDispatch } from "@/redux/store";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";

export function DefiConfigurator() {
  const dispatch = useDispatch<AppDispatch>();
  const open = useSelector(selectShowDefiConfig);
  const savedConfig = useSelector(selectDefiConfig);

  const [yieldConfig, setYieldConfig] = useState<any>(null);

  const handleConfigChange = (config: any) => {
    setYieldConfig(config);
  };

  const handleSave = () => {
    if (yieldConfig) {
      // Convert the yield configurator output to DefiConfig format
      const defiConfig: DefiConfig = {
        protocol: "custom",
        yieldRate: yieldConfig.weightedYield * 100,
        stakingPeriod: 12,
        compoundFrequency: "daily",
        riskLevel: "medium",
        allocations: yieldConfig.allocations,
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Advanced DeFi Yield Configuration</DialogTitle>
          <DialogDescription>
            Configure your asset allocation and expected yields for more accurate tax calculations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <DefiYieldConfigurator onConfigChange={handleConfigChange} />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!yieldConfig}>
              Save Configuration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

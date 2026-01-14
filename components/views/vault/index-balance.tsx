"use client";

import IndexMaker from "@/components/icons/indexmaker";
import { CustomButton } from "@/components/ui/custom-button";
import { useWallet } from "@/contexts/wallet-context";
import { SupplyPosition } from "@/lib/data";
import { IndexListEntry } from "@/types/index";
import { useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface IndexBalanceProps {
  className?: string;
  index: IndexListEntry;
  indexBalance?: string;
  tokenSymbol?: string;
  instantAPY?: string;
  supplyPositions: SupplyPosition[];
  onSupplyClick?: (indexId: string, token: string) => void;
  /** Balance on Arbitrum (bridged) - optional for dual-chain display */
  arbitrumBalance?: string;
  /** Balance on Orbit (native) - optional for dual-chain display */
  orbitBalance?: string;
}

/**
 * Chain badge for balance display
 */
function ChainBalanceBadge({
  chain,
  balance,
}: {
  chain: 'arbitrum' | 'orbit';
  balance?: string;
}) {
  const isArbitrum = chain === 'arbitrum';

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "px-1.5 py-0.5 rounded text-[10px] font-medium",
          isArbitrum
            ? "bg-blue-500/20 text-blue-400"
            : "bg-purple-500/20 text-purple-400"
        )}
      >
        {isArbitrum ? "Arb" : "Orbit"}
      </span>
      <span className="text-secondary text-[12px]">{balance ?? "-"}</span>
    </div>
  );
}

export default function IndexBalance({
  className = "",
  index,
  indexBalance = "-",
  tokenSymbol = "USDC",
  instantAPY = "24.79",
  supplyPositions,
  onSupplyClick,
  arbitrumBalance,
  orbitBalance,
}: IndexBalanceProps) {
  const { wallet, address, connectWallet } = useWallet();
  const onClickBuyButton = useCallback(async () => {
    // if (index.name !== "SY100") {
    //   toast.warning("Only SY100 can be deposited right now...");
    //   return;
    // }

    if (!wallet) await connectWallet();

    onSupplyClick && onSupplyClick(index.name, index.ticker);
  }, [wallet]);

  // Determine if we have dual-chain data
  const hasDualChainData = arbitrumBalance !== undefined || orbitBalance !== undefined;

  return (
    <div className={`w-full bg-foreground rounded-lg shadow ${className}`}>
      <div className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b ">
              <tr className="p-4">
                <th className="text-left py-3 px-4 font-medium text-secondary text-[13px]">
                  Token
                </th>
                <th className="text-left py-3 px-4 font-medium text-secondary text-[13px]">
                  % Since Entry
                </th>
                <th className="text-left py-3 px-4 font-medium text-secondary text-[13px]">
                  ITP Balance
                </th>
                <th className="text-right py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              <tr className="p-4">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-transparent rounded-full flex items-center justify-center">
                      <IndexMaker className="w-5 h-5 text-muted" />
                    </div>
                    <span className="font-medium text-secondary text-[13px]">
                      {index.name}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 font-medium text-secondary text-[13px]">
                  {address && supplyPositions
                    ? (() => {
                        const userSupply = supplyPositions.find(
                          (pos) =>
                            pos.user.toLowerCase() === address.toLowerCase()
                        );
                        return userSupply
                          ? `${userSupply.supply} ${userSupply.currency}`
                          : "0 USDC";
                      })()
                    : "-"}
                </td>
                <td className="py-4 px-4">
                  <div className="flex flex-col gap-2 items-start">
                    {hasDualChainData ? (
                      <>
                        {/* Show dual-chain breakdown */}
                        <span className="font-medium text-secondary mb-1">
                          {indexBalance}
                        </span>
                        <div className="flex flex-col gap-1">
                          <ChainBalanceBadge chain="arbitrum" balance={arbitrumBalance} />
                          <ChainBalanceBadge chain="orbit" balance={orbitBalance} />
                        </div>
                      </>
                    ) : (
                      <span className="font-medium text-secondary">
                        {indexBalance}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4 text-right max-w-[140px] w-[140px]">
                  <CustomButton
                    className="min-w-[100px] text-white"
                    onClick={onClickBuyButton}
                  >
                    Buy
                  </CustomButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";

import IndexMaker from "@/components/icons/indexmaker";
import { CustomButton } from "@/components/ui/custom-button";
import { useWallet } from "@/contexts/wallet-context";
import { SupplyPosition } from "@/lib/data";
import { IndexListEntry } from "@/types/index";
import { useCallback } from "react";
import { toast } from "sonner";

interface IndexBalanceProps {
  className?: string;
  index: IndexListEntry;
  indexBalance?: string;
  tokenSymbol?: string;
  instantAPY?: string;
  supplyPositions: SupplyPosition[];
  onSupplyClick?: (indexId: string, token: string) => void;
}

export default function IndexBalance({
  className = "",
  index,
  indexBalance = "-",
  tokenSymbol = "USDC",
  instantAPY = "24.79",
  supplyPositions,
  onSupplyClick,
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
                    <span className="font-medium text-secondary">
                      {indexBalance}
                    </span>
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

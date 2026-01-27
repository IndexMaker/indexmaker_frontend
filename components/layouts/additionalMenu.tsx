"use client";

import { useLanguage } from "@/contexts/language-context";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Home } from "lucide-react";
import { useState } from "react";
import { CalendlyModal } from "../calendly/calendly-modal";
import { SubscribeModal } from "../subscribe/subscribe-modal";
import { useDispatch } from "react-redux";
import { addSelectedVault } from "@/redux/vaultSlice";
import { CustomButton } from "../ui/custom-button";

interface AdditionalMenuProps {
  className: string;
  canBuy?: boolean;
  indexName?: string;
  ticker?: string;
  address?: string;
}

export function AdditionalMenu({
  className,
  canBuy = false,
  indexName,
  ticker,
  address
}: AdditionalMenuProps) {
  const { t } = useLanguage();
  const [isCalendlyOpen, setIsCalendlyOpen] = useState(false);
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);
  const dispatch = useDispatch();

  // Function to handle supply button click
  const handleSupplyClick = (name: string, ticker: string, addr: string) => {
    dispatch(addSelectedVault({ name, ticker, address: addr }));
  };
  return (
    <>
      <footer
        className={cn(
          "flex w-full flex-row gap-4 justify-end bottom-0 h-[40px] md:h-[40px] pt-0 shrink-0 items-center bg-transparent px-[4px]",
          className
        )}
      >
        {/* <Link
          className={cn(
            "flex items-center gap-3 rounded-sm py-[6px] font-[500] transition-colors ",
            "justify-center ",
            " hover:underline text-primary text-[16px] cursor-pointer"
          )}
          href={"/"}
        >
          <Home className="text-primary hover:underline text-[16px] w-5 h-5" />
        </Link> */}
        <CustomButton
          className={cn(
            "flex items-center gap-3 rounded-sm py-[6px] font-[500] transition-colors px-2",
            "justify-center ",
            " hover:underline text-primary text-[16px] cursor-pointer"
          )}
          onClick={() => setIsCalendlyOpen(true)}
        >
          {t("common.connect")}
        </CustomButton>
        <CustomButton
          className={cn(
            "flex items-center gap-3 rounded-sm py-[6px] font-[500] transition-colors px-2",
            "justify-center ",
            " hover:underline text-primary text-[16px] cursor-pointer"
          )}
          onClick={() => setIsSubscribeOpen(true)}
        >
          {t("common.subscribe")}
        </CustomButton>
        <>
          <CustomButton
            className={cn(
              "flex items-center gap-3 rounded-sm py-[6px] font-[500] transition-colors px-2",
              "justify-center ",
              canBuy
                ? " hover:underline text-primary text-[16px] cursor-pointer"
                : " text-gray-400 text-[16px] cursor-not-allowed"
            )}
            onClick={
              canBuy
                ? () =>
                    indexName && ticker && address ? handleSupplyClick(indexName, ticker, address) : {}
                : undefined
            }
            disabled={!canBuy}
          >
            {t("common.buy")}
          </CustomButton>
        </>
      </footer>

      <CalendlyModal
        isOpen={isCalendlyOpen}
        onClose={() => setIsCalendlyOpen(false)}
      />

      {/* Subscribe Modal */}
      <SubscribeModal
        isOpen={isSubscribeOpen}
        onClose={() => setIsSubscribeOpen(false)}
        IndexName={indexName || ""}
      />
    </>
  );
}

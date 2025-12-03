"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/language-context";
import { useQuoteContext } from "@/contexts/quote-context";
import { cn } from "@/lib/utils";
import { setBatchPrices, setTokenSupply } from "@/redux/market-data-slice";
import { RootState } from "@/redux/store";
import { IndexListEntry } from "@/types/index";
import { ethers } from "ethers";
import { ArrowDown, ArrowUp, Info } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useWallet } from "../../contexts/wallet-context";
import USDC from "../../public/logos/usd-coin.png";
import IndexMaker from "../icons/indexmaker";
import LeftArrow from "../icons/left-arrow";
import RightArrow from "../icons/right-arrow";
import AnimatedPrice from "./animate-price";

const ERC20_ABI = [
  "function totalSupply() view returns (uint256)",
  "function decimals() view returns (uint8)",
];

// --- DEFAULT VALUES ---
// These populate immediately if no wallet is connected.
// Check your console when connected to update these with real values.
const DEFAULT_SUPPLIES: Record<string, number> = {
  "SY100": 0.000058536080258111,
  "SYAZ": 0.00003233497370741,
  "SYL2": 0.000002460884913229,
  "SYAI": 0.000113742974796965,
  "SYME": 0.000001181856051783,
  "SYDF": 0.001055210060904233,
};

interface VaultTableProps {
  visibleColumns: { id: string; title: string; visible: boolean }[];
  isLoading: boolean;
  vaults: IndexListEntry[];
  onSort?: (columnId: string, direction: "asc" | "desc") => void;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  onSupplyClick?: (vaultId: string, token: string) => void;
}

export function VaultTable({
  isLoading,
  visibleColumns,
  vaults,
  onSort,
  sortColumn,
  sortDirection,
  onSupplyClick,
}: VaultTableProps) {
  const { t } = useLanguage();
  const { wallet } = useWallet();
  const router = useRouter();
  const dispatch = useDispatch();
  
  // Ref to ensure we only log the JSON for copying once per session
  const hasLoggedDefaults = useRef(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const selectedVault = useSelector(
    (state: RootState) => state.vault.selectedVault
  );
  const { selectedNetwork, currentChainId } = useSelector(
    (state: RootState) => state.network
  );
  
  const { prices: reduxPrices, supplies: reduxSupplies } = useSelector(
    (state: RootState) => state.marketData
  );

  const { indexPrices } = useQuoteContext();

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentVaults = vaults.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(vaults.length / itemsPerPage);

  const tokenAddressesRaw = [
    "SYDF", "0xcdce4c5ffd9cd0025d536dbc69a12cf7ada82193",
    "SYL2", "0x0cee77782fa57cfb66403c94c08e2e3e376dc388",
    "SYAZ", "0x8a8cf8860f97d007fcf46ed790df794e008b3ce8",
    "SYAI", "0x700892f09f8f8589ff3e69341b806adb06bb67fd",
    "SYME", "0xbab03330d8b41b20eb540b6361ab30b59d8ee849",
    "SY100", "0x1a64a446e31f19172c6eb3197a1e85ff664af380",
  ];

  const normalize = (s: string) => s.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

  const getLiveIndexPrice = (symbol: string): number | undefined => {
    if (reduxPrices[symbol] != null) return reduxPrices[symbol];
    const norm = normalize(symbol);
    for (const [k, v] of Object.entries(reduxPrices)) {
      if (normalize(k) === norm) return v;
    }
    return undefined;
  };

  const formatUSD = (n?: number) =>
    n == null || Number.isNaN(n)
      ? "0.00"
      : new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(n);

  useEffect(() => {
    if (indexPrices) {
      dispatch(setBatchPrices(indexPrices));
    }
  }, [indexPrices, dispatch]);

  // --- SUPPLY FETCH LOGIC ---
  useEffect(() => {
    let isMounted = true;
    const provider = wallet?.provider;

    // SCENARIO 1: No Wallet Provider (User not connected)
    // Directly load defaults into Redux. Do not attempt fetch.
    if (!provider) {
      for (let i = 0; i < tokenAddressesRaw.length; i += 2) {
        const ticker = tokenAddressesRaw[i];
        const defaultVal = DEFAULT_SUPPLIES[ticker] ?? 0;
        
        dispatch(setTokenSupply({ ticker, supply: defaultVal }));
      }
      return; 
    }

    // SCENARIO 2: Wallet Connected. Fetch from Chain & Log for Devs
    const fetchAllSuppliesStaggered = async () => {
      const collectedSupplies: Record<string, number> = {};
      const promises = [];

      for (let i = 0; i < tokenAddressesRaw.length; i += 2) {
        const ticker = tokenAddressesRaw[i];
        const address = tokenAddressesRaw[i + 1];

        const fetchSingle = async () => {
          // Visual stagger to prevent all loading spinners flickering at once
          const randomDelay = Math.random() * 2000;
          await new Promise((resolve) => setTimeout(resolve, randomDelay));

          if (!isMounted) return;

          try {
            const contract = new ethers.Contract(address, ERC20_ABI, provider);
            const [supplyRaw, decimals] = await Promise.all([
              contract.totalSupply(),
              contract.decimals().catch(() => 18),
            ]);

            const formattedSupply = parseFloat(
              ethers.formatUnits(supplyRaw, decimals)
            );

            // Collect for logging
            collectedSupplies[ticker] = formattedSupply;

            if (isMounted) {
              dispatch(setTokenSupply({ ticker, supply: formattedSupply }));
            }
          } catch (error) {
            console.warn(`Failed to fetch supply for ${ticker}, using default.`);
            
            // Fallback to default
            const defaultVal = DEFAULT_SUPPLIES[ticker] ?? 0;
            collectedSupplies[ticker] = defaultVal;

            if (isMounted) {
               dispatch(setTokenSupply({ ticker, supply: defaultVal }));
            }
          }
        };

        promises.push(fetchSingle());
      }

      // Wait for all requests to finish, then log once
      await Promise.all(promises);

      if (!hasLoggedDefaults.current && isMounted) {
        console.log("📋 COPY/PASTE THESE DEFAULTS:", JSON.stringify(collectedSupplies, null, 2));
        hasLoggedDefaults.current = true;
      }
    };

    fetchAllSuppliesStaggered();
    const interval = setInterval(fetchAllSuppliesStaggered, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [wallet?.provider, dispatch]); 

  // --- MEMO: Calculate AUM ---
  const liveTotalSupplyUSDByTicker = useMemo(() => {
    const map: Record<string, number> = {};

    for (const v of vaults) {
      const qty = reduxSupplies[v.ticker] ?? 0;
      const livePrice = getLiveIndexPrice(v.ticker);

      let usd = 0;
      if (livePrice != null && !Number.isNaN(livePrice)) {
        usd = qty * livePrice;
      }

      map[v.ticker] = usd;
    }
    return map;
  }, [vaults, reduxPrices, reduxSupplies]);

  const handleSort = (columnId: string) => {
    if (!onSort) return;
    if (sortColumn === columnId) {
      onSort(columnId, sortDirection === "asc" ? "desc" : "asc");
    } else {
      onSort(columnId, "asc");
    }
  };

  const assetDetail = (vault: IndexListEntry) => {
    if (!vault.ticker) return;
    window.open("/vault/" + vault.ticker, "_blank");
  };

  const isSortable = (columnId: string) =>
    [
      "name",
      "ytdReturn",
      "totalSupply",
      "ticker",
      "assetClass",
      "category",
      "inceptionDate",
      "performanceFee",
    ].includes(columnId);

  return (
    <TooltipProvider>
      <div className="">
        <Table className="text-primary text-xs bg-foreground rounded-[8px]">
          <TableHeader className="text-primary border-accent">
            <TableRow className="text-primary hover:bg-accent border-accent">
              {visibleColumns
                .filter((col) => col.visible)
                .map((col) => (
                  <TableHead
                    key={col.id}
                    className={
                      isSortable(col.id)
                        ? "cursor-pointer select-none text-secondary text-[11px] h-[44px] pl-5 pr-18 min-w-[180px]"
                        : cn(
                            "text-secondary text-[11px] h-[44px] pl-5 pr-18 ",
                            col.id === "actions"
                              ? "max-w-[92px] sticky right-0 bg-gradient-to-r from-transparent via-foreground to-foreground"
                              : "min-w-[180px]"
                          )
                    }
                    onClick={
                      isSortable(col.id) ? () => handleSort(col.id) : undefined
                    }
                  >
                    <div className="flex items-center gap-1">
                      <span>
                        {col.id === "actions"
                          ? ""
                          : col.id === "ytdReturn"
                          ? t("table.oneYearPerformance")
                          : col.id === "vaultApy"
                          ? t("table.supplyAPY")
                          : t("table." + col.id)}
                      </span>
                      {isSortable(col.id) && (
                        <span className="ml-1 h-3 w-3 hover:flex">
                          {sortColumn === col.id ? (
                            sortDirection === "asc" ? (
                              <ArrowUp className="h-3 w-3 text-zinc-400" />
                            ) : (
                              <ArrowDown className="h-3 w-3 text-zinc-400 opacity-30" />
                            )
                          ) : (
                            <ArrowDown className="h-3 w-3 text-zinc-400 opacity-30 " />
                          )}
                        </span>
                      )}
                    </div>
                  </TableHead>
                ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 10 }).map((_, index) => (
                  <TableRow
                    key={`skeleton-${index}`}
                    className="h-[54px] border-accent"
                  >
                    {visibleColumns
                      .filter((col) => col.visible)
                      .map((col) => (
                        <TableCell
                          key={`skeleton-${col.id}-${index}`}
                          className={cn(
                            "py-2 px-5",
                            col.id === "actions" &&
                              "sticky right-0 bg-foreground"
                          )}
                        >
                          <div className="flex items-center">
                            {col.id === "actions" ? (
                              <div className="h-8 w-20 rounded bg-accent animate-pulse" />
                            ) : (
                              <div className="h-4 w-3/4 rounded bg-accent animate-pulse" />
                            )}
                          </div>
                        </TableCell>
                      ))}
                  </TableRow>
                ))
              : currentVaults.map((vault: IndexListEntry) => {
                  const unitPrice = getLiveIndexPrice(vault.ticker);
                  const rawSupply = reduxSupplies[vault.ticker];
                  const liveSupplyUSD =
                    liveTotalSupplyUSDByTicker[vault.ticker] ?? 0;

                  // If default supply is used (no wallet), these will be true immediately
                  const isPriceLoaded = unitPrice !== undefined;
                  const isSupplyLoaded = rawSupply !== undefined;
                  const isAumLoaded = isPriceLoaded && isSupplyLoaded;

                  return (
                    <TableRow
                      key={vault.name}
                      className="hover:bg-accent border-accent h-[54px] text-[13px] cursor-pointer"
                    >
                      {visibleColumns.map(
                        (col) =>
                          col.visible && (
                            <TableCell
                              key={col.id}
                              onClick={() => assetDetail(vault)}
                              className={cn(
                                "text-card",
                                col.id === "actions"
                                  ? "sticky right-0 px-5 py-0 bg-foreground border-t before-line max-w-[92px] cursor-default"
                                  : "pl-5 pr-18"
                              )}
                            >
                              {col.id === "name" && (
                                <div className="flex items-center gap-2 pl-[1.5px]">
                                  <span>{vault.name}</span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-4 w-4"
                                      >
                                        <Info className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="max-w-xs">
                                        Additional information about this vault
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              )}

                              {col.id === "ticker" && (
                                <div
                                  className="flex flex-col justify-center"
                                  onClick={() => assetDetail(vault)}
                                >
                                  <span className="text-card">
                                    {vault.ticker}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground flex items-center h-[16px]">
                                    {isPriceLoaded ? (
                                      <AnimatedPrice
                                        currency="USDC"
                                        value={unitPrice}
                                      />
                                    ) : (
                                      <div className="h-2.5 w-12 bg-accent/80 animate-pulse rounded mt-0.5" />
                                    )}
                                  </span>
                                </div>
                              )}

                              {col.id === "totalSupply" && (
                                <div
                                  className="flex items-center gap-2"
                                  onClick={() => assetDetail(vault)}
                                >
                                  <div className="flex gap-1 items-center">
                                    <Image
                                      src={USDC}
                                      alt={"Total Supply"}
                                      width={12}
                                      height={12}
                                      className="object-cover w-[12px] h-[12px]"
                                    />
                                    {isAumLoaded ? (
                                      <span className="animate-in fade-in zoom-in duration-300">
                                        {formatUSD(liveSupplyUSD)} USDC
                                      </span>
                                    ) : (
                                      <div className="h-3 w-20 bg-accent/80 animate-pulse rounded" />
                                    )}
                                  </div>
                                </div>
                              )}

                              {col.id === "ytdReturn" && (
                                <div onClick={() => assetDetail(vault)}>
                                  {vault.performance?.oneYearReturn.toFixed(
                                    2
                                  ) ?? vault.ytdReturn}{" "}
                                  %
                                </div>
                              )}

                              {col.id === "assetClass" && (
                                <div>{vault.assetClass}</div>
                              )}
                              {col.id === "category" && (
                                <div>{vault.category}</div>
                              )}
                              {col.id === "inceptionDate" && (
                                <div>{vault.inceptionDate}</div>
                              )}

                              {col.id === "curator" && (
                                <div className="flex items-center gap-2">
                                  <IndexMaker className="w-4 h-4 text-muted" />
                                  <span>{"OTC"}</span>
                                </div>
                              )}
                              
                              {col.id === "managementFee" && (
                                <div>{vault.managementFee}</div>
                              )}

                              {col.id === "actions" && (
                                <div
                                  className="relative before:absolute before:top-0 before:left-0 before:w-px before:h-full before:bg-accent"
                                >
                                  {wallet &&
                                  currentChainId === selectedNetwork ? (
                                    <Button
                                      className={cn(
                                        "bg-[#2470ff] hover:bg-blue-700 text-white text-[11px] rounded-[4px] px-[5px] py-[8px] h-[26px] sticky right-0"
                                      )}
                                      onClick={(e: any) => {
                                        e.stopPropagation();
                                        onSupplyClick?.(
                                          vault.name,
                                          vault.ticker
                                        );
                                      }}
                                    >
                                      Buy Now
                                    </Button>
                                  ) : (
                                    <Button className="bg-[#2470ff] px-4 hover:bg-blue-700 text-white text-[11px] rounded-[4px] py-[8px] h-[26px] sticky right-0">
                                      Learn
                                    </Button>
                                  )}
                                </div>
                              )}
                            </TableCell>
                          )
                      )}
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>

        <div className="flex justify-center items-center mt-4 text-primary text-sx">
          <Button
            className="text-[11px] text-muted bg-background p-0 h-4"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            <LeftArrow className="w-4 h-4" />
          </Button>
          <span className="text-[11px] text-muted">
            {t("common.page")} {currentPage} {t("common.of")} {totalPages}
          </span>
          <Button
            className="text-[11px] text-muted bg-background p-0 h-4"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            <RightArrow className="w-[8px] h-[8px] rotate-180 " />
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
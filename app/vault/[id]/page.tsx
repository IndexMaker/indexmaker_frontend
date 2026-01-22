"use client";
import { fetchAllIndices } from "@/server/indices";
import { VaultDetailPage } from "@/components/views/vault/vault-detail";
import { log } from "@/lib/utils/logger";
import { setIndices } from "@/redux/indexSlice";
import { RootState } from "@/redux/store";
import { IndexListEntry } from "@/types/index";
import type { ItpListEntry, ItpListResponse } from "@/types/itp";
import { notFound, redirect, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLanguage } from "@/contexts/language-context";

// Convert ITP to IndexListEntry format for VaultDetailPage compatibility
function itpToIndexEntry(itp: ItpListEntry): IndexListEntry {
  return {
    indexId: itp.id,
    name: itp.name,
    address: itp.orbit_address,
    ticker: itp.symbol,
    curator: "OrbitGo",
    totalSupply: parseFloat(itp.total_supply) / 1e18,
    totalSupplyUSD: (parseFloat(itp.total_supply) / 1e18) * (itp.current_price ?? 0),
    ytdReturn: itp.price_24h_change ?? 0,
    collateral: [{ name: "ETH", logo: "/assets/tokens/eth.svg" }],
    managementFee: 0,
    assetClass: "Crypto",
    category: "ITP",
    inceptionDate: new Date(itp.created_at * 1000).toISOString().split("T")[0],
    performance: {
      ytdReturn: itp.price_24h_change ?? 0,
      oneYearReturn: itp.price_24h_change ?? 0,
      threeYearReturn: 0,
      fiveYearReturn: 0,
      tenYearReturn: 0,
    },
  };
}

export default function VaultPage() {
  const params = useParams();
  const { t } = useLanguage();
  const indexTicker = params.id?.toString();
  const [vault, setVault] = useState<IndexListEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const storedIndexes = useSelector((state: RootState) => state.index.indices);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!indexTicker) {
      log.error(t("common.noIndexTicker"));
      notFound();
      return;
    }

    const lowerTicker = indexTicker.toLowerCase();
    
    // Check localStorage first
    const localVaultsJson =
      typeof window !== "undefined"
        ? localStorage.getItem("storedVaults")
        : null;
    const localVaults: IndexListEntry[] = localVaultsJson
      ? JSON.parse(localVaultsJson)
      : [];
    
    const vaultFromLocal = localVaults.find(
      (index) => index && index.ticker && index.ticker.toLowerCase() === lowerTicker
    );

    if (vaultFromLocal) {
      log.info("Found index in localStorage", { ticker: indexTicker, indexId: vaultFromLocal.indexId });
      setVault(vaultFromLocal);
      dispatch(setIndices(localVaults));
      setLoading(false);
      return;
    }

    // Try to fetch ITP by symbol from OrbitGo backend
    const fetchItpBySymbol = async (symbol: string): Promise<IndexListEntry | null> => {
      try {
        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API || "http://localhost:3002";
        const response = await fetch(`${BACKEND_URL}/api/itp/list?search=${encodeURIComponent(symbol)}&limit=100`);
        if (!response.ok) return null;

        const data: ItpListResponse = await response.json();
        const foundItp = data.itps?.find(
          (itp) => itp.symbol.toLowerCase() === symbol.toLowerCase()
        );

        if (foundItp) {
          log.info("ITP found in OrbitGo backend", { symbol: foundItp.symbol, id: foundItp.id });
          return itpToIndexEntry(foundItp);
        }
        return null;
      } catch (error) {
        log.warn("Failed to fetch ITP from OrbitGo", { error, symbol });
        return null;
      }
    };

    // Fetch from API and validate
    const fetchData = async () => {
      try {
        log.info("Fetching indices from API to validate ticker", { ticker: indexTicker });
        const response = await fetchAllIndices();
        const data: IndexListEntry[] = response || [];

        if (data && data.length > 0) {
          dispatch(setIndices(data));

          // Store in localStorage for future use
          if (typeof window !== "undefined") {
            localStorage.setItem("storedVaults", JSON.stringify(data));
          }
        }

        // Find the index by ticker (case-insensitive)
        const foundIndex = data.find(
          (_index) => _index && _index.ticker && _index.ticker.toLowerCase() === lowerTicker
        );

        if (foundIndex) {
          log.info("Index found and validated", {
            ticker: foundIndex.ticker,
            indexId: foundIndex.indexId,
            name: foundIndex.name
          });
          setVault(foundIndex);
          return;
        }

        // Fallback: Try fetching from OrbitGo ITPs
        log.info("Index not found in regular indices, trying OrbitGo ITPs", { ticker: indexTicker });
        const itpAsIndex = await fetchItpBySymbol(indexTicker);

        if (itpAsIndex) {
          setVault(itpAsIndex);
          return;
        }

        // Not found in either source
        log.error("Ticker not found in indices or ITPs", {
          requestedTicker: indexTicker,
          availableIndices: data.map(i => i.ticker).join(", ")
        });
        setError(t("common.indexNotFound").replace("{ticker}", indexTicker));
      } catch (error) {
        log.error("Error fetching indices from API", {
          error: error instanceof Error ? error.message : String(error),
          indexTicker
        });
        setError(t("common.failedToLoadIndexData"));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [indexTicker, dispatch, t]);

  // Show error state if there's an error
  if (error && !loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">{t("common.errorLoadingIndex")}</h1>
          <p className="text-secondary mb-4">{error}</p>
          <button 
            onClick={() => window.location.href = "/"}
            className="px-4 py-2 bg-primary text-white rounded"
          >
            {t("common.returnToHome")}
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <VaultDetailPage index={null} />;
  }

  if (!vault) {
    log.warn("No vault found after loading completed", { indexTicker });
    notFound();
    return null;
  }

  return <VaultDetailPage index={vault} />;
}

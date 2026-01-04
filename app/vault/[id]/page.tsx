"use client";
import { fetchAllIndices } from "@/server/indices";
import { VaultDetailPage } from "@/components/views/vault/vault-detail";
import { log } from "@/lib/utils/logger";
import { setIndices } from "@/redux/indexSlice";
import { RootState } from "@/redux/store";
import { IndexListEntry } from "@/types/index";
import { notFound, redirect, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

export default function VaultPage() {
  const params = useParams();
  const indexTicker = params.id?.toString();
  const [vault, setVault] = useState<IndexListEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const storedIndexes = useSelector((state: RootState) => state.index.indices);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!indexTicker) {
      log.error("No index ticker provided in URL");
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

    // Fetch from API and validate
    const fetchData = async () => {
      try {
        log.info("Fetching indices from API to validate ticker", { ticker: indexTicker });
        const response = await fetchAllIndices();
        const data: IndexListEntry[] = response || [];
        
        if (!data || data.length === 0) {
          log.error("No indices returned from API");
          setError("Unable to load indices. Please try again later.");
          setLoading(false);
          return;
        }

        dispatch(setIndices(data));
        
        // Store in localStorage for future use
        if (typeof window !== "undefined") {
          localStorage.setItem("storedVaults", JSON.stringify(data));
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
        } else {
          log.error("Index ticker not found in API response", { 
            requestedTicker: indexTicker,
            availableTickers: data.map(i => i.ticker).join(", ")
          });
          setError(`Index "${indexTicker}" not found. Please check the URL.`);
        }
      } catch (error) {
        log.error("Error fetching indices from API", { 
          error: error instanceof Error ? error.message : String(error), 
          indexTicker 
        });
        setError("Failed to load index data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [indexTicker, dispatch]);

  // Show error state if there's an error
  if (error && !loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Error Loading Index</h1>
          <p className="text-secondary mb-4">{error}</p>
          <button 
            onClick={() => window.location.href = "/"}
            className="px-4 py-2 bg-primary text-white rounded"
          >
            Return to Home
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

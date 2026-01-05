"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/contexts/wallet-context";
import { log } from "@/lib/utils/logger";
import Dashboard from "@/components/views/Dashboard/dashboard";
import { CreateVaultForm } from "@/components/views/create/create-vault-form";

export default function CreatePage() {
  const { address } = useWallet();
  const [nextIndexId, setNextIndexId] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initData = async () => {
      try {
        log.info("Fetching next index ID for vault creation");
        const indexResponse = await fetch("https://api2.indexmaker.global/indexes");
        const indexJson = await indexResponse.json();
        
        let maxId = 0;
        if (indexJson.indexes && Array.isArray(indexJson.indexes)) {
          maxId = Math.max(...indexJson.indexes.map((i: any) => i.indexId || 0));
        }
        
        setNextIndexId(maxId + 1);
        log.info("Next index ID retrieved", { nextId: maxId + 1 });
      } catch (error) {
        log.error("Failed to fetch initial data", { 
          error: error instanceof Error ? error.message : String(error) 
        });
        setError("Failed to fetch initial data. Please try again.");
        setNextIndexId(1); // Fallback to 1
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  if (error && !loading) {
    return (
      <Dashboard>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-500 mb-4">Error Loading Page</h1>
            <p className="text-secondary mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded"
            >
              Try Again
            </button>
          </div>
        </div>
      </Dashboard>
    );
  }

  return (
    <Dashboard>
      <CreateVaultForm 
        initialIndexId={nextIndexId}
        walletAddress={address || undefined}
        isLoading={loading}
      />
    </Dashboard>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface KeeperLatestResponse {
  keeper_address: string;
  timestamp: string | null;
  acquisition: { value1: string; value2: string } | null;
  disposal: { value1: string; value2: string } | null;
}

interface AllKeepersResponse {
  keepers: KeeperLatestResponse[];
  total_count: number;
}

interface KeeperSelectorProps {
  selectedKeeper: string;
  onKeeperChange: (keeper: string) => void;
}

const AGGREGATED_VALUE = "all";

export function KeeperSelector({
  selectedKeeper,
  onKeeperChange,
}: KeeperSelectorProps) {
  const [keepers, setKeepers] = useState<KeeperLatestResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchKeepers() {
      setIsLoading(true);
      setError(null);
      try {
        const apiBase = process.env.NEXT_PUBLIC_BACKEND_API;
        const res = await fetch(`${apiBase}/api/keeper-charts/all`);
        if (!res.ok) {
          throw new Error(`Failed to fetch keepers: ${res.status}`);
        }
        const data: AllKeepersResponse = await res.json();
        setKeepers(data.keepers);
      } catch (err) {
        console.error("Error fetching keepers:", err);
        setError(err instanceof Error ? err.message : "Failed to load keepers");
      } finally {
        setIsLoading(false);
      }
    }

    fetchKeepers();
  }, []);

  const shortenAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isLoading) {
    return <Skeleton className="h-10 w-[200px]" />;
  }

  if (error) {
    return (
      <div className="text-sm text-destructive">
        Error loading keepers: {error}
      </div>
    );
  }

  return (
    <Select value={selectedKeeper} onValueChange={onKeeperChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select keeper" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={AGGREGATED_VALUE}>
          All Keepers (Aggregated)
        </SelectItem>
        {keepers.map((keeper) => (
          <SelectItem key={keeper.keeper_address} value={keeper.keeper_address}>
            {shortenAddress(keeper.keeper_address)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

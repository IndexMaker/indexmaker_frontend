"use client";
import { notFound, redirect, useParams } from "next/navigation";
import { VaultDetailPage } from "@/components/views/vault/vault-detail";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import axios from "axios";
import { setIndices } from "@/redux/indexSlice";
import { IndexListEntry } from "@/types";
import { useEffect, useState } from "react";
import { fetchAllIndices } from "@/api/indices";

export default function VaultPage() {
  const params = useParams();
  const indexTicker = params.id?.toString();
  const [vault, setVault] = useState<IndexListEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const storedIndexes = useSelector((state: RootState) => state.index.indices);
  const dispatch = useDispatch();
  useEffect(() => {
    if (!indexTicker) {
      notFound();
    }
    const lowerTicker = indexTicker.toLowerCase();
    const localVaultsJson =
      typeof window !== "undefined"
        ? localStorage.getItem("storedVaults")
        : null;
    const localVaults: IndexListEntry[] = localVaultsJson
      ? JSON.parse(localVaultsJson)
      : [];
    // First check Redux store
    const vaultFromLocal = localVaults.find(
      (index) => index && index.ticker && index.ticker.toLowerCase() === lowerTicker
    );

    if (vaultFromLocal) {
      setVault(vaultFromLocal);
      dispatch(setIndices(localVaults));
      setLoading(false);
      return;
    }

    // If not found in Redux, fetch from API
    const fetchData = async () => {
      try {
        const response = await fetchAllIndices();
        const data: IndexListEntry[] = response || [];
        dispatch(setIndices(data));

        const foundIndex = data.find(
          (_index) => _index && _index.ticker && _index.ticker.toLowerCase() === indexTicker.toLowerCase()
        );

        if (foundIndex) {
          setVault(foundIndex);
        } else {
          redirect("/");
        }
      } catch (error) {
        console.error("Error fetching performance data:", error);
        redirect("/");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [indexTicker, dispatch]);

  if (loading) {
    return <VaultDetailPage index={null} />;
  }
  if (!vault) {
    redirect("/");
  }

  return <VaultDetailPage index={vault} />;
}

"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Loader2,
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  Clock,
  X,
  ChevronsUpDown,
  Plus,
  ChevronDown,
  Settings2,
  Sparkles,
  User,
  Users,
  Building2,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { log } from "@/lib/utils/logger";
import { CustomButton } from "@/components/ui/custom-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useWallet } from "@/contexts/wallet-context";
import { createPublicClient, createWalletClient, custom, http } from "viem";
import { arbitrum } from "viem/chains";
import { bridgeProxyAbi, BRIDGE_PROXY_ADDRESS } from "@/lib/contracts/bridge-proxy";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { VirtualOrderbook } from "@/components/elements/VirtualOrderbook";
import { CalendlyModal } from "@/components/calendly/calendly-modal";
import { assetsFromJSON, type AssetJSON } from "@/lib/types/assets";

// ============================================================================
// TYPES
// ============================================================================

interface TradeableAsset {
  id: bigint;        // Registry ID
  symbol: string;
  exchange: string;
  quote_currency: string;
  coin_id?: string;
  logo?: string;
}

interface SelectedAsset {
  id: bigint;        // Registry ID - used for on-chain asset mapping
  symbol: string;
  weight: string;
  exchange: string;
  coin_id?: string;
  logo?: string;
}

interface CreateItpRequest {
  name: string;
  symbol: string;
  description?: string;
  methodology?: string;
  initial_price: number;
  max_order_size: number;
  asset_ids: number[];
  weights: number[];
  asset_composition: string[];
  sync: boolean;
  admin_address?: string; // Story 2-3 AC#6: Issuer wallet for portfolio view
}

interface AsyncResponse {
  tx_hash: string;
  nonce: number;
  confirmed_at_block: number; // Block when request was confirmed (for status polling)
  estimated_completion_time?: number;
  status: "pending";
}

interface SyncResponse {
  tx_hash: string;
  nonce: number;
  orbit_address: string;
  arbitrum_address: string;
  status: "completed";
}

// Response from status polling endpoint
interface StatusPollResponse {
  nonce: number;
  status: "pending" | "completed";
  orbit_address?: string;
  arbitrum_address?: string;
}

type CreateItpResponse = AsyncResponse | SyncResponse;

interface ValidationErrors {
  name?: string;
  symbol?: string;
  initial_price?: string;
  assets?: string;
  weights?: string;
}

interface CoinGeckoCategory {
  categoryId: string;
  name: string;
}

interface CategoryWithCount {
  categoryId: string;
  name: string;
  tradeableCount: number;
}

interface TopCategoryCoin {
  rank: number;
  coin_id: string;
  symbol: string;
  name: string;
  market_cap: number;
  price: number;
  volume_24h: number;
  logo?: string;
}

interface TopCategoryResponse {
  category_id: string;
  category_name: string;
  date: string;
  top: number;
  coins: TopCategoryCoin[];
}

type WeightingStrategy = "equal" | "market_cap";

// Real progress phases based on actual blockchain state
type DeployPhase = "submitting" | "tx-confirmed" | "waiting-bridge" | "complete";

const PHASE_MESSAGES: Record<DeployPhase, { label: string; detail: string; progress: number }> = {
  submitting: {
    label: "Submitting Transaction",
    detail: "Sending creation request to Arbitrum...",
    progress: 10,
  },
  "tx-confirmed": {
    label: "Transaction Confirmed",
    detail: "Request confirmed on Arbitrum. Waiting for bridge...",
    progress: 30,
  },
  "waiting-bridge": {
    label: "Bridge Processing",
    detail: "Waiting for Orbit vault creation and bridge confirmation...",
    progress: 50,
  },
  complete: {
    label: "Complete",
    detail: "ITP successfully deployed on both chains!",
    progress: 100,
  },
};

// ============================================================================
// CONSTANTS - ALLOWED CATEGORIES FOR ITP CREATION
// ============================================================================

const ALLOWED_CATEGORIES: { id: string; name: string }[] = [
  { id: "smart-contract-platform", name: "Smart Contract Platform" },
  { id: "layer-1", name: "Layer 1 (L1)" },
  { id: "proof-of-work-pow", name: "Proof of Work (PoW)" },
  { id: "world-liberty-financial-portfolio", name: "World Liberty Financial Portfolio" },
  { id: "proof-of-stake-pos", name: "Proof of Stake (PoS)" },
  { id: "made-in-usa", name: "Made in USA" },
  { id: "alleged-sec-securities", name: "Alleged SEC Securities" },
  { id: "exchange-based-tokens", name: "Exchange-based" },
  { id: "made-in-china", name: "Made in China" },
  { id: "centralized-exchange-token-cex", name: "Centralized Exchange (CEX)" },
  { id: "decentralized-finance-defi", name: "Decentralized Finance (DeFi)" },
  { id: "real-world-assets-rwa", name: "Real World Assets (RWA)" },
  { id: "meme-token", name: "Meme" },
  { id: "governance", name: "Governance" },
  { id: "dog-themed-coins", name: "Dog-Themed" },
  { id: "artificial-intelligence", name: "Artificial Intelligence (AI)" },
  { id: "infrastructure", name: "Infrastructure" },
  { id: "4chan", name: "4chan-Themed" },
  { id: "decentralized-exchange", name: "Decentralized Exchange (DEX)" },
  { id: "yzi-labs-portfolio", name: "YZi Labs (Prev. Binance Labs) Portfolio" },
  { id: "binance-alpha-spotlight", name: "Binance Alpha Spotlight" },
  { id: "privacy-coins", name: "Privacy Coins" },
  { id: "perpetuals", name: "Perpetuals" },
  { id: "chain-abstraction", name: "Chain Abstraction" },
  { id: "depin", name: "DePIN" },
  { id: "rwa-protocol", name: "RWA Protocol" },
  { id: "stablecoin-issuers", name: "Stablecoin Issuers" },
  { id: "cross-chain-communication", name: "Cross-chain Communication" },
  { id: "layer-2", name: "Layer 2 (L2)" },
  { id: "derivatives", name: "Derivatives" },
  { id: "yield-farming", name: "Yield Farming" },
  { id: "oracle", name: "Oracle" },
  { id: "x402-ecosystem", name: "x402 Ecosystem" },
  { id: "binance-launchpool", name: "Binance Launchpool" },
  { id: "cybersecurity", name: "Cybersecurity" },
  { id: "zero-knowledge-zk", name: "Zero Knowledge (ZK)" },
  { id: "automated-market-maker-amm", name: "Automated Market Maker (AMM)" },
  { id: "non-fungible-tokens-nft", name: "NFT" },
  { id: "directed-acyclic-graph-dag", name: "Directed Acyclic Graph (DAG)" },
  { id: "trump", name: "Trump-Affiliated" },
  { id: "layer-0-l0", name: "Layer 0 (L0)" },
  { id: "quantum-resistant", name: "Quantum-Resistant" },
  { id: "gaming", name: "Gaming (GameFi)" },
  { id: "launchpad", name: "Launchpad" },
  { id: "lending-borrowing", name: "Lending/Borrowing Protocols" },
  { id: "wallets", name: "Wallets" },
  { id: "neobank", name: "Neobank" },
  { id: "ai-agents", name: "AI Agents" },
  { id: "play-to-earn", name: "Play To Earn" },
  { id: "metaverse", name: "Metaverse" },
  { id: "data-availability", name: "Data Availability" },
  { id: "rollup", name: "Rollup" },
  { id: "socialfi", name: "SocialFi" },
  { id: "payment-solutions", name: "Payment Solutions" },
  { id: "frog-themed-coins", name: "Frog-Themed" },
  { id: "decentralized-identifier-did", name: "Decentralized Identifier (DID)" },
  { id: "storage", name: "Storage" },
  { id: "options", name: "Options" },
  { id: "gambling", name: "Gambling (GambleFi)" },
  { id: "internet-of-things-iot", name: "Internet of Things (IOT)" },
  { id: "prediction-markets", name: "Prediction Markets" },
  { id: "analytics", name: "Analytics" },
  { id: "dex-aggregator", name: "Dex Aggregator" },
  { id: "name-service", name: "Name Service" },
  { id: "sports", name: "Sports" },
  { id: "robotics", name: "Robotics" },
  { id: "cat-themed-coins", name: "Cat-Themed" },
  { id: "account-abstraction", name: "Account Abstraction" },
  { id: "entertainment", name: "Entertainment" },
  { id: "simulation-games", name: "Simulation Games" },
  { id: "rpg", name: "RPG" },
  { id: "mev-protection", name: "MEV Protection" },
  { id: "cefi", name: "CeFi" },
  { id: "vpn", name: "VPN" },
  { id: "synthetic-assets", name: "Synthetic" },
  { id: "buidlpad-launchpad", name: "Buidlpad Launchpad" },
  { id: "lsdfi", name: "LSDFi" },
  { id: "gaming-platform", name: "Gaming Platform" },
  { id: "desci", name: "Decentralized Science (DeSci)" },
  { id: "yield-aggregator", name: "Yield Aggregator" },
  { id: "fixed-interest", name: "Fixed Interest" },
  { id: "yield-tokenization-protocol", name: "Yield Tokenization Protocol" },
  { id: "echo-launchpad", name: "Echo Launchpad" },
  { id: "appchains", name: "Appchains" },
  { id: "intent", name: "Intent" },
  { id: "tradeable-ecosystem", name: "Tradeable Ecosystem" },
  { id: "layer-3", name: "Layer 3 (L3)" },
  { id: "insurance", name: "Insurance" },
  { id: "retail", name: "Retail" },
  { id: "inscriptions", name: "Inscriptions" },
  { id: "action-game", name: "Action Game" },
  { id: "energy", name: "Energy" },
  { id: "regenerative-finance", name: "Regenerative Finance (ReFi)" },
  { id: "legal", name: "Legal Coins" },
  { id: "healthcare", name: "Healthcare" },
  { id: "augmented-reality", name: "Augmented Reality" },
  { id: "game-studio", name: "Game Studio" },
  { id: "discord-bots", name: "Discord Bots" },
  { id: "capital-launchpad", name: "Capital Launchpad" },
  { id: "music", name: "Music" },
  { id: "marketing", name: "Marketing" },
  { id: "strategy-games", name: "Strategy Games" },
  { id: "adventure-games", name: "Adventure Games" },
  { id: "sports-games", name: "Sports Games" },
  { id: "shooting-games", name: "Shooting Games" },
  { id: "racing-games", name: "Racing Games" },
  { id: "arcade-games", name: "Arcade Games" },
  { id: "card-games", name: "Card Games" },
  { id: "impossible-finance-launchpad", name: "Impossible Finance Launchpad" },
  { id: "fan-token", name: "Fan Token" },
  { id: "e-commerce", name: "E-commerce" },
  { id: "binance-launchpad-token", name: "Binance Launchpad" },
  { id: "ai-agent-launchpad", name: "AI Agent Launchpad" },
  { id: "tokenfi-launchpad", name: "TokenFi Launchpad" },
];

// Categories to auto-blacklist (stablecoins, wrapped tokens, etc.)
const BLACKLISTED_CATEGORY_IDS = new Set([
  "stablecoins",
  "usd-stablecoin",
  "fiat-backed-stablecoin",
  "liquid-staked-eth",
  "bridged-tokens",
  "liquid-staking-tokens",
  "liquid-staking",
  "crypto-backed-tokens",
  "wrapped-tokens",
  "tokenized-btc",
  "bridged-stablecoin",
  "yield-bearing-stablecoin",
  "bridged-usdt",
  "synthetic-dollar",
  "liquid-staked-sol",
  "tokenized-gold",
  "bridged-usdc",
  "bridged-weth",
  "us-treasury-backed-stablecoin",
  "restaking",
  "tokenized-private-credit",
  "liquid-restaking-tokens",
  "tokenized-assets",
  "tokenized-commodities",
  "binance-peg-tokens",
  "yield-bearing",
  "lp-tokens",
  "liquid-staked-btc",
  "tokenized-treasury-bills",
  "morpho-ecosystem",
  "bridged-wbtc",
  "liquid-staked-hype",
  "btcfi-protocol",
  "tokenized-treasury-bonds",
  "bridged-dai",
  "eur-stablecoins",
  "algorithmic-stablecoins",
  "liquid-restaked-eth",
  "hyperunit-ecosystem",
  "aave-tokens",
  "midas-liquid-yield-tokens",
  "seigniorage",
  "tokenized-silver",
  "synthetic-asset",
  "breeding",
  "compound-tokens",
  "backedfi-xstocks-ecosystem",
  "defi-index",
  "tokenized-stock",
  "tokenized-real-estate",
  "liquid-restaked-sol",
  "tokenized-exchange-traded-funds",
  "jpy-stablecoin",
  "liquid-staked-sui",
  "tokensets-ecosystem",
  "yield-tokenization-product",
  "sgd-stablecoin",
  "idr-stablecoin",
  "realt-tokens",
  "bridged-wsteth",
  "cny-stablecoin",
  "gbp-stablecoin",
  "bridged-frax",
]);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the logo URL for an asset.
 * Priority: 1) Backend-provided logo URL, 2) Local logo by coin_id, 3) Fallback by symbol mapping
 */
const getAssetLogoUrl = (
  coin_id?: string,
  logo?: string,
  symbol?: string,
  symbolToCoinId?: Record<string, string>
): string | null => {
  // If backend provided a logo URL, use it
  if (logo) return logo;
  // If we have a coin_id, construct local logo path
  if (coin_id) return `/logos/${coin_id}.png`;
  // Fallback: try to map symbol to coin_id using fetched mapping
  if (symbol && symbolToCoinId) {
    const mappedCoinId = symbolToCoinId[symbol.toUpperCase()];
    if (mappedCoinId) return `/logos/${mappedCoinId}.png`;
  }
  return null;
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

const validateName = (name: string): string | null => {
  if (!name.trim()) return "Name is required";
  if (name.length > 64) return "Name must be 64 characters or less";
  if (!/^[a-zA-Z0-9 ]+$/.test(name)) return "Name can only contain letters, numbers, and spaces";
  return null;
};

const validateSymbol = (symbol: string): string | null => {
  if (!symbol.trim()) return "Symbol is required";
  if (symbol.length > 8) return "Symbol must be 8 characters or less";
  if (!/^[A-Z0-9]+$/.test(symbol)) return "Symbol must be uppercase letters and numbers only";
  return null;
};

const validatePrice = (price: string): string | null => {
  const num = parseFloat(price);
  if (isNaN(num) || num <= 0) return "Price must be greater than 0";
  if (num > 1_000_000) return "Price cannot exceed $1,000,000";
  return null;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CreateItpForm() {
  const { wallet, connectWallet, isConnected, address } = useWallet();

  // Available assets from backend (Bitget only)
  const [availableAssets, setAvailableAssets] = useState<TradeableAsset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [assetsError, setAssetsError] = useState<string | null>(null);

  // Symbol to coin_id mapping from CoinGecko database
  const [symbolToCoinId, setSymbolToCoinId] = useState<Record<string, string>>({});

  // Form state
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [initialPrice, setInitialPrice] = useState("1.00");
  const [selectedAssets, setSelectedAssets] = useState<SelectedAsset[]>([]);

  // Advanced settings (expandable)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [description, setDescription] = useState("");
  const [methodology, setMethodology] = useState("");
  const [maxOrderSize, setMaxOrderSize] = useState("1000");

  // Category pre-fill state
  const [showCategoryPrefill, setShowCategoryPrefill] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("__all__"); // __all__ = all tradeable assets
  const [weightingStrategy, setWeightingStrategy] = useState<WeightingStrategy>("equal");
  const [minWeightPercent, setMinWeightPercent] = useState(1);
  const [topXCount, setTopXCount] = useState(10);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [lastPrefillResult, setLastPrefillResult] = useState<string | null>(null); // Success message with count

  // Dynamic categories from backend (with tradeable counts)
  const [categoriesWithCounts, setCategoriesWithCounts] = useState<CategoryWithCount[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Asset selector state
  const [assetPopoverOpen, setAssetPopoverOpen] = useState(false);
  const [assetSearch, setAssetSearch] = useState("");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pollingProgress, setPollingProgress] = useState<number | null>(null);
  const [deployPhase, setDeployPhase] = useState<DeployPhase | null>(null); // Story 2-3 AC#4
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateItpResponse | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Deploy options popover state
  const [showDeployOptions, setShowDeployOptions] = useState(false);
  const [showCalendlyModal, setShowCalendlyModal] = useState(false);
  const [deployType, setDeployType] = useState<"personal" | "tradable" | "institutional" | null>(null);

  // ============================================================================
  // FETCH AVAILABLE ASSETS AND COIN MAPPINGS
  // ============================================================================

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setAssetsLoading(true);
        setAssetsError(null);
        // Fetch from centralized asset registry (vendor/assets.json)
        const response = await fetch("/api/assets/registry");
        if (!response.ok) {
          throw new Error("Failed to fetch assets");
        }
        const data: { assets: AssetJSON[]; total_count: number } = await response.json();
        // Convert JSON IDs (number) to bigint for type safety
        const assets = assetsFromJSON(data.assets);
        // Map to TradeableAsset format for compatibility with existing UI
        const tradeableAssets: TradeableAsset[] = assets.map(a => ({
          id: a.id,
          symbol: a.bitget.replace(/USD[CT]$/, ""), // Strip quote currency for display
          exchange: "bitget",
          quote_currency: a.bitget.endsWith("USDC") ? "USDC" : "USDT",
          coin_id: a.coingecko || undefined,
          logo: a.logo,
        }));
        setAvailableAssets(tradeableAssets);
        log.info("Loaded registry assets", { count: data.total_count });
      } catch (error) {
        log.error("Failed to fetch assets", { error });
        setAssetsError("Failed to load available assets");
      } finally {
        setAssetsLoading(false);
      }
    };

    const fetchCoinMapping = async () => {
      try {
        const response = await fetch("/api/coins/symbol-mapping");
        if (!response.ok) {
          log.warn("Failed to fetch coin mapping, logos may not display");
          return;
        }
        const data = await response.json();
        // Convert array of {symbol, coin_id} to Record<string, string>
        const mapping: Record<string, string> = {};
        for (const item of data.mappings || []) {
          mapping[item.symbol.toUpperCase()] = item.coin_id;
        }
        setSymbolToCoinId(mapping);
        log.info("Loaded coin symbol mapping", { count: data.total_count });
      } catch (error) {
        log.warn("Failed to fetch coin mapping", { error });
      }
    };

    fetchAssets();
    fetchCoinMapping();
  }, []);

  // Fetch categories with tradeable counts from backend
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const response = await fetch("/api/categories/with-counts");
        if (!response.ok) {
          log.warn("Failed to fetch categories with counts, falling back to static list");
          return;
        }
        const data: CategoryWithCount[] = await response.json();
        // Sort by tradeable count descending
        data.sort((a, b) => b.tradeableCount - a.tradeableCount);
        setCategoriesWithCounts(data);
        log.info("Loaded categories with tradeable counts", { count: data.length });
      } catch (error) {
        log.warn("Failed to fetch categories", { error });
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  // Get max assets for the currently selected category (capped at 250)
  const maxAssetsForCategory = useMemo(() => {
    let count = 250; // Max allowed
    if (selectedCategory === "__all__") {
      count = availableAssets.length;
    } else {
      // Look up the tradeable count from categoriesWithCounts
      const category = categoriesWithCounts.find(c => c.categoryId === selectedCategory);
      if (category) {
        count = category.tradeableCount;
      }
    }
    // Cap at 250 max assets per index
    return Math.min(count, 250);
  }, [selectedCategory, availableAssets.length, categoriesWithCounts]);

  // Reset topXCount when maxAssetsForCategory changes and current value exceeds it
  useEffect(() => {
    if (topXCount > maxAssetsForCategory && maxAssetsForCategory > 0) {
      setTopXCount(Math.min(10, maxAssetsForCategory));
    }
  }, [maxAssetsForCategory, topXCount]);

  // Calculate total weight
  const totalWeight = useMemo(() => {
    return selectedAssets.reduce((sum, asset) => {
      const weight = parseFloat(asset.weight) || 0;
      return sum + weight;
    }, 0);
  }, [selectedAssets]);

  // Check if weights are valid (sum to 1)
  const weightsValid = useMemo(() => {
    if (selectedAssets.length === 0) return false;
    return Math.abs(totalWeight - 1.0) < 0.0001;
  }, [totalWeight, selectedAssets.length]);

  // Filter available assets (exclude already selected)
  const filteredAssets = useMemo(() => {
    const selectedSymbols = new Set(selectedAssets.map(a => a.symbol));
    return availableAssets.filter(asset => !selectedSymbols.has(asset.symbol));
  }, [availableAssets, selectedAssets]);

  // Check if form can be submitted
  const canSubmit = useMemo(() => {
    return (
      name.trim() !== "" &&
      symbol.trim() !== "" &&
      parseFloat(initialPrice) > 0 &&
      selectedAssets.length > 0 &&
      weightsValid &&
      !isSubmitting
    );
  }, [name, symbol, initialPrice, selectedAssets.length, weightsValid, isSubmitting]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleAddAsset = (asset: TradeableAsset) => {
    setSelectedAssets(prev => [
      ...prev,
      {
        id: asset.id,        // Store registry ID for on-chain submission
        symbol: asset.symbol,
        weight: "",
        exchange: asset.exchange,
        coin_id: asset.coin_id,
        logo: asset.logo,
      }
    ]);
    setAssetPopoverOpen(false);
    setAssetSearch("");
    if (errors.assets) {
      setErrors(prev => ({ ...prev, assets: undefined }));
    }
  };

  const handleRemoveAsset = (index: number) => {
    setSelectedAssets(prev => prev.filter((_, i) => i !== index));
  };

  const handleWeightChange = (index: number, value: string) => {
    if (value !== "" && !/^\d*\.?\d*$/.test(value)) return;

    setSelectedAssets(prev =>
      prev.map((asset, i) => (i === index ? { ...asset, weight: value } : asset))
    );
    if (errors.weights) {
      setErrors(prev => ({ ...prev, weights: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {
      name: validateName(name) || undefined,
      symbol: validateSymbol(symbol) || undefined,
      initial_price: validatePrice(initialPrice) || undefined,
      assets: selectedAssets.length === 0 ? "At least one asset is required" : undefined,
      weights: !weightsValid ? `Weights must sum to 1.0 (current: ${totalWeight.toFixed(4)})` : undefined,
    };

    setErrors(newErrors);

    const hasErrors = Object.values(newErrors).some(Boolean);

    // Scroll to first error field
    if (hasErrors) {
      const fieldOrder: (keyof ValidationErrors)[] = ["name", "symbol", "initial_price", "assets", "weights"];
      const firstErrorField = fieldOrder.find(f => newErrors[f]);
      if (firstErrorField) {
        // weights shares the same card as assets
        const fieldId = firstErrorField === "weights" ? "field-assets" : `field-${firstErrorField}`;
        const el = document.getElementById(fieldId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("animate-shake");
          setTimeout(() => el.classList.remove("animate-shake"), 600);
        }
      }
    }

    return !hasErrors;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    // Check wallet connection
    if (!wallet || !address) {
      setSubmitError("Please connect your wallet first");
      return;
    }

    if (!wallet.rawProvider) {
      setSubmitError("Wallet provider not available");
      return;
    }

    const controller = new AbortController();
    setAbortController(controller);
    setIsSubmitting(true);
    setSubmitError(null);
    setPollingProgress(10);
    setDeployPhase("submitting");

    try {
      const assetList = selectedAssets.map(a => a.symbol.toUpperCase());
      // Convert weights from float (0-1) to 18 decimals for contract (sum must equal 1e18)
      // Contract expects weights in 18 decimals where 1.0 = 1e18
      const weightList = selectedAssets.map(a => {
        const weight = parseFloat(a.weight);
        // Convert to BigInt with 18 decimals
        return BigInt(Math.round(weight * 1e18));
      });
      // Use actual registry IDs for on-chain asset mapping
      const assetIdList = selectedAssets.map(a => BigInt(a.id));

      // Contract parameters
      const itpName = name.trim();
      const itpSymbol = symbol.trim().toUpperCase();
      const itpDescription = description.trim() || `Index tracking ${assetList.join(", ")}`;
      const itpMethodology = methodology.trim() || "Market cap weighted index";
      // Initial price in USDC (6 decimals)
      const initialPriceUsdc = BigInt(Math.round(parseFloat(initialPrice) * 1_000_000));
      // Max order size in 18 decimals
      const maxOrderSizeWei = BigInt(Math.round((parseFloat(maxOrderSize) || 1000) * 1e18));

      log.info("Submitting ITP creation via MetaMask", {
        name: itpName,
        symbol: itpSymbol,
        initialPrice: initialPriceUsdc.toString(),
        maxOrderSize: maxOrderSizeWei.toString(),
        assets: assetIdList.map(a => a.toString()),
        weights: weightList.map(w => w.toString()),
      });

      // Step 1: Create wallet client for MetaMask
      const walletClient = createWalletClient({
        chain: arbitrum,
        transport: custom(wallet.rawProvider),
      });

      const publicClient = createPublicClient({
        chain: arbitrum,
        transport: http("https://arb1.arbitrum.io/rpc"),
      });

      // Step 2: Get current nonce before submitting (to track this request)
      const currentNonce = await publicClient.readContract({
        address: BRIDGE_PROXY_ADDRESS,
        abi: bridgeProxyAbi,
        functionName: "getAdminItpCreationNonce",
        args: [address as `0x${string}`],
      });

      log.info("Current ITP creation nonce", { nonce: currentNonce.toString() });

      // Step 3: Submit requestCreateItp via MetaMask
      log.info("Requesting MetaMask signature for requestCreateItp...");
      const txHash = await walletClient.writeContract({
        address: BRIDGE_PROXY_ADDRESS,
        abi: bridgeProxyAbi,
        functionName: "requestCreateItp",
        args: [
          itpName,
          itpSymbol,
          itpDescription,
          itpMethodology,
          initialPriceUsdc,
          maxOrderSizeWei,
          assetIdList,
          weightList,
        ],
        account: address as `0x${string}`,
      });

      log.info("Transaction submitted", { txHash });

      // Step 4: Wait for transaction confirmation
      setDeployPhase("tx-confirmed");
      setPollingProgress(30);

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1,
      });

      if (receipt.status !== "success") {
        throw new Error("Transaction reverted on-chain");
      }

      const confirmedAtBlock = receipt.blockNumber;
      log.info("Transaction confirmed", {
        txHash,
        blockNumber: confirmedAtBlock.toString(),
        nonce: currentNonce.toString(),
      });

      // Step 5: Poll for real completion status (bridge-node will complete creation)
      const maxPolls = 120; // 120 polls * 2s = 240s timeout (bridge can take time)
      const pollIntervalMs = 2000;
      let pollCount = 0;

      setDeployPhase("waiting-bridge");
      setPollingProgress(50);

      while (pollCount < maxPolls) {
        if (controller.signal.aborted) {
          throw new Error("Cancelled");
        }

        // Poll for status via backend API
        const statusResponse = await fetch(
          `/api/itp/status/${currentNonce}?from_block=${confirmedAtBlock}&admin=${address}`,
          { signal: controller.signal }
        );

        if (!statusResponse.ok) {
          log.warn("Status poll failed", { status: statusResponse.status });
          await new Promise(r => setTimeout(r, pollIntervalMs));
          pollCount++;
          continue;
        }

        const statusData: StatusPollResponse = await statusResponse.json();
        log.debug("Status poll result", { statusData });

        // Update progress based on poll count (50-90%)
        const progressPct = 50 + Math.min(40, pollCount * 0.5);
        setPollingProgress(progressPct);

        if (statusData.status === "completed" && statusData.orbit_address && statusData.arbitrum_address) {
          // Success!
          const syncResult: SyncResponse = {
            tx_hash: txHash,
            nonce: Number(currentNonce),
            orbit_address: statusData.orbit_address,
            arbitrum_address: statusData.arbitrum_address,
            status: "completed",
          };
          log.info("ITP creation completed", { syncResult });
          setDeployPhase("complete");
          setPollingProgress(100);
          setResult(syncResult);
          return;
        }

        // Still pending, continue polling
        await new Promise(r => setTimeout(r, pollIntervalMs));
        pollCount++;
      }

      // Timeout - but tx was submitted successfully
      throw new Error(`Bridge confirmation timed out after ${(maxPolls * pollIntervalMs) / 1000}s. Transaction was submitted (tx: ${txHash.slice(0, 10)}...). The bridge-node will complete the ITP creation - check back later.`);

    } catch (error) {
      if (error instanceof Error && (error.name === "AbortError" || error.message === "Cancelled")) {
        log.info("ITP creation cancelled by user");
        setSubmitError(null);
      } else if (error instanceof Error && error.message.includes("User rejected")) {
        log.info("User rejected MetaMask transaction");
        setSubmitError("Transaction rejected in wallet");
      } else {
        log.error("ITP creation failed", { error });
        setSubmitError(error instanceof Error ? error.message : "Failed to create ITP");
      }
    } finally {
      setIsSubmitting(false);
      setPollingProgress(null);
      setDeployPhase(null);
      setAbortController(null);
    }
  };

  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  const handleRetry = () => {
    setSubmitError(null);
    handleSubmit();
  };

  // Handle deploy option selection
  const handleDeployOptionSelect = (type: "personal" | "tradable" | "institutional") => {
    setDeployType(type);
    setShowDeployOptions(false);

    if (type === "personal") {
      // Deploy for yourself - proceed with normal deployment
      handleSubmit();
    } else if (type === "tradable") {
      // Deploy as tradable fund - show calendly for $500 consultation
      setShowCalendlyModal(true);
    } else if (type === "institutional") {
      // Deploy as institutional ETF - show calendly for institutional consultation
      setShowCalendlyModal(true);
    }
  };

  // Handle deploy button click - show options popover
  const handleDeployClick = () => {
    if (!validateForm()) return;
    setShowDeployOptions(true);
  };

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleReset = () => {
    setName("");
    setSymbol("");
    setInitialPrice("1.00");
    setSelectedAssets([]);
    setDescription("");
    setMethodology("");
    setMaxOrderSize("1000");
    setErrors({});
    setSubmitError(null);
    setResult(null);
  };

  // ============================================================================
  // CATEGORY PRE-FILL HANDLER
  // ============================================================================

  const handleCategoryPrefill = useCallback(async () => {
    setCategoryLoading(true);
    setCategoryError(null);

    try {
      let coinsToUse: { symbol: string; coin_id?: string; market_cap?: number; logo?: string }[] = [];
      let categoryName = "All Tradeable";

      if (selectedCategory === "__all__") {
        // Use all available Bitget assets (sorted alphabetically for now)
        // Note: We don't have market cap data for all assets, so we'll use equal weight by default
        coinsToUse = availableAssets.map(a => ({
          symbol: a.symbol.toUpperCase(),
          coin_id: a.coin_id,
          market_cap: 0, // Unknown for local assets
          logo: a.logo, // Use logo from asset if available
        }));
        categoryName = "All Tradeable";
      } else {
        // Fetch LIVE top coins from the selected category (uses real-time CoinGecko data)
        const response = await fetch(
          `/api/market-cap/live-category?category_id=${selectedCategory}&top=250`
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to fetch category data");
        }

        const data: TopCategoryResponse = await response.json();
        // Try dynamic categories first, then static list, then response, then fallback to ID
        categoryName = categoriesWithCounts.find(c => c.categoryId === selectedCategory)?.name
          || ALLOWED_CATEGORIES.find(c => c.id === selectedCategory)?.name
          || data.category_name
          || selectedCategory;

        if (data.coins.length === 0) {
          setCategoryError("No coins found in this category");
          return;
        }

        // Build a map for matching: normalize symbols to handle prefixes like 1000SHIB -> SHIB
        // Also build reverse lookup: coingecko symbol -> exchange asset
        const normalizeSymbol = (s: string) => {
          const upper = s.toUpperCase();
          // Remove common exchange prefixes
          if (upper.startsWith("1000")) return upper.slice(4);
          if (upper.startsWith("10000")) return upper.slice(5);
          if (upper.startsWith("100000")) return upper.slice(6);
          return upper;
        };

        // Build map of normalized symbol -> exchange asset
        const normalizedToExchange = new Map<string, TradeableAsset>();
        const exactToExchange = new Map<string, TradeableAsset>();
        for (const asset of availableAssets) {
          const upper = asset.symbol.toUpperCase();
          const normalized = normalizeSymbol(asset.symbol);
          exactToExchange.set(upper, asset);
          normalizedToExchange.set(normalized, asset);
        }

        // Also build map by coin_id if available
        const coinIdToExchange = new Map<string, TradeableAsset>();
        for (const asset of availableAssets) {
          if (asset.coin_id) {
            coinIdToExchange.set(asset.coin_id.toLowerCase(), asset);
          }
        }

        // Filter coins that are available on Bitget using multiple matching strategies
        coinsToUse = [];
        for (const coin of data.coins) {
          const coinSymbolUpper = coin.symbol.toUpperCase();
          const coinIdLower = coin.coin_id.toLowerCase();

          // Try matching strategies in order of preference:
          // 1. Exact coin_id match (most reliable)
          // 2. Exact symbol match
          // 3. Normalized symbol match (e.g., SHIB matches 1000SHIB)
          const matchedAsset = coinIdToExchange.get(coinIdLower)
            || exactToExchange.get(coinSymbolUpper)
            || normalizedToExchange.get(coinSymbolUpper);

          if (matchedAsset) {
            coinsToUse.push({
              symbol: matchedAsset.symbol.toUpperCase(), // Use the exchange symbol
              coin_id: coin.coin_id,
              market_cap: coin.market_cap,
              logo: coin.logo, // CoinGecko image URL
            });
          }
        }

        if (coinsToUse.length === 0) {
          setCategoryError(`No coins from this category are tradeable on Bitget (checked ${data.coins.length} coins)`);
          return;
        }
      }

      // Limit to top X (or all if fewer available)
      const actualCount = Math.min(topXCount, coinsToUse.length);
      const topCoins = coinsToUse.slice(0, actualCount);

      if (topCoins.length === 0) {
        setCategoryError("No coins available");
        return;
      }

      // Calculate weights based on strategy
      let rawWeights: number[] = [];

      if (weightingStrategy === "market_cap" && topCoins.some(c => c.market_cap && c.market_cap > 0)) {
        // Market cap weighted with minimum threshold
        const minWeight = minWeightPercent / 100;
        const totalMarketCap = topCoins.reduce((sum, c) => sum + (c.market_cap || 0), 0);

        if (totalMarketCap > 0) {
          const mcWeights = topCoins.map(c => (c.market_cap || 0) / totalMarketCap);
          // Apply minimum weight and normalize
          const adjustedWeights = mcWeights.map(w => Math.max(w, minWeight));
          const totalAdjusted = adjustedWeights.reduce((sum, w) => sum + w, 0);
          rawWeights = adjustedWeights.map(w => w / totalAdjusted);
        } else {
          // Fallback to equal weight if no market cap data
          rawWeights = topCoins.map(() => 1 / topCoins.length);
        }
      } else {
        // Equal weight for all coins
        rawWeights = topCoins.map(() => 1 / topCoins.length);
      }

      // Round all weights to 4 decimals and adjust first to ensure perfect sum of 1.0000
      const roundedWeights = rawWeights.map(w => Math.round(w * 10000) / 10000);
      const currentSum = roundedWeights.reduce((sum, w) => sum + w, 0);
      const adjustment = Math.round((1 - currentSum) * 10000) / 10000;
      const weights = [roundedWeights[0] + adjustment, ...roundedWeights.slice(1)];

      // Create selected assets with weights - only include assets with valid registry IDs
      const assetsWithWeights = topCoins.map((coin, index) => {
        const bitgetAsset = availableAssets.find(
          a => a.symbol.toUpperCase() === coin.symbol
        );
        return {
          bitgetAsset,
          coin,
          weight: weights[index],
        };
      });

      // Filter out assets without valid registry IDs (id must be > 0)
      const validAssets = assetsWithWeights.filter(
        ({ bitgetAsset }) => bitgetAsset && bitgetAsset.id > BigInt(0)
      );

      // If we filtered some assets, recalculate weights to sum to 1.0
      let finalWeights = validAssets.map(a => a.weight);
      if (validAssets.length < assetsWithWeights.length && validAssets.length > 0) {
        const totalWeight = finalWeights.reduce((sum, w) => sum + w, 0);
        finalWeights = finalWeights.map(w => w / totalWeight);
        // Re-round and adjust
        finalWeights = finalWeights.map(w => Math.round(w * 10000) / 10000);
        const currentSum = finalWeights.reduce((sum, w) => sum + w, 0);
        const adjustment = Math.round((1 - currentSum) * 10000) / 10000;
        finalWeights[0] = finalWeights[0] + adjustment;
      }

      const newSelectedAssets: SelectedAsset[] = validAssets.map(({ bitgetAsset, coin }, index) => ({
        id: bitgetAsset!.id, // Safe: filtered to only valid assets
        symbol: coin.symbol,
        weight: finalWeights[index].toFixed(4),
        exchange: bitgetAsset!.exchange || "bitget",
        coin_id: coin.coin_id,
        logo: coin.logo, // Use CoinGecko image URL from API
      }));

      setSelectedAssets(newSelectedAssets);

      const finalAssetCount = newSelectedAssets.length;
      const skippedCount = topCoins.length - finalAssetCount;

      // Auto-generate name and symbol if empty
      // Strip parentheses and their content from category name for the Name field
      // (e.g. "Layer 1 (L1)" -> "Layer 1") since name only allows letters, numbers, spaces
      const cleanCategoryName = categoryName.replace(/\s*\([^)]*\)/g, "").trim();
      if (!name) {
        setName(`Top ${finalAssetCount} ${cleanCategoryName} Index`);
      }
      if (!symbol) {
        // Generate symbol from category name (first letters, max 8 chars)
        const symbolParts = categoryName.split(/[\s\-\(\)]+/).filter(Boolean);
        const generatedSymbol = symbolParts
          .map(p => p[0])
          .join("")
          .toUpperCase()
          .slice(0, 6) + finalAssetCount.toString();
        setSymbol(generatedSymbol.slice(0, 8));
      }

      // Set methodology based on strategy
      const strategyName = weightingStrategy === "equal"
        ? "Equal-weighted"
        : `Market cap weighted (min ${minWeightPercent}%)`;
      setMethodology(`${strategyName} index tracking ${cleanCategoryName} tokens`);

      // Show success message - account for filtered assets without registry IDs
      let message: string;
      if (skippedCount > 0) {
        message = `Added ${finalAssetCount} assets (${skippedCount} skipped - not in registry)`;
      } else if (finalAssetCount < topXCount) {
        message = `Added ${finalAssetCount} assets (only ${finalAssetCount} available in this category)`;
      } else {
        message = `Added ${finalAssetCount} assets`;
      }
      setLastPrefillResult(message);

      log.info("Category pre-fill applied", {
        event: "category_prefill",
        category: selectedCategory,
        strategy: weightingStrategy,
        coinsCount: topCoins.length,
        requestedCount: topXCount,
        actualCount: finalAssetCount,
        filteredCount: skippedCount,
      });

    } catch (error) {
      log.error("Category pre-fill failed", { error });
      setCategoryError(error instanceof Error ? error.message : "Failed to load category data");
      setLastPrefillResult(null);
    } finally {
      setCategoryLoading(false);
    }
  }, [
    selectedCategory,
    topXCount,
    weightingStrategy,
    minWeightPercent,
    availableAssets,
    categoriesWithCounts,
    name,
    symbol,
  ]);

  // ============================================================================
  // RENDER - WALLET CONNECTION CHECK
  // ============================================================================

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">Create ITP</h1>
            <p className="text-sm text-secondary">Deploy a new Index Token Product</p>
          </div>
          <Link href="/create">
            <CustomButton className="bg-transparent border border-accent text-secondary hover:bg-accent h-9 text-[13px] rounded flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Historical Simulation
            </CustomButton>
          </Link>
        </div>

        <Card className="bg-foreground border border-accent shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-primary mb-2">Connect Wallet</h2>
              <p className="text-secondary mb-6">
                Connect your wallet to create a new ITP index.
              </p>
              <CustomButton
                onClick={connectWallet}
                className="bg-[#2470ff] text-white hover:bg-[#1a5acc] h-11 px-6"
              >
                Connect Wallet
              </CustomButton>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // RENDER - SUCCESS STATE
  // ============================================================================

  if (result) {
    const isCompleted = result.status === "completed";
    const syncResult = isCompleted ? result as SyncResponse : null;

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">Create ITP</h1>
            <p className="text-sm text-secondary">Deploy a new Index Token Product</p>
          </div>
          <Link href="/create">
            <CustomButton className="bg-transparent border border-accent text-secondary hover:bg-accent h-9 text-[13px] rounded flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Historical Simulation
            </CustomButton>
          </Link>
        </div>

        <Card className="bg-foreground border border-accent shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-primary">
                {isCompleted ? "ITP Created Successfully!" : "ITP Creation Submitted"}
              </h2>
              <p className="text-secondary mt-2">
                {isCompleted
                  ? "Your ITP index is now live on both chains."
                  : "Transaction submitted. Bridge confirmation pending."}
              </p>
            </div>

            <div className="space-y-4 bg-background border border-accent rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-secondary">Transaction</span>
                <div className="flex items-center gap-2">
                  <code className="text-sm text-primary font-mono">
                    {result.tx_hash.slice(0, 10)}...{result.tx_hash.slice(-8)}
                  </code>
                  <button
                    onClick={() => handleCopy(result.tx_hash, "tx")}
                    className="p-1 hover:bg-accent rounded"
                  >
                    {copiedField === "tx" ? (
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-secondary" />
                    )}
                  </button>
                  <a
                    href={`https://arbiscan.io/tx/${result.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-accent rounded"
                  >
                    <ExternalLink className="w-4 h-4 text-[#2470ff]" />
                  </a>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-secondary">Nonce</span>
                <code className="text-sm text-primary font-mono">{result.nonce}</code>
              </div>

              {syncResult && (
                <>
                  <div className="border-t border-accent pt-4">
                    <span className="text-xs text-secondary uppercase tracking-wide">
                      Orbit Chain Address
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <code className="text-sm text-primary font-mono">
                        {syncResult.orbit_address.slice(0, 14)}...{syncResult.orbit_address.slice(-10)}
                      </code>
                      <button
                        onClick={() => handleCopy(syncResult.orbit_address, "orbit")}
                        className="p-1 hover:bg-accent rounded"
                      >
                        {copiedField === "orbit" ? (
                          <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-secondary" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-secondary uppercase tracking-wide">
                      Arbitrum Address
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <code className="text-sm text-primary font-mono">
                        {syncResult.arbitrum_address.slice(0, 14)}...{syncResult.arbitrum_address.slice(-10)}
                      </code>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopy(syncResult.arbitrum_address, "arbitrum")}
                          className="p-1 hover:bg-accent rounded"
                        >
                          {copiedField === "arbitrum" ? (
                            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-secondary" />
                          )}
                        </button>
                        <a
                          href={`https://arbiscan.io/address/${syncResult.arbitrum_address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 hover:bg-accent rounded"
                        >
                          <ExternalLink className="w-4 h-4 text-[#2470ff]" />
                        </a>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <CustomButton
              onClick={handleReset}
              className="w-full mt-6 bg-[#2470ff] text-white hover:bg-[#1a5acc] h-11"
            >
              Create Another ITP
            </CustomButton>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // RENDER - FORM
  // ============================================================================

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Create ITP</h1>
          <p className="text-sm text-secondary">Deploy a new Index Token Product to Orbit and Arbitrum chains</p>
        </div>
        <Link href="/create">
          <CustomButton className="bg-transparent border border-accent text-secondary hover:bg-accent h-9 text-[13px] rounded flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Historical Simulation
          </CustomButton>
        </Link>
      </div>

      {/* Form Card */}
      <Card className="bg-foreground border border-accent shadow-sm">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-primary mb-4">ITP Details</h3>
          <div className="space-y-6">
            {/* Name */}
            <div id="field-name" className="space-y-2">
              <label className="text-sm font-medium text-secondary">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Top 10 DeFi Index"
                className={cn(
                  "bg-background border-accent h-12 text-primary placeholder:text-secondary/50",
                  errors.name && "border-red-500"
                )}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors({ ...errors, name: undefined });
                }}
                maxLength={64}
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Symbol */}
            <div id="field-symbol" className="space-y-2">
              <label className="text-sm font-medium text-secondary">
                Symbol <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="DEFI10"
                className={cn(
                  "bg-background border-accent h-12 font-mono uppercase text-primary placeholder:text-secondary/50",
                  errors.symbol && "border-red-500"
                )}
                value={symbol}
                onChange={(e) => {
                  setSymbol(e.target.value.toUpperCase());
                  if (errors.symbol) setErrors({ ...errors, symbol: undefined });
                }}
                maxLength={8}
              />
              <p className="text-xs text-secondary">
                Max 8 characters, uppercase
              </p>
              {errors.symbol && (
                <p className="text-xs text-red-500">{errors.symbol}</p>
              )}
            </div>

            {/* Initial Price */}
            <div id="field-initial_price" className="space-y-2">
              <label className="text-sm font-medium text-secondary">
                Initial Price (USD) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary">
                  $
                </span>
                <Input
                  type="number"
                  placeholder="1.00"
                  className={cn(
                    "bg-background border-accent h-12 font-mono pl-7 text-primary placeholder:text-secondary/50",
                    errors.initial_price && "border-red-500"
                  )}
                  value={initialPrice}
                  onChange={(e) => {
                    setInitialPrice(e.target.value);
                    if (errors.initial_price) setErrors({ ...errors, initial_price: undefined });
                  }}
                  step="0.01"
                  min="0"
                />
              </div>
              {errors.initial_price && (
                <p className="text-xs text-red-500">{errors.initial_price}</p>
              )}
            </div>

            {/* Category Pre-fill Section */}
            <Card className="bg-background border border-accent overflow-hidden">
              <button
                type="button"
                onClick={() => setShowCategoryPrefill(!showCategoryPrefill)}
                className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#2470ff]" />
                  <span className="text-sm font-medium text-primary">Pre-fill from Category</span>
                  <span className="text-xs text-secondary">
                    {categoriesLoading ? "(loading...)" : `(${categoriesWithCounts.length} categories)`}
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-secondary transition-transform",
                    showCategoryPrefill && "rotate-180"
                  )}
                />
              </button>

              {showCategoryPrefill && (
                <CardContent className="pt-0 pb-4 border-t border-accent">
                  <div className="space-y-4 pt-4">
                    {/* Category Selector */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-secondary">Category</label>
                      <Select value={selectedCategory} onValueChange={(v) => {
                        setSelectedCategory(v);
                        setCategoryError(null);
                        setLastPrefillResult(null);
                      }}>
                        <SelectTrigger className="bg-foreground border-accent h-10">
                          <SelectValue placeholder="Select a category..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          <SelectItem value="__all__">
                            All Tradeable Assets ({availableAssets.length})
                          </SelectItem>
                          {categoriesWithCounts.length > 0 ? (
                            categoriesWithCounts.map((cat) => (
                              <SelectItem key={cat.categoryId} value={cat.categoryId}>
                                {cat.name} ({cat.tradeableCount})
                              </SelectItem>
                            ))
                          ) : (
                            // Fallback to static list if dynamic fetch failed
                            ALLOWED_CATEGORIES.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-secondary">
                        {selectedCategory === "__all__"
                          ? `${availableAssets.length} Bitget assets available (max 250, limited logo coverage)`
                          : `${maxAssetsForCategory} tradeable assets in this category (max 250)`}
                      </p>
                    </div>

                    {/* Top X Count */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-secondary">
                        Top {Math.min(topXCount, maxAssetsForCategory)} of {maxAssetsForCategory} Assets
                      </label>
                      <Slider
                        value={[Math.min(topXCount, Math.max(1, maxAssetsForCategory))]}
                        onValueChange={(v) => setTopXCount(v[0])}
                        min={1}
                        max={Math.max(1, maxAssetsForCategory)}
                        step={1}
                        className="py-2"
                        disabled={maxAssetsForCategory < 1}
                      />
                      <p className="text-xs text-secondary">
                        Select 1-{maxAssetsForCategory} assets (max 250 per index)
                      </p>
                    </div>

                    {/* Weighting Strategy */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-secondary">Weighting Strategy</label>
                      <Select
                        value={weightingStrategy}
                        onValueChange={(v) => setWeightingStrategy(v as WeightingStrategy)}
                      >
                        <SelectTrigger className="bg-foreground border-accent h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equal">Equal Weight</SelectItem>
                          <SelectItem value="market_cap">Market Cap Weighted</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Market Cap Min Weight (only for market_cap strategy) */}
                    {weightingStrategy === "market_cap" && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-secondary">
                          Minimum Weight: {minWeightPercent}%
                        </label>
                        <Slider
                          value={[minWeightPercent]}
                          onValueChange={(v) => setMinWeightPercent(v[0])}
                          min={0.1}
                          max={10}
                          step={0.1}
                          className="py-2"
                        />
                        <p className="text-xs text-secondary">
                          Each asset will have at least {minWeightPercent}% weight
                        </p>
                      </div>
                    )}

                    {/* Error Display */}
                    {categoryError && (
                      <div className="flex items-center gap-2 text-sm text-red-500">
                        <AlertCircle className="w-4 h-4" />
                        {categoryError}
                      </div>
                    )}

                    {/* Success Display */}
                    {lastPrefillResult && !categoryError && (
                      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                        <Check className="w-4 h-4" />
                        {lastPrefillResult}
                      </div>
                    )}

                    {/* Apply Button */}
                    <CustomButton
                      onClick={handleCategoryPrefill}
                      disabled={categoryLoading || assetsLoading}
                      className={cn(
                        "w-full h-10",
                        !categoryLoading && !assetsLoading
                          ? "bg-[#2470ff] text-white hover:bg-[#1a5acc]"
                          : "bg-accent text-secondary cursor-not-allowed"
                      )}
                    >
                      {categoryLoading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Apply Pre-fill
                        </span>
                      )}
                    </CustomButton>

                    <p className="text-xs text-secondary text-center">
                      This will replace your current asset selection
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Asset Composition Section */}
            <Card id="field-assets" className="bg-background border border-accent">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-medium text-secondary">
                    Asset Composition <span className="text-red-500">*</span>
                  </label>
                  {/* Weight Sum Display */}
                  <div className={cn(
                    "text-sm font-mono px-3 py-1 rounded",
                    selectedAssets.length === 0
                      ? "text-secondary bg-accent/50"
                      : weightsValid
                        ? "text-green-600 dark:text-green-400 bg-green-500/10"
                        : "text-red-500 bg-red-500/10"
                  )}>
                    Total: {totalWeight.toFixed(4)} / 1.0000
                  </div>
                </div>

                {/* Assets Loading State */}
                {assetsLoading && (
                  <div className="flex items-center gap-2 text-sm text-secondary py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading Bitget assets...
                  </div>
                )}

                {/* Assets Error State */}
                {assetsError && (
                  <div className="flex items-center gap-2 text-sm text-red-500 py-4">
                    <AlertCircle className="w-4 h-4" />
                    {assetsError}
                  </div>
                )}

                {/* Selected Assets List */}
                {!assetsLoading && !assetsError && (
                  <>
                    {selectedAssets.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {selectedAssets.map((asset, index) => (
                          <div
                            key={`${asset.symbol}-${index}`}
                            className="flex items-center gap-3 p-3 bg-foreground border border-accent rounded-lg"
                          >
                            {/* Asset Logo and Symbol */}
                            <div className="flex items-center gap-3 flex-1">
                              {getAssetLogoUrl(asset.coin_id, asset.logo, asset.symbol, symbolToCoinId) ? (
                                <img
                                  src={getAssetLogoUrl(asset.coin_id, asset.logo, asset.symbol, symbolToCoinId)!}
                                  alt={asset.symbol}
                                  className="w-8 h-8 rounded-full"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                                  <span className="text-xs font-bold text-secondary">
                                    {asset.symbol.slice(0, 2)}
                                  </span>
                                </div>
                              )}
                              <div>
                                <span className="font-mono font-medium text-primary">
                                  {asset.symbol}
                                </span>
                                <span className="text-xs text-secondary ml-2">
                                  Bitget
                                </span>
                              </div>
                            </div>

                            {/* Weight Input */}
                            <div className="w-32">
                              <Input
                                type="text"
                                inputMode="decimal"
                                placeholder="0.00"
                                value={asset.weight}
                                onChange={(e) => handleWeightChange(index, e.target.value)}
                                className={cn(
                                  "h-9 font-mono text-right bg-background border-accent text-primary",
                                  asset.weight && (parseFloat(asset.weight) <= 0 || parseFloat(asset.weight) > 1) && "border-red-500"
                                )}
                              />
                            </div>

                            {/* Remove Button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveAsset(index)}
                              className="p-1.5 hover:bg-red-500/10 rounded text-secondary hover:text-red-500 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Asset Button with Combobox */}
                    <Popover open={assetPopoverOpen} onOpenChange={setAssetPopoverOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "w-full flex items-center justify-center gap-2 h-10 px-4",
                            "border border-dashed border-accent rounded-lg",
                            "text-sm text-secondary hover:text-primary hover:border-primary/50",
                            "transition-colors bg-foreground"
                          )}
                        >
                          <Plus className="w-4 h-4" />
                          Add Asset from Bitget
                          <ChevronsUpDown className="w-4 h-4 ml-auto opacity-50" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Search Bitget assets..."
                            value={assetSearch}
                            onValueChange={setAssetSearch}
                          />
                          <CommandList>
                            <CommandEmpty>No assets found.</CommandEmpty>
                            <CommandGroup heading={`Bitget Assets (${filteredAssets.filter(a => a.symbol.toLowerCase().includes(assetSearch.toLowerCase())).length})`}>
                              {filteredAssets
                                .filter(asset =>
                                  asset.symbol.toLowerCase().includes(assetSearch.toLowerCase())
                                )
                                .slice(0, 50)
                                .map((asset) => (
                                  <CommandItem
                                    key={asset.symbol}
                                    value={asset.symbol}
                                    onSelect={() => handleAddAsset(asset)}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    {getAssetLogoUrl(asset.coin_id, asset.logo, asset.symbol, symbolToCoinId) ? (
                                      <img
                                        src={getAssetLogoUrl(asset.coin_id, asset.logo, asset.symbol, symbolToCoinId)!}
                                        alt={asset.symbol}
                                        className="w-5 h-5 rounded-full"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                                        <span className="text-[10px] font-bold text-secondary">
                                          {asset.symbol.slice(0, 2)}
                                        </span>
                                      </div>
                                    )}
                                    <span className="font-mono font-medium">{asset.symbol}</span>
                                    <span className="text-xs text-secondary ml-auto">
                                      {asset.quote_currency}
                                    </span>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {/* Validation Messages */}
                    {errors.assets && (
                      <p className="text-xs text-red-500 mt-2">{errors.assets}</p>
                    )}
                    {errors.weights && (
                      <p className="text-xs text-red-500 mt-2">{errors.weights}</p>
                    )}

                    {/* Weight Guidance */}
                    {selectedAssets.length > 0 && !weightsValid && (
                      <p className="text-xs text-secondary mt-2">
                        Weights must sum to exactly 1.0 (e.g., 0.5 + 0.3 + 0.2 = 1.0)
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Virtual Orderbook Preview */}
            {selectedAssets.length > 0 && weightsValid && (
              <VirtualOrderbook
                symbols={selectedAssets.map(a => a.symbol)}
                weights={selectedAssets.map(a => {
                  const w = parseFloat(a.weight);
                  return Math.max(1, Math.round((isNaN(w) ? 0 : Math.abs(w)) * 10000));
                })}
                displayLevels={5}
                showAssetBreakdown={true}
                autoRefreshInterval={3}
                className="shadow-sm"
                defaultCollapsed={true}
                baseMidPrice={parseFloat(initialPrice) || undefined}
              />
            )}

            {/* More Settings (Expandable) */}
            <Card className="bg-background border border-accent overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-secondary" />
                  <span className="text-sm font-medium text-primary">More Settings</span>
                </div>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-secondary transition-transform",
                    showAdvancedSettings && "rotate-180"
                  )}
                />
              </button>

              {showAdvancedSettings && (
                <CardContent className="pt-0 pb-4 border-t border-accent">
                  <div className="space-y-4 pt-4">
                    {/* Description */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-secondary">
                        Description
                      </label>
                      <textarea
                        placeholder="A brief description of your index..."
                        className={cn(
                          "w-full min-h-[80px] px-3 py-2 rounded-md",
                          "bg-foreground border border-accent",
                          "text-primary placeholder:text-secondary/50",
                          "text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        )}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        maxLength={500}
                      />
                      <p className="text-xs text-secondary text-right">
                        {description.length}/500
                      </p>
                    </div>

                    {/* Methodology */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-secondary">
                        Methodology
                      </label>
                      <textarea
                        placeholder="How the index is weighted and rebalanced..."
                        className={cn(
                          "w-full min-h-[80px] px-3 py-2 rounded-md",
                          "bg-foreground border border-accent",
                          "text-primary placeholder:text-secondary/50",
                          "text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        )}
                        value={methodology}
                        onChange={(e) => setMethodology(e.target.value)}
                        maxLength={500}
                      />
                      <p className="text-xs text-secondary text-right">
                        {methodology.length}/500
                      </p>
                    </div>

                    {/* Max Order Size */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-secondary">
                        Max Order Size (USDC)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary">
                          $
                        </span>
                        <Input
                          type="number"
                          placeholder="1000"
                          className="bg-foreground border-accent h-10 font-mono pl-7 text-primary placeholder:text-secondary/50"
                          value={maxOrderSize}
                          onChange={(e) => setMaxOrderSize(e.target.value)}
                          step="100"
                          min="100"
                        />
                      </div>
                      <p className="text-xs text-secondary">
                        Maximum single order size for this ITP (default: $1,000)
                      </p>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Error Display */}
            {submitError && (
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-500 font-medium">Creation Failed</p>
                  <p className="text-xs text-red-400 mt-1">{submitError}</p>
                  <button
                    onClick={handleRetry}
                    className="mt-3 text-sm text-[#2470ff] hover:underline font-medium"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {/* Submit Button with Deploy Options Popover */}
            <Popover open={showDeployOptions} onOpenChange={setShowDeployOptions}>
              <PopoverTrigger asChild>
                <CustomButton
                  onClick={handleDeployClick}
                  disabled={!canSubmit || isSubmitting}
                  className={cn(
                    "w-full h-12 text-base font-medium",
                    canSubmit && !isSubmitting
                      ? "bg-[#2470ff] text-white hover:bg-[#1a5acc]"
                      : "bg-accent text-secondary cursor-not-allowed"
                  )}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {deployPhase
                        ? `${PHASE_MESSAGES[deployPhase].label} (${Math.round(pollingProgress || 0)}%)`
                        : "Deploying..."}
                    </span>
                  ) : !canSubmit && selectedAssets.length > 0 && !weightsValid ? (
                    <span className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Weights must sum to 1.0
                    </span>
                  ) : (
                    "Deploy ITP"
                  )}
                </CustomButton>
              </PopoverTrigger>
              <PopoverContent className="w-[360px] p-0" align="center" side="top">
                <div className="p-4 border-b border-accent">
                  <h3 className="text-sm font-semibold text-primary">Choose Deployment Type</h3>
                  <p className="text-xs text-secondary mt-1">Select how you want to deploy your ITP</p>
                </div>
                <div className="p-2 space-y-1">
                  {/* Personal Use Option */}
                  <button
                    type="button"
                    onClick={() => handleDeployOptionSelect("personal")}
                    className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors text-left group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-primary group-hover:text-blue-500 transition-colors">
                          Deploy for Yourself
                        </span>
                        <span className="text-[10px] font-mono bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded">
                          FREE
                        </span>
                      </div>
                      <p className="text-xs text-secondary mt-0.5">
                        Personal use, build your track record
                      </p>
                      <p className="text-[11px] text-blue-500 mt-1">
                        ✦ 24/7 intent liquidity bonus
                      </p>
                    </div>
                  </button>

                  {/* Tradable Fund Option */}
                  <button
                    type="button"
                    onClick={() => handleDeployOptionSelect("tradable")}
                    className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors text-left group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#2470ff]/10 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-[#2470ff]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-primary group-hover:text-[#2470ff] transition-colors">
                          Tradable Fund for Others
                        </span>
                        <span className="text-[10px] font-mono bg-[#2470ff]/10 text-[#2470ff] px-1.5 py-0.5 rounded">
                          $500
                        </span>
                      </div>
                      <p className="text-xs text-secondary mt-0.5">
                        Accept deposits from others, DAO legal wrapper included
                      </p>
                      <p className="text-[11px] text-[#2470ff] mt-1">
                        ✦ 24/7 intent liquidity bonus
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-[11px] text-secondary">
                        <Calendar className="w-3 h-3" />
                        <span>Schedule a call to get started</span>
                      </div>
                    </div>
                  </button>

                  {/* Institutional ETF Option */}
                  <button
                    type="button"
                    onClick={() => handleDeployOptionSelect("institutional")}
                    className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors text-left group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-zinc-500/10 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-zinc-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-primary group-hover:text-zinc-400 transition-colors">
                          Institutional ETF
                        </span>
                        <span className="text-[10px] font-mono bg-zinc-500/10 text-zinc-500 px-1.5 py-0.5 rounded">
                          CUSTOM
                        </span>
                      </div>
                      <p className="text-xs text-secondary mt-0.5">
                        Full regulatory compliance, custodian integration, unlimited TVL
                      </p>
                      <div className="flex items-center gap-1 mt-1.5 text-[11px] text-zinc-500">
                        <Calendar className="w-3 h-3" />
                        <span>Contact us for institutional pricing</span>
                      </div>
                    </div>
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Cancel Button (while submitting) */}
            {isSubmitting && (
              <CustomButton
                onClick={handleCancel}
                className="w-full bg-transparent border border-accent text-secondary hover:bg-accent h-10 text-sm"
              >
                Cancel
              </CustomButton>
            )}

            {/* Calendly Modal for tradable/institutional options */}
            <CalendlyModal
              isOpen={showCalendlyModal}
              onClose={() => setShowCalendlyModal(false)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

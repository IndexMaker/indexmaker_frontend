"use client";

/**
 * BridgeTab - LEGACY COMPONENT FOR TESTING
 *
 * STATUS: Keep as separate component - DO NOT merge into main buy flow
 *
 * Purpose:
 * - Testing USDC bridging between Arbitrum and Orbit chains
 * - Uses direct viem calls to bridge contracts
 * - Independent from buy/sell flows in SupplyPanel
 *
 * This component handles cross-chain bridging which is different from
 * the buy/sell ITP flows that will use BridgeProxy contract.
 *
 * Story 3.2 Decision: Keep BridgeTab separate for testing purposes.
 * Consider moving to dev-only route in future if not needed in production.
 */

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";
import { useWallet } from "@/contexts/wallet-context";
import { cn } from "@/lib/utils";
import { ArrowDownUp, RefreshCw } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatEther, formatUnits, parseUnits } from "viem";
import { createPublicClient, createWalletClient, custom, http } from "viem";
import { arbitrum } from "viem/chains";
import USDC from "../../public/logos/usd-coin.png";
import Info from "../icons/info";

// Chain configurations from FINAL.md
const ARBITRUM_CHAIN_ID = 42161;
const ORBIT_CHAIN_ID = 111222333;

const ARBITRUM_CONFIG = {
  chainId: ARBITRUM_CHAIN_ID,
  name: "Arbitrum",
  rpcUrl: "https://arb1.arbitrum.io/rpc",
  usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  bridge: "0x7b7cF960C5e005b52c223ad99dC07b416a30EAF6",
  explorer: "https://arbiscan.io",
};

const ORBIT_CONFIG = {
  chainId: ORBIT_CHAIN_ID,
  name: "Orbit Testnet",
  rpcUrl: "https://index.rpc.zeeve.net",
  wusdc: "0xE1AccDbE71393F582CD86a6F04872ed341B499e9",
  bridge: "0x721fcEE97DB26B0406852fabf2420B347042358E",
  explorer: "https://index.explorer.zeeve.net",
};

// ERC20 ABI (minimal)
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
] as const;

// Bridge ABI (simplified)
const BRIDGE_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "bridgeOut",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

interface Balance {
  usdc: string;
  ind: string;
  eth: string;
}

interface BridgeTabProps {
  className?: string;
}

export function BridgeTab({ className = "" }: BridgeTabProps) {
  const { t } = useLanguage();
  const { wallet, address } = useWallet();
  
  const [direction, setDirection] = useState<"toOrbit" | "toArbitrum">("toOrbit");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [arbitrumBalances, setArbitrumBalances] = useState<Balance>({
    usdc: "0",
    ind: "0",
    eth: "0",
  });
  
  const [orbitBalances, setOrbitBalances] = useState<Balance>({
    usdc: "0",
    ind: "0",
    eth: "0",
  });

  // Define custom Orbit chain
  const orbitChain = {
    id: ORBIT_CHAIN_ID,
    name: "Orbit Testnet",
    network: "orbit-testnet",
    nativeCurrency: {
      decimals: 18,
      name: "IND",
      symbol: "IND",
    },
    rpcUrls: {
      default: { http: [ORBIT_CONFIG.rpcUrl] },
      public: { http: [ORBIT_CONFIG.rpcUrl] },
    },
    blockExplorers: {
      default: { name: "Orbit Explorer", url: ORBIT_CONFIG.explorer },
    },
  } as const;

  // Fetch balances
  const fetchBalances = async () => {
    if (!address) return;

    setRefreshing(true);
    try {
      // Arbitrum balances
      const arbClient = createPublicClient({
        chain: arbitrum,
        transport: http(ARBITRUM_CONFIG.rpcUrl),
      });

      const [arbEth, arbUsdc] = await Promise.all([
        arbClient.getBalance({ address: address as `0x${string}` }),
        arbClient.readContract({
          address: ARBITRUM_CONFIG.usdc as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [address as `0x${string}`],
        }),
      ]);

      setArbitrumBalances({
        usdc: formatUnits(arbUsdc as bigint, 6),
        ind: "0",
        eth: formatEther(arbEth),
      });

      // Orbit balances
      const orbitClient = createPublicClient({
        chain: orbitChain,
        transport: http(ORBIT_CONFIG.rpcUrl),
      });

      const [orbitInd, orbitWUsdc] = await Promise.all([
        orbitClient.getBalance({ address: address as `0x${string}` }),
        orbitClient.readContract({
          address: ORBIT_CONFIG.wusdc as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [address as `0x${string}`],
        }),
      ]);

      setOrbitBalances({
        usdc: formatUnits(orbitWUsdc as bigint, 6),
        ind: formatEther(orbitInd),
        eth: "0",
      });
    } catch (error) {
      console.error("Error fetching balances:", error);
      toast.error("Failed to fetch balances");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (address) {
      fetchBalances();
      // Refresh every 30 seconds
      const interval = setInterval(fetchBalances, 30000);
      return () => clearInterval(interval);
    }
  }, [address]);

  const switchDirection = () => {
    setDirection(direction === "toOrbit" ? "toArbitrum" : "toOrbit");
    setAmount("");
  };

  const setMaxAmount = () => {
    const balance =
      direction === "toOrbit"
        ? arbitrumBalances.usdc
        : orbitBalances.usdc;
    setAmount(balance);
  };

  const handleBridge = async () => {
    if (!wallet || !address || !amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      const amountWei = parseUnits(amount, 6);

      if (direction === "toOrbit") {
        // Bridge from Arbitrum to Orbit
        if (!wallet.rawProvider) {
          toast.error("Wallet provider not available");
          return;
        }
        
        const walletClient = createWalletClient({
          chain: arbitrum,
          transport: custom(wallet.rawProvider),
        });

        // First approve
        toast.info("Approving USDC...");
        const approveHash = await walletClient.writeContract({
          address: ARBITRUM_CONFIG.usdc as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [ARBITRUM_CONFIG.bridge as `0x${string}`, amountWei],
          account: address as `0x${string}`,
        });

        toast.info("Waiting for approval confirmation...");
        const arbClient = createPublicClient({
          chain: arbitrum,
          transport: http(ARBITRUM_CONFIG.rpcUrl),
        });
        await arbClient.waitForTransactionReceipt({ hash: approveHash });

        // Then bridge
        toast.info("Initiating bridge transaction...");
        const bridgeHash = await walletClient.writeContract({
          address: ARBITRUM_CONFIG.bridge as `0x${string}`,
          abi: BRIDGE_ABI,
          functionName: "bridgeOut",
          args: [address as `0x${string}`, amountWei],
          account: address as `0x${string}`,
        });

        toast.success(
          `Bridge initiated! Tx: ${bridgeHash.slice(0, 10)}...`,
          {
            description: "Your tokens will arrive on Orbit in ~10 seconds",
          }
        );
      } else {
        // Bridge from Orbit to Arbitrum
        if (!wallet.rawProvider) {
          toast.error("Wallet provider not available");
          return;
        }
        
        const walletClient = createWalletClient({
          chain: orbitChain,
          transport: custom(wallet.rawProvider),
        });

        // First approve
        toast.info("Approving wUSDC...");
        const approveHash = await walletClient.writeContract({
          address: ORBIT_CONFIG.wusdc as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [ORBIT_CONFIG.bridge as `0x${string}`, amountWei],
          account: address as `0x${string}`,
        });

        toast.info("Waiting for approval confirmation...");
        const orbitClient = createPublicClient({
          chain: orbitChain,
          transport: http(ORBIT_CONFIG.rpcUrl),
        });
        await orbitClient.waitForTransactionReceipt({ hash: approveHash });

        // Then bridge
        toast.info("Initiating bridge transaction...");
        const bridgeHash = await walletClient.writeContract({
          address: ORBIT_CONFIG.bridge as `0x${string}`,
          abi: BRIDGE_ABI,
          functionName: "bridgeOut",
          args: [address as `0x${string}`, amountWei],
          account: address as `0x${string}`,
        });

        toast.success(
          `Bridge initiated! Tx: ${bridgeHash.slice(0, 10)}...`,
          {
            description: "Your tokens will arrive on Arbitrum in ~10 seconds",
          }
        );
      }

      setAmount("");
      // Refresh balances after a delay
      setTimeout(fetchBalances, 5000);
    } catch (error: any) {
      console.error("Bridge error:", error);
      toast.error(error?.message || "Bridge transaction failed");
    } finally {
      setLoading(false);
    }
  };

  const sourceChain = direction === "toOrbit" ? "Arbitrum" : "Orbit Testnet";
  const destChain = direction === "toOrbit" ? "Orbit Testnet" : "Arbitrum";
  const sourceBalances = direction === "toOrbit" ? arbitrumBalances : orbitBalances;
  const destBalances = direction === "toOrbit" ? orbitBalances : arbitrumBalances;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex flex-row items-center justify-between py-4 px-4 border-b border-accent">
        <span className="text-[16px] text-primary font-medium">
          Bridge Assets
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchBalances}
          disabled={refreshing}
          className="h-8 w-8 text-secondary hover:text-primary"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Source Chain */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] text-secondary">From</span>
            <span className="text-[12px] text-primary font-medium">
              {sourceChain}
            </span>
          </div>

          {/* Source Balances */}
          <div className="bg-accent rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Image src={USDC} alt="USDC" width={16} height={16} />
                <span className="text-[12px] text-secondary">USDC</span>
              </div>
              <span className="text-[12px] text-primary font-mono">
                {parseFloat(sourceBalances.usdc).toFixed(4)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[12px] text-secondary">
                {direction === "toOrbit" ? "ETH" : "IND"}
              </span>
              <span className="text-[12px] text-primary font-mono">
                {direction === "toOrbit"
                  ? parseFloat(sourceBalances.eth).toFixed(6)
                  : parseFloat(sourceBalances.ind).toFixed(6)}
              </span>
            </div>
          </div>
        </div>

        {/* Switch Direction Button */}
        <div className="flex justify-center my-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={switchDirection}
            className="h-10 w-10 rounded-full bg-accent hover:bg-muted"
          >
            <ArrowDownUp className="h-5 w-5 text-primary" />
          </Button>
        </div>

        {/* Destination Chain */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] text-secondary">To</span>
            <span className="text-[12px] text-primary font-medium">
              {destChain}
            </span>
          </div>

          {/* Destination Balances */}
          <div className="bg-accent rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Image src={USDC} alt="USDC" width={16} height={16} />
                <span className="text-[12px] text-secondary">
                  {direction === "toOrbit" ? "wUSDC" : "USDC"}
                </span>
              </div>
              <span className="text-[12px] text-primary font-mono">
                {parseFloat(destBalances.usdc).toFixed(4)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[12px] text-secondary">
                {direction === "toOrbit" ? "IND" : "ETH"}
              </span>
              <span className="text-[12px] text-primary font-mono">
                {direction === "toOrbit"
                  ? parseFloat(destBalances.ind).toFixed(6)
                  : parseFloat(destBalances.eth).toFixed(6)}
              </span>
            </div>
          </div>
        </div>

        {/* Amount Input */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[12px] text-secondary">Amount</label>
            <span className="text-[11px] text-muted">
              Available: {parseFloat(sourceBalances.usdc).toFixed(4)} USDC
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-2 px-3 py-3 bg-accent rounded-lg border border-accent">
              <input
                type="number"
                step="any"
                placeholder="0.00"
                inputMode="decimal"
                autoComplete="off"
                autoCorrect="off"
                value={amount}
                className="flex-1 font-mono text-[14px] outline-none bg-transparent text-primary placeholder-secondary"
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow empty or valid decimal numbers
                  if (value === "" || /^\d*\.?\d*$/.test(value)) {
                    setAmount(value);
                  }
                }}
                onKeyDown={(e) => {
                  // Prevent 'e', '+', '-' in number input
                  if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') {
                    e.preventDefault();
                  }
                }}
              />

              <div className="flex items-center gap-2">
                <Image src={USDC} alt="USDC" width={18} height={18} />
                <span className="text-[12px] text-secondary">USDC</span>
                <Button
                  type="button"
                  className="px-2 py-1 h-6 text-[11px] rounded bg-foreground text-primary hover:bg-muted"
                  onClick={setMaxAmount}
                >
                  MAX
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-6">
          <Info className="h-4 w-4 text-blue-500 mt-0.5" />
          <div className="flex-1">
            <p className="text-[11px] text-secondary leading-relaxed">
              Bridge completion takes ~5 seconds. 
              processes your transaction.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-accent">
        <Button
          onClick={handleBridge}
          disabled={
            !wallet ||
            !amount ||
            parseFloat(amount) <= 0 ||
            parseFloat(amount) > parseFloat(sourceBalances.usdc) ||
            loading
          }
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[13px] h-10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Processing...
            </span>
          ) : (
            `Bridge to ${destChain}`
          )}
        </Button>
      </div>
    </div>
  );
}

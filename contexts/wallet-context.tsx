"use client";

import onboard from "@/lib/blocknative/web3-onboard";
import { shortenAddress } from "@/lib/utils";
import { clearSelectedVault } from "@/redux/vaultSlice";
import { ethers } from "ethers";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";

type WalletState = {
  label: string;
  icon: string;
  provider: ethers.BrowserProvider | null; // Use BrowserProvider for ethers v6
  rawProvider: any; // Store raw provider from web3-onboard for request calls
  accounts: {
    address: string;
    ens?: { name?: string; avatar?: string };
    balance?: Record<string, string>;
  }[];
  chains: { id: string }[];
};

type WalletContextType = {
  wallet: WalletState | null;
  isConnected: boolean;
  connecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  switchNetwork: (chainId: string) => Promise<void>;
  switchWallet: () => Promise<void>;
  address: string | null;
  displayAddress: string | null;
  chainId: string | null;
  isAdmin: boolean;
  isWhitelisted: boolean;
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const LAST_WALLET_KEY = "lastConnectedWallet";
const CHECK_INTERVAL = 30_000; // Check connection every 30 seconds

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [chainId, setChainId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const isConnected = !!wallet;
  const address = wallet?.accounts[0]?.address || null;
  const displayAddress = address ? shortenAddress(address) : null;
  const isAdmin = address
    ? ethers.getAddress(address) ===
      ethers.getAddress(process.env.NEXT_PUBLIC_ADMIN_ADDRESS || "")
    : false;

  const checkWhitelistStatus = async (address: string): Promise<boolean> => {
    // Whitelist checking logic - currently returns false for all addresses
    // In production, this would check against a backend API or smart contract
    try {
      // Example implementation:
      // const response = await fetch(`/api/whitelist/${address}`);
      // return response.ok;
      return false; // Default to not whitelisted
    } catch (error) {
      console.error('Error checking whitelist status:', error);
      return false;
    }
  };
  // Check if wallet is still connected
  const checkConnection = useCallback(async () => {
    if (!wallet || !wallet.provider) {
      return;
    }

    try {
      await wallet.provider.getNetwork(); // Verify provider is responsive
    } catch (error) {
      console.warn("Wallet connection lost:", error);
      await disconnectWallet();
    }
  }, [wallet]);

  useEffect(() => {
    const updateWhitelist = async () => {
      if (address) {
        const result = await checkWhitelistStatus(address);
        setIsWhitelisted(result);
      } else {
        setIsWhitelisted(false);
      }
    };

    updateWhitelist();
  }, [address]);

  // Initialize wallet and handle auto-connection
  useEffect(() => {
    let unsubscribe: any;
    let intervalId: NodeJS.Timeout | undefined;

    const init = async () => {
      try {
        // Check for previously connected wallet
        const lastWalletLabel = localStorage.getItem(LAST_WALLET_KEY);
        const initialWallets = onboard.state.get().wallets;

        if (initialWallets.length > 0) {
          updateWalletState(initialWallets[0]);
          setIsInitialized(true);
          return;
        }

        // Attempt auto-connection if a wallet was previously connected
        if (lastWalletLabel) {
          try {
            const wallets = await onboard.connectWallet({
              autoSelect: { label: lastWalletLabel, disableModals: true },
            });
            if (wallets.length > 0) {
              updateWalletState(wallets[0]);
              setIsInitialized(true);
              return;
            }
          } catch (error) {
            console.warn("Auto-connection failed:", error);
            localStorage.removeItem(LAST_WALLET_KEY);
          }
        }

        // Subscribe to wallet changes
        unsubscribe = onboard.state.select("wallets").subscribe((wallets) => {
          const newWallet = wallets[0] || null;
          setWallet(
            (newWallet
              ? {
                  label: newWallet.label,
                  icon: newWallet.icon,
                  provider: newWallet.provider
                    ? new ethers.BrowserProvider(newWallet.provider)
                    : null,
                  rawProvider: newWallet.provider || null,
                  accounts: newWallet.accounts,
                  chains: newWallet.chains,
                }
              : null) as WalletState
          );
          setChainId(newWallet?.chains[0]?.id || null);
          if (newWallet) {
            localStorage.setItem(LAST_WALLET_KEY, newWallet.label);
          } else {
            localStorage.removeItem(LAST_WALLET_KEY);
          }
        });

        setIsInitialized(true);
      } catch (error) {
        console.error("Wallet initialization failed:", error);
        setIsInitialized(true);
      }
    };

    init();

    return () => {
      // unsubscribe?.();
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const disconnectWallet = useCallback(async () => {
    if (!wallet) return;

    try {
      // Disconnect using web3-onboard
      await onboard.disconnectWallet({ label: wallet.label });

      // Coinbase Wallet may support disconnect via EIP-1193
      await wallet.rawProvider.disconnect?.();
      // Alternatively, clear session via close
      await wallet.rawProvider.close?.();
      // Handle WalletConnect-specific disconnection
      if (
        wallet.label.toLowerCase().includes("walletconnect") &&
        wallet.rawProvider
      ) {
        try {
          await wallet.rawProvider.disconnect?.();
        } catch (error) {
          console.warn("Failed to close WalletConnect session:", error);
        }
      }

      // Handle MetaMask-specific disconnection
      if (
        wallet.label.toLowerCase().includes("metamask") &&
        wallet.rawProvider
      ) {
        try {
          // Request new permissions to reset MetaMask session
          await wallet.rawProvider.request({
            method: "wallet_requestPermissions",
            params: [{ eth_accounts: {} }],
          });
        } catch (error) {
          console.warn("Failed to reset MetaMask session:", error);
        }
      }

      // Clear local state
      setWallet(null);
      setChainId(null);
      clearSelectedVault();
      localStorage.removeItem(LAST_WALLET_KEY);
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
      throw error;
    }
  }, [wallet]);

  // Periodic connection check and provider event listeners
  useEffect(() => {
    if (!isConnected || !wallet?.rawProvider) return;

    const handleDisconnect = () => {
      console.log("Provider disconnected");
      disconnectWallet();
    };
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        console.log("No accounts available, disconnecting");
        disconnectWallet();
      }
    };

    wallet.rawProvider.on?.("disconnect", handleDisconnect);
    wallet.rawProvider.on?.("accountsChanged", handleAccountsChanged);

    const intervalId = setInterval(checkConnection, CHECK_INTERVAL);

    return () => {
      wallet.rawProvider.removeListener?.("disconnect", handleDisconnect);
      wallet.rawProvider.removeListener?.(
        "accountsChanged",
        handleAccountsChanged
      );
      clearInterval(intervalId);
    };
  }, [isConnected, wallet, checkConnection, disconnectWallet]);

  const updateWalletState = (walletState: any) => {
    const { label, icon, provider, accounts, chains } = walletState;
    setWallet({
      label,
      icon,
      provider: provider ? new ethers.BrowserProvider(provider) : null,
      rawProvider: provider || null,
      accounts,
      chains,
    });
    setChainId(chains[0]?.id || null);
  };

  const connectWallet = useCallback(async () => {
    // console.log(isConnected)
    // if (isConnected) return;

    try {
      setConnecting(true);
      const wallets = await onboard.connectWallet();
      if (wallets.length > 0) {
        updateWalletState(wallets[0]);
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      throw error;
    } finally {
      setConnecting(false);
    }
  }, [isConnected]);

  const switchNetwork = useCallback(
    async (chainId: string) => {
      if (!isConnected) return;

      try {
        await onboard.setChain({ chainId });
      } catch (error) {
        console.error("Error switching network:", error);
        throw error;
      }
    },
    [isConnected]
  );

  const switchWallet = useCallback(async () => {
    if (wallet) {
      await disconnectWallet();
    }
    // setTimeout(async () => await connectWallet(), 1000)
  }, [wallet, disconnectWallet, connectWallet]);

  if (!isInitialized) {
    return null; // Or a loading spinner
  }

  return (
    <WalletContext.Provider
      value={{
        wallet,
        isConnected,
        connecting,
        connectWallet,
        disconnectWallet,
        switchNetwork,
        switchWallet,
        address,
        displayAddress,
        chainId,
        isAdmin,
        isWhitelisted
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};

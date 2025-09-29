"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NetworkSwitcher, networks } from "../elements/network-switcher";
import { CustomButton } from "../ui/custom-button";
import Navigation from "../icons/navigation";
import { LanguageSelector } from "../elements/language-selector";
import { useLanguage } from "@/contexts/language-context";
import { cn, shortenAddress } from "@/lib/utils";
import NavigationAlert from "../icons/navigation-alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@radix-ui/react-popover";
import RightArrow from "../icons/right-arrow";
import Switch from "../icons/switch";
import Disconnect from "../icons/disconnect";
import { useCallback, useEffect, useState } from "react";
import { NetworkMismatchModal } from "../elements/network-mismatch-modal";
import Image from "next/image";
import Base from "../../public/icons/base.png";
import Info from "../icons/info";
import { useWallet } from "../../contexts/wallet-context";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentChainId, setSelectedNetwork } from "@/redux/networkSlice";
import { RootState } from "@/redux/store";
import ETH from "../../public/logos/ethereum.png";
import { clearSelectedVault } from "@/redux/vaultSlice";
import { useQuoteContext } from "@/contexts/quote-context";
import { Menu, X } from "lucide-react";
import { fetchMintInvoices } from "@/server/invoice";
import { setInvoices, setLatestInvoice } from "@/redux/mintInvoicesSlice";
import { MintInvoice } from "@/types";
interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  rightbarOpen: boolean;
  setRightbarOpen: (open: boolean) => void;
  isVisible: boolean;
  showHowEarnWorks: boolean;
  setShowHowEarnWorks: (showHowEarnWorks: boolean) => void;
}

export function Header({
  sidebarOpen,
  setSidebarOpen,
  rightbarOpen,
  setRightbarOpen,
  isVisible,
  showHowEarnWorks,
  setShowHowEarnWorks,
}: HeaderProps) {
  const {
    wallet,
    isConnected,
    connecting,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    switchWallet,
  } = useWallet();

  const { t } = useLanguage();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentNetwork = searchParams.get("network");
  const router = useRouter();
  const dispatch = useDispatch();
  // const [selectedNetwork, setSelectedNetwork] = useState<string>("0x1");
  const { selectedNetwork, currentChainId } = useSelector(
    (state: RootState) => state.network
  );
  const [showModal, setShowModal] = useState(false);

  const selectedVault = useSelector(
    (state: RootState) => state.vault.selectedVault
  );

  const defaultNetwork =
    networks.find((n) => n.id === searchParams.get("network")) || networks[0];

  const { connect } = useQuoteContext();
  useEffect(() => {
    connect();
  }, []);

  // Initialize network if not set
  useEffect(() => {
    if (!selectedNetwork) {
      dispatch(setSelectedNetwork(defaultNetwork.chainId));
    }
  }, [defaultNetwork, selectedNetwork]);

  useEffect(() => {
    // Update the URL without reloading the page
    // const url = new URL(window.location.href);
    // if (selectedNetwork) {
    //   const network = networks.find((n) => n.chainId === selectedNetwork);
    //   if (network) {
    //     url.searchParams.set("network", network.id);
    //     router.replace(url.toString(), { scroll: false });
    //   }
    // }
  }, [selectedNetwork, router]);

  // Generate breadcrumb items
  const pathSegments = pathname.split("/").filter((segment) => segment);
  const shouldShowBreadcrumb = pathSegments.length > 1;

  const breadcrumbItems = pathSegments.map((segment, index) => {
    if (segment === "vault") {
      segment = "indexes";
    }
    const path =
      segment === "indexes"
        ? "/"
        : `../${pathSegments.slice(0, index + 1).join("/")}`;
    const _segment = t("common." + segment);
    return {
      name: segment.charAt(0).toUpperCase() + segment.slice(1),
      href: path,
    };
  });

  const [isIndexDetailPage] = useState<boolean>(
    pathSegments.length > 1 && pathSegments.includes("vault")
  );

  // Listen for wallet chain changes
  // useEffect(() => {
  //   if (!wallet || !wallet.provider) {
  //     dispatch(clearSelectedVault())
  //     return;
  //   }
  // }, [wallet, dispatch])
  useEffect(() => {
    const now = new Date();
    const DEFAULT_FROM = new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0));

    // Default “to”: today @ 00:00:00 UTC
    const DEFAULT_TO = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
        0
      )
    );
    if (wallet && wallet.chains.length > 0) {
      const chainId = wallet.chains[0].id;
      dispatch(setCurrentChainId(chainId));

      if (chainId !== selectedNetwork && chainId !== "0x2105") {
        setShowModal(true);
      } else {
        setShowModal(false);
      }

      const from = DEFAULT_FROM;
      const to = DEFAULT_TO;
      const address = wallet.accounts?.[0]?.address;
      let cancelled = false;
      if (address) {
        (async () => {
          try {
            const invoicesData = await fetchMintInvoices(from, to);

            const filtered = invoicesData.filter(
              (inv) => inv.address.toLowerCase() === address.toLowerCase()
            );

            const augmented = filtered.map((inv) => ({
              ...inv,
              status: "completed" as const,
            }));

            const sorted = augmented.sort(
              (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime()
            );
            const latest = sorted.length > 0 ? sorted[0] : null;
            if (!cancelled) {
              dispatch(setLatestInvoice(latest as MintInvoice )); 
            }
          } catch (err) {
            console.error("Failed to load invoices:", err);
          }
        })();
      }
    } else {
      dispatch(setCurrentChainId(null));
      setShowModal(false);
    }
  }, [selectedNetwork, wallet, dispatch]);

  const handleNetworkSwitch = useCallback(
    async (chainId: string) => {
      if (!isConnected) return;

      dispatch(setSelectedNetwork(chainId));

      if (currentChainId !== chainId) {
        setShowModal(true);
      } else {
        setShowModal(false);
      }
    },
    [isConnected, currentChainId, dispatch]
  );

  const handleSwitchWalletNetwork = async () => {
    await switchNetwork(selectedNetwork);
    setShowModal(false);
  };

  const disconnect = async () => {
    await disconnectWallet();
    await dispatch(clearSelectedVault());
  };

  const _switchWallet = useCallback(async () => {
    await disconnect();
    setTimeout(() => connectWallet(), 1000);
  }, [isConnected, connectWallet, disconnect]);

  return (
    <>
      <div className="flex flex-col gap-0">
        <header className="flex h-[55px] md:h-[50px] pt-0 shrink-0 items-center border-b border-transparent bg-background px-[11px] lg:px-[40px]">
          {!showHowEarnWorks && (
            <div
              className="lg:hidden inline-flex items-center rounded-full
               bg-background hover:bg-background text-primary border-0"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-controls="app-sidebar"
              aria-expanded={sidebarOpen}
            >
              {sidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}

              {!sidebarOpen && (
                <span className="relative -ml-2 -mt-2 h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-600"></span>
                  <span className="absolute -t-2 inline-flex h-2.5 w-2.5 rounded-full bg-secondary" />
                </span>
              )}
            </div>
          )}

          {shouldShowBreadcrumb && (
            <nav className="text-sm text-secondary hidden md:flex">
              <ol className="flex items-center space-x-2">
                {breadcrumbItems.map((item, index) => (
                  <li key={item.href} className="flex items-center">
                    {index === breadcrumbItems.length - 1 ? (
                      <span className="text-muted text-semibold text-[13px]">
                        {item.name}
                      </span>
                    ) : (
                      <Link
                        href={item.href}
                        className="text-muted text-semibold hover:text-primary text-[13px]"
                      >
                        {item.name}
                        <span className="mx-2 text-muted text-semibold text-[13px]">
                          {" "}
                          /{" "}
                        </span>
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}

          <div className="ml-auto flex items-center gap-2">
            <LanguageSelector />
            <NetworkSwitcher
              handleNetworkSwitch={handleNetworkSwitch}
              selectedNetwork={
                networks.find((n) => n.chainId === selectedNetwork) || null
              }
              setSelectedNetwork={(newNetwork) =>
                setSelectedNetwork(newNetwork.chainId)
              }
            />

            {isConnected && wallet ? (
              <Popover>
                <PopoverTrigger asChild>
                  <CustomButton className="flex items-center gap-1 bg-transparent lg:bg-foreground text-[11px] rounded-[3px] cursor-pointer hover:bg-accent">
                    <div className="w-[17px] h-[17px] rounded-full bg-gradient-to-br from-[#A5FECA] via-[#3EDCEB] via-[#2594FF] to-[#53F]"></div>
                    <span className="text-secondary hidden lg:flex">
                      {shortenAddress(wallet.accounts[0].address)}
                    </span>
                    {currentChainId !== selectedNetwork &&
                      currentChainId !== "0x2105" && (
                        <Info color="#FFB13De6" className="h-4 w-4" />
                      )}
                  </CustomButton>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[300px] p-0 bg-ring text-card flex flex-col shadow-[0px_1px_20px_0px_rgba(0,0,0,0.04),0px_12px_16px_0px_rgba(6,9,11,0.05),0px_6px_12px_0px_rgba(0,0,0,0.07)] z-100"
                  align="end"
                  sideOffset={5}
                >
                  <Link
                    href={
                      `https://etherscan.${
                        currentNetwork === "mainnet" ? "org" : "io"
                      }/address/` + wallet.accounts[0].address
                    }
                    target="_blank"
                    className="flex gap-2 px-[8px] py-[12px] items-center h-[48px] border-b-[1px] border-accent cursor-pointer hover:bg-accent"
                  >
                    <div className="w-[17px] h-[17px] rounded-full bg-gradient-to-br from-[#A5FECA] via-[#3EDCEB] via-[#2594FF] to-[#53F]"></div>
                    <span className="text-secondary text-[14px] underline">
                      {shortenAddress(wallet.accounts[0].address)}
                    </span>
                    <RightArrow
                      className="w-4 h-4 rotate-135"
                      width="12px"
                      height="12px"
                    />
                  </Link>
                  {currentChainId !== selectedNetwork &&
                  currentChainId !== "0x2105" ? (
                    <div
                      className="flex gap-2 p-[6px] items-center h-[36px] border-b-[1px] border-accent cursor-pointer hover:bg-accent"
                      onClick={handleSwitchWalletNetwork}
                    >
                      {currentChainId !== "0x1" ? (
                        <Image
                          src={ETH}
                          alt={"Ethereum"}
                          width={17}
                          height={17}
                        />
                      ) : (
                        <Image src={Base} alt={"Base"} width={17} height={17} />
                      )}
                      <span className="text-secondary text-[14px]">
                        {t("common.switchWalletNetwork")}
                      </span>
                      <Info color="#FFB13De6" className="h-4 w-4" />
                    </div>
                  ) : (
                    <></>
                  )}
                  <div
                    className="flex gap-2 p-[6px] items-center h-[36px] border-b-[1px] border-accent cursor-pointer hover:bg-accent"
                    onClick={_switchWallet}
                  >
                    <Switch className="w-4 h-4 text-primary" />
                    <span className="text-secondary text-[14px]">
                      {t("common.switchWallet")}
                    </span>
                  </div>
                  <div
                    className="flex gap-2 p-[6px] items-center h-[36px] cursor-pointer hover:bg-accent"
                    onClick={disconnect}
                  >
                    <Disconnect className="w-4 h-4 text-primary" />
                    <span className="text-secondary text-[14px]">
                      {t("common.disconnectWallet")}
                    </span>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <CustomButton
                onClick={connectWallet}
                disabled={connecting}
                className="bg-[#2470ff] hover:bg-blue-700 text-[11px] rounded-[3px] cursor-pointer"
              >
                {connecting
                  ? t("common.connecting")
                  : t("common.connectWallet")}
              </CustomButton>
            )}

            {selectedVault.length > 0 ? (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setRightbarOpen(!rightbarOpen)}
              >
                <NavigationAlert className="h-7 w-7 text-primary" />
                <span className="sr-only">Toggle Right</span>
              </Button>
            ) : (
              <></>
            )}

            <NetworkMismatchModal
              isOpen={showModal}
              onClose={() => setShowModal(false)}
              walletChainId={currentChainId || ""}
              desiredNetwork={selectedNetwork}
              onSwitch={handleSwitchWalletNetwork}
            />
          </div>
        </header>
      </div>
    </>
  );
}

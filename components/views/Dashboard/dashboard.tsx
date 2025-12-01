"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layouts/sidebar";
import { Header } from "@/components/layouts/header";
import { EarnContent } from "./earn-content";
import { SupplyPanel } from "@/components/elements/supply-panel";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { addSelectedVault, clearSelectedVault } from "@/redux/vaultSlice";
import { usePathname } from "next/navigation";
import { useWallet } from "@/contexts/wallet-context";
interface DashboardProps {
  children?: React.ReactNode;
  _sidebarOpen?: boolean;
}
export default function Dashboard({
  children,
  _sidebarOpen = false,
}: DashboardProps) {
  const { wallet } = useWallet();
  const pathname = usePathname();
  const isVaultPage = pathname?.startsWith("/vault/");
  const [sidebarOpen, setSidebarOpen] = useState(_sidebarOpen);
  const [showHowEarnWorks, setShowHowEarnWorks] = useState(false);
  useEffect(() => {
    setSidebarOpen(_sidebarOpen);
  }, [_sidebarOpen]);
  const [rightbarOpen, setRightbarOpen] = useState(false);
  const selectedVault = useSelector(
    (state: RootState) => state.vault.selectedVault
  );

  const storedIndexes = useSelector((state: RootState) => state.index.indices);

  const dispatch = useDispatch();

  // Function to handle supply button click
  const handleSupplyClick = (name: string, ticker: string) => {
    dispatch(addSelectedVault({ name, ticker }));
    // setRightbarOpen(true)
  };

  // Function to close the supply panel
  const handleCloseSupplyPanel = () => {
    dispatch(clearSelectedVault());
  };

  useEffect(() => {
    if (selectedVault.length > 0) {
      setRightbarOpen(true);
    } else {
      setRightbarOpen(false);
    }
  }, [selectedVault]);
  const [isVisible, setIsVisible] = useState(false);
  const [prevScrollPos, setPrevScrollPos] = useState(0);

  useEffect(() => {
    const mainElement = document.querySelector("main"); // Get your scrollable element
    if (!mainElement) return;

    const handleScroll = () => {
      const currentScrollPos = mainElement.scrollTop;
      setIsVisible(currentScrollPos > 30);

      setPrevScrollPos(currentScrollPos);
    };

    mainElement.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      mainElement.removeEventListener("scroll", handleScroll);
    };
  }, [prevScrollPos]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          isVisible={isVisible}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          rightbarOpen={rightbarOpen}
          setRightbarOpen={setRightbarOpen}
          showHowEarnWorks={showHowEarnWorks}
          setShowHowEarnWorks={setShowHowEarnWorks}
        />
        <div className="flex flex-row h-full">
          <main className="flex-1 overflow-y-auto px-[10px] py-20 md:px-10 md:py-20 custom-3xl-padding bg-background">
            {children || (
              <EarnContent
                onSupplyClick={handleSupplyClick}
                showHowEarnWorks={showHowEarnWorks}
                setShowHowEarnWorks={setShowHowEarnWorks}
              />
            )}
          </main>
          {selectedVault.length > 0 && ((!wallet && isVaultPage) || wallet) && (
            <SupplyPanel
              vaultIds={selectedVault}
              onClose={handleCloseSupplyPanel}
              open={rightbarOpen}
              setOpen={setRightbarOpen}
              vaults={storedIndexes.filter((vault) =>
                selectedVault.map((v) => v.name).includes(vault.name)
              )}
            />
          )}
        </div>
        {/* <div className={`
          fixed top-0 left-0 right-0
          transition-all duration-300 ease-in-out
          ${isScrolled ? 'translate-y-0' : 'translate-y-full'}
        `}>
          <Footer />
        </div> */}
      </div>
    </div>
  );
}

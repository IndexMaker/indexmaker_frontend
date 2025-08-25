"use client";

import type React from "react";
import { useMediaQuery } from "react-responsive";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle,
  Copy,
  Eye,
  EyeOff,
  FileText,
  HelpCircle,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEffect, useRef, useState } from "react";
import Dashboard from "../Dashboard/dashboard";
import { toast } from "sonner";
import {
  Activity,
  SupplyPosition,
  VaultAsset,
  mockup_vaults,
} from "@/lib/data";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@radix-ui/react-popover";
import { Input } from "@/components/ui/input";
import { CustomButton } from "@/components/ui/custom-button";
import { VaultReAllocation } from "@/components/elements/vault-reallocation";
import { VaultSupply } from "@/components/elements/vault-supplyposition";
import { TransactionTypeSelector } from "@/components/elements/transaction-types";
import { VaultActivity } from "@/components/elements/vault-activity";
import Image from "next/image";
import { useLanguage } from "@/contexts/language-context";
import { VaultLiteratureSection } from "./vault-literature";
import { cn, getERC20AddressForIndex, shortenAddress } from "@/lib/utils";
import { PerformanceChart } from "@/components/elements/performance-chart";
import { TimePeriodSelector } from "@/components/elements/time-period";
import { IndexListEntry } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchBtcHistoricalData,
  fetchDepositTransactionData,
  fetchEthHistoricalData,
  fetchHistoricalData,
  fetchUserTransactionData,
  fetchVaultAssets,
} from "@/api/indices";
import IndexMaker from "@/components/icons/indexmaker";
import { VaultAssets } from "@/components/elements/vault-assets";
import FundDetail from "./fund-details";
import FundManager from "./fund-manager";
import FundOverview from "./fund-overview";
import PortfolioManagerInsights from "./portfolio-manager-insignts";
import Risk from "./fund-risk";
import FundRiskReturn from "./fund-risk-return";
import { AdditionalMenu } from "@/components/layouts/additionalMenu";
import IndexBalance from "./index-balance";
import { getBalance } from "viem/actions";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { useWallet } from "@/contexts/wallet-context";
import { addSelectedVault } from "@/redux/vaultSlice";
import USDC from "../../../public/logos/usd-coin.png";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordian";
import { getIndexData } from "@/lib/IndexMockupData";
import SymmioIndices from "@/components/icons/symmioIndices";
import { useQuoteContext } from "@/contexts/quote-context";
import EquityStyleMap from "./fund-style-map";
interface VaultDetailPageProps {
  index: IndexListEntry | null;
}
interface ChartDataPoint {
  name: string;
  date: string;
  value: number;
  price?: number;
}
const USDC_ADDRESS_IN_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export interface IndexData {
  name: string;
  indexId: number;
  rawData: any[];
  chartData: ChartDataPoint[];
  formattedTransactions: any[];
}
export function VaultDetailPage({ index }: VaultDetailPageProps) {
  const { wallet } = useWallet();
  const { indexPrices } = useQuoteContext();
  const { t } = useLanguage();
  const vault = mockup_vaults[0];
  const documents = getIndexData(index?.ticker || "SY100")?.documents || [];
  const isMobile = useMediaQuery({ maxWidth: 1540 });
  const isSmallWindow = useMediaQuery({ maxWidth: 1024 });
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [historicalLoading, setHistoricalLoading] = useState<boolean>(false);
  const [indexAssetLoading, setAssetLoading] = useState<boolean>(false);
  const [depositTransactionLoading, setDepositTransactionLoading] =
    useState<boolean>(false);
  const [userActivityLoading, setUserActivityLoading] =
    useState<boolean>(false);
  const [indexData, setIndexData] = useState<IndexData | null>(null);
  const [btcData, setBtcData] = useState<any[]>([]);
  const [ethData, setEthData] = useState<any[]>([]);
  const [selectedIndexId, setSelectedIndexId] = useState<number | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [showETHComparison, setShowETHComparison] = useState(false);
  const [indexAssets, setIndexAssets] = useState<VaultAsset[]>([]);
  const [supplyPositions, setSupplyPositions] = useState<SupplyPosition[]>([]);
  const [userActivities, setUserActivities] = useState<Activity[]>([]);

  // const storedWallet = useSelector((state: RootState) => state.wallet.wallet);
  const dispatch = useDispatch();
  const handleSupplyClick = (name: string, ticker: string) => {
    dispatch(addSelectedVault({ name, ticker }));
  };
  const selectedVault = useSelector(
    (state: RootState) => state.vault.selectedVault
  );

  const [indexDescription, setIndexDescription] = useState("");

  useEffect(() => {
    const fetchData = async (indexId: number) => {
      setHistoricalLoading(true);
      try {
        const response = await fetchHistoricalData(indexId);
        const data = response;
        data && setIndexData(data);
      } catch (error) {
        console.error("Error fetching performance data:", error);
      } finally {
        setHistoricalLoading(false);
      }
    };

    index?.indexId && fetchData(index.indexId);

    const _fetchBtcHistoricalData = async () => {
      try {
        const response = await fetchBtcHistoricalData();
        const data = response;
        setBtcData(data);
      } catch (error) {
        console.error("Error fetching btc data:", error);
      } finally {
      }
    };
    index?.indexId && _fetchBtcHistoricalData();

    const _fetchEthHistoricalData = async () => {
      try {
        const response = await fetchEthHistoricalData();
        const data = response;
        setEthData(data);
      } catch (error) {
        console.error("Error fetching eth data:", error);
      } finally {
      }
    };
    index?.indexId && _fetchEthHistoricalData();

    const _fetchVaultAssets = async (_indexId: number) => {
      setAssetLoading(true);
      try {
        const response = await fetchVaultAssets(_indexId);
        const data = response;
        setIndexAssets(data);
      } catch (error) {
        console.error("Error Index asset data:", error);
      } finally {
        setAssetLoading(false);
      }
    };
    index?.indexId && _fetchVaultAssets(index?.indexId);

    const _fetchDepositTransaction = async (_indexId: number) => {
      setDepositTransactionLoading(true);
      try {
        const response = await fetchDepositTransactionData(_indexId, "0x0000");
        const data = response;
        setSupplyPositions(data);
      } catch (error) {
        console.error("Error deposit transaction data:", error);
      } finally {
        setDepositTransactionLoading(false);
      }
    };
    index?.indexId && _fetchDepositTransaction(index?.indexId);

    const _fetchUserTransaction = async (_indexId: number) => {
      setUserActivityLoading(true);
      try {
        const response = await fetchUserTransactionData(_indexId);
        const data = response;
        setUserActivities(data);
      } catch (error) {
        console.error("Error user transaction data:", error);
      } finally {
        setUserActivityLoading(false);
      }
    };
    index?.indexId && _fetchUserTransaction(index?.indexId);

    index &&
      index.ticker &&
      setIndexDescription(getIndexData(index.ticker).description);

    index &&
      dispatch(addSelectedVault({ name: index.name, ticker: index.ticker }));
  }, [index, dispatch]);

  const containerRef = useRef<HTMLDivElement>(null);
  const getCutoffDate = () => {
    const now = new Date();
    let cutoffDate = new Date(0); // All time

    switch (selectedPeriod) {
      case "ytd":
        cutoffDate = new Date(now.getFullYear(), 0, 1);
        break;
      case "6m":
        cutoffDate = new Date(now.setMonth(now.getMonth() - 6));
        break;
      case "1y":
        cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      case "3y":
        cutoffDate = new Date(now.setFullYear(now.getFullYear() - 3));
        break;
      case "5y":
        cutoffDate = new Date(now.setFullYear(now.getFullYear() - 5));
        break;
      case "10y":
        cutoffDate = new Date(now.setFullYear(now.getFullYear() - 10));
        break;
    }
    return cutoffDate;
  };

  const filteredChartData = () => {
    return indexData && indexData.chartData
      ? indexData.chartData.filter(
          (item) => new Date(item.date) >= getCutoffDate()
        )
      : [];
  };

  const filteredBtcData = () => {
    return btcData
      ? btcData.filter((item) => new Date(item.date) >= getCutoffDate())
      : [];
  };

  const filteredEthData = () => {
    return ethData
      ? ethData.filter((item) => new Date(item.date) >= getCutoffDate())
      : [];
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast(type + " copied to clipboard.", {
      position: "top-right",
      icon: <CheckCircle />,
    });
  };

  // Default visible columns
  const [visibleColumns, setVisibleColumns] = useState([
    // { id: "id", name: "Id", visible: true },
    { id: "ticker", name: "Ticker", visible: true },
    { id: "assetname", name: "Asset Name", visible: true },
    { id: "sector", name: "Sector", visible: true },
    { id: "market_cap", name: "Market Cap", visible: true },
    { id: "weights", name: "Weight", visible: true },
  ]);

  const [visibleReAllocationColumns, setVisibleReAllocationColumns] = useState([
    { id: "timestamp", name: "Date & Time", visible: true },
    { id: "market", name: "Market", visible: true },
  ]);

  const [visibleTransactionColumns, setVisibleTransactionColumns] = useState([
    { id: "dateTime", name: "Date & Time", visible: true },
    { id: "wallet", name: "Wallet", visible: true },
    { id: "hash", name: "Hash", visible: true },
    { id: "transactionType", name: "Transaction Types", visible: true },
    { id: "amount", name: "Amount", visible: true },
  ]);

  const [searchQuery, setSearchQuery] = useState("");

  const toggleColumnVisibility = (columnId: string, visible: boolean) => {
    setVisibleColumns(
      visibleColumns.map((column) =>
        column.id === columnId ? { ...column, visible } : column
      )
    );
  };

  const toggleReAllocationColumnVisibility = (
    columnId: string,
    visible: boolean
  ) => {
    setVisibleReAllocationColumns(
      visibleReAllocationColumns.map((column) =>
        column.id === columnId ? { ...column, visible } : column
      )
    );
  };

  const toggleActivityColumnVisibility = (
    columnId: string,
    visible: boolean
  ) => {
    setVisibleTransactionColumns(
      visibleTransactionColumns.map((column) =>
        column.id === columnId ? { ...column, visible } : column
      )
    );
  };

  const filteredColumns = visibleColumns.filter((column) =>
    column.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredReallocationColumns = visibleReAllocationColumns.filter(
    (column) => column.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredActivityColumns = visibleTransactionColumns.filter((column) =>
    column.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dashboard>
      {index ? (
        <>
          {/* <Footer
            className={`
          transition-all duration-300 ease-in-out
          ${isScrolled ? "top-0" : "hidden"}
        `}
          /> */}
          <div
            className="xl:pl-[86px] xl:pr-[86px] lg:mt-9 2xl:-mx-[40px]"
            ref={containerRef}
          >
            {/* Vault Header */}
            <div
              className={cn(
                "flex gap-16 ",
                isMobile ? "flex-col" : "flex-row "
              )}
            >
              <div
                className={cn(
                  "flex flex-col xl:flex-row items-center gap-8 flex-nowrap mt-9 lg:mt-0 w-full overflow-ellipsis",
                  isMobile ? "w-full" : "w-[50%]"
                )}
              >
                {/* <div
                  className={cn(
                    "h-[104px] min-w-[104px] rounded-full overflow-hidden bg-foreground p-[12px] flex items-center justify-center",
                    isMobile ? "" : ""
                  )}
                >
                  {vault.icon ? (
                    <IndexMaker className="w-[80px] h-[80px] text-muted" />
                  ) : (
                    <div className="text-4xl">
                      {vault.token.symbol.charAt(0) || ""}
                    </div>
                  )}
                  <div className="text-4xl text-primary">
                    {vault.token.symbol.charAt(0) || ""}
                  </div>
                </div> */}
                <div className="flex gap-6 flex-col">
                  <h1 className="text-[38px] min-w-[50%] h-[44px] text-primary text-center xl:text-left">
                    {index.ticker}
                  </h1>
                  <div className="flex items-center gap-4 mt-2 justify-center xl:justify-start">
                    <div className="flex items-center gap-2">
                      <div className="relative h-[17px] w-[17px] rounded-full overflow-hidden bg-transparent flex items-center justify-center">
                        <Image
                          src={USDC}
                          alt={vault.token.symbol}
                          width={17}
                          height={17}
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <span className="text-secondary text-[20px]">
                        {"USDC"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative rounded-full overflow-hidden bg-transparent flex items-center justify-center">
                        <SymmioIndices className="w-[120px] h-[28px] text-muted" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Vault Description */}
              <div className="bg-foreground rounded-sm p-5  flex items-center w-full relative">
                <div className="flex flex-col gap-8 w-full absolute right-3 mt-[-40]">
                  {/* Top Section with Properties & PDF/SVG Icon */}
                  <div className="flex justify-between items-start w-full">
                    {/* Left side (empty or other content) */}
                    <div></div>

                    {/* Properties Text */}
                    <div className="flex flex-row items-end gap-4 text-secondary  text-[11px]">
                      <Link href={"#"}>
                        <div className="flex flex-col items-center justify-center hover:text-[#2470ff]">
                          <FileText className="w-4" />
                          <Link href={`#`}>KID</Link>
                        </div>
                      </Link>
                      <Link
                        target="_blank"
                        href={`${
                          process.env.NEXT_PUBLIC_BACKEND_API
                        }/pdf-generation/pdfview/factsheet/${
                          index.ticker || "SY100"
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center text-[11px] hover:text-[#2470ff]">
                          <FileText className="w-4" />
                          <Link
                            target="_blank"
                            href={`${
                              process.env.NEXT_PUBLIC_BACKEND_API
                            }/pdf-generation/pdfview/factsheet/${
                              index.ticker || "SY100"
                            }`}
                          >
                            Factsheet
                          </Link>
                        </div>
                      </Link>
                      <Link
                        href={`${
                          process.env.NEXT_PUBLIC_BACKEND_API
                        }/pdf-generation/pdfview/methodology/${
                          index.ticker || "SY100"
                        }`}
                        target="_blank"
                      >
                        <div className="flex flex-col items-center justify-center text-[11px] hover:text-[#2470ff]">
                          <FileText className="w-4" />
                          <Link
                            target="_blank"
                            href={`${
                              process.env.NEXT_PUBLIC_BACKEND_API
                            }/pdf-generation/pdfview/methodology/${
                              index.ticker || "SY100"
                            }`}
                          >
                            Methodology
                          </Link>
                        </div>
                      </Link>
                    </div>
                  </div>
                </div>
                <p className="text-secondary text-[13px] pt-10 leading-[16px]">
                  {indexDescription || ""}
                </p>
              </div>
            </div>

            {isSmallWindow ? (
              <Accordion
                type="multiple"
                className="w-full space-y-4 pt-6"
                defaultValue={["Balance"]}
              >
                {/* Index Balance */}
                <AccordionItem value="Balance">
                  <AccordionTrigger className="text-left lg:text-[20px] text-[16px] text-primary font-custom">
                    {t("common.Portfolios")}
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <IndexBalance
                      indexBalance={wallet ? "0" : "-"}
                      onSupplyClick={handleSupplyClick}
                      index={index}
                      supplyPositions={supplyPositions}
                      className={""}
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Index Info */}
                <AccordionItem value="Info">
                  <AccordionTrigger className="text-left lg:text-[20px] text-[16px] text-primary font-custom">
                    {t("common.indexInfo")}
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <div className="grid grid-cols-1 md:gird md:grid-cols-2 rounded-[8px] bg-foreground px-[10px] md:px-5 md:[&>:nth-child(2n+1)]:pr-10 md:[&>:nth-child(2n)]:pl-10">
                      <InfoMobileCard title={t("table.curator")}>
                        <div className="flex items-center flex-row">
                          <CuratorInfo curator={index.curator} />
                        </div>
                      </InfoMobileCard>

                      <InfoMobileCard title={t("table.token")}>
                        <TokenInfo token={vault.token} />
                      </InfoMobileCard>

                      <InfoMobileCard title={t("table.totalSupply")}>
                        <TokenValue
                          token={vault.token}
                          value={index.totalSupply}
                        />
                      </InfoMobileCard>

                      <InfoMobileCard title={t("table.oneYearPerformance")}>
                        <div className="text-sm text-secondary">
                          {index.performance?.oneYearReturn.toFixed(2) || "0"} %
                        </div>
                      </InfoMobileCard>

                      <InfoMobileCard title={t("table.managementFee")}>
                        <div className="text-sm text-secondary">
                          {index.managementFee || ""}%
                        </div>
                      </InfoMobileCard>

                      <InfoMobileCard title={t("table.vaultAddress")}>
                        <AddressInfo
                          address={getERC20AddressForIndex(index.indexId) || ""}
                        />
                      </InfoMobileCard>

                      <InfoMobileCard title={t("table.liquidity")}>
                        <TokenValue
                          token={vault.token}
                          value={index.totalSupply}
                        />
                      </InfoMobileCard>

                      <InfoMobileCard title={t("table.guardianAddress")}>
                        <AddressInfo address={vault.guardianAddress || ""} />
                      </InfoMobileCard>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Index Overview */}
                <AccordionItem value="Overview">
                  <AccordionTrigger className="text-left lg:text-[20px] text-[16px] text-primary font-custom">
                    {t("common.indexOverview")}
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <div
                      className={cn(
                        `flex gap-6  `,
                        isSmallWindow ? "flex-col" : "flex-wrap flex-responsive"
                      )}
                    >
                      <FundDetail indexId={index.ticker} />
                      <FundOverview indexId={index.ticker} />
                      <EquityStyleMap indexId={index.ticker} />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Price Chart */}
                <AccordionItem value="Chart">
                  <AccordionTrigger className="text-left lg:text-[20px] text-[16px] text-primary font-custom">
                    {t("common.indexPerformance")}
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <div
                      className={cn(
                        `flex gap-6  `,
                        isSmallWindow ? "flex-col" : "flex-wrap flex-responsive"
                      )}
                    >
                      <TimePeriodSelector
                        selectedPeriod={selectedPeriod}
                        onPeriodChange={setSelectedPeriod}
                        showComparison={showComparison}
                        showETHComparison={showETHComparison}
                        setShowComparison={setShowComparison}
                        setShowETHComparison={setShowETHComparison}
                      />

                      <div
                        className={cn(
                          "bg-background rounded-lg shadow",
                          isSmallWindow ? "" : "p-4"
                        )}
                      >
                        <PerformanceChart
                          isLoading={historicalLoading}
                          data={filteredChartData()}
                          indexId={index.indexId}
                          btcData={filteredBtcData()}
                          ticker={index.ticker || ""}
                          ethData={filteredEthData()}
                          showComparison={showComparison}
                          showETHComparison={showETHComparison}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Vault Literature */}
                <AccordionItem value="Literature">
                  <AccordionTrigger className="text-left lg:text-[20px] text-[16px] text-primary font-custom">
                    {t("common.vaultInfo")}
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <VaultLiteratureSection
                      literature={documents}
                      rebalanceData={indexData?.rawData ?? []}
                      indexId={index.indexId}
                      indexName={index.name}
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Vault Assets */}
                <AccordionItem value="Assets">
                  <AccordionTrigger className="text-left lg:text-[20px] text-[16px] text-primary font-custom">
                    {t("common.vaultAssets")}
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <VaultAssets
                      isLoading={indexAssetLoading}
                      assets={indexAssets}
                      visibleColumns={visibleColumns}
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Vault Reallocation */}
                <AccordionItem value="Reallocation">
                  <AccordionTrigger className="text-left lg:text-[20px] text-[16px] text-primary font-custom">
                    {t("common.vaultReallocations")}
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    {historicalLoading ? (
                      <div className="space-y-3 animate-pulse py-2">
                        <div className="h-10 bg-foreground rounded w-full mx-auto"></div>
                      </div>
                    ) : (
                      <VaultReAllocation
                        reallocations={indexData?.formattedTransactions || []}
                        visibleColumns={visibleReAllocationColumns}
                      />
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* Vault Supply */}
                <AccordionItem value="Supply">
                  <AccordionTrigger className="text-left lg:text-[20px] text-[16px] text-primary font-custom">
                    {t("common.supplyPositions")}
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    {depositTransactionLoading ? (
                      <div className="space-y-3 animate-pulse py-2">
                        <div className="h-10 bg-foreground rounded w-full mx-auto"></div>
                      </div>
                    ) : (
                      <VaultSupply supplyPositions={supplyPositions} />
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* User Activities */}
                <AccordionItem value="Activities">
                  <AccordionTrigger className="text-left lg:text-[20px] text-[16px] text-primary font-custom">
                    {t("common.userActivity")}
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    {userActivityLoading ? (
                      <div className="space-y-3 animate-pulse py-2">
                        <div className="h-10 bg-foreground rounded w-full mx-auto"></div>
                      </div>
                    ) : (
                      <VaultActivity
                        activities={userActivities}
                        visibleColumns={visibleTransactionColumns}
                      />
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ) : (
              <>
                {/* Index Balance */}
                <div className="pt-20">
                  <h2 className="lg:text-[20px] text-[16px] mb-4 text-primary font-custom">
                    {t("common.Portfolios")}
                  </h2>
                  <IndexBalance
                    indexBalance={wallet ? "0" : "-"}
                    onSupplyClick={handleSupplyClick}
                    index={index}
                    supplyPositions={supplyPositions}
                    className={""}
                  />
                </div>

                {/* Index Info */}
                <div className="pt-10">
                  <h2 className="lg:text-[20px] text-[16px] mb-4 text-primary font-custom">
                    {t("common.indexInfo")}
                  </h2>
                  {isMobile ? (
                    <div className="grid grid-cols-1 md:gird md:grid-cols-2 rounded-[8px] bg-foreground px-[10px] md:px-5 md:[&>:nth-child(2n+1)]:pr-10 md:[&>:nth-child(2n)]:pl-10">
                      <InfoMobileCard title={t("table.curator")}>
                        <div className="flex items-center flex-row">
                          <CuratorInfo curator={index.curator} />
                        </div>
                      </InfoMobileCard>

                      <InfoMobileCard title={t("table.token")}>
                        <TokenInfo token={vault.token} />
                      </InfoMobileCard>

                      <InfoMobileCard title={t("table.totalSupply")}>
                        <TokenValue
                          token={vault.token}
                          value={index.totalSupply}
                        />
                      </InfoMobileCard>

                      <InfoMobileCard title={t("table.oneYearPerformance")}>
                        <div className="text-sm text-secondary">
                          {index.performance?.oneYearReturn.toFixed(2) || "0"} %
                        </div>
                      </InfoMobileCard>

                      <InfoMobileCard title={t("table.managementFee")}>
                        <div className="text-sm text-secondary">
                          {index.managementFee || ""}%
                        </div>
                      </InfoMobileCard>

                      <InfoMobileCard title={t("table.vaultAddress")}>
                        <AddressInfo
                          address={getERC20AddressForIndex(index.indexId) || ""}
                        />
                      </InfoMobileCard>

                      <InfoMobileCard title={t("table.liquidity")}>
                        <TokenValue
                          token={vault.token}
                          value={index.totalSupply}
                        />
                      </InfoMobileCard>

                      <InfoMobileCard title={t("table.guardianAddress")}>
                        <AddressInfo address={vault.guardianAddress || ""} />
                      </InfoMobileCard>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-5">
                      {/* Curator */}
                      <InfoCard title={t("table.curator")}>
                        <div className="flex items-center gap-2">
                          {/* <div className="relative h-[17px] w-[17px] rounded-full overflow-hidden bg-transparent flex items-center justify-center">
                            <IndexMaker className="h-5 w-5 text-muted" />
                            <div className="text-4xl text-primary">
                              {vault.token.symbol.charAt(0) || ""}
                            </div>
                          </div> */}
                          <span className="text-secondary text-[14px] font-normal">
                            {"SYMMIO"}
                          </span>
                          {
                            <Link
                              href={`https://basescan.org/address/${index.curator}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ArrowUpRight className="h-4 w-4 text-secondary" />
                            </Link>
                          }
                        </div>
                      </InfoCard>

                      {/* Token */}
                      <InfoCard title={t("table.token")}>
                        <div className="flex items-center gap-2">
                          <div className="relative h-[17px] w-[17px] rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center">
                            <Image
                              src={USDC}
                              alt={"USDC"}
                              className="object-cover w-full h-full"
                              width={17}
                              height={17}
                            />
                          </div>
                          <span className="text-secondary text-[14px] font-normal">
                            {"USDC"}
                          </span>
                          {USDC_ADDRESS_IN_BASE && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 hover:bg-transparent hover:text-primary cursor-pointer"
                              onClick={() =>
                                copyToClipboard(
                                  USDC_ADDRESS_IN_BASE || "",
                                  "Token address"
                                )
                              }
                            >
                              <Copy className="h-3 w-3 text-secondary hover:text-primary" />
                            </Button>
                          )}
                        </div>
                      </InfoCard>

                      {/* Total Supply */}
                      <InfoCard title={t("table.totalSupply")}>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <div className="relative h-[17px] w-[17px] rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center">
                              <Image
                                src={USDC}
                                alt={"USDC"}
                                className="object-cover w-full h-full"
                                width={17}
                                height={17}
                              />
                            </div>
                            <span className="text-secondary text-[14px] font-normal">
                              {index.totalSupply} USDC
                            </span>
                          </div>
                          <div className="text-[13px] text-secondary px-[2px] bg-accent">
                            {index.totalSupply}
                          </div>
                        </div>
                      </InfoCard>

                      {/* Instant APY */}
                      <InfoCard title={t("table.oneYearPerformance")}>
                        <div className="text-[14px] text-secondary font-normal">
                          {index.performance?.oneYearReturn.toFixed(2) || "0"} %
                        </div>
                      </InfoCard>

                      {/* Performance Fee */}
                      <InfoCard
                        title={t("table.managementFee")}
                        tooltip="The fee charged on earnings by the vault curator"
                      >
                        <div className="text-[14px] text-secondary font-normal">
                          {index.managementFee} %
                        </div>
                      </InfoCard>

                      {/* Vault Address */}
                      <InfoCard title={t("table.vaultAddress")}>
                        <div className="flex items-center gap-2">
                          <span className="text-secondary text-[14px] font-normal">
                            {shortenAddress(
                              getERC20AddressForIndex(index.indexId)
                            )}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 hover:bg-transparent hover:text-primary cursor-pointer"
                            onClick={() =>
                              copyToClipboard(
                                getERC20AddressForIndex(index.indexId),
                                "Index address"
                              )
                            }
                          >
                            <Copy className="h-3 w-3 text-secondary" />
                          </Button>
                        </div>
                      </InfoCard>

                      {/* liquidity */}
                      <InfoCard
                        title={t("table.liquidity")}
                        tooltip="The amount of tokens available for borrowing"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <div className="relative h-[17px] w-[17px] rounded-full overflow-hidden bg-foreground flex items-center justify-center">
                              <Image
                                src={USDC}
                                alt={"USDC"}
                                className="object-cover w-full h-full"
                                width={17}
                                height={17}
                              />
                            </div>
                            <span className="text-secondary text-[14px] font-normal">
                              {index.totalSupply} USDC
                            </span>
                          </div>
                          <div className="text-[13px] text-secondary px-[2px] bg-[#fafafa1a]">
                            {index.totalSupply}
                          </div>
                        </div>
                      </InfoCard>

                      {/* Guardian Address */}
                      <InfoCard
                        title={t("table.guardianAddress")}
                        tooltip="The blockchain address of the vault guardian"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-secondary text-[14px] font-normal">
                            {vault.guardianAddress}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 hover:bg-transparent hover:text-primary cursor-pointer"
                            onClick={() =>
                              copyToClipboard(
                                vault.guardianAddress,
                                "Guardian address"
                              )
                            }
                          >
                            <Copy className="h-3 w-3 text-secondary" />
                          </Button>
                        </div>
                      </InfoCard>
                    </div>
                  )}
                </div>

                {/* Index Overview */}
                <div className="pt-20">
                  <h2 className="lg:text-[20px] text-[16px] mb-4 text-primary font-custom">
                    {t("common.indexOverview")}
                  </h2>
                  <div
                    className={cn(
                      `flex gap-6  `,
                      isSmallWindow ? "flex-col" : "flex-wrap flex-responsive"
                    )}
                  >
                    <FundDetail indexId={index.ticker} />
                    {/* {!isSmallWindow && <FundManager indexId={index.ticker} />} */}
                    <FundOverview indexId={index.ticker} />
                    {/* {!isSmallWindow && (
                      <PortfolioManagerInsights indexId={index.ticker} />
                    )} */}
                    <EquityStyleMap indexId={index.ticker} />
                    {!isSmallWindow && <Risk indexId={index.ticker} />}
                  </div>
                </div>

                {/* Price Chart */}
                <div className="pt-20">
                  <h2 className="lg:text-[20px] text-[16px] mb-4 text-primary font-custom">
                    {t("common.indexPerformance")}
                  </h2>

                  <TimePeriodSelector
                    selectedPeriod={selectedPeriod}
                    onPeriodChange={setSelectedPeriod}
                    showComparison={showComparison}
                    showETHComparison={showETHComparison}
                    setShowComparison={setShowComparison}
                    setShowETHComparison={setShowETHComparison}
                  />

                  <div
                    className={cn(
                      "bg-background rounded-lg shadow",
                      isSmallWindow ? "" : "p-4"
                    )}
                  >
                    <PerformanceChart
                      isLoading={historicalLoading}
                      data={filteredChartData()}
                      indexId={index.indexId}
                      btcData={filteredBtcData()}
                      ticker={index.ticker || ""}
                      ethData={filteredEthData()}
                      showComparison={showComparison}
                      showETHComparison={showETHComparison}
                    />
                  </div>
                </div>

                {/* Vault Literature */}
                <div className="pt-20">
                  <h2 className="lg:text-[20px] text-[16px] mb-4 text-primary font-custom">
                    {t("common.vaultInfo")}
                  </h2>
                  <VaultLiteratureSection
                    literature={documents}
                    rebalanceData={indexData?.rawData ?? []}
                    indexId={index.indexId}
                    indexName={index.name}
                  />
                </div>

                <div className="pt-16">
                  <h1 className="lg:text-[20px] text-primary flex justify-between lg:items-center flex-row flex-wrap lg:flex-nowrap">
                    <div className="flex items-center gap-3">
                      <div>{t("common.vaultAssets")}</div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 p-0 hover:bg-transparent hover:text-primary text-[#ffffff80]"
                            >
                              <HelpCircle className="h-3 w-3 text-[#fffff80]" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">
                              {t("common.vaultAllocationBreakdownNote")}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <CustomButton
                          variant="secondary"
                          onClick={() => setSearchQuery("")}
                          className="border-none text-[11px] rounded-[4px] h-[26px] flex items-center"
                        >
                          {t("common.editProperties")}
                        </CustomButton>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[300px] z-50 p-0 bg-foreground text-card border-zinc-700"
                        align="end"
                        sideOffset={5}
                      >
                        <div className="p-0 border-b border-zinc-700">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="search"
                              placeholder={t("common.searchProperties")}
                              className="pl-8 py-[10px] !shadow-none bg-foreground border-zinc-700 text-card"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
                          {filteredColumns.map((column) => (
                            <div
                              key={column.id}
                              className="flex items-center justify-between py-2 px-3 h-[36px] hover:bg-accent rounded-sm"
                            >
                              <span className="text-[12px]">
                                {t("table." + column.id)}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  toggleColumnVisibility(
                                    column.id,
                                    !column.visible
                                  )
                                }
                                className="hover:bg-transparent hover:text-primary text-card h-8 w-8"
                              >
                                {visibleColumns.filter(
                                  (_column) => column.id === _column.id
                                )[0].visible ? (
                                  <Eye className="h-4 w-4 text-card" />
                                ) : (
                                  <EyeOff className="h-4 w-4 text-card" />
                                )}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </h1>
                  <VaultAssets
                    isLoading={indexAssetLoading}
                    assets={indexAssets}
                    visibleColumns={visibleColumns}
                  />
                </div>

                <div className="pt-16">
                  <h1 className="lg:text-[20px] text-primary flex justify-between lg:items-center flex-row flex-wrap lg:flex-nowrap">
                    <div className="flex items-center gap-3">
                      <div>{t("common.vaultReallocations")}</div>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <CustomButton
                          variant="secondary"
                          onClick={() => setSearchQuery("")}
                          className="border-none text-[11px] rounded-[4px] h-[26px] flex items-center"
                        >
                          {t("common.editProperties")}
                        </CustomButton>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[300px] z-50 p-0 bg-foreground text-card border-zinc-700"
                        align="end"
                        sideOffset={5}
                      >
                        <div className="p-0 border-b border-zinc-700">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="search"
                              placeholder={t("common.searchProperties")}
                              className="pl-8 py-[10px] !shadow-none bg-foreground border-zinc-700 text-primary"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
                          {filteredReallocationColumns.map((column) => (
                            <div
                              key={column.id}
                              className="flex items-center justify-between py-2 px-3 h-[36px] hover:bg-accent rounded-sm"
                            >
                              <span className="text-[12px]">
                                {t("table." + column.id)}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  toggleReAllocationColumnVisibility(
                                    column.id,
                                    !column.visible
                                  )
                                }
                                className="hover:bg-transparent hover:text-primary text-card h-8 w-8"
                              >
                                {visibleReAllocationColumns.filter(
                                  (_column) => column.id === _column.id
                                )[0].visible ? (
                                  <Eye className="h-4 w-4 text-card" />
                                ) : (
                                  <EyeOff className="h-4 w-4 text-card" />
                                )}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </h1>
                  {historicalLoading ? (
                    <div className="space-y-3 animate-pulse py-2">
                      <div className="h-10 bg-foreground rounded w-full mx-auto"></div>
                    </div>
                  ) : (
                    <VaultReAllocation
                      reallocations={indexData?.formattedTransactions || []}
                      visibleColumns={visibleReAllocationColumns}
                    />
                  )}
                </div>

                <div className="pt-16">
                  <h1 className="lg:text-[20px] text-primary flex justify-between lg:items-center flex-row flex-wrap lg:flex-nowrap">
                    <div className="flex items-center gap-3">
                      <div>{t("common.supplyPositions")}</div>
                    </div>
                  </h1>
                  {depositTransactionLoading ? (
                    <div className="space-y-3 animate-pulse py-2">
                      <div className="h-10 bg-foreground rounded w-full mx-auto"></div>
                    </div>
                  ) : (
                    <VaultSupply supplyPositions={supplyPositions} />
                  )}
                </div>

                <div className="pt-16">
                  <h1 className="lg:text-[20px] text-primary flex justify-between lg:items-center flex-row flex-wrap lg:flex-nowrap">
                    <div className="flex items-center gap-3">
                      <div>{t("common.userActivity")}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <TransactionTypeSelector />
                      <Popover>
                        <PopoverTrigger asChild>
                          <CustomButton
                            variant="secondary"
                            onClick={() => setSearchQuery("")}
                            className="border-none text-[11px] rounded-[4px] h-[26px] flex items-center"
                          >
                            {t("common.editProperties")}
                          </CustomButton>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[300px] z-50 p-0 bg-foreground border-zinc-700 text-primary"
                          align="end"
                          sideOffset={5}
                        >
                          <div className="p-0 border-b border-zinc-700">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="search"
                                placeholder={t("common.searchProperties")}
                                className="pl-8 py-[10px] !shadow-none bg-foreground border-zinc-700 text-primary"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="max-h-[400px] overflow-y-auto">
                            {filteredActivityColumns.map((column) => (
                              <div
                                key={column.id}
                                className="flex items-center justify-between py-2 px-3 h-[36px] hover:bg-accent rounded-sm"
                              >
                                <span className="text-[12px]">
                                  {t("table." + column.id)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    toggleActivityColumnVisibility(
                                      column.id,
                                      !column.visible
                                    )
                                  }
                                  className="hover:bg-transparent hover:text-primary text-card h-8 w-8"
                                >
                                  {visibleTransactionColumns.filter(
                                    (_column) => column.id === _column.id
                                  )[0].visible ? (
                                    <Eye className="h-4 w-4 text-card" />
                                  ) : (
                                    <EyeOff className="h-4 w-4 text-card" />
                                  )}
                                </Button>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </h1>
                  {userActivityLoading ? (
                    <div className="space-y-3 animate-pulse py-2">
                      <div className="h-10 bg-foreground rounded w-full mx-auto"></div>
                    </div>
                  ) : (
                    <VaultActivity
                      activities={userActivities}
                      visibleColumns={visibleTransactionColumns}
                    />
                  )}
                </div>
              </>
            )}
            {/* TOS */}
            <div className="pt-16">
              <div className="grid grid-cols-1">
                <div className="col-span-1">
                  <h4 className="text-[13px] pb-2 pt-3 font-bold text-primary">
                    Before investing, consider the index' investment objectives,
                    risks, charges and expenses. Contact your investment
                    professional or visit indexmaker.global for a prospectus
                    containing this information. Read it carefully.
                  </h4>

                  <p className="text-[13px] mb-0 pb-4 text-secondary">
                    The index is described in a Key Information Document (KID),
                    or Key Investor Information Document (KIID) for investors,
                    and prospectus. The Funds KID, or KIID, must be made
                    available to potential subscribers prior to subscription.
                  </p>
                  <p className="text-[13px] mb-0 pb-4 text-secondary">
                    The Funds reference material (KIID, prospectus, annual and
                    semi-annual reports) can be obtained from IndexMaker on
                    request, or obtained via the indexmaker.global website.{" "}
                    <br></br>
                    For Professional Clients only. This website is addressed
                    only to those persons in the UK falling within one or more
                    of the following exemptions from the restrictions in Section
                    238 FSMA:<br></br>- Authorised firms under FSMA and certain
                    other investment professionals falling within article 14 of
                    the FSMA (Promotion of Collective Investment Schemes)
                    (Exemptions) Order 2001, as amended (the "CIS Order") and
                    their directors, officers and employees acting for such
                    entities in relation to investment.<br></br>- High value
                    entities falling within article 22 CIS Order and their
                    directors, officers and employees acting for such entities
                    in relation to investment;<br></br>- Other persons who are
                    in accordance with the Rules of the FCA prior to 1 November
                    2007 classified as Intermediate Customers or Market
                    Counterparties or on or thereafter classified as
                    Professional Clients or Eligible Counterparties.<br></br>
                    The distribution of this website's information to any person
                    in the UK not falling within one of the above categories is
                    not permitted by IndexMkaer Limited and may contravene FSMA.
                    No person in the UK falling outside those categories should
                    rely or act on it for any purposes whatsoever. <br></br>
                    This website's information is only directed at persons who
                    are Professional Clients (as defined in the FCA's Handbook
                    of Rules and Guidance), must not be distributed to the
                    public and must not be relied or acted upon by any other
                    persons for any purposes whatsoever. <br></br>
                    Potential investors in the UK should be aware that none of
                    the protections afforded by the UK regulatory system will
                    apply to an investment in an Index and that compensation
                    will not be available under the UK Financial Services
                    Compensation Scheme. <br></br>
                  </p>
                  <p className="text-[13px] mb-0 pb-4 text-secondary">
                    Regarding Index admitted on a regulated market, the listing
                    is subject to a volatility control mechanisms to ensure that
                    the Index price does not deviate significantly from a
                    reference price set by the listing rules of the relevant
                    regulated market, notably through the implementation of a
                    trading halt mechanism in case of significant deviation from
                    this reference price.
                  </p>
                  <p className="text-[13px] mb-0 pb-4 text-secondary">
                    The Index offers no capital guarantee. Investors may not get
                    back the full amount of their initial investment,
                    particularly in the event that the benchmark index falls.
                    Potential investors are advised to read the Funds risk
                    profile, which is described in detail in the prospectus. The
                    amount that is reasonable to invest in the Fund will depend
                    on the personal circumstances of each investor. To determine
                    this amount, investors should take into account their
                    financial situation, personal assets, and current and future
                    requirements, as well as considering their willingness to
                    accept risks or conversely their preference to invest
                    cautiously. Investors are also strongly recommended to
                    sufficiently diversify their investments so as to avoid
                    being exposed solely to the risks of this Fund. Investors
                    should therefore seek advice in this regard from their usual
                    advisors (legal, tax, financial and/or accounting) before
                    purchasing any units of the Fund.
                  </p>
                  <p className="text-[13px] mb-0 pb-4 text-secondary">
                    The source of the data contained in this document is
                    IndexMaker unless otherwise stated.
                  </p>
                  <p className="text-[13px] mb-0 pb-4 font-bold text-secondary">
                    Policy regarding portfolio transparency and warning on
                    secondary market
                  </p>
                  <p className="text-[13px] mb-0 pb-4 text-secondary">
                    The policy regarding portfolio transparency and information
                    on the funds assets are available on indexmaker.global.
                    Indicative net asset value is published by stock exchanges.
                    Shares purchased on the secondary market cannot usually be
                    sold directly back to the fund. Investors must buy and sell
                    shares on a secondary market with the assistance of an
                    intermediary (e.g. a broker) and may incur fees for doing
                    so. Investors may pay more than the current net asset value
                    when buying shares and may receive less than the current net
                    asset value when selling them.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="xl:pl-[86px] xl:pr-[86px] lg:mt-9 2xl:-mx-[40px]">
          <div
            className={cn("flex gap-16", isMobile ? "flex-col" : "flex-row")}
          >
            {/* Left Column - Vault Info */}
            <div
              className={cn(
                "flex flex-col xl:flex-row items-center gap-8 flex-nowrap mt-9 lg:mt-0 w-full",
                isMobile ? "w-full" : "w-[50%]"
              )}
            >
              {/* Avatar Skeleton */}
              <Skeleton className="h-[100px] w-[100px] rounded-full" />

              {/* Text Info Skeleton */}
              <div className="flex gap-6 flex-col w-full">
                {/* Title Skeleton */}
                <Skeleton className="h-[44px] w-[200px] rounded-sm" />

                {/* Token & Curator Info Skeleton */}
                <div className="flex items-center gap-4 mt-2 justify-center xl:justify-start">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-[17px] w-[17px] rounded-full" />
                    <Skeleton className="h-[20px] w-[60px] rounded-sm" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-[17px] w-[17px] rounded-full" />
                    <Skeleton className="h-[20px] w-[80px] rounded-sm" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Description Skeleton */}
            <div className="bg-foreground rounded-sm p-5 flex items-center w-full">
              <div className="space-y-2 w-full">
                <Skeleton className="h-[16px] w-full rounded-sm" />
                <Skeleton className="h-[16px] w-4/5 rounded-sm" />
                <Skeleton className="h-[16px] w-3/4 rounded-sm" />
              </div>
            </div>
          </div>
          <Skeleton className="h-[300px] mt-[10]"></Skeleton>
        </div>
      )}
    </Dashboard>
  );
}

interface InfoCardProps {
  title: string;
  tooltip?: string;
  children: React.ReactNode;
}

function InfoCard({ title, tooltip, children }: InfoCardProps) {
  return (
    <Card className="bg-foreground border-[#afafaf1a] border-none h-[100px] p-5 rounded-[8px] shadow-none">
      <CardContent className="px-0 flex flex-col justify-between h-full border-none">
        <div className="flex items-center gap-1 mb-3 text-[13px] text-zinc-400">
          <span>{title}</span>
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                    <HelpCircle className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div>{children}</div>
      </CardContent>
    </Card>
  );
}

function InfoMobileCard({ title, tooltip, children }: InfoCardProps) {
  return (
    <Card className="bg-foreground border-accent border-b-[0.5px] border-t-0 border-l-[0px] border-r-[0px] rounded-none h-[60px] pt-[6px] pb-[6px] pl-0 shadow-none">
      <CardContent className="px-0 flex flex-row justify-between h-full items-center border-none">
        <div className="flex items-center gap-1 text-[13px] text-muted">
          <span>{title}</span>
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                    <HelpCircle className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div>{children}</div>
      </CardContent>
    </Card>
  );
}

const CuratorInfo = ({ curator }: { curator: string }) => (
  <div className="flex items-center gap-2">
    <div className="relative h-5 w-5 rounded-full overflow-hidden bg-forground flex items-center justify-center">
      <IndexMaker className="h-5 w-5 text-muted" />
    </div>
    <span className="text-secondary text-[13px] font-normal">{"SYMMIO"}</span>
    {
      <Link href={`https://basescan.org/address/${curator}`}>
        <ArrowUpRight className="h-4 w-4 text-zinc-400" />
      </Link>
    }
  </div>
);

const TokenInfo = ({
  token,
}: {
  token: {
    symbol: string;
    icon: string;
    address?: string;
  };
}) => (
  <div className="flex items-center gap-2">
    <div className="relative h-5 w-5 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center">
      {token.icon ? (
        <Image
          src={USDC}
          alt={"USDC"}
          className="w-full h-full"
          width={20}
          height={20}
        />
      ) : (
        <div className="text-[11px]">{"USDC"}</div>
      )}
    </div>
    <span className="text-secondary text-[13px] font-normal">{"USDC"}</span>
  </div>
);

const TokenValue = ({
  token,
  value,
}: {
  token: {
    symbol: string;
    icon: string;
    address?: string;
  };
  value: number;
}) => (
  <div className="flex flex-row items-center lg:items-center gap-1 lg:gap-2">
    <div className="flex items-center gap-2">
      <div className="relative h-5 w-5 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center">
        {token.icon ? (
          <Image
            src={USDC}
            alt={token.symbol}
            className="w-full h-full"
            width={20}
            height={20}
          />
        ) : (
          <div className="text-[11px]">{token.symbol.charAt(0)}</div>
        )}
      </div>
      <span className="text-secondary text-[13px] font-normal">
        {value} USDC
      </span>
    </div>
    <div className="text-[11px] text-secondary px-1 bg-accent">{value}</div>
  </div>
);

const AddressInfo = ({ address }: { address: string }) => (
  <div className="flex items-center gap-2">
    <a
      href={`https://basescan.org/address/${address}`}
      target="_blank"
      className="text-secondary text-[13px] font-normal"
    >
      {shortenAddress(address)}
    </a>
  </div>
);

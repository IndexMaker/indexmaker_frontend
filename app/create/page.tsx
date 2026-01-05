"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  ChevronsUpDown, 
  Loader2, 
  AlertCircle 
} from "lucide-react";
import { cn, shortenAddress } from "@/lib/utils";
import { CustomButton } from "@/components/ui/custom-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useWallet } from "@/contexts/wallet-context";
import Dashboard from "@/components/views/Dashboard/dashboard";

// ============================================================================
// 🛠️ TYPES & DEFAULTS
// ============================================================================

interface Category {
  category_id: string;
  name: string;
}

interface IndexData {
  indexId: number;
  name: string;
  symbol: string;
  address: string;
  category: string;
  assetClass: string;
  tokens: any[];
  initialDate: string;
  initialPrice: string;
  coingeckoCategory: string;
  exchangesAllowed: string[];
  exchangeTradingFees: string;
  exchangeAvgSpread: string;
  rebalancePeriod: string;
}

const STEPS = [
  { id: "basics", title: "Basics", description: "Name, Symbol & Price" },
  { id: "strategy", title: "Strategy", description: "Category & Rebalancing" },
  { id: "execution", title: "Execution", description: "Fees & Exchanges" },
  { id: "review", title: "Review", description: "Confirm & Deploy" },
];

export default function CreatePage() {
  // ==========================================================================
  // 🎣 STATE MANAGEMENT
  // ==========================================================================
  const { wallet, address, connectWallet, isConnected } = useWallet();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Data Sources
  const [categories, setCategories] = useState<Category[]>([]);
  const [isFetchingCategories, setIsFetchingCategories] = useState(false);
  const [hasFetchedCategories, setHasFetchedCategories] = useState(false);
  
  const [nextIndexId, setNextIndexId] = useState<number>(0);

  // Form Data
  const [formData, setFormData] = useState<IndexData>({
    indexId: 0,
    name: "SYMMIO Indices Top 100 ",
    symbol: "SY100",
    address: "0x...", 
    category: "Global", 
    assetClass: "Cryptocurrencies", 
    tokens: [],
    initialDate: "2020-01-01",
    initialPrice: "10.0",
    coingeckoCategory: "",
    exchangesAllowed: ["bitget"], 
    exchangeTradingFees: "0.001",
    exchangeAvgSpread: "0.0005",
    rebalancePeriod: "14",
  });

  // UI States
  const [openCombobox, setOpenCombobox] = useState(false);

  // ==========================================================================
  // 🔄 WALLET ADDRESS SYNC
  // ==========================================================================
  useEffect(() => {
    if (address) {
      setFormData(prev => ({ ...prev, address }));
    }
  }, [address]);


  // ==========================================================================
  // 🔄 INITIAL DATA (ONLY INDEX ID)
  // ==========================================================================
  useEffect(() => {
    const initData = async () => {
      try {
        // Fetch Next Index ID
        try {
          const indexResponse = await fetch("https://api2.indexmaker.global/indexes");
          const indexJson = await indexResponse.json();
          let maxId = 0;
          if (indexJson.indexes && Array.isArray(indexJson.indexes)) {
            maxId = Math.max(...indexJson.indexes.map((i: any) => i.indexId || 0));
          }
          setNextIndexId(maxId + 1);
          setFormData(prev => ({ ...prev, indexId: maxId + 1 }));
        } catch (e) {
          console.warn("Could not fetch indexes, defaulting ID to 1");
          setNextIndexId(1);
          setFormData(prev => ({ ...prev, indexId: 1 }));
        }
      } catch (error) {
        console.error("Failed to fetch initial data", error);
      }
    };

    initData();
  }, []);

  // ==========================================================================
  // 🔄 LAZY LOAD CATEGORIES (ON CLICK)
  // ==========================================================================
  const handleOpenChange = (open: boolean) => {
    setOpenCombobox(open);
    
    // Only fetch if opening, haven't fetched before, and not currently fetching
    if (open && !hasFetchedCategories && !isFetchingCategories) {
      fetchCategories();
    }
  };

  const fetchCategories = async () => {
    setIsFetchingCategories(true);
    try {
      const catResponse = await fetch("https://api2.indexmaker.global/coingecko-categories");
      const catData = await catResponse.json();
      
      // Handle the response - API returns array with categoryId (not category_id)
      const rawList = Array.isArray(catData) ? catData : (catData.categories || []);
      
      // Map to consistent structure and sanitize
      const mappedCategories = rawList
        .filter((item: any) => item && item.name && (item.category_id || item.categoryId))
        .map((item: any) => ({
          category_id: item.category_id || item.categoryId,
          name: item.name.trim()
        }));
      
      // OPTIMIZATION: Deduplicate
      const uniqueCategories = mappedCategories.reduce((acc: Category[], current: Category) => {
        const exists = acc.find(item => item.category_id === current.category_id);
        if (!exists) {
          return acc.concat([current]);
        }
        return acc;
      }, []);

      // Sort alphabetically
      uniqueCategories.sort((a: Category, b: Category) => a.name.localeCompare(b.name));

      console.log(`✅ Loaded ${uniqueCategories.length} CoinGecko categories`);
      setCategories(uniqueCategories);
      setHasFetchedCategories(true);
    } catch (error) {
      console.error("Failed to fetch categories", error);
    } finally {
      setIsFetchingCategories(false);
    }
  };

  // ==========================================================================
  // ⚡ MEMOIZED HELPERS
  // ==========================================================================
  
  const selectedCategoryName = useMemo(() => {
    if (!formData.coingeckoCategory) return "None";
    // If list hasn't loaded yet but we have a value, just show the ID or a placeholder
    const found = categories.find((c) => c.category_id === formData.coingeckoCategory);
    return found ? found.name : formData.coingeckoCategory; 
  }, [categories, formData.coingeckoCategory]);

  // ==========================================================================
  // ⚡ VALIDATION & HANDLERS
  // ==========================================================================
  
  const validateStep = () => {
    if (currentStep === 0) {
      return (
        formData.name.trim().length > 0 &&
        formData.symbol.trim().length > 0 &&
        formData.initialPrice.length > 0 &&
        formData.initialDate.length > 0
      );
    }
    if (currentStep === 1) {
      return (
        formData.coingeckoCategory !== undefined &&
        formData.category.trim().length > 0 &&
        formData.rebalancePeriod.length > 0
      );
    }
    if (currentStep === 2) {
      return (
        formData.exchangeTradingFees.length > 0 &&
        formData.exchangeAvgSpread.length > 0
      );
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep() && currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    
    try {
      const payload = {
        ...formData,
        rebalancePeriod: parseInt(formData.rebalancePeriod),
        address: formData.address, // Use connected wallet address
        // Ensure coingeckoCategory is null string if empty
        coingeckoCategory: formData.coingeckoCategory || "null",
      };

      console.log("🚀 Submitting vault creation request...");
      console.log("📦 Payload:", JSON.stringify(payload, null, 2));
      console.log("🌐 Endpoint: /api/create-index");

      const response = await fetch("/api/create-index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("📡 Response status:", response.status, response.statusText);

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        console.log("✅ Vault created successfully!", data);
        alert("Vault Created Successfully!");
      } else {
        const errorData = await response.text().catch(() => "No error details");
        console.error("❌ Server returned error:", {
          status: response.status,
          statusText: response.statusText,
          body: errorData
        });
        alert(`Error creating vault: ${response.status} ${response.statusText}\n\nCheck console for details.`);
      }
    } catch (error) {
      console.error("🔥 Network/Connection Error:");
      console.error("Error type:", error instanceof TypeError ? "TypeError (likely CORS or connection refused)" : error?.constructor?.name);
      console.error("Error message:", error instanceof Error ? error.message : error);
      console.error("Full error:", error);
      
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        alert(
          "❌ Connection Error: Cannot connect to backend server\n\n" +
          "Possible causes:\n" +
          "• Backend server not running on http://localhost:3002\n" +
          "• CORS policy blocking the request\n" +
          "• Network/firewall issues\n\n" +
          "Check console for details."
        );
      } else {
        alert(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}\n\nCheck console for details.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================================================
  // 🎨 RENDER HELPERS
  // ==========================================================================
  
  const THEME = {
    primary: "text-[#FFA300]",
    bgActive: "bg-[#FFA300]/10",
    borderActive: "border-[#FFA300]",
    borderDefault: "border-zinc-800",
    textMuted: "text-zinc-500",
    inputBg: "bg-zinc-900",
  };

  const canProceed = validateStep();

  return (
    <Dashboard>
    {/* LAYOUT FIX FOR MOBILE: 
      flex-col-reverse ensures Content is TOP, Sidebar (Stepper) is BOTTOM on mobile.
      md:flex-row ensures Sidebar is LEFT, Content is RIGHT on Desktop.
    */}
    <div className="min-h-screen bg-background text-primary flex flex-col-reverse md:flex-row font-sans selection:bg-[#FFA300] selection:text-black">
      
      {/* =======================
          LEFT SIDEBAR (Stepper)
         ======================= */}
      <div className="w-full md:w-80 border-t md:border-t-0 md:border-r border-border p-4 md:p-8 flex flex-col bg-background shrink-0">
        <div className="mb-6 md:mb-10 flex items-center justify-between md:block">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-primary">
              Create <span className={THEME.primary}>Vault</span>
            </h1>
            <p className="text-xs text-secondary mt-1 md:mt-2">
              Configure your index parameters.
            </p>
          </div>
          {/* Mobile Step Indicator (Compact) */}
          <div className="md:hidden text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
             Step {currentStep + 1}/{STEPS.length}
          </div>
        </div>

        {/* Desktop Stepper */}
        <div className="hidden md:block space-y-0 relative">
          <div className="absolute left-[15px] top-4 bottom-4 w-[1px] bg-border z-0"></div>

          {STEPS.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div key={step.id} className="relative z-10 flex items-start group mb-8 last:mb-0">
                <div 
                  className={cn(
                    "w-8 h-8 rounded-full border flex items-center justify-center text-xs font-mono transition-all duration-300 bg-background",
                    isActive ? `${THEME.borderActive} ${THEME.primary} ${THEME.bgActive}` : 
                    isCompleted ? "border-green-500 text-green-500 bg-green-500/10" : 
                    "border-border text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                <div className="ml-4 pt-1">
                  <p className={cn(
                    "text-sm font-medium transition-colors", 
                    isActive ? "text-primary" : isCompleted ? "text-primary/80" : "text-muted-foreground"
                  )}>
                    {step.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Horizontal Stepper (simplified) */}
        <div className="flex md:hidden justify-between mt-4 relative">
             <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-border -z-10 transform -translate-y-1/2"></div>
             {STEPS.map((step, index) => {
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                return (
                    <div key={step.id} className={cn(
                        "w-6 h-6 rounded-full border flex items-center justify-center text-[10px] bg-background",
                        isActive ? "border-[#FFA300] text-[#FFA300]" : 
                        isCompleted ? "border-green-500 text-green-500" : "border-border text-zinc-600"
                    )}>
                        {isCompleted ? <Check className="w-3 h-3" /> : index + 1}
                    </div>
                )
             })}
        </div>
      </div>

      {/* =======================
          RIGHT CONTENT (Form)
         ======================= */}
      <div className="flex-1 p-4 md:p-12 lg:p-16 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-8">
          
          {/* STEP 1: BASICS */}
          {currentStep === 0 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-primary">Basic Information</h2>
                <p className="text-sm text-secondary">Define the identity of your new index vault.</p>
              </div>

              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label>Vault Name <span className="text-red-500">*</span></Label>
                  <Input 
                    placeholder="e.g. Top 100 Market-Cap Tokens" 
                    className="bg-foreground border-border focus:border-[#FFA300] h-12"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                  <p className="text-[10px] text-muted-foreground pt-1">The public display name for your vault.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Symbol (Ticker) <span className="text-red-500">*</span></Label>
                    <Input 
                      placeholder="e.g. SY100" 
                      className="bg-foreground border-border focus:border-[#FFA300] h-12 font-mono uppercase"
                      value={formData.symbol}
                      onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
                      maxLength={6}
                    />
                     <p className="text-[10px] text-muted-foreground pt-1">Max 6 characters.</p>
                  </div>
                  <div className="grid gap-2">
                    <Label>Initial Price ($) <span className="text-red-500">*</span></Label>
                    <Input 
                      type="number" 
                      placeholder="10.0" 
                      className="bg-foreground border-border focus:border-[#FFA300] h-12 font-mono"
                      value={formData.initialPrice}
                      onChange={(e) => setFormData({...formData, initialPrice: e.target.value})}
                    />
                    <p className="text-[10px] text-muted-foreground pt-1">Starting NAV for the index.</p>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Inception Date <span className="text-red-500">*</span></Label>
                  <Input 
                    type="date"
                    className="bg-foreground border-border focus:border-[#FFA300] h-12 block w-full"
                    value={formData.initialDate}
                    onChange={(e) => setFormData({...formData, initialDate: e.target.value})}
                  />
                   <p className="text-[10px] text-muted-foreground pt-1">The official start date for performance tracking.</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: STRATEGY */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="space-y-2">
                <h2 className="text-xl font-bold text-primary">Strategy Configuration</h2>
                <p className="text-sm text-muted-foreground">Set the category and rebalancing rules.</p>
              </div>

              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label>CoinGecko Category <span className="text-red-500">*</span></Label>
                  
                  {/* OPTIMIZED COMBOBOX */}
                  <Popover open={openCombobox} onOpenChange={handleOpenChange}>
                    <PopoverTrigger asChild>
                      <CustomButton
                        variant="outline"
                        role="combobox"
                        aria-expanded={openCombobox}
                        className="w-full justify-between h-12 bg-background border-border hover:bg-accent font-normal"
                      >
                        <span className="truncate">
                          {isFetchingCategories ? (
                             <span className="flex items-center text-muted-foreground">
                                <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Loading categories...
                             </span>
                          ) : selectedCategoryName}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </CustomButton>
                    </PopoverTrigger>
                    
                    {/* WIDTH FIX: Use var(--radix-popover-trigger-width) to match button width exactly */}
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command shouldFilter={true} loop>
                        <CommandInput placeholder="Search categories..." className="h-9" />
                        <CommandList className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
                          
                          {/* Loading State */}
                          {isFetchingCategories && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                               <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                               Fetching categories...
                            </div>
                          )}

                          {!isFetchingCategories && (
                            <>
                              <CommandEmpty>No category found.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value="none"
                                  onSelect={() => {
                                    setFormData((prev) => ({ ...prev, coingeckoCategory: "" }));
                                    setOpenCombobox(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4 flex-shrink-0",
                                      formData.coingeckoCategory === "" ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <span className="truncate">None (All Categories)</span>
                                </CommandItem>
                                
                                {categories.map((category) => (
                                  <CommandItem
                                    key={category.category_id}
                                    value={category.name} 
                                    onSelect={() => {
                                      setFormData((prev) => ({
                                        ...prev,
                                        coingeckoCategory: category.category_id
                                      }));
                                      setOpenCombobox(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4 flex-shrink-0",
                                        formData.coingeckoCategory === category.category_id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span className="truncate">{category.name}</span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  
                  <p className="text-[10px] text-muted-foreground pt-1">
                    Source category from CoinGecko API.
                  </p>
                </div>

                <div className="grid gap-2">
                    <Label>Category Name (Display) <span className="text-red-500">*</span></Label>
                    <Input 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="bg-background border-border focus:border-[#FFA300] h-12"
                      placeholder="e.g. Top 100 Market-Cap Tokens"
                    />
                </div>

                <div className="grid gap-2">
                  <Label>Rebalance Period (Days) <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number"
                    value={formData.rebalancePeriod}
                    onChange={(e) => setFormData({...formData, rebalancePeriod: e.target.value})}
                    className="bg-background border-border focus:border-[#FFA300] h-12 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: EXECUTION */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-primary">Execution Parameters</h2>
                <p className="text-sm text-muted-foreground">Historical simulation parameters and restrictions.</p>
              </div>

              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Asset Class</Label>
                  <Input 
                    value="Cryptocurrencies" 
                    disabled 
                    className="bg-muted/50 border-border text-muted-foreground cursor-not-allowed h-12"
                  />
                </div>

                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Allowed Exchanges</Label>
                  <div className="flex gap-2">
                      <div className="px-4 py-3 bg-muted/50 border border-border rounded-md text-muted-foreground text-sm w-full font-mono">
                        Bitget
                      </div>
                  </div>
                </div>

                <div className="p-4 border border-[#FFA300]/20 bg-[#FFA300]/5 rounded-lg space-y-4">
                    <div className="flex items-center gap-2 text-[#FFA300]">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wide">Historical Backtest Data</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Trading Fees (%) <span className="text-red-500">*</span></Label>
                            <Input 
                                value={formData.exchangeTradingFees}
                                onChange={(e) => setFormData({...formData, exchangeTradingFees: e.target.value})}
                                className="bg-background border-border focus:border-[#FFA300] h-10 font-mono"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Avg Spread (%) <span className="text-red-500">*</span></Label>
                            <Input 
                                value={formData.exchangeAvgSpread}
                                onChange={(e) => setFormData({...formData, exchangeAvgSpread: e.target.value})}
                                className="bg-background border-border focus:border-[#FFA300] h-10 font-mono"
                            />
                        </div>
                    </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-primary">Review & Deploy</h2>
                <p className="text-sm text-muted-foreground">Verify your vault configuration.</p>
              </div>

              <div className="bg-muted/30 border border-border rounded-lg p-6 space-y-4 font-mono text-sm">
                <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Name</span>
                    <span className="text-primary">{formData.name}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Symbol</span>
                    <span className="text-primary">{formData.symbol}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Category</span>
                    <span className="text-primary">{selectedCategoryName}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Wallet Address</span>
                    {isConnected ? (
                      <span className="text-[#FFA300]">{shortenAddress(formData.address)}</span>
                    ) : (
                      <CustomButton
                        onClick={connectWallet}
                        className="bg-[#FFA300] text-black hover:bg-[#FFB700] h-8 text-xs px-3"
                      >
                        Connect Wallet
                      </CustomButton>
                    )}
                </div>
              </div>
            </div>
          )}

          {/* NAVIGATION FOOTER */}
          <div className="flex justify-between pt-8 border-t border-border">
             <CustomButton
               variant="outline"
               onClick={handleBack}
               disabled={currentStep === 0 || isLoading}
               className="border-border text-muted-foreground hover:text-primary"
             >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
             </CustomButton>

             {currentStep < STEPS.length - 1 ? (
               <CustomButton 
                onClick={handleNext}  
                disabled={isLoading || !canProceed}
                className={cn(
                  "text-black transition-all",
                  canProceed 
                    ? "bg-[#FFA300] hover:bg-[#FFB700] cursor-pointer" 
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                )}
               >
                 Next Step
                 <ChevronRight className="w-4 h-4 ml-2" />
               </CustomButton>
             ) : (
               <CustomButton 
                onClick={handleSubmit} 
                disabled={isLoading}
                className="bg-[#FFA300] text-black hover:bg-[#FFB700] min-w-[140px]"
               >
                 {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Deploy Vault"}
               </CustomButton>
             )}
          </div>
        
        </div>
      </div>
    </div>
    </Dashboard>
  );
}

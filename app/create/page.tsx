"use client";

import React, { useState, useEffect } from "react";
import { 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Search, 
  Loader2, 
  AlertCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";
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

// ============================================================================
// 🛠️ TYPES & DEFAULTS
// ============================================================================

interface Category {
  category_id: string; // Adjusted based on common API responses (snake_case vs camelCase)
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
  initialDate: string; // Changed to string for native input (YYYY-MM-DD)
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
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  
  // Data Sources
  const [categories, setCategories] = useState<Category[]>([]);
  const [nextIndexId, setNextIndexId] = useState<number>(0);

  // Form Data
  const [formData, setFormData] = useState<IndexData>({
    indexId: 0,
    name: "",
    symbol: "",
    address: "0x...", 
    category: "", 
    assetClass: "Cryptocurrencies", 
    tokens: [],
    initialDate: new Date().toISOString().split('T')[0], // Default YYYY-MM-DD
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
  // 🔄 INITIAL DATA FETCHING
  // ==========================================================================
  useEffect(() => {
    const initData = async () => {
      try {
        setIsFetchingData(true);
        
        // 1. Fetch Next Index ID
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

        // 2. Fetch Categories (Real API)
        const catResponse = await fetch("https://api2.indexmaker.global/coingecko-categories");
        const catData = await catResponse.json();
        
        // Handle different possible API responses (array vs object)
        const categoryList = Array.isArray(catData) ? catData : (catData.categories || []);
        setCategories(categoryList);

      } catch (error) {
        console.error("Failed to fetch initial data", error);
      } finally {
        setIsFetchingData(false);
      }
    };

    initData();
  }, []);

  // ==========================================================================
  // ⚡ VALIDATION & HANDLERS
  // ==========================================================================
  
  const validateStep = () => {
    if (currentStep === 0) {
      // Basics: Require Name, Symbol, Price, Date
      return (
        formData.name.trim().length > 0 &&
        formData.symbol.trim().length > 0 &&
        formData.initialPrice.length > 0 &&
        formData.initialDate.length > 0
      );
    }
    if (currentStep === 1) {
      // Strategy: Require CoinGecko Category, Custom Name, Rebalance
      return (
        formData.coingeckoCategory.length > 0 &&
        formData.category.trim().length > 0 &&
        formData.rebalancePeriod.length > 0
      );
    }
    if (currentStep === 2) {
      // Execution: Require Fees, Spread
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
        address: "0x9080dd35d88b7de97afd0498fc309784ef7ebc49", 
      };

      const response = await fetch("http://localhost:3002/create-index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert("Vault Created Successfully!");
      } else {
        alert("Error creating vault");
      }
    } catch (error) {
      console.error(error);
      alert("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================================================
  // 🎨 RENDER HELPERS
  // ==========================================================================
  
  // Theme Constants (Morpho V1 Style)
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
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col md:flex-row font-sans selection:bg-[#FFA300] selection:text-black">
      
      {/* =======================
          LEFT SIDEBAR (Stepper)
         ======================= */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-zinc-900 p-8 flex flex-col bg-zinc-950/50">
        <div className="mb-10">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Create <span className={THEME.primary}>Vault</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-2">
            Configure your index parameters.
          </p>
        </div>

        <div className="space-y-0 relative">
          <div className="absolute left-[15px] top-4 bottom-4 w-[1px] bg-zinc-900 z-0"></div>

          {STEPS.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div key={step.id} className="relative z-10 flex items-start group mb-8 last:mb-0">
                <div 
                  className={cn(
                    "w-8 h-8 rounded-full border flex items-center justify-center text-xs font-mono transition-all duration-300 bg-zinc-950",
                    isActive ? `${THEME.borderActive} ${THEME.primary} ${THEME.bgActive}` : 
                    isCompleted ? "border-green-500 text-green-500 bg-green-500/10" : 
                    "border-zinc-800 text-zinc-600"
                  )}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                <div className="ml-4 pt-1">
                  <p className={cn(
                    "text-sm font-medium transition-colors", 
                    isActive ? "text-white" : isCompleted ? "text-zinc-300" : "text-zinc-600"
                  )}>
                    {step.title}
                  </p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Helper Box */}
        <div className="mt-auto bg-zinc-900/50 border border-zinc-900 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className={cn("w-4 h-4 animate-spin", isFetchingData ? "opacity-100" : "opacity-0")} />
            <span className="text-xs text-zinc-500 font-mono">
              NEXT ID: {isFetchingData ? "..." : nextIndexId}
            </span>
          </div>
          <p className="text-[10px] text-zinc-600">
            Index ID is auto-assigned from the registry.
          </p>
        </div>
      </div>

      {/* =======================
          RIGHT CONTENT (Form)
         ======================= */}
      <div className="flex-1 p-6 md:p-12 lg:p-16 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-8">
          
          {/* STEP 1: BASICS */}
          {currentStep === 0 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <h2 className="text-xl font-bold">Basic Information</h2>
                <p className="text-sm text-zinc-500">Define the identity of your new index vault.</p>
              </div>

              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label>Vault Name <span className="text-red-500">*</span></Label>
                  <Input 
                    placeholder="e.g. Top 100 Market-Cap Tokens" 
                    className="bg-zinc-900 border-zinc-800 focus:border-[#FFA300] h-12"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                  <p className="text-[10px] text-zinc-500 pt-1">The public display name for your vault.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Symbol (Ticker) <span className="text-red-500">*</span></Label>
                    <Input 
                      placeholder="e.g. SY100" 
                      className="bg-zinc-900 border-zinc-800 focus:border-[#FFA300] h-12 font-mono uppercase"
                      value={formData.symbol}
                      onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
                      maxLength={6}
                    />
                     <p className="text-[10px] text-zinc-500 pt-1">Max 6 characters.</p>
                  </div>
                  <div className="grid gap-2">
                    <Label>Initial Price ($) <span className="text-red-500">*</span></Label>
                    <Input 
                      type="number" 
                      placeholder="10.0" 
                      className="bg-zinc-900 border-zinc-800 focus:border-[#FFA300] h-12 font-mono"
                      value={formData.initialPrice}
                      onChange={(e) => setFormData({...formData, initialPrice: e.target.value})}
                    />
                    <p className="text-[10px] text-zinc-500 pt-1">Starting NAV for the index.</p>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Inception Date <span className="text-red-500">*</span></Label>
                  {/* Native Date Picker to remove dependency and enforce format */}
                  <Input 
                    type="date"
                    className="bg-zinc-900 border-zinc-800 focus:border-[#FFA300] h-12 block w-full text-white scheme-dark"
                    value={formData.initialDate}
                    onChange={(e) => setFormData({...formData, initialDate: e.target.value})}
                  />
                   <p className="text-[10px] text-zinc-500 pt-1">The official start date for performance tracking.</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: STRATEGY */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="space-y-2">
                <h2 className="text-xl font-bold">Strategy Configuration</h2>
                <p className="text-sm text-zinc-500">Set the category and rebalancing rules.</p>
              </div>

              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label>CoinGecko Category <span className="text-red-500">*</span></Label>
                  <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                      <CustomButton
                        variant="outline"
                        role="combobox"
                        aria-expanded={openCombobox}
                        className="w-full justify-between h-12 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:text-white"
                      >
                        {formData.coingeckoCategory
                          ? categories.find((c) => c.category_id === formData.coingeckoCategory)?.name || formData.coingeckoCategory
                          : "Select category..."}
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </CustomButton>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0 bg-zinc-950 border-zinc-800">
                      <Command className="bg-zinc-950 text-white">
                        <CommandInput placeholder="Search CoinGecko categories..." className="h-9" />
                        <CommandList className="max-h-[300px] overflow-y-auto custom-scrollbar">
                            <CommandEmpty>No category found.</CommandEmpty>
                            <CommandGroup>
                            {categories.map((category) => (
                                <CommandItem
                                key={category.category_id}
                                value={category.name}
                                onSelect={() => {
                                    setFormData({
                                      ...formData, 
                                      coingeckoCategory: category.category_id, 
                                      category: category.name // Auto-fill display name too
                                    });
                                    setOpenCombobox(false);
                                }}
                                className="aria-selected:bg-[#FFA300]/20 aria-selected:text-[#FFA300] cursor-pointer"
                                >
                                {category.name}
                                </CommandItem>
                            ))}
                            </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className="text-[10px] text-zinc-500 pt-1">
                    Select a source category. You must pick from the list (no free typing).
                  </p>
                </div>

                <div className="grid gap-2">
                    <Label>Custom Category Name (Display) <span className="text-red-500">*</span></Label>
                    <Input 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="bg-zinc-900 border-zinc-800 focus:border-[#FFA300] h-12"
                    />
                     <p className="text-[10px] text-zinc-500 pt-1">
                        How the category appears on the dashboard UI.
                     </p>
                </div>

                <div className="grid gap-2">
                  <Label>Rebalance Period (Days) <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number"
                    value={formData.rebalancePeriod}
                    onChange={(e) => setFormData({...formData, rebalancePeriod: e.target.value})}
                    className="bg-zinc-900 border-zinc-800 focus:border-[#FFA300] h-12 font-mono"
                  />
                  <p className="text-[10px] text-zinc-500 pt-1">
                    Frequency at which the index weights are recalculated.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: EXECUTION */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <h2 className="text-xl font-bold">Execution Parameters</h2>
                <p className="text-sm text-zinc-500">Historical simulation parameters and restrictions.</p>
              </div>

              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label className="text-zinc-400">Asset Class</Label>
                  <Input 
                    value="Cryptocurrencies" 
                    disabled 
                    className="bg-zinc-900/50 border-zinc-900 text-zinc-500 cursor-not-allowed h-12"
                  />
                   <p className="text-[10px] text-zinc-600 pt-1">Locked parameter.</p>
                </div>

                <div className="grid gap-2">
                  <Label className="text-zinc-400">Allowed Exchanges</Label>
                  <div className="flex gap-2">
                      <div className="px-4 py-3 bg-zinc-900/50 border border-zinc-900 rounded-md text-zinc-500 text-sm w-full font-mono">
                        Bitget
                      </div>
                  </div>
                  <p className="text-[10px] text-zinc-600">
                    Currently limited to Bitget for this vault type.
                  </p>
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
                                className="bg-zinc-900 border-zinc-800 focus:border-[#FFA300] h-10 font-mono"
                            />
                             <p className="text-[10px] text-zinc-500 pt-1">Simulated fee per trade.</p>
                        </div>
                        <div className="grid gap-2">
                            <Label>Avg Spread (%) <span className="text-red-500">*</span></Label>
                            <Input 
                                value={formData.exchangeAvgSpread}
                                onChange={(e) => setFormData({...formData, exchangeAvgSpread: e.target.value})}
                                className="bg-zinc-900 border-zinc-800 focus:border-[#FFA300] h-10 font-mono"
                            />
                            <p className="text-[10px] text-zinc-500 pt-1">Simulated slippage.</p>
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
                <h2 className="text-xl font-bold">Review & Deploy</h2>
                <p className="text-sm text-zinc-500">Verify your vault configuration.</p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4 font-mono text-sm">
                
                <div className="flex justify-between border-b border-zinc-800 pb-2">
                    <span className="text-zinc-500">Index ID</span>
                    <span className="text-[#FFA300]">#{formData.indexId}</span>
                </div>
                
                <div className="flex justify-between border-b border-zinc-800 pb-2">
                    <span className="text-zinc-500">Name</span>
                    <span className="text-white">{formData.name}</span>
                </div>

                <div className="flex justify-between border-b border-zinc-800 pb-2">
                    <span className="text-zinc-500">Symbol</span>
                    <span className="text-white">{formData.symbol}</span>
                </div>

                <div className="flex justify-between border-b border-zinc-800 pb-2">
                    <span className="text-zinc-500">Date</span>
                    <span className="text-white">{formData.initialDate}</span>
                </div>

                <div className="flex justify-between border-b border-zinc-800 pb-2">
                    <span className="text-zinc-500">Category</span>
                    <span className="text-white">{formData.category}</span>
                </div>

                <div className="flex justify-between border-b border-zinc-800 pb-2">
                    <span className="text-zinc-500">Rebalance</span>
                    <span className="text-white">{formData.rebalancePeriod} Days</span>
                </div>

                 <div className="flex justify-between pt-2">
                    <span className="text-zinc-500">Exchanges</span>
                    <span className="text-zinc-400">{formData.exchangesAllowed.join(", ")}</span>
                </div>
              </div>
            </div>
          )}

          {/* NAVIGATION FOOTER */}
          <div className="flex justify-between pt-8 border-t border-zinc-900">
             <CustomButton
               variant="outline"
               onClick={handleBack}
               disabled={currentStep === 0 || isLoading}
               className="border-zinc-800 text-zinc-400 hover:text-white"
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
  );
}
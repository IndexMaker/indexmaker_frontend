"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  ChevronsUpDown, 
  Loader2, 
  AlertCircle 
} from "lucide-react";
import { cn, shortenAddress } from "@/lib/utils";
import { log } from "@/lib/utils/logger";
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

// ============================================================================
// TYPES
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

interface CreateVaultFormProps {
  initialIndexId: number;
  walletAddress?: string;
  isLoading: boolean;
}

const STEPS = [
  { id: "basics", title: "Basics", description: "Name, Symbol & Price" },
  { id: "strategy", title: "Strategy", description: "Category & Rebalancing" },
  { id: "execution", title: "Execution", description: "Fees & Exchanges" },
  { id: "review", title: "Review", description: "Confirm & Deploy" },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CreateVaultForm({ initialIndexId, walletAddress, isLoading: pageLoading }: CreateVaultFormProps) {
  const { connectWallet, isConnected } = useWallet();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Data Sources
  const [categories, setCategories] = useState<Category[]>([]);
  const [isFetchingCategories, setIsFetchingCategories] = useState(false);
  const [hasFetchedCategories, setHasFetchedCategories] = useState(false);

  // Form Data
  const [formData, setFormData] = useState<IndexData>({
    indexId: initialIndexId,
    name: "SYMMIO Indices Top 100 ",
    symbol: "SY100",
    address: walletAddress || "0x...", 
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

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    if (initialIndexId) {
      setFormData(prev => ({ ...prev, indexId: initialIndexId }));
    }
  }, [initialIndexId]);

  useEffect(() => {
    if (walletAddress) {
      setFormData(prev => ({ ...prev, address: walletAddress }));
    }
  }, [walletAddress]);

  // ============================================================================
  // CATEGORY LOADING
  // ============================================================================

  const handleOpenChange = (open: boolean) => {
    setOpenCombobox(open);
    
    if (open && !hasFetchedCategories && !isFetchingCategories) {
      fetchCategories();
    }
  };

  const fetchCategories = async () => {
    setIsFetchingCategories(true);
    try {
      log.info("Fetching CoinGecko categories");
      const catResponse = await fetch("https://api2.indexmaker.global/coingecko-categories");
      const catData = await catResponse.json();
      
      const rawList = Array.isArray(catData) ? catData : (catData.categories || []);
      
      const mappedCategories = rawList
        .filter((item: any) => item && item.name && (item.category_id || item.categoryId))
        .map((item: any) => ({
          category_id: item.category_id || item.categoryId,
          name: item.name.trim()
        }));
      
      const uniqueCategories = mappedCategories.reduce((acc: Category[], current: Category) => {
        const exists = acc.find(item => item.category_id === current.category_id);
        if (!exists) {
          return acc.concat([current]);
        }
        return acc;
      }, []);

      uniqueCategories.sort((a: Category, b: Category) => a.name.localeCompare(b.name));

      log.info("Categories loaded", { count: uniqueCategories.length });
      setCategories(uniqueCategories);
      setHasFetchedCategories(true);
    } catch (error) {
      log.error("Failed to fetch categories", { error });
    } finally {
      setIsFetchingCategories(false);
    }
  };

  // ============================================================================
  // MEMOIZED HELPERS
  // ============================================================================
  
  const selectedCategoryName = useMemo(() => {
    if (!formData.coingeckoCategory) return "None";
    const found = categories.find((c) => c.category_id === formData.coingeckoCategory);
    return found ? found.name : formData.coingeckoCategory; 
  }, [categories, formData.coingeckoCategory]);

  // ============================================================================
  // VALIDATION & HANDLERS
  // ============================================================================
  
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
    setIsSubmitting(true);
    
    try {
      const payload = {
        ...formData,
        rebalancePeriod: parseInt(formData.rebalancePeriod),
        address: formData.address,
        coingeckoCategory: formData.coingeckoCategory || "null",
      };

      log.info("Submitting vault creation", { payload });

      const response = await fetch("/api/create-index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        log.info("Vault created successfully", data);
        alert("Vault Created Successfully!");
      } else {
        const errorData = await response.text().catch(() => "No error details");
        log.error("Server error during vault creation", {
          status: response.status,
          body: errorData
        });
        alert(`Error creating vault: ${response.status} ${response.statusText}\n\nCheck console for details.`);
      }
    } catch (error) {
      log.error("Network error during vault creation", { error });
      
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
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  const canProceed = validateStep();

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#2470ff]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-primary flex flex-col-reverse md:flex-row font-sans selection:bg-[#2470ff] selection:text-black">
      
      {/* LEFT SIDEBAR (Stepper) */}
      <div className="w-full md:w-80 border-t md:border-t-0 md:border-r border-border p-4 md:p-8 flex flex-col bg-background shrink-0">
        <div className="mb-6 md:mb-10 flex items-center justify-between md:block">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-primary">
              Create <span className="text-[#2470ff]">ITP Index</span>
            </h1>
            <p className="text-xs text-secondary mt-1 md:mt-2">
              Configure your index parameters.
            </p>
          </div>
          {/* Mobile Step Indicator */}
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
                    isActive ? "border-[#2470ff] text-[#2470ff] bg-[#2470ff]/10" : 
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

        {/* Mobile Horizontal Stepper */}
        <div className="flex md:hidden justify-between mt-4 relative">
             <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-border -z-10 transform -translate-y-1/2"></div>
             {STEPS.map((step, index) => {
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                return (
                    <div key={step.id} className={cn(
                        "w-6 h-6 rounded-full border flex items-center justify-center text-[10px] bg-background",
                        isActive ? "border-[#2470ff] text-[#2470ff]" : 
                        isCompleted ? "border-green-500 text-green-500" : "border-border text-zinc-600"
                    )}>
                        {isCompleted ? <Check className="w-3 h-3" /> : index + 1}
                    </div>
                )
             })}
        </div>
      </div>

      {/* RIGHT CONTENT (Form) */}
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
                    className="bg-foreground border-border focus:border-[#2470ff] h-12"
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
                      className="bg-foreground border-border focus:border-[#2470ff] h-12 font-mono uppercase"
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
                      className="bg-foreground border-border focus:border-[#2470ff] h-12 font-mono"
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
                    className="bg-foreground border-border focus:border-[#2470ff] h-12 block w-full"
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
                  
                  <Popover open={openCombobox} onOpenChange={handleOpenChange}>
                    <PopoverTrigger asChild>
                      <CustomButton
                        variant="outline"
                        role="combobox"
                        aria-expanded={openCombobox}
                        className="w-full justify-between h-12 bg-foreground border-border hover:bg-accent font-normal text-primary"
                      >
                        <span className="truncate text-primary">
                          {isFetchingCategories ? (
                             <span className="flex items-center text-muted-foreground">
                                <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Loading categories...
                             </span>
                          ) : selectedCategoryName}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </CustomButton>
                    </PopoverTrigger>
                    
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-foreground border-border" align="start">
                      <Command shouldFilter={true} loop className="bg-foreground">
                        <CommandInput placeholder="Search categories..." className="h-9 bg-foreground text-primary border-border" />
                        <CommandList className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900 bg-foreground">
                          
                          {isFetchingCategories && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                               <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                               Fetching categories...
                            </div>
                          )}

                          {!isFetchingCategories && (
                            <>
                              <CommandEmpty className="text-primary">No category found.</CommandEmpty>
                              <CommandGroup className="bg-foreground">
                                <CommandItem
                                  value="none"
                                  onSelect={() => {
                                    setFormData((prev) => ({ ...prev, coingeckoCategory: "" }));
                                    setOpenCombobox(false);
                                  }}
                                  className="text-primary hover:bg-accent cursor-pointer"
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
                                    className="text-primary hover:bg-accent cursor-pointer"
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
                      className="bg-foreground border-border focus:border-[#2470ff] h-12"
                      placeholder="e.g. Top 100 Market-Cap Tokens"
                    />
                </div>

                <div className="grid gap-2">
                  <Label>Rebalance Period (Days) <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number"
                    value={formData.rebalancePeriod}
                    onChange={(e) => setFormData({...formData, rebalancePeriod: e.target.value})}
                    className="bg-foreground border-border focus:border-[#2470ff] h-12 font-mono"
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

                <div className="p-4 border border-[#2470ff]/20 bg-[#2470ff]/5 rounded-lg space-y-4">
                    <div className="flex items-center gap-2 text-[#2470ff]">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wide">Historical Backtest Data</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Trading Fees (%) <span className="text-red-500">*</span></Label>
                            <Input 
                                value={formData.exchangeTradingFees}
                                onChange={(e) => setFormData({...formData, exchangeTradingFees: e.target.value})}
                                className="bg-foreground border-border focus:border-[#2470ff] h-10 font-mono"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Avg Spread (%) <span className="text-red-500">*</span></Label>
                            <Input 
                                value={formData.exchangeAvgSpread}
                                onChange={(e) => setFormData({...formData, exchangeAvgSpread: e.target.value})}
                                className="bg-foreground border-border focus:border-[#2470ff] h-10 font-mono"
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
                    <span className="text-muted-foreground">Initial Price</span>
                    <span className="text-primary">${formData.initialPrice}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Inception Date</span>
                    <span className="text-primary">{formData.initialDate}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">CoinGecko Category</span>
                    <span className="text-primary">{selectedCategoryName}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Display Category</span>
                    <span className="text-primary">{formData.category}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Rebalance Period</span>
                    <span className="text-primary">{formData.rebalancePeriod} days</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Asset Class</span>
                    <span className="text-primary">{formData.assetClass}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Exchanges</span>
                    <span className="text-primary">Bitget</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Trading Fees</span>
                    <span className="text-primary">{formData.exchangeTradingFees}%</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Avg Spread</span>
                    <span className="text-primary">{formData.exchangeAvgSpread}%</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Wallet Address</span>
                    {isConnected ? (
                      <span className="text-[#2470ff]">{shortenAddress(formData.address)}</span>
                    ) : (
                      <CustomButton
                        onClick={connectWallet}
                        className="bg-[#2470ff] text-white hover:bg-[#1a5acc] h-8 text-xs px-3"
                      >
                        Connect Wallet
                      </CustomButton>
                    )}
                </div>
              </div>
            </div>
          )}

          {/* NAVIGATION FOOTER */}
          <div className="flex justify-between items-center pt-8 border-t border-border gap-4">
             <CustomButton
               variant="outline"
               onClick={handleBack}
               disabled={currentStep === 0 || isSubmitting}
               className="border-border text-primary hover:bg-accent hover:text-primary bg-foreground h-11 px-6 flex items-center justify-center gap-2 font-medium"
             >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
             </CustomButton>

             {currentStep < STEPS.length - 1 ? (
               <CustomButton 
                onClick={handleNext}  
                disabled={isSubmitting || !canProceed}
                className={cn(
                  "text-white transition-all h-11 px-6 flex items-center justify-center gap-2 font-medium",
                  canProceed 
                    ? "bg-[#2470ff] hover:bg-[#1a5acc] cursor-pointer" 
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                )}
               >
                 <span>Next Step</span>
                 <ChevronRight className="w-4 h-4" />
               </CustomButton>
             ) : (
               <CustomButton 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="bg-[#2470ff] text-white hover:bg-[#1a5acc] h-11 px-6 min-w-[140px] flex items-center justify-center gap-2 font-medium"
               >
                 {isSubmitting ? (
                   <>
                     <Loader2 className="w-4 h-4 animate-spin" />
                     <span>Deploying...</span>
                   </>
                 ) : (
                   <span>Deploy Index</span>
                 )}
               </CustomButton>
             )}
          </div>
        
        </div>
      </div>
    </div>
  );
}

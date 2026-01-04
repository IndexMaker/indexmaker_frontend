"use client";

import Dashboard from "@/components/views/Dashboard/dashboard";
import { CustomButton } from "@/components/ui/custom-button";
import { Check, X, Zap, Globe, Building2, ExternalLink, ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordian";

export default function CreateIndexPage() {
  // ==================================================================================
  // 📝 CONTENT CONFIGURATION
  // ==================================================================================
  const pageContent = {
    hero: {
      title: "Select Your ITP Type",
      subtitle: "Choose how fast you want to launch your ITP.",
    },
    offerings: {
      instant: {
        title: "Instant Vault",
        badge: "TESTNET / BETA",
        icon: Zap,
        description: "Permissionless environment for track record building.",
        features: [
          "Permissionless Deployment",
          "Capped TVL ($10k)",
          "Instant Settlement",
          "0% Management Fees",
        ],
        buttonText: "Deploy Instant",
        buttonLink: "/create",
        theme: "blue",
      },
      legal: {
        title: "Legal Vault",
        badge: "INSTITUTIONAL",
        icon: Globe,
        description: "Compliant structure for scalable capital.",
        features: [
          "Unlimited TVL",
          "No KYC/AML Gating",
          "Custodian Integration",
          "Regulatory Compliant",
        ],
        buttonText: "Request Access",
        buttonLink: "https://cal.com/indexmaker/indexmaker-intro",
        theme: "orange",
      },
      tidal: {
        title: "Traditional ETF*",
        badge: "LEGACY",
        icon: Building2,
        description: "Standard off-chain white label issuance.",
        features: [
          "SEC Registration Required",
          "High Capital Intensity",
          "T+2 Settlement",
          "Banking Custody",
        ],
        buttonText: "View Tidal Financial",
        buttonLink: "https://www.tidalfinancialgroup.com/",
        theme: "gray",
      },
    },
    // The Data Rows
    comparisonRows: [
      {
        category: "Structure",
        label: "Jurisdictions",
        instant: "Global (Permissionless)*",
        legal: "Compliant (KYC/RWA)",
        tidal: "Restricted (Region Specific)",
      },
      {
        category: "Structure",
        label: "Legal Wrapper",
        instant: "None (Tech Sandbox)",
        legal: "Included (RWA Structure)",
        tidal: "SEC Registered (Series Trust)",
      },
      {
        category: "Structure",
        label: "Time to Market",
        instant: "< 10 min",
        legal: "< 1 Week",
        tidal: "4 - 6 Months",
      },
      {
        category: "Economics",
        label: "Setup Cost",
        instant: "$0",
        legal: "$1,000",
        tidal: "~$50,000 - $75,000",
      },
      {
        category: "Economics",
        label: "Maintenance",
        instant: "0%",
        legal: "$0",
        tidal: "~$200,000 / year",
      },
      {
        category: "Economics",
        label: "Break-even AUM (1%)",
        instant: "$0",
        legal: "~$100k ",
        tidal: "~$20M - $40M",
      },
      {
        category: "Execution",
        label: "Trading Hours",
        instant: "24/7",
        legal: "24/7",
        tidal: "Mon-Fri (9:30-4:00)",
      },
      {
        category: "Execution",
        label: "Settlement",
        instant: "Block Time",
        legal: "Intent Time",
        tidal: "T+2 Days",
      },
      {
        category: "Execution",
        label: "Custody",
        instant: "Qualified + MPC",
        legal: "Qualified + MPC",
        tidal: "Traditional Bank",
      },
    ],
    faqs: [
      {
        question: "What is the difference between Instant and Legal?",
        answer:
          "Instant vaults are designed for beta testing and building a track record with capped amounts. Legal vaults are for full-scale institutional capital and require a DAO check.",
      },
      {
        question: "Can I upgrade from Instant to Legal?",
        answer:
          "Yes. Once you pay the $1k approval fee your Instant vault is converted uppon approval by the DAO..",
      },
      {
        question: "Why are Tidal / ETF estimates included?",
        answer:
          "We provide these comparisons to show the speed and cost efficiency of on-chain structures compared to traditional Wall Street ETF issuance.",
      },
    ],
    disclaimer:
      "* Disclaimer: 'Traditional ETF' estimates are based on industry standards for white-label ETF services. IndexMaker is a technology provider. Instant Vaults are permissionless technology demos.",
  };

  // Morpho-style Theme Logic
  const getThemeColors = (theme: string) => {
    switch (theme) {
      case "blue":
        return {
          bg: "bg-blue-500/10",
          text: "text-blue-500",
          border: "border-blue-500/20",
          btn: "bg-blue-600 hover:bg-blue-500 text-white border-0",
          badge: "bg-blue-500/20 text-blue-400",
          hover: "hover:bg-blue-500/5",
        };
      case "orange": // The new FFA300 Theme
        return {
          bg: "bg-[#FFA300]/10",
          text: "text-[#FFA300]",
          border: "border-[#FFA300]/20",
          btn: "bg-[#FFA300] hover:bg-[#FFB700] text-black font-semibold border-0",
          badge: "bg-[#FFA300]/20 text-[#FFA300]",
          hover: "hover:bg-[#FFA300]/5",
        };
      default: // Gray/Tidal
        return {
          bg: "bg-zinc-800/50",
          text: "text-zinc-400",
          border: "border-zinc-700",
          btn: "bg-transparent border border-zinc-600 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500",
          badge: "bg-zinc-800 text-zinc-500",
          hover: "hover:bg-zinc-800/50",
        };
    }
  };

  let lastCategory = "";

  return (
    <Dashboard>
      <div className="max-w-7xl mx-auto space-y-12 pb-20">
        
        {/* Header - Technical / Minimal */}
        <div className="pt-10 pb-6 text-center border-b border-border/10">
          <h1 className="text-3xl md:text-5xl font-bold text-primary tracking-tight">
            {pageContent.hero.title}
          </h1>
          <p className="mt-4 text-secondary/60 text-lg font-light max-w-2xl mx-auto">
            {pageContent.hero.subtitle}
          </p>
        </div>

        {/* ==================================================================================
            MOBILE VIEW: Stacked Modular Cards
           ================================================================================== */}
        <div className="flex flex-col gap-6 md:hidden">
          {Object.entries(pageContent.offerings).map(([key, offer]) => {
            const styles = getThemeColors(offer.theme);
            const dataKey = key as "instant" | "legal" | "tidal";

            return (
              <div
                key={key}
                className={`rounded-lg overflow-hidden border ${styles.border} bg-background`}
              >
                {/* Header */}
                <div className={`p-6 border-b border-border/10 ${styles.bg}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <offer.icon className={`w-5 h-5 ${styles.text}`} />
                      <h2 className="text-lg font-bold text-primary tracking-tight">
                        {offer.title}
                      </h2>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-mono ${styles.badge}`}>
                      {offer.badge}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-6">
                    {offer.features.map((feature, idx) => (
                      <div key={idx} className="flex gap-3 items-start">
                         <Check className={`h-4 w-4 ${styles.text} flex-shrink-0 mt-0.5`} />
                         <p className="text-sm text-secondary/80 font-light">{feature}</p>
                      </div>
                    ))}
                  </div>

                  {offer.buttonLink.startsWith("http") ? (
                    <a href={offer.buttonLink} target="_blank" rel="noreferrer" className="block w-full">
                         <CustomButton className={`w-full rounded-md ${styles.btn}`}>
                            {offer.buttonText}
                            {key === 'tidal' && <ExternalLink className="ml-2 w-3 h-3"/>}
                         </CustomButton>
                    </a>
                  ) : (
                    <Link href={offer.buttonLink} className="block w-full">
                        <CustomButton className={`w-full rounded-md ${styles.btn}`}>
                            {offer.buttonText}
                        </CustomButton>
                    </Link>
                  )}
                </div>

                {/* Data Rows */}
                <div className="divide-y divide-border/10">
                  {pageContent.comparisonRows.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-2 p-4 text-sm">
                      <span className="text-secondary/50 font-medium text-xs uppercase tracking-wide">
                        {row.label}
                      </span>
                      <span className={`text-right font-mono ${key === 'legal' ? 'text-[#FFA300]' : 'text-primary'}`}>
                        {row[dataKey]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* ==================================================================================
            DESKTOP VIEW: Technical Grid
           ================================================================================== */}
        <div className="hidden md:block bg-background rounded-lg border border-border/20 shadow-sm overflow-hidden">
          
          {/* Main Grid Header */}
          <div className="grid grid-cols-10 border-b border-border/20">
            {/* Legend Column */}
            <div className="col-span-2 p-6 border-r border-border/20 flex flex-col justify-end bg-accent/5">
              <span className="text-xs font-mono text-secondary/40 uppercase tracking-widest">
                Metric
              </span>
            </div>

            {/* Instant Column Header */}
            <div className="col-span-3 p-6 border-r border-border/20 bg-blue-500/[0.02]">
              <div className="flex items-center justify-between mb-4">
                 <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
                   <Zap className="w-4 h-4 text-blue-500" /> Instant
                 </h2>
                 <span className="text-[10px] font-mono bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded">BETA</span>
              </div>
              <div className="space-y-1.5 mb-6 min-h-[80px]">
                {pageContent.offerings.instant.features.map((f, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Check className="h-3 w-3 text-blue-500" />
                    <p className="text-xs text-secondary/70">{f}</p>
                  </div>
                ))}
              </div>
              <Link href={pageContent.offerings.instant.buttonLink}>
                <CustomButton className="w-full bg-blue-600 hover:bg-blue-500 text-white h-9 text-xs font-mono rounded">
                    DEPLOY INSTANT
                </CustomButton>
              </Link>
            </div>

            {/* Legal Column Header */}
            <div className="col-span-3 p-6 border-r border-border/20 bg-[#FFA300]/[0.02] relative overflow-hidden">
              <div className="absolute top-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#FFA300]/50 to-transparent opacity-50"></div>
              <div className="flex items-center justify-between mb-4">
                 <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
                   <Globe className="w-4 h-4 text-[#FFA300]" /> Legal
                 </h2>
                 <span className="text-[10px] font-mono bg-[#FFA300]/10 text-[#FFA300] px-2 py-0.5 rounded">PRO</span>
              </div>
              <div className="space-y-1.5 mb-6 min-h-[80px]">
                {pageContent.offerings.legal.features.map((f, i) => (
                   <div key={i} className="flex gap-2 items-center">
                     <Check className="h-3 w-3 text-[#FFA300]" />
                     <p className="text-xs text-secondary/70">{f}</p>
                   </div>
                ))}
              </div>
              <a href={pageContent.offerings.legal.buttonLink} target="_blank" rel="noreferrer">
                <CustomButton className="w-full bg-[#FFA300] hover:bg-[#FFB700] text-black h-9 text-xs font-mono font-bold rounded">
                    EARLY ACCESS
                </CustomButton>
              </a>
            </div>

            {/* Tidal Column Header */}
            <div className="col-span-2 p-6 bg-zinc-500/[0.02] grayscale opacity-70 hover:opacity-100 hover:grayscale-0 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                 <h2 className="text-lg font-semibold text-secondary flex items-center gap-2">
                   <Building2 className="w-4 h-4" /> Traditional
                 </h2>
              </div>
              <div className="space-y-1.5 mb-6 min-h-[80px]">
                {pageContent.offerings.tidal.features.map((f, i) => (
                   <div key={i} className="flex gap-2 items-center">
                     <X className="h-3 w-3 text-red-400/70" />
                     <p className="text-xs text-secondary/50">{f}</p>
                   </div>
                ))}
              </div>
              <a href={pageContent.offerings.tidal.buttonLink} target="_blank" rel="noreferrer">
                <CustomButton className="w-full bg-transparent border border-border/40 text-secondary hover:bg-accent h-9 text-[10px] px-1 font-mono rounded">
                    VIEW EXTERNAL
                </CustomButton>
              </a>
            </div>
          </div>

          {/* Data Rows */}
          <div className="divide-y divide-border/10">
            {pageContent.comparisonRows.map((item, index) => {
              const showCategoryHeader = item.category !== lastCategory;
              lastCategory = item.category;
              return (
                <div key={index}>
                  {showCategoryHeader && (
                    <div className="bg-accent/5 px-6 py-1.5 border-y border-border/10">
                      <h3 className="text-[10px] font-mono font-bold text-secondary/40 uppercase tracking-widest">
                        {item.category}
                      </h3>
                    </div>
                  )}
                  <div className="grid grid-cols-10 hover:bg-accent/5 transition-colors group">
                    {/* Label */}
                    <div className="col-span-2 p-4 border-r border-border/10 text-secondary/70 text-xs font-medium flex items-center">
                      {item.label}
                    </div>
                    {/* Instant Value */}
                    <div className="col-span-3 p-4 border-r border-border/10 text-primary text-sm font-mono flex items-center">
                      {item.instant}
                    </div>
                    {/* Legal Value */}
                    <div className="col-span-3 p-4 border-r border-border/10 bg-[#FFA300]/[0.01] text-[#FFA300] text-sm font-mono flex items-center">
                      {item.legal}
                    </div>
                    {/* Tidal Value */}
                    <div className="col-span-2 p-4 text-secondary/40 text-sm font-mono flex items-center group-hover:text-secondary/70 transition-colors">
                      {item.tidal}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="p-3 bg-accent/5 border-t border-border/10 text-center">
            <p className="text-[10px] text-secondary/40 font-mono">
              {pageContent.disclaimer}
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="space-y-6 pt-10">
          <h2 className="text-xl md:text-2xl font-bold text-primary tracking-tight">
            Common Questions
          </h2>
          <Accordion type="single" collapsible className="space-y-3">
            {pageContent.faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-background border border-border/20 rounded px-6 data-[state=open]:border-border/40"
              >
                <AccordionTrigger className="text-primary hover:no-underline py-4 text-sm font-medium">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-secondary/70 pb-4 text-sm">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </Dashboard>
  );
}
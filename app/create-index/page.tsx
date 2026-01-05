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
        legal: "Global (Permissionless)",
        tidal: "Restricted (Region Specific)",
      },
      {
        category: "Structure",
        label: "Legal Wrapper",
        instant: "None (Tech Sandbox)",
        legal: "DAO Registered (Series LLC)",
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
      case "orange": // The Professional Blue Theme
        return {
          bg: "bg-[#2470ff]/10",
          text: "text-[#2470ff]",
          border: "border-[#2470ff]/20",
          btn: "bg-[#2470ff] hover:bg-[#1a5acc] text-white font-semibold border-0",
          badge: "bg-[#2470ff]/20 text-[#2470ff]",
          hover: "hover:bg-[#2470ff]/5",
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
      <div className="max-w-7xl mx-auto pb-20">
        
        {/* Header - Minimal, matching ecosystem style */}
        <div className="flex flex-col gap-4 pt-6 pb-10">
          <h1 className="text-[38px] font-normal text-primary h-[44px] items-center flex">
            {pageContent.hero.title}
          </h1>
          <p className="text-secondary text-[14px]">
            {pageContent.hero.subtitle}
          </p>
        </div>

        {/* Mobile View: Stacked Cards */}
        <div className="flex flex-col gap-4 md:hidden pb-10">
          {Object.entries(pageContent.offerings).map(([key, offer]) => {
            const styles = getThemeColors(offer.theme);
            const dataKey = key as "instant" | "legal" | "tidal";

            return (
              <div
                key={key}
                className="rounded-lg overflow-hidden border border-border bg-foreground"
              >
                {/* Header */}
                <div className="p-6 border-b border-border">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <offer.icon className={`w-5 h-5 ${styles.text}`} />
                      <h2 className="text-[20px] font-medium text-primary">
                        {offer.title}
                      </h2>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded uppercase font-mono ${styles.badge}`}>
                      {offer.badge}
                    </span>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    {offer.features.map((feature, idx) => (
                      <div key={idx} className="flex gap-3 items-center">
                         <Check className={`h-4 w-4 ${styles.text} flex-shrink-0`} />
                         <p className="text-[13px] text-secondary">{feature}</p>
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
                <div className="divide-y divide-border">
                  {pageContent.comparisonRows.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-2 p-4">
                      <span className="text-secondary text-[13px]">
                        {row.label}
                      </span>
                      <span className={`text-right text-[13px] font-mono ${key === 'legal' ? 'text-[#2470ff]' : 'text-primary'}`}>
                        {row[dataKey]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View: Comparison Table */}
        <div className="hidden md:block bg-foreground rounded-lg border border-border overflow-hidden">
          
          {/* Header Row */}
          <div className="grid grid-cols-10 border-b border-border">
            {/* Legend Column */}
            <div className="col-span-2 p-6 border-r border-border flex flex-col justify-end">
              <span className="text-[13px] text-secondary uppercase">
                Metric
              </span>
            </div>

            {/* Instant Column Header */}
            <div className="col-span-3 p-6 border-r border-border">
              <div className="flex items-center justify-between mb-4">
                 <h2 className="text-[18px] font-medium text-primary flex items-center gap-2">
                   <Zap className="w-4 h-4 text-blue-500" /> Instant
                 </h2>
                 <span className="text-[10px] font-mono bg-blue-500/10 text-blue-500 px-2 py-1 rounded">BETA</span>
              </div>
              <div className="space-y-2 mb-6 min-h-[80px]">
                {pageContent.offerings.instant.features.map((f, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Check className="h-3.5 w-3.5 text-blue-500" />
                    <p className="text-[13px] text-secondary">{f}</p>
                  </div>
                ))}
              </div>
              <Link href={pageContent.offerings.instant.buttonLink}>
                <CustomButton className="w-full bg-blue-600 hover:bg-blue-500 text-white h-9 text-[13px] rounded">
                    Deploy Instant
                </CustomButton>
              </Link>
            </div>

            {/* Legal Column Header */}
            <div className="col-span-3 p-6 border-r border-border">
              <div className="flex items-center justify-between mb-4">
                 <h2 className="text-[18px] font-medium text-primary flex items-center gap-2">
                   <Globe className="w-4 h-4 text-[#2470ff]" /> Legal
                 </h2>
                 <span className="text-[10px] font-mono bg-[#2470ff]/10 text-[#2470ff] px-2 py-1 rounded">PRO</span>
              </div>
              <div className="space-y-2 mb-6 min-h-[80px]">
                {pageContent.offerings.legal.features.map((f, i) => (
                   <div key={i} className="flex gap-2 items-center">
                     <Check className="h-3.5 w-3.5 text-[#2470ff]" />
                     <p className="text-[13px] text-secondary">{f}</p>
                   </div>
                ))}
              </div>
              <a href={pageContent.offerings.legal.buttonLink} target="_blank" rel="noreferrer">
                <CustomButton className="w-full bg-[#2470ff] hover:bg-[#1a5acc] text-white h-9 text-[13px] rounded">
                    Early Access
                </CustomButton>
              </a>
            </div>

            {/* Tidal Column Header */}
            <div className="col-span-2 p-6 opacity-60 hover:opacity-100 transition-opacity">
              <div className="flex items-center justify-between mb-4">
                 <h2 className="text-[18px] font-medium text-secondary flex items-center gap-2">
                   <Building2 className="w-4 h-4" /> Traditional
                 </h2>
              </div>
              <div className="space-y-2 mb-6 min-h-[80px]">
                {pageContent.offerings.tidal.features.map((f, i) => (
                   <div key={i} className="flex gap-2 items-center">
                     <X className="h-3.5 w-3.5 text-red-400/70" />
                     <p className="text-[13px] text-secondary/70">{f}</p>
                   </div>
                ))}
              </div>
              <a href={pageContent.offerings.tidal.buttonLink} target="_blank" rel="noreferrer">
                <CustomButton className="w-full bg-transparent border border-border text-secondary hover:bg-accent h-9 text-[13px] rounded">
                    View External
                </CustomButton>
              </a>
            </div>
          </div>

          {/* Data Rows */}
          <div className="divide-y divide-border">
            {pageContent.comparisonRows.map((item, index) => {
              const showCategoryHeader = item.category !== lastCategory;
              lastCategory = item.category;
              return (
                <div key={index}>
                  {showCategoryHeader && (
                    <div className="bg-background px-6 py-2 border-y border-border">
                      <h3 className="text-[11px] font-medium text-secondary uppercase">
                        {item.category}
                      </h3>
                    </div>
                  )}
                  <div className="grid grid-cols-10 hover:bg-background transition-colors">
                    {/* Label */}
                    <div className="col-span-2 p-4 border-r border-border text-secondary text-[13px] flex items-center">
                      {item.label}
                    </div>
                    {/* Instant Value */}
                    <div className="col-span-3 p-4 border-r border-border text-primary text-[13px] font-mono flex items-center">
                      {item.instant}
                    </div>
                    {/* Legal Value */}
                    <div className="col-span-3 p-4 border-r border-border text-[#2470ff] text-[13px] font-mono flex items-center">
                      {item.legal}
                    </div>
                    {/* Tidal Value */}
                    <div className="col-span-2 p-4 text-secondary text-[13px] font-mono flex items-center">
                      {item.tidal}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="p-4 bg-background border-t border-border text-center">
            <p className="text-[11px] text-secondary">
              {pageContent.disclaimer}
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="flex flex-col gap-4 pt-16">
          <h2 className="text-[20px] font-medium text-primary">
            Common Questions
          </h2>
          <Accordion type="single" collapsible className="space-y-2">
            {pageContent.faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-foreground border border-border rounded-lg px-6"
              >
                <AccordionTrigger className="text-primary hover:no-underline py-4 text-[14px]">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-secondary pb-4 text-[13px]">
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

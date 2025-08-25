import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tax Calculator | IndexMaker",
  description: "Compare tax implications of ETF vs Crypto investments across multiple countries with our comprehensive tax calculator.",
  keywords: ["tax calculator", "ETF tax", "crypto tax", "investment tax", "capital gains"],
  openGraph: {
    title: "Tax Calculator | IndexMaker",
    description: "Compare tax implications of ETF vs Crypto investments across multiple countries",
    type: "website",
  },
};

export default function CalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 overflow-auto">
      {children}
    </div>
  );
}

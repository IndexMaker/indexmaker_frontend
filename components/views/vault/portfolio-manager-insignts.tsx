import { Card, CardContent } from "@/components/ui/card";
import { getIndexData } from "@/lib/IndexMockupData";
import Image from 'next/image';
import Chri_Lin_Bio from "../../../public/images/Chris Lin biotech.jpg";
export default function PortfolioManagerInsights({indexId = 'SY100'}: {indexId: string}) {
  const portfolioManagerInsights = getIndexData(indexId).portfolioManagerInsights || []
  return (
    <Card className="w-full min-w-[350px] h-[430px] border-none bg-foreground overflow-auto p-2 gap-2 flex-1">
      <div className="px-3 pb-1 border-b border-gray-200">
        <h2 className="text-[16px] font-semibold">Portfolio Manager Insights</h2>
      </div>
      
      <CardContent className="p-4 overflow-y-auto flex-1 space-y-6">
        {portfolioManagerInsights.map((insight: any) => (
          <div key={insight.id} className="space-y-3">
            <div className="w-full">
              <Image
                src={Chri_Lin_Bio}
                alt={insight.title}
                width={400}
                height={300}
                className={insight.imageClassName}
                priority={insight.id === 1} // Only prioritize first image
              />
            </div>
            
            <div className="space-y-2">
              <h3 className={`text-[14px] font-medium ${
                insight.isLink ? "text-[#2470ff] hover:underline cursor-pointer" : ""
              }`}>
                {insight.title}
              </h3>
              <p className="text-[13px] leading-relaxed text-secondary">
                {insight.description}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

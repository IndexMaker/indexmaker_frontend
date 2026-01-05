import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { getIndexData } from "@/lib/IndexMockupData";
import { Info, MoreVertical } from "lucide-react"

export default function FundManager({indexId = 'SY100'}: {indexId: string}) {
  const { manager, managedFunds, commentaryLinks } = (getIndexData(indexId) || getIndexData("SY100"))?.fundManagerData || {};

  return (
    <Card className="w-full min-w-[350px] h-[440px] border-none bg-foreground overflow-auto flex flex-1 p-2 gap-2">
      {/* Header */}
      <div className="px-3 pb-1 border-b border-gray-200">
        <h2 className="flex items-center gap-2 text-[16px] font-bold">
          Fund Manager(s)
          <Info className="h-4 w-4 text-[#2470ff]" />
        </h2>
      </div>

      {/* Content */}
      <CardContent className="p-4 overflow-y-auto flex-1">
        {/* Manager Profile */}
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gray-300 rounded-full h-12 w-12 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-gray-600"
            >
              <circle cx="12" cy="8" r="5" />
              <path d="M20 21a8 8 0 0 0-16 0" />
            </svg>
          </div>
          <div>
            <div className="font-medium">{manager.name}</div>
            <div className="text-sm text-gray-600">{manager.role}</div>
            <div className="text-sm text-gray-500">Manager Tenure: since {manager.tenureStartDate}</div>
          </div>
        </div>

        {/* Managed Funds */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Funds Currently Managed</h3>
            <MoreVertical className="h-5 w-5 text-gray-500 cursor-pointer" />
          </div>
          <div className="h-[1px] bg-[#2470ff] w-full mb-3"></div>
          <ul className="space-y-3">
            {managedFunds.map((fund: any, index: number) => (
              <li key={index + '-managed'} className="text-[13px] pl-2">
                <span 
                  dangerouslySetInnerHTML={{ 
                    __html: `${fund.name} <span class="text-gray-500">(since ${fund.startDate})</span>`
                      .replace(/®/g, "<sup>®</sup>") 
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
      </CardContent>

      {/* Footer */}
      {/* <CardFooter className="p-4 border-t border-gray-200">
        <div className="w-full">
          <h3 className="font-medium mb-2">Commentary</h3>
          <div className="grid grid-cols-2 gap-2">
            {commentaryLinks.map((link: any, index: number) => (
              <a
                key={index + '-commentary'}
                href={link.url}
                className="text-sm text-[#2470ff] hover:underline cursor-pointer"
              >
                {link.title}
              </a>
            ))}
          </div>
        </div>
      </CardFooter> */}
    </Card>
  );
}

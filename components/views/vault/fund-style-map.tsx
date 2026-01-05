import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { getIndexData } from "@/lib/IndexMockupData";
import { Info } from "lucide-react";

export default function EquityStyleMap({
  indexId = "SY100",
}: {
  indexId: string;
}) {
  const equityData = (getIndexData(indexId) || getIndexData("SY100"))?.equityStyleMap || {};

  const styleLabels = ["Value", "Blend", "Growth"];
  const capLabels = ["LG", "MD", "SM"];

  const renderGrid = () => {
    const grid = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const isCurrent =
          equityData.currentPosition?.x === col &&
          equityData.currentPosition?.y === row;
        const isHistorical =
          equityData.historicalPosition?.x === col &&
          equityData.historicalPosition?.y === row;

        grid.push(
          <div
            key={`${row}-${col}`}
            className="w-12 h-12 border border-gray-300 bg-white relative flex items-center justify-center"
          >
            {isHistorical && (
              <div className="absolute inset-0 bg-blue-300 z-0"></div>
            )}
            {isCurrent && (
              <div className="w-6 h-6 bg-blue-800 rounded-full z-10"></div>
            )}
          </div>
        );
      }
    }
    return grid;
  };

  return (
    <Card className="w-full min-w-[350px] h-[440px] border-none bg-foreground overflow-auto p-2 gap-2 flex-1">
      <div className="pb-1 border-b-1 border-gray-200">
        <CardTitle className="flex items-center justify-start text-[16px] gap-1 px-3 font-bold">
          <div className="flex items-center gap-2">
            Index StyleMap<sup>®</sup>
            <Info className="h-4 w-4 text-[#2470ff]" />
          </div>
          <span className="text-[12px] text-gray-500 font-semibold">
            AS OF {equityData.asOfDate}
          </span>
        </CardTitle>
      </div>
      <CardContent className="space-y-4 overflow-y-auto px-3">
        {/* Legend */}
        <div className="flex gap-4 text-[12px] justify-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-800 rounded-full"></div>
            <span>Current</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-300 rounded-none"></div>
            <span>Historical</span>
          </div>
        </div>

        {/* Style Grid */}
        <div className="flex items-center gap-4 justify-center">
          {/* Y-axis labels */}
          <div
            className="text-[12px] font-semibold text-center mb-2 border-l-3 border-dotted border-[#024a7a] cursor-help"
            style={{
              writingMode: "vertical-lr",
              whiteSpace: "nowrap",
              transform: "rotate(180deg)",
            }}
          >
            Capitalization
          </div>
          <div className="flex flex-row gap-0 mt-[50px]">
            <div className="flex flex-col">
              {capLabels.map((label, index) => (
                <div
                  key={index}
                  className="h-12 flex items-center justify-center text-[11px] font-semibold"
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="flex flex-col">
            {/* X-axis labels */}
            <div className="flex mb-2">
              <div className="text-[12px] font-semibold text-center mb-1 border-b-3 border-dotted border-[#024a7a]">
                Style
              </div>
            </div>
            <div className="flex mb-1">
              {styleLabels.map((label, index) => (
                <div
                  key={index}
                  className="w-12 text-center text-[11px] font-semibold"
                >
                  {label}
                </div>
              ))}
            </div>
            {/* Grid cells */}
            <div className="grid grid-cols-3 gap-0">{renderGrid()}</div>
          </div>
        </div>

        {/* Category Info */}
        <div className="space-y-2">
          <h3 className="text-[14px] font-semibold">{equityData.category}</h3>
      
          <p className="text-[12px] leading-relaxed">
            {equityData.description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

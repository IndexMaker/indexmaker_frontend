"use client";

import { useState, useEffect } from "react";
import { format, subDays, subMonths, startOfDay } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";

export type TimeRangePreset = "24h" | "7d" | "30d" | "90d" | "all" | "custom";

interface TimeRange {
  startDate: string | undefined;
  endDate: string | undefined;
  preset: TimeRangePreset;
}

interface TimeRangeSelectorProps {
  onTimeRangeChange: (range: TimeRange) => void;
  className?: string;
}

const presets: { value: TimeRangePreset; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "all", label: "All Time" },
  { value: "custom", label: "Custom" },
];

export function TimeRangeSelector({
  onTimeRangeChange,
  className,
}: TimeRangeSelectorProps) {
  const [selectedPreset, setSelectedPreset] = useState<TimeRangePreset>("30d");
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Apply default time range on mount
  useEffect(() => {
    const endDate = startOfDay(new Date());
    const startDate = subDays(endDate, 30);
    onTimeRangeChange({
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
      preset: "30d",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePresetClick = (preset: TimeRangePreset) => {
    setSelectedPreset(preset);

    if (preset === "custom") {
      setShowCustomPicker(true);
      return;
    }

    setShowCustomPicker(false);
    const endDate = startOfDay(new Date());
    let startDate: Date | undefined;

    switch (preset) {
      case "24h":
        startDate = subDays(endDate, 1);
        break;
      case "7d":
        startDate = subDays(endDate, 7);
        break;
      case "30d":
        startDate = subDays(endDate, 30);
        break;
      case "90d":
        startDate = subMonths(endDate, 3);
        break;
      case "all":
        startDate = undefined;
        break;
    }

    onTimeRangeChange({
      startDate: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
      endDate: preset === "all" ? undefined : format(endDate, "yyyy-MM-dd"),
      preset,
    });
  };

  const handleCustomDateChange = () => {
    if (customStartDate && customEndDate) {
      onTimeRangeChange({
        startDate: format(customStartDate, "yyyy-MM-dd"),
        endDate: format(customEndDate, "yyyy-MM-dd"),
        preset: "custom",
      });
    }
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="flex flex-wrap gap-1">
        {presets.map((preset) => (
          <Button
            key={preset.value}
            variant={selectedPreset === preset.value ? "default" : "outline"}
            size="sm"
            onClick={() => handlePresetClick(preset.value)}
            className={cn(
              "h-8 px-3 text-xs",
              selectedPreset === preset.value && "bg-primary text-primary-foreground"
            )}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {showCustomPicker && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <DatePicker
              selected={customStartDate}
              onChange={(date) => setCustomStartDate(date)}
              selectsStart
              startDate={customStartDate}
              endDate={customEndDate}
              maxDate={customEndDate || new Date()}
              placeholderText="Start date"
              className="h-8 w-28 rounded-md border border-input bg-background px-2 text-xs"
              dateFormat="yyyy-MM-dd"
            />
          </div>
          <span className="text-muted-foreground text-xs">to</span>
          <DatePicker
            selected={customEndDate}
            onChange={(date) => setCustomEndDate(date)}
            selectsEnd
            startDate={customStartDate}
            endDate={customEndDate}
            minDate={customStartDate || undefined}
            maxDate={new Date()}
            placeholderText="End date"
            className="h-8 w-28 rounded-md border border-input bg-background px-2 text-xs"
            dateFormat="yyyy-MM-dd"
          />
          <Button
            size="sm"
            onClick={handleCustomDateChange}
            disabled={!customStartDate || !customEndDate}
            className="h-8 px-3 text-xs"
          >
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}

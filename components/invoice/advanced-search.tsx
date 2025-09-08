"use client"

import React, { useState, forwardRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, X, CalendarIcon, SlidersHorizontal } from "lucide-react"
import { format } from "date-fns"
import DatePicker from "react-datepicker"
import { Separator } from "@radix-ui/react-select"
import "react-datepicker/dist/react-datepicker.css"

export interface SearchFilters {
  query: string
  status: string
  symbol: string
  minAmount: string
  maxAmount: string
  dateFrom: Date | undefined
  dateTo: Date | undefined
  fillRateMin: string
  fillRateMax: string
}

interface AdvancedSearchProps {
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  onReset: () => void
  activeFilterCount: number
}

export function AdvancedSearch({ filters, onFiltersChange, onReset, activeFilterCount }: AdvancedSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const hasActiveFilters = activeFilterCount > 0

  // Button-like input for the pickers
  const DateButton = forwardRef<HTMLButtonElement, { value?: string; onClick?: () => void; placeholder?: string }>(
    ({ value, onClick, placeholder }, ref) => (
      <Button
        ref={ref}
        type="button"
        variant="outline"
        onClick={onClick}
        className="w-full justify-start text-left font-normal"
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {value || placeholder}
      </Button>
    )
  )
  DateButton.displayName = "DateButton"

  const handleFromChange = (date: Date | null) => {
    const from = date ?? undefined
    // If "from" goes after current "to", clear "to"
    const to = filters.dateTo && from && from > filters.dateTo ? undefined : filters.dateTo
    onFiltersChange({ ...filters, dateFrom: from, dateTo: to })
  }

  const handleToChange = (date: Date | null) => {
    const to = date ?? undefined
    // If "to" goes before current "from", clear "from"
    const from = filters.dateFrom && to && to < filters.dateFrom ? undefined : filters.dateFrom
    onFiltersChange({ ...filters, dateFrom: from, dateTo: to })
  }

  return (
    <Card className="bg-foreground">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Search & Filters</CardTitle>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {activeFilterCount} active
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="h-8">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              {isExpanded ? "Simple" : "Advanced"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Basic Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search invoices, addresses, or IDs..."
            value={filters.query}
            onChange={(e) => updateFilter("query", e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2">
          <Select value={filters.status} onValueChange={(value) => updateFilter("status", value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.symbol} onValueChange={(value) => updateFilter("symbol", value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Symbol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Symbols</SelectItem>
              <SelectItem value="SY100">SY100</SelectItem>
              <SelectItem value="SYAZ">SYAZ</SelectItem>
              <SelectItem value="SYAI">SYAI</SelectItem>
              <SelectItem value="SYME">SYME</SelectItem>
              <SelectItem value="SYL2">SYL2</SelectItem>
              <SelectItem value="SYDF">SYDF</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={onReset} className="h-10">
              <X className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>

        {/* Advanced Filters */}
        {isExpanded && (
          <>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Amount Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Amount Range (USD)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Min"
                    value={filters.minAmount}
                    onChange={(e) => updateFilter("minAmount", e.target.value)}
                    type="number"
                  />
                  <Input
                    placeholder="Max"
                    value={filters.maxAmount}
                    onChange={(e) => updateFilter("maxAmount", e.target.value)}
                    type="number"
                  />
                </div>
              </div>

              {/* Fill Rate Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Fill Rate (%)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Min %"
                    value={filters.fillRateMin}
                    onChange={(e) => updateFilter("fillRateMin", e.target.value)}
                    type="number"
                    min="0"
                    max="100"
                  />
                  <Input
                    placeholder="Max %"
                    value={filters.fillRateMax}
                    onChange={(e) => updateFilter("fillRateMax", e.target.value)}
                    type="number"
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              {/* Date Range (two single pickers) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Date Range</Label>
                  {(filters.dateFrom || filters.dateTo) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 px-2"
                      onClick={() => onFiltersChange({ ...filters, dateFrom: undefined, dateTo: undefined })}
                    >
                      <X className="h-4 w-4 mr-1" /> Clear
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  {/* From */}
                  <DatePicker
                    selected={filters.dateFrom ?? null}
                    onChange={handleFromChange}
                    selectsStart
                    startDate={filters.dateFrom ?? undefined}
                    endDate={filters.dateTo ?? undefined}
                    maxDate={filters.dateTo ?? undefined}
                    placeholderText="From"
                    dateFormat="PP"
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                    isClearable
                    customInput={<DateButton placeholder="From" />}
                    withPortal
                  />

                  {/* To */}
                  <DatePicker
                    selected={filters.dateTo ?? null}
                    onChange={handleToChange}
                    selectsEnd
                    startDate={filters.dateFrom ?? undefined}
                    endDate={filters.dateTo ?? undefined}
                    minDate={filters.dateFrom ?? undefined}
                    placeholderText="To"
                    dateFormat="PP"
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                    isClearable
                    customInput={<DateButton placeholder="To" />}
                    withPortal
                  />
                </div>
                {/* Optional: compact preview under the buttons */}
                {(filters.dateFrom || filters.dateTo) && (
                  <p className="text-xs text-muted-foreground">
                    {filters.dateFrom ? format(filters.dateFrom, "PP") : "—"} &nbsp;–&nbsp;{" "}
                    {filters.dateTo ? format(filters.dateTo, "PP") : "—"}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

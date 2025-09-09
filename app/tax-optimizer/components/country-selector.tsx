"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUPPORTED_COUNTRIES } from "@/lib/calculator/constants";
import { selectSelectedCountry } from "@/redux/calculatorSelectors";
import { setSelectedCountry } from "@/redux/calculatorSlice";
import type { AppDispatch } from "@/redux/store";
import { useDispatch, useSelector } from "react-redux";

export function CountrySelector() {
  const dispatch = useDispatch<AppDispatch>();
  const selectedCountry = useSelector(selectSelectedCountry);

  const handleCountryChange = (country: string) => {
    dispatch(setSelectedCountry(country));
  };
  return (
    <div className="space-y-2">
      <Select value={selectedCountry} onValueChange={handleCountryChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a country" />
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_COUNTRIES.map((country) => (
            <SelectItem key={country.code} value={country.code}>
              <div className="flex items-center gap-2">
                <span>{country.flag}</span>
                <span>{country.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

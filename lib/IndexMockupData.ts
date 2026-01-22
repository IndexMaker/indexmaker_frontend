// Index data is now fetched from the backend API
// This file provides a fallback structure for components that haven't been migrated yet

const STANDARD_RISK_DISCLOSURE = `Cryptocurrencies and related markets are highly volatile and can decline significantly in response to adverse issuer-specific, technological, regulatory, political, market, or macroeconomic developments.`;

const STANDARD_DISCLOSURE_LINK = `This description is only intended to provide a brief overview of the index. Read the index's key investors information document for more detailed information.`;

// Empty structure - all index data should come from API
export const indexData: Record<string, any> = {};

// Helper function to get data by index ID
// Returns null for all indexes - data should be fetched from API
export const getIndexData = (indexId: string): any | null => {
  return indexData[indexId] || null;
};

// Default empty structure for components that expect certain fields
export const getEmptyIndexData = () => ({
  fundDetails: [],
  equityStyleMap: null,
  fundManagerData: null,
  fundOverviewData: null,
  fundRisk: null,
  description: null,
  documents: [],
});

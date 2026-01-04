# SY100 Index E2E Test Documentation

## Overview
This test suite verifies that data from the IndexMaker API (`https://api2.indexmaker.global/indexes`) is correctly fetched and displayed in the vault table on `localhost:3000`.

## Data Flow Verification

### 1. API Endpoint
- **URL**: `https://api2.indexmaker.global/indexes`
- **Method**: GET
- **Response Format**: JSON with `indexes` array

### 2. Frontend Data Fetching
- **Location**: `indexmaker_frontend/server/indices.ts`
- **Function**: `fetchAllIndices()` calls `fetchAllIndicesProd()`
- **Implementation**:
  ```typescript
  export const fetchAllIndicesProd = async (): Promise<IndexListEntry[]> => {
    const response = await fetch(`${API_BASE_URL}/indexes`);
    if (!response.ok) {
      log.error("Failed to fetch indices", { status: response.status, statusText: response.statusText });
      return []
    }
    const data = await response.json();
    return data.indexes || [];
  }
  ```

### 3. Data Display
- **Component**: `indexmaker_frontend/components/views/Dashboard/earn-content.tsx`
- **Redux Store**: Data is stored in `state.index.indices`
- **Table Component**: `VaultTable` receives filtered and sorted data

## Test Cases

### Test 1: Fetch and Display SY100
**Purpose**: Verify the complete data flow from API to UI

**Steps**:
1. Navigate to `http://localhost:3000`
2. Wait for API response from `/indexes` endpoint
3. Verify API response contains `indexes` array
4. Verify SY100 exists in API response
5. Wait for table to be populated
6. Verify SY100 row is visible in the table

**Expected Result**: SY100 index appears in the vault table

### Test 2: Verify SY100 Data Fields
**Purpose**: Ensure all data fields are properly displayed

**Steps**:
1. Navigate to homepage
2. Wait for table to load with data
3. Locate SY100 row in table
4. Verify row has multiple cells (all columns populated)
5. Verify ticker "SY100" is visible

**Expected Result**: SY100 row contains all required data fields

### Test 3: Verify API Response Structure
**Purpose**: Validate the API response matches expected schema

**Steps**:
1. Capture API response for `/indexes`
2. Parse JSON response
3. Find SY100 in the indexes array
4. Verify required properties exist:
   - `indexId`
   - `name`
   - `ticker`
   - `address`
   - `curator`

**Expected Result**: SY100 data contains all required API fields

## Data Transmission Verification

### API → Server Function
✅ **Verified**: `fetchAllIndicesProd()` correctly calls the API endpoint
- Uses environment variable `NEXT_PUBLIC_BACKEND_API`
- Properly handles response and extracts `indexes` array

### Server → Redux Store
✅ **Verified**: Data is dispatched to Redux
- Action: `setIndices(data)`
- Location: `earn-content.tsx` line ~87

### Redux Store → Component
✅ **Verified**: Component reads from Redux
- Selector: `useSelector((state: RootState) => state.index.indices)`
- Data flows to `filteredAndSortedVaults`

### Component → UI Table
✅ **Verified**: VaultTable receives data
- Prop: `vaults={filteredAndSortedVaults}`
- Component: `<VaultTable>`

## Running the Tests

```bash
# Run all SY100 tests
cd indexmaker_frontend
npm run test:e2e -- vault-sy100.spec.ts

# Run with UI mode
npm run test:e2e:ui -- vault-sy100.spec.ts

# Run in headed mode (see browser)
npm run test:e2e:headed -- vault-sy100.spec.ts
```

## Expected SY100 Data Structure

Based on the API documentation, SY100 should have:

```json
{
  "indexId": 21,
  "name": "Top 100 Market-Cap Tokens",
  "ticker": "SY100",
  "address": "0x1a64a446e31f19172c6eb3197a1e85ff664af380",
  "curator": "0xF7F7d5C0d394f75307B4D981E8DE2Bab9639f90F",
  "totalSupply": 0.0,
  "totalSupplyUSD": 0.0,
  "ytdReturn": 9.24,
  "managementFee": 2,
  "assetClass": "Cryptocurrencies",
  "inceptionDate": "2024-01-02",
  "category": "Top 100 Market-Cap Tokens"
}
```

## Troubleshooting

### If tests fail:
1. Verify the dev server is running on port 3000
2. Check that the API endpoint `https://api2.indexmaker.global/indexes` is accessible
3. Ensure environment variable `NEXT_PUBLIC_BACKEND_API` is set correctly in `.env`
4. Check browser console for any errors
5. Review test screenshots in `test-results/` directory

### Common Issues:
- **Timeout errors**: The API may be slow to respond - increase timeout values
- **Element not found**: Table may still be loading - increase wait times
- **Empty table**: API may have returned no data - verify API response manually

## Success Criteria

✅ All three tests pass
✅ SY100 appears in the vault table on localhost:3000
✅ API response contains SY100 with all required fields
✅ Data flows correctly from API → Redux → UI

## Files Involved

- **Test File**: `tests/e2e/vault-sy100.spec.ts`
- **API Functions**: `server/indices.ts`
- **Main Component**: `components/views/Dashboard/earn-content.tsx`
- **Table Component**: `components/elements/vault-table.tsx`
- **Redux Slice**: `redux/indexSlice.ts`
- **Environment**: `.env`

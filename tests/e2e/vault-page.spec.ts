import { test, expect } from '@playwright/test';

test.describe('Vault Page', () => {
  test.beforeEach(async ({ page }) => {
    // Set up any necessary mocks or configurations
    await page.route('**/indexes**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          indexes: [
            {
              indexId: 21,
              name: 'Top 100 Market-Cap Tokens',
              address: '0x1a64a446e31f19172c6eb3197a1e85ff664af380',
              ticker: 'SY100',
              curator: '0xF7F7d5C0d394f75307B4D981E8DE2Bab9639f90F',
              totalSupply: 0.0,
              totalSupplyUSD: 0.0,
              ytdReturn: 9.24,
              collateral: [{ name: 'BTC', logo: '' }],
              managementFee: 2,
              assetClass: 'Cryptocurrencies',
              inceptionDate: '2024-01-02',
              category: 'Top 100 Market-Cap Tokens',
              ratings: {
                overallRating: 'A+',
                expenseRating: 'B',
                riskRating: 'C+'
              },
              performance: {
                ytdReturn: 9.24,
                oneYearReturn: -59.41,
                threeYearReturn: 0.0,
                fiveYearReturn: 0.0,
                tenYearReturn: 0.0
              },
              indexPrice: 117899.79
            }
          ]
        })
      });
    });

    // Mock other common API calls
    await page.route('**/fetch-vault-assets/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.route('**/current-index-weight/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          indexId: 21,
          constituents: []
        })
      });
    });

    await page.route('**/fetch-index-historical-data/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          indexId: 21,
          name: 'Top 100 Market-Cap Tokens',
          chartData: [],
          formattedTransactions: []
        })
      });
    });

    await page.route('**/fetch-coin-historical-data/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] })
      });
    });

    await page.route('**/get-deposit-transaction-data/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.route('**/indexes/**/transactions**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });
  });

  test('should load vault page with valid ticker', async ({ page }) => {
    // Navigate to vault page with valid ticker
    await page.goto('/vault/SY100');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check that the ticker is displayed
    await expect(page.locator('h1').filter({ hasText: 'SY100' })).toBeVisible();

    // Check that no error message is displayed
    await expect(page.locator('text=Error Loading Index')).not.toBeVisible();
  });

  test('should show error for invalid ticker', async ({ page }) => {
    // Navigate to vault page with invalid ticker
    await page.goto('/vault/INVALID_TICKER');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check that error message is displayed
    await expect(page.locator('text=Error Loading Index')).toBeVisible();
    await expect(page.locator('text=Index "INVALID_TICKER" not found')).toBeVisible();

    // Check that return button is available
    await expect(page.locator('button', { hasText: 'Return to Home' })).toBeVisible();
  });

  test('should fetch and display current-index-weight data', async ({ page }) => {
    // Mock the current-index-weight API endpoint
    await page.route('**/current-index-weight/21', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          indexId: 21,
          indexName: 'Top 100 Market-Cap Tokens',
          indexSymbol: 'SY100',
          lastRebalanceDate: '2025-12-21',
          portfolioValue: '110408.09',
          totalWeight: '98',
          constituents: [
            {
              coinId: 'bitcoin',
              symbol: 'BTC',
              weight: '1',
              weightPercentage: 1.02,
              quantity: '0.0127542475281765803362509269',
              price: 88347.94,
              value: 1126.81,
              exchange: 'binance',
              tradingPair: 'usdc'
            },
            {
              coinId: 'ethereum',
              symbol: 'ETH',
              weight: '1',
              weightPercentage: 1.02,
              quantity: '0.5',
              price: 3500.0,
              value: 1750.0,
              exchange: 'binance',
              tradingPair: 'usdc'
            }
          ]
        })
      });
    });

    // Mock the vault assets API endpoint
    await page.route('**/fetch-vault-assets/21', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            ticker: 'BTC',
            assetname: 'Bitcoin',
            sector: 'Bitcoin Ecosystem',
            market_cap: 1821746282317.0,
            weights: 1.00,
            quantity: 0.01275424752817658,
            pair: 'btcusdc',
            listing: 'bi'
          },
          {
            id: 2,
            ticker: 'ETH',
            assetname: 'Ethereum',
            sector: 'Smart Contract Platform',
            market_cap: 420000000000.0,
            weights: 1.00,
            quantity: 0.5,
            pair: 'ethusdc',
            listing: 'bi'
          }
        ])
      });
    });

    // Navigate to vault page
    await page.goto('/vault/SY100');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Wait for the assets table to be visible
    await page.waitForSelector('table', { timeout: 10000 });

    // Check that vault assets section is present
    await expect(page.locator('text=Vault Assets').or(page.locator('text=vaultAssets'))).toBeVisible();

    // Verify that the table has data rows
    const tableRows = page.locator('table tbody tr');
    await expect(tableRows).toHaveCount(2, { timeout: 10000 });

    // Verify BTC data is displayed
    await expect(page.locator('table').locator('text=BTC')).toBeVisible();
    await expect(page.locator('table').locator('text=Bitcoin')).toBeVisible();

    // Verify ETH data is displayed
    await expect(page.locator('table').locator('text=ETH')).toBeVisible();
    await expect(page.locator('table').locator('text=Ethereum')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock failed API response for current-index-weight
    await page.route('**/current-index-weight/21', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    // Mock successful vault assets response as fallback
    await page.route('**/fetch-vault-assets/21', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            ticker: 'BTC',
            assetname: 'Bitcoin',
            sector: 'Bitcoin Ecosystem',
            market_cap: 1821746282317.0,
            weights: 1.00,
            quantity: 0.01275424752817658,
            pair: 'btcusdc',
            listing: 'bi'
          }
        ])
      });
    });

    // Navigate to vault page
    await page.goto('/vault/SY100');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check that the page still loads (with fallback data)
    await expect(page.locator('h1').filter({ hasText: 'SY100' })).toBeVisible();

    // Verify that at least fallback data is shown
    await page.waitForSelector('table', { timeout: 10000 });
    const tableRows = page.locator('table tbody tr');
    await expect(tableRows.first()).toBeVisible();
  });

  test('should validate index ID from /indexes endpoint', async ({ page }) => {
    // Mock the indexes API to return specific indexes
    await page.route('**/indexes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          indexes: [
            {
              indexId: 21,
              name: 'Top 100 Market-Cap Tokens',
              ticker: 'SY100',
              address: '0x1a64a446e31f19172c6eb3197a1e85ff664af380',
              curator: '0xF7F7d5C0d394f75307B4D981E8DE2Bab9639f90F',
              totalSupply: 0.0,
              totalSupplyUSD: 0.0,
              ytdReturn: 9.24,
              collateral: [],
              managementFee: 2,
              assetClass: 'Cryptocurrencies',
              inceptionDate: '2024-01-02',
              category: 'Top 100',
              indexPrice: 117899.79
            },
            {
              indexId: 22,
              name: 'Top 20 DeFi Tokens',
              ticker: 'DEFI20',
              address: '0x2b64a446e31f19172c6eb3197a1e85ff664af381',
              curator: '0xF7F7d5C0d394f75307B4D981E8DE2Bab9639f90F',
              totalSupply: 0.0,
              totalSupplyUSD: 0.0,
              ytdReturn: 15.5,
              collateral: [],
              managementFee: 2.5,
              assetClass: 'Cryptocurrencies',
              inceptionDate: '2024-03-01',
              category: 'DeFi',
              indexPrice: 89500.50
            }
          ]
        })
      });
    });

    // Test valid ticker that exists in the response
    await page.goto('/vault/SY100');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').filter({ hasText: 'SY100' })).toBeVisible();

    // Test another valid ticker
    await page.goto('/vault/DEFI20');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').filter({ hasText: 'DEFI20' })).toBeVisible();

    // Test invalid ticker that doesn't exist in the response
    await page.goto('/vault/NOTFOUND');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Error Loading Index')).toBeVisible();
    await expect(page.locator('text=Index "NOTFOUND" not found')).toBeVisible();
  });

  test('should store validated indexes in localStorage', async ({ page }) => {
    // Navigate to a valid vault page
    await page.goto('/vault/SY100');
    await page.waitForLoadState('networkidle');

    // Check that storedVaults is in localStorage
    const storedVaults = await page.evaluate(() => {
      return localStorage.getItem('storedVaults');
    });

    expect(storedVaults).toBeTruthy();
    
    const vaults = JSON.parse(storedVaults || '[]');
    expect(vaults).toBeInstanceOf(Array);
    expect(vaults.length).toBeGreaterThan(0);
    
    // Check that SY100 is in the stored vaults
    const sy100 = vaults.find((v: any) => v.ticker === 'SY100');
    expect(sy100).toBeTruthy();
    expect(sy100.indexId).toBe(21);
    expect(sy100.name).toBe('Top 100 Market-Cap Tokens');
  });
});

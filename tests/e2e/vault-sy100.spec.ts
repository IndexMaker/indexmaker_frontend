import { test, expect } from '@playwright/test';

test.describe('Vault Table - SY100 Index', () => {
  
  test('should fetch data from API and display SY100 in vault table', async ({ page }) => {
    // Log all network requests to debug
    page.on('response', response => {
      if (response.url().includes('index')) {
        console.log('📡 API Request:', response.url(), 'Status:', response.status());
      }
    });

    // Set up to wait for API response - using the full API domain
    const apiResponsePromise = page.waitForResponse(
      response => {
        const url = response.url();
        const isIndexesEndpoint = url.includes('api2.indexmaker.global') && url.includes('indexes');
        const isSuccess = response.status() === 200;
        if (isIndexesEndpoint) {
          console.log('✅ Found indexes API call:', url, 'Status:', response.status());
        }
        return isIndexesEndpoint && isSuccess;
      },
      { timeout: 30000 }
    );

    // Navigate to the homepage
    console.log('🌐 Navigating to localhost:3000...');
    await page.goto('http://localhost:3000');
    
    // Wait for splash screen to finish
    console.log('⏳ Waiting for splash screen...');
    await page.waitForTimeout(5000);
    
    // Get the API response
    console.log('📥 Waiting for API response...');
    const apiResponse = await apiResponsePromise;
    const responseData = await apiResponse.json();
    
    // Verify API response structure
    expect(responseData).toHaveProperty('indexes');
    expect(Array.isArray(responseData.indexes)).toBeTruthy();
    console.log(`📊 Found ${responseData.indexes.length} indexes in API response`);
    
    // Find SY100 in API response
    const sy100Index = responseData.indexes.find((index: any) => index.ticker === 'SY100');
    expect(sy100Index).toBeDefined();
    console.log('✅ SY100 found in API response:', sy100Index?.name);
    
    // Wait for table to be populated with data
    console.log('🔍 Waiting for table to populate...');
    await page.waitForSelector('table tbody tr', { timeout: 20000 });
    
    // Check if SY100 is visible in the table
    const sy100Row = page.locator('tr', { hasText: 'SY100' });
    await expect(sy100Row).toBeVisible({ timeout: 10000 });
    
    console.log('✅ SY100 index displayed in vault table');
  });

  test('should verify SY100 API response structure', async ({ page }) => {
    // Set up to capture API response with proper URL matching
    const apiResponsePromise = page.waitForResponse(
      response => response.url().includes('api2.indexmaker.global/indexes') && response.status() === 200,
      { timeout: 30000 }
    );
    
    // Navigate to trigger API call
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(5000);
    
    // Get API response
    const apiResponse = await apiResponsePromise;
    const responseData = await apiResponse.json();
    
    // Find SY100
    const sy100Index = responseData.indexes.find((index: any) => index.ticker === 'SY100');
    
    // Verify required fields
    expect(sy100Index).toBeDefined();
    expect(sy100Index).toHaveProperty('indexId');
    expect(sy100Index).toHaveProperty('name');
    expect(sy100Index).toHaveProperty('ticker');
    expect(sy100Index).toHaveProperty('address');
    expect(sy100Index).toHaveProperty('curator');
    expect(sy100Index.ticker).toBe('SY100');
    
    console.log('✅ SY100 API response structure verified:', {
      indexId: sy100Index.indexId,
      name: sy100Index.name,
      ticker: sy100Index.ticker
    });
  });
});

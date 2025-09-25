import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IndexRegistryService } from 'src/modules/blockchain/index-registry.service';
import { EtfPriceService } from 'src/modules/computation/etf-price.service';
import { MetricsService } from 'src/modules/computation/metrics.service';
import { EtfMainService } from 'src/modules/computation/etf-main.service';
import { BinanceService } from 'src/modules/data-fetcher/binance.service';
import { Response } from 'express';
import { CoinGeckoService } from 'src/modules/data-fetcher/coingecko.service';
import { HuggingFaceService } from 'src/modules/computation/huggingface.service';
import { CreateDepositTransactionDto } from 'src/transactions/create-deposit-transaction.dto';
import { Top20IndexService } from 'src/modules/computation/top20-index.service';

@ApiTags('indices')
@Controller('indices')
export class IndexController {
  constructor(
    private binanceService: BinanceService,
    private etfPriceService: EtfPriceService,
    private metricsService: MetricsService,
    private etfMainService: EtfMainService,
    private top20Service: Top20IndexService,
    private coinGeckoService: CoinGeckoService,
    private indexRegistryService: IndexRegistryService,
    private huggingfaceService: HuggingFaceService,
  ) {}

  @ApiOperation({ summary: 'Get live ETF price' })
  @Get(':indexId/price')
  async getPrice(@Param('indexId') indexId: string): Promise<number> {
    return this.etfPriceService.computeLivePrice(indexId, 1);
  }

  @ApiOperation({ summary: 'Get Year-to-Date return' })
  @Get(':indexId/ytd')
  async getYTD(@Param('indexId') indexId: string): Promise<number> {
    return this.metricsService.computeYTD(indexId, 1);
  }

  @ApiOperation({ summary: 'Get Sharpe Ratio' })
  @Get('/getIndexMakerInfo')
  async getIndexMakerInfo(@Param('indexId') indexId: string) {
    return await this.etfPriceService.getIndexMakerInfo();
  }

  @Get('/parsingAnnouncements')
  async processAnnouncements() {
    await this.huggingfaceService.processAnnouncements();
  }

  @Get('/top20-rebalance/:category')
  async top20Rebalance(@Param('category') category: string) {
    let sy100Start = new Date('2019-01-01');
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);
    await this.top20Service.simulateTop20Rebalances(category, sy100Start, now);
  }
  @ApiOperation({ summary: 'Trigger Top 100 rebalance' })
  @Get('/rebalance')
  async rebalance(@Param('indexId') indexId: number): Promise<void> {
    // initial deploying
    // await this.etfMainService.processAllPendingRebalances()

    // await this.coinGeckoService.storeMissingPricesUntilToday();
    // await this.etfPriceService.getHistoricalDataFromTempRebalances(21);
    // await this.etfPriceService.getHistoricalDataFromTempRebalances(22);
    // await this.etfPriceService.getHistoricalDataFromTempRebalances(23);
    // await this.etfPriceService.getHistoricalDataFromTempRebalances(24);
    // await this.etfPriceService.getHistoricalDataFromTempRebalances(25);
    // await this.etfPriceService.getHistoricalDataFromTempRebalances(27);

    // return;
    // SY100: Biweekly from 2022-01-01
    let sy100Start = new Date('2019-01-01');
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);
    while (sy100Start < now) {
      console.log(`Simulating SY100 rebalance at ${sy100Start.toISOString()}`);
      await this.etfMainService.rebalanceSY100(
        Math.floor(sy100Start.getTime() / 1000),
      );
      sy100Start.setDate(sy100Start.getDate() + 14); // biweekly
    }

    // SYAZ: Daily from 2019-01-01
    let syazStart = new Date('2019-01-01');
    // while (syazStart < now) {
    //   console.log(`Simulating SYAZ rebalance at ${syazStart.toISOString()}`);
    //   await this.etfMainService.rebalanceETF('andreessen-horowitz-a16z-portfolio', 22, Math.floor(syazStart.getTime() / 1000));
    //   syazStart.setDate(syazStart.getDate() + 1); // daily
    // }

    await this.etfMainService.simulateRebalances(
      syazStart,
      now,
      'andreessen-horowitz-a16z-portfolio',
      22,
    );

    // SYL2: Daily from 2019-01-01
    let syl2Start = new Date('2019-01-01');
    // while (syl2Start < now) {
    //   console.log(`Simulating SYL2 rebalance at ${syl2Start.toISOString()}`);
    //   await this.etfMainService.rebalanceETF('layer-2', 23, Math.floor(syl2Start.getTime() / 1000));
    //   syl2Start.setDate(syl2Start.getDate() + 1); // daily
    // }
    await this.etfMainService.simulateRebalances(syl2Start, now, 'layer-2', 23);

    // SYAI: Daily from 2019-01-01
    let syaiStart = new Date('2019-01-01');
    // while (syaiStart < now) {
    //   console.log(`Simulating SYAI rebalance at ${syaiStart.toISOString()}`);
    //   await this.etfMainService.rebalanceETF('artificial-intelligence', 24, Math.floor(syaiStart.getTime() / 1000));
    //   syaiStart.setDate(syaiStart.getDate() + 1); // daily
    // }

    await this.etfMainService.simulateRebalances(
      syaiStart,
      now,
      'artificial-intelligence',
      24,
    );

    // SYME: Daily from 2019-01-01
    let symeStart = new Date('2019-01-01');
    // while (symeStart < now) {
    //   console.log(`Simulating SYME rebalance at ${symeStart.toISOString()}`);
    //   await this.etfMainService.rebalanceETF('meme-token', 25, Math.floor(symeStart.getTime() / 1000));
    //   symeStart.setDate(symeStart.getDate() + 1); // daily
    // }

    await this.etfMainService.simulateRebalances(
      symeStart,
      now,
      'meme-token',
      25,
    );
    // SYDF: Daily from 2019-01-01
    let sydfStart = new Date('2019-01-01');
    // while (sydfStart < now) {
    //   console.log(`Simulating SYDF rebalance at ${sydfStart.toISOString()}`);
    // await this.etfMainService.rebalanceETF('decentralized-finance-defi', 26, Math.floor(now.getTime() / 1000));
    //   sydfStart.setDate(sydfStart.getDate() + 1); // daily
    // }
    await this.etfMainService.simulateRebalances(
      sydfStart,
      now,
      'decentralized-finance-defi',
      27,
    );

    await this.etfPriceService.getHistoricalDataFromTempRebalances(21);
    await this.etfPriceService.getHistoricalDataFromTempRebalances(22);
    await this.etfPriceService.getHistoricalDataFromTempRebalances(23);
    await this.etfPriceService.getHistoricalDataFromTempRebalances(24);
    await this.etfPriceService.getHistoricalDataFromTempRebalances(25);
    await this.etfPriceService.getHistoricalDataFromTempRebalances(27);
  }

  @ApiOperation({ summary: 'Get index data' })
  @Get(':indexId/data')
  async getIndexData(@Param('indexId') indexId: number): Promise<any> {
    return this.indexRegistryService.getIndexData(indexId);
  }

  @ApiOperation({ summary: 'Detect Binance listings/delistings' })
  @Get('binance/listings')
  async getListings(): Promise<any> {
    return this.binanceService.detectListingsAndDelistings();
  }

  @ApiOperation({ summary: 'Get Binance trading pairs' })
  @Get('binance/pairs')
  async getBinancePairs(): Promise<any> {
    return this.binanceService.fetchTradingPairs();
  }

  @Get('/getHistoricalData/:indexId')
  async getHistoricalData(@Param('indexId') indexId: number) {
    if (!indexId) return {};
    const rawData = await this.etfPriceService.getHistoricalData(indexId);
    const formattedTransactions =
      await this.etfPriceService.getIndexTransactions(indexId);
    // Calculate cumulative returns
    let baseValue = 10000;
    let indexName = '';
    const chartData = rawData.map((entry, index) => {
      indexName = entry.name;
      if (index === 0)
        return {
          name: entry.name,
          date: entry.date,
          price: entry.price,
          value: baseValue,
        };

      const prevPrice = rawData[index - 1].price;
      const returnPct = (entry.price - prevPrice) / prevPrice;
      baseValue = baseValue * (1 + returnPct);

      return {
        name: entry.name,
        date: entry.date,
        price: entry.price,
        value: baseValue,
      };
    });

    const response = {
      name: indexName,
      indexId,
      // rawData,
      chartData,
      formattedTransactions,
    };

    return response;
  }

  @Get('/getDepositTransactionData/:indexId/:address')
  async fetchDepositTransactionData(
    @Param('indexId') indexId: number,
    @Param('address') address?: string,
  ) {
    if (!indexId) return {};
    const formattedTransactions =
      await this.etfPriceService.getDepositTransactions(indexId, address);

    return formattedTransactions;
  }

  @Get('/getUserTransactionData/:indexId')
  async fetchUserTransactionData(@Param('indexId') indexId: number) {
    if (!indexId) return {};
    const formattedTransactions =
      await this.etfPriceService.getUserTransactions(indexId);

    return formattedTransactions;
  }

  @Get('/getCalculatedRebalances/:indexId')
  @ApiOperation({ summary: 'Get rebalance data for a specific index' })
  async getRebalances(@Param('indexId') indexId: number) {
    if (indexId) {
      return this.etfMainService.getRebalancesByIndex(indexId);
    } else {
      return [];
    }
  }

  @Get('/fetchCurrentRebalanceById/:indexId')
  @ApiOperation({ summary: 'Get rebalance data for a specific index' })
  async fetchCurrentRebalanceById(@Param('indexId') indexId: number) {
    if (indexId) {
      return this.etfMainService.getCurrentRebalanceById(indexId);
    } else {
      return [];
    }
  }

  @Get('/downloadRebalanceData/:indexId')
  async downloadRebalanceData(
    @Param('indexId') indexId: number,
    @Res() res: Response,
  ) {
    // const rebalanceData = await this.etfPriceService.getRebalancedData(indexId);

    // Prepare CSV headers
    // const headers = ['Timestamp', 'Date', 'Price', 'Weights'];

    // // Convert data to CSV rows
    // const csvRows: any[] = [];

    // // Add header row
    // csvRows.push(headers.join(','));

    // // Add data rows
    // rebalanceData.forEach((event) => {
    //   const date = new Date(event.timestamp * 1000).toISOString();
    //   const weightsString = JSON.stringify(event.weights).replace(/"/g, '""');

    //   const row = [
    //     event.timestamp,
    //     `"${date}"`,
    //     event.price,
    //     `"${weightsString}"`,
    //   ];

    //   csvRows.push(row.join(','));
    // });

    // // Create CSV string
    // const csvString = csvRows.join('\n');

    // res.setHeader('Content-Type', 'text/csv');
    // res.setHeader(
    //   'Content-Disposition',
    //   `attachment; filename="rebalance_data_${indexId}.csv"`,
    // );

    // // Send CSV data
    // res.send(csvString);

    // const processedData = [...rebalanceData]
    //   // 1. Filter out Bitget assets
    //   .filter((item) => item.listing !== 'bg')

    //   // 2. Sort by market cap descending
    //   .sort((a, b) => b.market_cap - a.market_cap)

    //   // 3. Add Bitget total weight to bi.BTCUSDC
    //   .map((item, _, array) => {
    //     const bitgetWeightSum = rebalanceData
    //       .filter((e) => e.listing === 'bg')
    //       .reduce((sum, e) => sum + parseFloat(e.weights), 0);

    //     if (item.ticker === 'BTCUSDC' && item.listing === 'bi') {
    //       return {
    //         ...item,
    //         weights: (parseFloat(item.weights) + bitgetWeightSum).toFixed(2),
    //       };
    //     }
    //     return item;
    //   })

    //   // 4. Sort again by market cap (after BTC update)
    //   .sort((a, b) => b.market_cap - a.market_cap)

    //   // 5. Final structure
    //   .map((item, index) => ({
    //     id: index + 1,
    //     pair: item.pair,
    //     listing: 'Binance',
    //     assetname: item.assetname,
    //     sector: item.sector,
    //     market_cap: item.market_cap,
    //     weights: item.weights,
    //     quantity: item.quantity,
    //   }));
    // res.send(processedData);

    // return processedData;

    const rebalanceData =
      await this.etfPriceService.getTempRebalancedData(indexId);

    // Prepare CSV headers
    const headers = [
      'Index',
      'IndexId',
      'Rebalance Date',
      'Index Price',
      'Weights',
      // 'QUantities',
      'Asset Prices',
    ];

    // Convert data to CSV rows
    const csvRows: any[] = [];

    // Add header row
    csvRows.push(headers.join(','));

    // Add data rows
    rebalanceData.forEach((event) => {
      const date = event.date;
      const weightsString = JSON.stringify(event.weights)
        .replace(/"/g, '')
        .replace(/\\/g, '');
      const pricesString = JSON.stringify(event.assetPrices)
        .replace(/"/g, '')
        .replace(/\\/g, '');
      const row = [
        event.index,
        event.indexId,
        date,
        event.indexPrice,
        `"${weightsString}"`,
        // `"${quantitiesString}"`,
        `"${pricesString}"`,
      ];

      csvRows.push(row.join(','));
    });

    // Create CSV string
    const csvString = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="rebalance_data_${indexId}.csv"`,
    );

    // Send CSV data
    res.send(csvString);
  }

  @Get('/downloadDailyPriceData/:indexId')
  async downloadDailyPriceData(
    @Param('indexId') indexId: number,
    @Res() res: Response,
  ) {
    const dailyPriceData =
      await this.etfPriceService.getDailyPriceData(indexId);

    // Prepare CSV headers
    const headers = [
      'Index',
      'IndexId',
      'Date',
      'Price',
      'Asset Quantities',
      'Asset Prices',
    ];

    // Convert data to CSV rows
    const csvRows: any[] = [];

    // Add header row
    csvRows.push(headers.join(','));

    // Add data rows
    dailyPriceData.forEach((event) => {
      const date = event.date;
      const quantities = JSON.stringify(event.quantities)
        .replace(/"/g, '')
        .replace(/\\/g, '');

      const coinPrices = JSON.stringify(event.coinPrices)
        .replace(/"/g, '')
        .replace(/\\/g, '');
      const price = event.price || 0;
      const row = [
        event.index,
        event.indexId,
        date,
        price,
        `"${quantities}"`,
        `"${coinPrices}"`,
      ];

      csvRows.push(row.join(','));
    });

    // Create CSV string
    const csvString = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="rebalance_data_${indexId}.csv"`,
    );

    // Send CSV data
    res.send(csvString);
  }

  @Get('/fetchBtcHistoricalData')
  async fetchBtcHistoricalData(): Promise<any> {
    const btcData =
      await this.etfPriceService.fetchCoinHistoricalData('bitcoin');
    return btcData;
  }

  @Get('/fetchEthHistoricalData')
  async fetchEthHistoricalData(): Promise<any> {
    const ethData =
      await this.etfPriceService.fetchCoinHistoricalData('ethereum');
    return ethData;
  }

  @Get('/fetchVaultAssets/:indexId')
  async fetchVaultAssets(@Param('indexId') indexId: number): Promise<any> {
    const vaultAssets = await this.etfPriceService.fetchVaultAssets(indexId);
    return vaultAssets;
  }

  @Get('/fetchAllAssets')
  async fetchAllAssets(): Promise<any> {
    const allAssets = await this.etfPriceService.fetchAllAssets();
    return allAssets;
  }

  @Get('/getIndexLists')
  async fetchIndexLists() {
    const lists = await this.etfPriceService.getIndexList();
    return lists;
  }

  @Get('/syncMintInvoices')
  async syncMintInvoices() {
    await this.etfPriceService.syncMintInvoices();
  }

  @Post('deposit_transaction')
  async recordDeposit(@Body() dto: CreateDepositTransactionDto) {
    return this.etfPriceService.saveBlockchainEvent(dto);
  }

  @Post('subscribe')
  async storeEmail(@Body() dto: any) {
    await this.etfMainService.storeEmail(dto.email, dto.twitter);
    return { success: true };
  }
}

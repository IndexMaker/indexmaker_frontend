import { Injectable } from '@nestjs/common';
import { IndexRegistryService } from '../blockchain/index-registry.service';
import { CoinGeckoService } from '../data-fetcher/coingecko.service';
import { DbService } from '../../db/db.service';
import {
  blockchainEvents,
  coinSymbols,
  dailyPrices,
  historicalPrices,
  indexEvents,
  rebalances,
  tempRebalances,
  tempTop20Rebalances,
} from '../../db/schema';
import {
  and,
  asc,
  between,
  desc,
  eq,
  gte,
  inArray,
  lte,
  sql,
} from 'drizzle-orm';
import { ethers, randomBytes } from 'ethers';
import * as path from 'path';
import {
  Asset,
  FundRating,
  IndexListEntry,
  MarketRow,
  MintInvoice,
  VaultAsset,
} from 'src/common/types/index.types';
import { calculateLETV, formatTimestamp } from 'src/common/utils/utils';
import { promises as fs } from 'fs';
import { CreateDepositTransactionDto } from 'src/transactions/create-deposit-transaction.dto';
import { createHash, randomUUID } from 'crypto';

type Weight = [string, number];

interface HistoricalEntry {
  name: string;
  date: Date;
  price: number;
  value: number;
  quantities?: Record<string, number>;
}

const YOUR_START_BLOCK = 32627126;
@Injectable()
export class EtfPriceService {
  private provider: ethers.JsonRpcProvider;
  private indexRegistry: ethers.Contract;
  private readonly signer: ethers.Wallet;
  private priceCache: Record<string, Array<[number, number]>> = {};
  private indexes: {
    name: string;
    symbol: string;
    address: string;
    indexId: number;
    custodyId: string;
  }[];
  private otcCustody: ethers.Contract;
  private readonly INDEX_LIST_PATH = path.resolve(
    process.cwd(),
    'deployedIndexes.json',
  );

  constructor(
    private indexRegistryService: IndexRegistryService,
    private coinGeckoService: CoinGeckoService,
    private dbService: DbService,
  ) {
    const rpcUrl = process.env.BASE_RPCURL || 'https://mainnet.base.org'; // Use testnet URL for Sepolia if needed
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    // Configure signer with private key
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('PRIVATE_KEY is not set in .env');
    }
    this.signer = new ethers.Wallet(privateKey, this.provider);
    const custodyArtifact = require(
      path.resolve(
        __dirname,
        '../../../../artifacts/contracts/OTCCustody/OTCCustody.sol/OTCCustody.json',
      ),
    );
    this.otcCustody = new ethers.Contract(
      process.env.OTC_CUSTODY_ADDRESS!,
      custodyArtifact.abi,
      this.signer,
    );

    this.dbService = new DbService();
  }

  async computeLivePrice(indexId: string, chainId: number): Promise<number> {
    // const { tokens, weights } = await this.indexRegistryService.getIndexData(indexId, chainId);
    let totalPrice = 0;
    // for (let i = 0; i < tokens.length; i++) {
    //   const coinId = this.mapTokenToCoinGeckoId(tokens[i]); // Map ERC20 address to CoinGecko ID
    //   const price = await this.coinGeckoService.getLivePrice(coinId);
    //   totalPrice += price * (weights[i] / 10000); // Weights in basis points
    // }
    return totalPrice;
  }

  async computeHistoricalPrice(
    indexId: string,
    timestamp: number,
  ): Promise<number> {
    const rebalance = await this.dbService
      .getDb()
      .select()
      .from(rebalances)
      .where(eq(rebalances.indexId, indexId))
      .where(eq(rebalances.timestamp, timestamp))
      .limit(1);
    if (!rebalance[0]) return 0;
    const prices = rebalance[0].prices as Record<string, number>;
    const weights = JSON.parse(rebalance[0].weights) as number[];
    let totalPrice = 0;
    Object.keys(prices).forEach((token, i) => {
      totalPrice += prices[token] * (weights[i] / 10000);
    });
    return totalPrice;
  }

  async getIndexMakerInfo() {
    const contractAddress = process.env.OTC_CUSTODY_ADDRESS!;
    const usdcAddress = process.env.USDC_ADDRESS_IN_BASE!;
    const provider = this.provider;

    // 1. Sync Deposit & Withdraw events from blockchain to DB
    // await this.indexRegistryService.syncBlockchainEvents({
    //   provider,
    //   network: 'base',
    //   contractAddress,
    //   eventDefs: [
    //     {
    //       name: 'Deposit',
    //       abi: 'event Deposit(uint256 amount, address from, uint256 seqNumNewOrderSingle, address affiliate1, address affiliate2)',
    //       topic: ethers.id('Deposit(uint256,address)'),
    //     },
    //     {
    //       name: 'Withdraw',
    //       abi: 'event Withdraw(uint256 amount, address to, bytes executionReport)',
    //       topic: ethers.id('Withdraw(uint256,address,bytes)'),
    //     },
    //   ],
    // });

    // 2. Get current USDC balance from chain (totalManaged)

    // 3. Query DB for totalVolume (sum of Deposit and Withdraw amounts)
    const rows = await this.dbService
      .getDb()
      .select({
        eventType: blockchainEvents.eventType,
        amount: blockchainEvents.amount,
      })
      .from(blockchainEvents)
      .where(inArray(blockchainEvents.eventType, ['mint']));

    const DECIMALS = 18; // or match your token's decimals

    function decimalToBigInt(val: string): bigint {
      if (!val) return 0n;

      const [intPart, fracPart = ''] = val.split('.');
      const fracPadded = fracPart.padEnd(DECIMALS, '0').slice(0, DECIMALS);

      return BigInt(intPart + fracPadded);
    }

    const totalVolumeRaw = rows.reduce((acc, row) => {
      return acc + decimalToBigInt(row.amount);
    }, 0n);

    return {
      totalVolume: ethers.formatUnits(0, 6),
      totalManaged: ethers.formatUnits(totalVolumeRaw, DECIMALS),
    };
  }

  async getTotalHoldings(indexId: number) {
    const previousDay = new Date();
    previousDay.setDate(previousDay.getDate() - 1); // Go back 1 day
    previousDay.setUTCHours(0, 0, 0, 0); // Normalize to midnight UTC
    const priceRow = await this.dbService
      .getDb()
      .select()
      .from(dailyPrices)
      .where(
        and(
          eq(dailyPrices.indexId, indexId.toString()),
          eq(
            dailyPrices.date,
            new Date(previousDay.getTime()).toISOString().split('T')[0],
          ),
        ),
      )
      .orderBy(desc(dailyPrices.date))
      .limit(1);
    if (priceRow && priceRow.length > 0) {
      return Object.keys(priceRow[0].quantities).length || 0;
    }

    return 0;
  }

  async getIndexesDatafromFile() {
    const raw = await fs.readFile(this.INDEX_LIST_PATH, 'utf8');
    const allIndexes: Array<any> = JSON.parse(raw);

    return allIndexes;
  }

  async calculateTotalReturns(
    indexId: number,
    currentDate = new Date(),
  ): Promise<Record<string, string>> {
    const today = new Date(currentDate);
    today.setUTCHours(0, 0, 0, 0);

    const timeFrames = {
      threeMonth: 3,
      ytd: 'ytd',
      oneYear: 1,
      threeYear: 3,
      fiveYear: 5,
      tenYear: 10,
    };

    const previousDay = new Date();
    previousDay.setDate(previousDay.getDate() - 1); // Go back 1 day
    previousDay.setUTCHours(0, 0, 0, 0); // Normalize to midnight UTC
    const jan1 = new Date(today.getFullYear(), 0, 1).getTime();

    const latestPrice = await this.getPriceForDate(
      indexId,
      previousDay.getTime(),
    );
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(timeFrames)) {
      let pastDate: number;

      if (value === 'ytd') {
        pastDate = jan1;
      } else {
        const past = new Date(today);
        past.setUTCFullYear(today.getUTCFullYear() - Number(value));
        pastDate = past.getTime();
      }

      const pastPrice = await this.getPriceForDate(indexId, pastDate);

      if (!pastPrice || pastPrice === 0 || !latestPrice || latestPrice === 0) {
        result[key] = '0.00';
        continue;
      }

      const change = ((latestPrice - pastPrice) / pastPrice) * 100;
      result[key] = change.toFixed(2);
    }

    return result;
  }

  async getDepositTransactions(indexId: number, address?: string) {
    const USDC_DECIMALS = 6;
    const INDEX_DECIMALS = 30; // high precision for tiny fractional quantities
    const LOWER = (s?: string) => (s ? s.toLowerCase() : '');

    // --- tolerant decimal -> bigint (raw units) ---
    const normalizeDecimalString = (s: string, decimals: number): string => {
      if (!s) return '0';
      s = s.trim();

      // Handle scientific notation (e.g., "3.22e-7")
      if (/e/i.test(s)) {
        const n = Number(s);
        if (!Number.isFinite(n) || n === 0) return '0';
        s = n.toFixed(Math.min(decimals, 100));
      }

      if (s.startsWith('+')) s = s.slice(1);
      if (!s.includes('.')) return s;

      let [intPart, fracPart = ''] = s.split('.');
      if (fracPart.length > decimals) fracPart = fracPart.slice(0, decimals);
      fracPart = fracPart.replace(/0+$/, '');
      return fracPart.length ? `${intPart}.${fracPart}` : intPart;
    };

    const toBigIntUnits = (v: unknown, decimals: number): bigint => {
      if (v == null) return 0n;
      if (typeof v === 'bigint') return v;
      if (typeof v === 'number') {
        const s = normalizeDecimalString(v.toString(), decimals);
        return s.includes('.')
          ? ethers.parseUnits(s, decimals)
          : BigInt(s || '0');
      }
      if (typeof v === 'string') {
        const s = normalizeDecimalString(v, decimals);
        return s.includes('.')
          ? ethers.parseUnits(s, decimals)
          : BigInt(s || '0');
      }
      return 0n;
    };

    // Normalize optional filter once
    const addressFilter =
      address && address !== '0x0000' ? LOWER(address) : null;

    // Helper: build map of index metadata by lowercase address
    const loadIndexDirectory = async () => {
      const raw = await fs.readFile(this.INDEX_LIST_PATH, 'utf8');
      const allIndexes: Array<any> = JSON.parse(raw);
      const byAddr = new Map<string, any>();
      for (const idx of allIndexes) {
        if (!idx?.address) continue;
        byAddr.set(LOWER(idx.address), idx);
      }
      return { allIndexes, byAddr };
    };

    // Helper: get latest index price (as number) for a given indexId (string)
    const getLatestPrice = async (idxId: string): Promise<number | null> => {
      const rows = await this.dbService
        .getDb()
        .select({ price: dailyPrices.price })
        .from(dailyPrices)
        .where(eq(dailyPrices.indexId, idxId))
        .orderBy(desc(dailyPrices.date))
        .limit(1);
      const r = rows[0];
      return r ? Number(r.price as unknown as string) : null;
    };

    const network = 'base';
    const db = this.dbService.getDb();

    // ------- SINGLE-INDEX MODE -------
    if (indexId != -1) {
      const indexData = await this.getIndexDataFromFile(indexId);
      if (!indexData?.address) throw new Error(`Index ${indexId} not found`);

      const indexAddress = LOWER(indexData.address);

      // Latest price for this index
      const indexPrice = await getLatestPrice(String(indexData.indexId));

      // Pull ALL mint rows for this contract (needed for totalSupply/totalQuantity)
      const allRows = await db
        .select()
        .from(blockchainEvents)
        .where(
          and(
            eq(blockchainEvents.contractAddress, indexAddress),
            eq(blockchainEvents.network, network),
            eq(blockchainEvents.eventType, 'mint'),
          ),
        );

      // Totals for the index (USDC + quantity)
      let totalAmountBase = 0n;
      let totalQtyBase = 0n;
      for (const ev of allRows) {
        totalAmountBase += toBigIntUnits(ev.amount ?? 0, USDC_DECIMALS);
        totalQtyBase += toBigIntUnits(ev.quantity ?? 0, INDEX_DECIMALS);
      }

      const rows = addressFilter
        ? allRows.filter((r) => LOWER(r.userAddress) === addressFilter)
        : allRows;

      const USDValueOfUSDC = 1;
      const deposits = rows.map((event, i) => {
        const user = LOWER(event.userAddress);
        const amountBase = toBigIntUnits(event.amount ?? 0, USDC_DECIMALS);
        const qtyBase = toBigIntUnits(event.quantity ?? 0, INDEX_DECIMALS);

        const supply = Number(ethers.formatUnits(amountBase, USDC_DECIMALS));
        const quantity = Number(ethers.formatUnits(qtyBase, INDEX_DECIMALS));

        const totalSupply = Number(
          ethers.formatUnits(totalAmountBase, USDC_DECIMALS),
        );
        const totalQuantity = Number(
          ethers.formatUnits(totalQtyBase, INDEX_DECIMALS),
        );

        const share = totalSupply > 0 ? (supply / totalSupply) * 100 : 0;

        return {
          id: `mint-${event.txHash}-${i}`,
          indexId: indexData.indexId,
          indexName: indexData.name,
          indexSymbol: indexData.symbol,
          user,
          supply: supply.toFixed(2),
          supplyValueUSD: supply * USDValueOfUSDC,
          currency: 'USDC',
          quantity: quantity.toString(),
          totalQuantity: totalQuantity.toString(),
          share: Number.isFinite(share) ? share : 0,
          rawShare: totalSupply > 0 ? supply / totalSupply : 0,
          totalSupply: totalSupply.toFixed(2),
          blockNumber: event.blockNumber,
          transactionHash: event.txHash,
          indexPrice, // latest price
        };
      });

      // Group by user (or by index if address provided)
      const grouped: Record<
        string,
        (typeof deposits)[number] & { depositCount: number }
      > = {};

      for (const dep of deposits) {
        const key = addressFilter ? String(dep.indexId) : dep.user;

        if (!grouped[key]) {
          grouped[key] = { ...dep, depositCount: 1 };
        } else {
          grouped[key].depositCount += 1;
          grouped[key].supply = (
            parseFloat(grouped[key].supply) + parseFloat(dep.supply)
          ).toFixed(2);
          grouped[key].supplyValueUSD =
            parseFloat(String(grouped[key].supplyValueUSD)) +
            parseFloat(String(dep.supplyValueUSD));
          grouped[key].quantity = (
            parseFloat(grouped[key].quantity) + parseFloat(dep.quantity)
          ).toString();
        }
      }

      const totalSupplyNumber = Number(
        ethers.formatUnits(totalAmountBase, USDC_DECIMALS),
      );
      const totalQuantityNumber = Number(
        ethers.formatUnits(totalQtyBase, INDEX_DECIMALS),
      );

      return Object.values(grouped).map((g) => {
        const share =
          totalSupplyNumber > 0
            ? (parseFloat(g.supply) / totalSupplyNumber) * 100
            : 0;

        return {
          indexId: g.indexId,
          indexName: g.indexName,
          indexSymbol: g.indexSymbol,
          user: addressFilter ? null : g.user,
          totalSupply: g.totalSupply,
          totalQuantity: totalQuantityNumber.toString(),
          supplyValueUSD: g.supplyValueUSD,
          depositCount: g.depositCount,
          supply: g.supply,
          quantity: g.quantity,
          currency: g.currency,
          share,
          rawShare:
            totalSupplyNumber > 0
              ? parseFloat(g.supply) / totalSupplyNumber
              : 0,
          indexPrice: g.indexPrice ?? null,
        };
      });
    }

    // ------- ALL-INDEXES MODE (-1): per-index totals -------
    const { byAddr } = await loadIndexDirectory();

    // All mints in the network
    const allRows = await db
      .select()
      .from(blockchainEvents)
      .where(
        and(
          eq(blockchainEvents.network, network),
          eq(blockchainEvents.eventType, 'mint'),
        ),
      );

    // Filter by user if provided (for the "group values"); grouping is by INDEX ONLY
    const filteredRows = addressFilter
      ? allRows.filter((r) => LOWER(r.userAddress) === addressFilter)
      : allRows;

    // Overall totals per contract (independent of user filter)
    const totalsByContract = new Map<
      string,
      { amountBase: bigint; qtyBase: bigint }
    >();
    for (const ev of allRows) {
      const c = LOWER(ev.contractAddress);
      const cur = totalsByContract.get(c) ?? { amountBase: 0n, qtyBase: 0n };
      totalsByContract.set(c, {
        amountBase:
          cur.amountBase + toBigIntUnits(ev.amount ?? 0, USDC_DECIMALS),
        qtyBase: cur.qtyBase + toBigIntUnits(ev.quantity ?? 0, INDEX_DECIMALS),
      });
    }

    // Group filtered rows by contract
    const byContractFiltered = new Map<
      string,
      { amountBase: bigint; qtyBase: bigint; count: number }
    >();
    for (const ev of filteredRows) {
      const c = LOWER(ev.contractAddress);
      const cur = byContractFiltered.get(c) ?? {
        amountBase: 0n,
        qtyBase: 0n,
        count: 0,
      };
      byContractFiltered.set(c, {
        amountBase:
          cur.amountBase + toBigIntUnits(ev.amount ?? 0, USDC_DECIMALS),
        qtyBase: cur.qtyBase + toBigIntUnits(ev.quantity ?? 0, INDEX_DECIMALS),
        count: cur.count + 1,
      });
    }

    // Pre-fetch latest prices for all indexes we will return
    const indexIdsToFetch = new Set<string>();
    for (const contractAddr of byContractFiltered.keys()) {
      const meta = byAddr.get(contractAddr);
      if (meta) indexIdsToFetch.add(String(meta.indexId));
    }
    const priceMap = new Map<string, number | null>();
    for (const idxId of indexIdsToFetch) {
      priceMap.set(idxId, await getLatestPrice(idxId));
    }

    const USDValueOfUSDC = 1;
    const result = Array.from(byContractFiltered.entries()).flatMap(
      ([contractAddr, group]) => {
        const meta = byAddr.get(contractAddr);
        if (!meta) return [];

        const overallTotals = totalsByContract.get(contractAddr) ?? {
          amountBase: 0n,
          qtyBase: 0n,
        };

        const totalSupply = Number(
          ethers.formatUnits(overallTotals.amountBase, USDC_DECIMALS),
        );
        const totalQuantity = Number(
          ethers.formatUnits(overallTotals.qtyBase, INDEX_DECIMALS),
        );

        const groupSupply = Number(
          ethers.formatUnits(group.amountBase, USDC_DECIMALS),
        );
        const groupQuantity = Number(
          ethers.formatUnits(group.qtyBase, INDEX_DECIMALS),
        );

        const share = totalSupply > 0 ? (groupSupply / totalSupply) * 100 : 0;
        const indexPrice = priceMap.get(String(meta.indexId)) ?? null;

        return [
          {
            indexId: meta.indexId,
            name: meta.name,
            symbol: meta.symbol,
            address: contractAddr,
            user: addressFilter ? addressFilter : null, // user if filtered, otherwise null
            totalSupply: totalSupply.toFixed(2), // overall USDC per index
            balanceRaw: totalQuantity.toString(), // overall qty per index
            depositCount: group.count,
            supply: groupSupply.toFixed(2), // filtered group's USDC per index
            quantity: groupQuantity.toString(), // filtered group's qty per index
            currency: 'USDC',
            share,
            decimals: 30,
            sharePct: totalSupply > 0 ? groupSupply / totalSupply : 0,
            usdPrice: indexPrice,
          },
        ];
      },
    );

    return result;
  }

  async getUserTransactions(indexId: number): Promise<any[]> {
    const indexData = await this.getIndexDataFromFile(indexId);
    if (!indexData?.address) throw new Error(`Index ${indexId} not found`);

    const contractAddress = indexData.address.toLowerCase();
    const network = 'base';

    const eventDefs = [
      {
        name: 'Deposit',
        abi: 'event Deposit(uint256 amount, address from, uint256 seqNumNewOrderSingle, address affiliate1, address affiliate2)',
        topic: ethers.id('Deposit(uint256,address,uint256,address,address)'),
      },
      {
        name: 'Withdraw',
        abi: 'event Withdraw(uint256 amount, address to, bytes executionReport)',
        topic: ethers.id('Withdraw(uint256,address,bytes)'),
      },
    ];

    const USDValueOfUSDC = 1;
    // await this.coinGeckoService.getUSDCUSDPrice('usd-coin');

    // 1. Sync Mint + Transfer events from blockchain
    // await this.indexRegistryService.syncBlockchainEvents({
    //   provider: this.provider,
    //   network,
    //   contractAddress,
    //   eventDefs,
    // });

    // 2. Query from local DB
    const events = await this.dbService
      .getDb()
      .select()
      .from(blockchainEvents)
      .where(
        and(
          eq(blockchainEvents.contractAddress, contractAddress),
          eq(blockchainEvents.network, network),
          inArray(blockchainEvents.eventType, ['mint', 'deposit', 'withdraw']),
        ),
      );

    // 3. Fetch timestamps for each block with caching
    const blockCache: Record<number, string> = {};

    const getBlockTimestamp = async (blockNumber: number): Promise<string> => {
      if (blockCache[blockNumber]) return blockCache[blockNumber];
      const block = await this.provider.getBlock(blockNumber);
      const timestamp = block
        ? new Date(block.timestamp * 1000).toISOString()
        : new Date().toISOString();
      blockCache[blockNumber] = timestamp;
      return timestamp.split('.')[0].replace('T', ' ');
    };

    // 4. Parse to activity list
    const activities = await Promise.all(
      events.map(async (event, i) => {
        const wallet = event.userAddress;
        const amount = Number(event.amount ?? '0'); // assuming USDC 6 decimals
        const dateTime = new Date(event.timestamp)
          .toISOString()
          .split('.')[0]
          .replace('T', ' ');

        return {
          id: `${event.eventType}-${event.txHash}-${i}`,
          dateTime,
          wallet,
          hash: event.txHash,
          transactionType:
            event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1),
          amount: {
            amount,
            currency: 'USDC',
            amountSummary: `${(event.quantity)} ${indexData.symbol}`,
          },
        };
      }),
    );

    // 5. Sort by date desc
    return activities
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime(),
      );
  }

  async getIndexTransactions(indexId: number) {
    const rows = await this.dbService
      .getDb()
      .select({
        tx_hash: indexEvents.txHash,
        log_index: indexEvents.logIndex,
        timestamp: indexEvents.timestamp,
        nav: indexEvents.nav,
        weights: indexEvents.weights,
        created_at: indexEvents.createdAt,
      })
      .from(indexEvents)
      .where(eq(indexEvents.indexId, indexId))
      .orderBy(desc(indexEvents.timestamp));

    const uniqueByTimestamp = new Map<number, (typeof rows)[0]>();
    for (const row of rows) {
      if (!uniqueByTimestamp.has(row.timestamp)) {
        uniqueByTimestamp.set(row.timestamp, row);
      }
      // because rows are sorted DESC by logIndex for same timestamp,
      // the first one you see is the highest-logIndex for that timestamp
    }

    return Array.from(uniqueByTimestamp.values()).map((row) => ({
      id: `chain-${row.tx_hash}-${row.log_index}`,
      timestamp: formatTimestamp(row.timestamp),
      formattedTimestamp: row.timestamp,
      user: 'System',
      hash: row.tx_hash,
      currency: 'USDC',
      type: 'Rebalance',
      letv: 0,
      weights: row.weights,
      prices: null,
      coins: null,
      nav: row.nav,
    }));
  }

  async indexRebalanceTransactionsFetchAndStore() {
    const raw = await fs.readFile(this.INDEX_LIST_PATH, 'utf8');
    const list: Array<any> = JSON.parse(raw);
    list.map(async (_index) => {
      const indexData = _index;
      if (!indexData) return;
      const iface = new ethers.Interface([
        'event CuratorUpdate(uint256 timestamp, bytes weights, uint256 nav)',
      ]);
      const logs = await this.provider.getLogs({
        address: indexData.address,
        fromBlock: 0,
        toBlock: 'latest',
        topics: [ethers.id('CuratorUpdate(uint256,bytes,uint256)')],
      });

      const entries = logs.map((log, idx) => {
        const parsed = iface.parseLog(log);
        if (!parsed) return null;
        return {
          indexId: Number(_index.indexId),
          txHash: log.transactionHash,
          logIndex: Math.round(Math.random() * 1000),
          timestamp: Number(parsed.args.timestamp),
          nav: parsed.args.nav.toString(),
          weights: parsed.args.weights,
        };
      });

      // Upsert logic: insert if not exists
      for (const entry of entries) {
        await this.dbService
          .getDb()
          .insert(indexEvents)
          .values(entry)
          .onConflictDoNothing({ target: indexEvents.txHash });
      }
    });
  }

  async getHistoricalData(indexId: number): Promise<HistoricalEntry[]> {
    const indexData = await this.getIndexDataFromFile(indexId);

    // 1. First try to get complete existing data from database
    const existingPrices = await this.dbService
      .getDb()
      .select({
        date: dailyPrices.date,
        price: dailyPrices.price,
      })
      .from(dailyPrices)
      .where(eq(dailyPrices.indexId, indexId.toString()))
      .orderBy(asc(dailyPrices.date));

    // If we have complete historical data, return it immediately
    if (existingPrices.length > 0) {
      const latestDate = existingPrices[existingPrices.length - 1].date;
      const isUpToDate = latestDate >= new Date(Date.now() - 86400 * 1000);

      return existingPrices.map((row) => ({
        name: indexData?.name, // Will be filled below
        date: row.date,
        price: Number(row.price),
        value: Number(row.price),
      }));
    }

    // 2. Get all rebalance events
    const rebalanceData = await this.dbService.getDb().execute(
      sql`
        SELECT timestamp, weights, prices
        FROM (
          SELECT *,
                 ROW_NUMBER() OVER (PARTITION BY timestamp ORDER BY created_at DESC) as rn
          FROM ${rebalances}
          WHERE ${rebalances.indexId} = ${indexId.toString()}
        ) sub
        WHERE rn = 1
        ORDER BY timestamp ASC;
      `,
    );

    const rebalanceEvents = rebalanceData.rows;

    if (rebalanceEvents.length === 0) return [];

    // 4. Prepare calculation for missing dates only
    const historicalData: HistoricalEntry[] = [
      ...existingPrices.map((p) => ({
        name: indexData?.name,
        date: p.date,
        price: Number(p.price),
        value: Number(p.price),
      })),
    ];

    let currentQuantities: Record<string, number> = {};
    let lastKnownPrice =
      historicalData.length > 0
        ? historicalData[historicalData.length - 1].price
        : 10000; // Default to 10,000 if no history

    // 5. Get all needed Coingecko IDs
    const allSymbols: any[] = rebalanceEvents.flatMap((event) =>
      JSON.parse(event.weights).map((w: [string, number]) => w[0]),
    );
    const coingeckoIdMap = await this.mapToCoingeckoIds([
      ...new Set(allSymbols),
    ]);

    // 6. Process each period between rebalances
    for (let i = 0; i < rebalanceEvents.length; i++) {
      const rebalance = {
        timestamp: Number(rebalanceEvents[i].timestamp),
        weights: JSON.parse(rebalanceEvents[i].weights) as [string, number][],
        prices: rebalanceEvents[i].prices as Record<string, number>,
      };

      const nextRebalance = rebalanceEvents[i + 1];
      const endTimestamp = nextRebalance
        ? Number(nextRebalance.timestamp)
        : Math.floor(Date.now() / 1000);

      // Calculate quantities at rebalance point
      currentQuantities = this.calculateTokenQuantities(
        rebalance.weights,
        rebalance.prices,
        lastKnownPrice,
      );

      // Calculate only missing dates
      const startDate = this.normalizeToNextUtcMidnight(
        new Date(rebalance.timestamp * 1000),
      );
      startDate.setUTCHours(0, 0, 0, 0);

      let endDate;
      if (this.isUtcMidnight(new Date(endTimestamp * 1000))) {
        endDate = this.normalizeToNextUtcMidnight(
          new Date(endTimestamp * 1000),
        );
      } else {
        endDate = new Date(endTimestamp * 1000);
      }

      // Get historical prices for this period
      const tokenPrices = await this.getHistoricalPricesForPeriod(
        coingeckoIdMap,
        startDate.getTime() / 1000,
        endDate.getTime() / 1000,
      );

      for (let d = startDate; d < endDate; d.setUTCDate(d.getUTCDate() + 1)) {
        const date = d;
        const dateStr = d.toISOString().split('T')[0]; // 'YYYY-MM-DD'

        // Skip if we already have this date
        if (existingPrices.some((p) => p.date === dateStr)) {
          continue;
        }

        const ts = Math.floor(d.getTime() / 1000); // Timestamp at midnight UTC

        const price = this.calculateIndexPrice(
          currentQuantities,
          tokenPrices,
          ts,
        );
        if (price === null) continue;
        lastKnownPrice = Number(price.toFixed(2));

        const entry: HistoricalEntry = {
          name: indexData?.name || '',
          date: new Date(ts * 1000), // Keep as string in 'YYYY-MM-DD' format
          price: Number(price.toFixed(2)),
          value: price,
          quantities: currentQuantities,
        };

        historicalData.push(entry);
        await this.storeDailyPrice(
          indexId,
          dateStr,
          Number(price.toFixed(2)),
          currentQuantities,
        ); // Also pass 'YYYY-MM-DD' string to DB
      }
    }

    // Return sorted and deduplicated
    return historicalData.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }

  async getHistoricalDataFromTempRebalances(
    indexId: number,
  ): Promise<HistoricalEntry[]> {
    const indexData = await this.getIndexDataFromFile(indexId);

    // 1. Get all rebalance events
    const rebalanceData = await this.dbService.getDb().execute(
      sql`
        SELECT timestamp, weights, prices, coins
        FROM (
          SELECT *,
                 ROW_NUMBER() OVER (PARTITION BY timestamp ORDER BY created_at DESC) as rn
          FROM ${tempRebalances}
          WHERE ${tempRebalances.indexId} = ${indexId.toString()}
        ) sub
        WHERE rn = 1
        ORDER BY timestamp ASC;
      `,
    );
    const rebalanceEvents = rebalanceData.rows;
    if (rebalanceEvents.length === 0) return [];

    const historicalData: HistoricalEntry[] = [];
    let currentQuantities: Record<string, number> = {};
    let lastKnownPrice = 10000; // Initial value

    // 2. Get all unique Coingecko IDs
    const allCoinIds = new Set<string>();
    rebalanceEvents.forEach((event) => {
      const coins =
        typeof event.coins === 'string' ? JSON.parse(event.coins) : event.coins;
      Object.keys(coins).forEach((id) => allCoinIds.add(id));
    });

    const symbolMappings = await this.dbService
      .getDb()
      .select({
        coinId: coinSymbols.coinId,
        symbol: coinSymbols.symbol,
      })
      .from(coinSymbols)
      .where(inArray(coinSymbols.coinId, Array.from(allCoinIds)));

    // Handle missing coinIds
    const existingCoinIds = new Set(symbolMappings.map((row) => row.coinId));
    const missingCoinIds = Array.from(allCoinIds).filter(
      (id) => !existingCoinIds.has(id),
    );
    if (missingCoinIds.length > 0) {
      for (const coinId of missingCoinIds) {
        const _symbol =
          await this.coinGeckoService.getSymbolFromCoinGecko(coinId);
        _symbol && symbolMappings.push({ coinId, symbol: _symbol });
      }
    }

    // 3. Find the correct trading pair (prioritize Binance USDC > Binance USDT > Bitget USDC > Bitget USDT)
    const findTradingPair = (
      prices: Record<string, number>,
      symbol: string,
    ): string | null => {
      const upperSymbol = symbol.toUpperCase();
      const possiblePairs = [
        `bi.${upperSymbol}USDC`, // Binance USDC
        `bi.${upperSymbol}USDT`, // Binance USDT
        `bg.${upperSymbol}USDC`, // Bitget USDC
        `bg.${upperSymbol}USDT`, // Bitget USDT
      ];
      return possiblePairs.find((pair) => prices[pair] !== undefined) || null;
    };

    // 4. Process each period between rebalances
    for (let i = 0; i < rebalanceEvents.length; i++) {
      // for (let i = 40; i < 41; i++) {
      const rebalance = {
        timestamp: Number(rebalanceEvents[i].timestamp),
        weights: JSON.parse(rebalanceEvents[i].weights) as [string, number][],
        prices:
          typeof rebalanceEvents[i].prices === 'string'
            ? JSON.parse(rebalanceEvents[i].prices)
            : rebalanceEvents[i].prices,
        coins: rebalanceEvents[i].coins as Record<string, number>,
      };

      const nextRebalance = rebalanceEvents[i + 1];
      const endTimestamp = nextRebalance
        ? Number(nextRebalance.timestamp)
        : Math.floor(Date.now() / 1000 - 86400);

      // Create price map using the best available pairs
      const tokenPrices: Record<string, number> = {};
      symbolMappings.forEach((row) => {
        const pair = findTradingPair(rebalance.prices, row.symbol);
        if (pair) {
          tokenPrices[row.coinId] = rebalance.prices[pair];
        }
      });
      // Modified for a while as a quick deploying

      // currentQuantities = this.calculateTokenQuantitiesFromTempRebalance(
      //   typeof rebalance.coins === 'string'
      //     ? JSON.parse(rebalance.coins)
      //     : rebalance.coins,
      //   tokenPrices,
      //   lastKnownPrice,
      // );

      let effectiveCoins =
        typeof rebalance.coins === 'string'
          ? JSON.parse(rebalance.coins)
          : rebalance.coins;

      if (
        indexId === 21 &&
        i === rebalanceEvents.length - 1 // last rebalance only
      ) {
        // Convert weights to synthetic BTC weight
        const adjustedWeights =
          await this.indexRegistryService.replaceBitgetWeightsWithBTC(
            rebalance.weights,
          );

        // Create synthetic coins from adjusted weights
        effectiveCoins = {};
        for (const [pair, weight] of adjustedWeights) {
          const coinId = symbolMappings.find((row) => {
            const p = findTradingPair(rebalance.prices, row.symbol);
            return p === pair;
          })?.coinId;

          if (coinId) {
            effectiveCoins[coinId] = weight;
          }
        }
      }

      currentQuantities = this.calculateTokenQuantitiesFromTempRebalance(
        effectiveCoins,
        tokenPrices,
        lastKnownPrice,
      );

      // Set date range for this period
      const startDate = this.normalizeToNextUtcMidnight(
        new Date(rebalance.timestamp * 1000),
      );
      startDate.setUTCHours(0, 0, 0, 0);

      let endDate;
      if (this.isUtcMidnight(new Date(endTimestamp * 1000))) {
        endDate = this.normalizeToNextUtcMidnight(
          new Date(endTimestamp * 1000),
        );
      } else {
        endDate = new Date(endTimestamp * 1000);
      }

      // Get historical prices for this period
      const coingeckoIdMap = symbolMappings.reduce(
        (acc, row) => {
          acc[row.symbol] = row.coinId;
          return acc;
        },
        {} as Record<string, string>,
      );

      const dailyTokenPrices =
        await this.getHistoricalPricesForPeriodWithCoinId(
          coingeckoIdMap,
          startDate.getTime() / 1000,
          endDate.getTime() / 1000,
        );
      // Process each day in the period
      for (
        let d = new Date(startDate);
        d < endDate;
        d.setUTCDate(d.getUTCDate() + 1)
      ) {
        const date = new Date(d);
        const dateStr = date.toISOString().split('T')[0];
        const ts = Math.floor(date.getTime() / 1000);
        const price = this.calculateIndexPrice(
          currentQuantities,
          dailyTokenPrices,
          ts,
        );
        if (price === null) continue;
        lastKnownPrice = Number(price.toFixed(2));
        historicalData.push({
          name: indexData?.name || '',
          date: new Date(ts * 1000),
          price: lastKnownPrice,
          value: lastKnownPrice,
          quantities: currentQuantities,
        });

        await this.storeDailyPrice(
          indexId,
          dateStr,
          lastKnownPrice,
          currentQuantities,
        );
      }
    }

    return historicalData.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  async getHistoricalDataFromTop20Rebalances(
    indexId: number,
    name: string,
  ): Promise<HistoricalEntry[]> {
    const rebalanceData = await this.dbService.getDb().execute(
      sql`
        SELECT timestamp, weights, prices, coins
        FROM (
          SELECT *,
                 ROW_NUMBER() OVER (PARTITION BY timestamp ORDER BY created_at DESC) as rn
          FROM ${tempTop20Rebalances}
          WHERE ${tempTop20Rebalances.indexId} = ${indexId.toString()}
        ) sub
        WHERE rn = 1
        ORDER BY timestamp ASC;
      `,
    );

    const rebalanceEvents = rebalanceData.rows;
    if (rebalanceEvents.length === 0) return [];

    const historicalData: HistoricalEntry[] = [];
    let currentQuantities: Record<string, number> = {};
    let lastKnownPrice = 10000; // initial

    const allCoinIds = new Set<string>();
    for (const event of rebalanceEvents) {
      const coins =
        typeof event.coins === 'string' ? JSON.parse(event.coins) : event.coins;
      Object.keys(coins).forEach((id) => allCoinIds.add(id));
    }

    const symbolMappings = await this.dbService
      .getDb()
      .select({ coinId: coinSymbols.coinId, symbol: coinSymbols.symbol })
      .from(coinSymbols)
      .where(inArray(coinSymbols.coinId, Array.from(allCoinIds)));

    // Handle any unmapped IDs via Coingecko
    const existingCoinIds = new Set(symbolMappings.map((row) => row.coinId));
    const missingCoinIds = Array.from(allCoinIds).filter(
      (id) => !existingCoinIds.has(id),
    );

    if (missingCoinIds.length > 0) {
      for (const coinId of missingCoinIds) {
        const _symbol =
          await this.coinGeckoService.getSymbolFromCoinGecko(coinId);
        if (_symbol) {
          symbolMappings.push({ coinId, symbol: _symbol });
        }
      }
    }

    const findTradingPair = (
      prices: Record<string, number>,
      symbol: string,
    ): string | null => {
      const upperSymbol = symbol.toUpperCase();
      const possiblePairs = [
        `bi.${upperSymbol}USDC`,
        `bi.${upperSymbol}USDT`,
        `bg.${upperSymbol}USDC`,
        `bg.${upperSymbol}USDT`,
      ];
      return possiblePairs.find((pair) => prices[pair] !== undefined) || null;
    };

    for (let i = 0; i < rebalanceEvents.length; i++) {
      const rebalance = {
        timestamp: Number(rebalanceEvents[i].timestamp),
        weights: JSON.parse(rebalanceEvents[i].weights) as [string, number][],
        prices:
          typeof rebalanceEvents[i].prices === 'string'
            ? JSON.parse(rebalanceEvents[i].prices)
            : rebalanceEvents[i].prices,
        coins:
          typeof rebalanceEvents[i].coins === 'string'
            ? JSON.parse(rebalanceEvents[i].coins)
            : rebalanceEvents[i].coins,
      };

      const nextRebalance = rebalanceEvents[i + 1];
      const endTimestamp = nextRebalance
        ? Number(nextRebalance.timestamp)
        : Math.floor(Date.now() / 1000 - 86400);

      // Build price map by coinId
      const tokenPrices: Record<string, number> = {};
      symbolMappings.forEach((row) => {
        const pair = findTradingPair(rebalance.prices, row.symbol);
        if (pair) {
          tokenPrices[row.coinId] = rebalance.prices[pair];
        }
      });

      currentQuantities = this.calculateTokenQuantitiesFromTempRebalance(
        rebalance.coins,
        tokenPrices,
        lastKnownPrice,
      );

      const startDate = this.normalizeToNextUtcMidnight(
        new Date(rebalance.timestamp * 1000),
      );
      startDate.setUTCHours(0, 0, 0, 0);

      const endDate = this.isUtcMidnight(new Date(endTimestamp * 1000))
        ? this.normalizeToNextUtcMidnight(new Date(endTimestamp * 1000))
        : new Date(endTimestamp * 1000);

      const coingeckoIdMap = symbolMappings.reduce(
        (acc, row) => {
          acc[row.symbol] = row.coinId;
          return acc;
        },
        {} as Record<string, string>,
      );

      const dailyTokenPrices =
        await this.getHistoricalPricesForPeriodWithCoinId(
          coingeckoIdMap,
          startDate.getTime() / 1000,
          endDate.getTime() / 1000,
        );

      for (
        let d = new Date(startDate);
        d < endDate;
        d.setUTCDate(d.getUTCDate() + 1)
      ) {
        const date = new Date(d);
        const ts = Math.floor(date.getTime() / 1000);
        const price = this.calculateIndexPrice(
          currentQuantities,
          dailyTokenPrices,
          ts,
        );
        if (price === null) continue;
        lastKnownPrice = Number(price.toFixed(2));
        historicalData.push({
          name: name,
          date: new Date(ts * 1000),
          price: lastKnownPrice,
          value: lastKnownPrice,
          quantities: currentQuantities,
        });
      }
    }

    return historicalData.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private isUtcMidnight = (date: Date): boolean => {
    return (
      date.getUTCHours() === 0 &&
      date.getUTCMinutes() === 0 &&
      date.getUTCSeconds() === 0 &&
      date.getUTCMilliseconds() === 0
    );
  };

  private normalizeToNextUtcMidnight = (date: Date): Date => {
    const isMidnight =
      date.getUTCHours() === 0 &&
      date.getUTCMinutes() === 0 &&
      date.getUTCSeconds() === 0 &&
      date.getUTCMilliseconds() === 0;

    if (isMidnight) return date;

    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate() + 1,
      ),
    );
  };

  async getLastDailyETFPrice(indexId: number): Promise<HistoricalEntry[]> {
    // 1. First try to get complete existing data from database
    const existingPrices = await this.dbService
      .getDb()
      .select({
        date: dailyPrices.date,
        price: dailyPrices.price,
      })
      .from(dailyPrices)
      .where(eq(dailyPrices.indexId, indexId.toString()))
      .orderBy(asc(dailyPrices.date));

    // If we have complete historical data, return it immediately
    if (existingPrices.length > 0) {
      const latestDate = existingPrices[existingPrices.length - 1].date;
      const isUpToDate = latestDate >= new Date(Date.now() - 86400 * 1000);

      return existingPrices.map((row) => ({
        name: '', // Will be filled below
        date: row.date,
        price: Number(row.price),
        value: Number(row.price),
      }));
    }

    // 2. Get all rebalance events
    const rebalanceEvents = await this.dbService.getDb().execute(
      sql`
        SELECT timestamp, weights, prices
        FROM (
          SELECT *,
                 ROW_NUMBER() OVER (PARTITION BY timestamp ORDER BY created_at DESC) as rn
          FROM ${rebalances}
          WHERE ${rebalances.indexId} = ${indexId.toString()}
        ) sub
        WHERE rn = 1
        ORDER BY timestamp ASC;
      `,
    );

    if (rebalanceEvents.length === 0) return [];

    // 4. Prepare calculation for missing dates only
    const historicalData: HistoricalEntry[] = [
      ...existingPrices.map((p) => ({
        name: '',
        date: p.date,
        price: Number(p.price),
        value: Number(p.price),
      })),
    ];

    let currentQuantities: Record<string, number> = {};
    let lastKnownPrice =
      historicalData.length > 0
        ? historicalData[historicalData.length - 1].price
        : 10000; // Default to 10,000 if no history

    // 5. Get all needed Coingecko IDs
    const allSymbols: any[] = rebalanceEvents.flatMap((event) =>
      JSON.parse(event.weights).map((w: [string, number]) => w[0]),
    );
    const coingeckoIdMap = await this.mapToCoingeckoIds([
      ...new Set(allSymbols),
    ]);

    // 6. Process each period between rebalances
    for (let i = 0; i < rebalanceEvents.length; i++) {
      const rebalance = {
        timestamp: Number(rebalanceEvents[i].timestamp),
        weights: JSON.parse(rebalanceEvents[i].weights) as [string, number][],
        prices: rebalanceEvents[i].prices as Record<string, number>,
      };

      const nextRebalance = rebalanceEvents[i + 1];
      const endTimestamp = nextRebalance
        ? Number(nextRebalance.timestamp)
        : Math.floor(Date.now() / 1000);

      // Calculate quantities at rebalance point
      currentQuantities = this.calculateTokenQuantities(
        rebalance.weights,
        rebalance.prices,
        lastKnownPrice,
      );
      // Get historical prices for this period
      const tokenPrices = await this.getHistoricalPricesForPeriod(
        coingeckoIdMap,
        rebalance.timestamp,
        endTimestamp,
      );

      // Calculate only missing dates
      for (let ts = rebalance.timestamp; ts <= endTimestamp; ts += 86400) {
        const currentDate = new Date(ts * 1000);
        const dateStr = currentDate.toISOString().split('T')[0];

        // Skip if we already have this date
        if (existingPrices.some((p) => p.date === dateStr)) {
          continue;
        }

        const price = this.calculateIndexPrice(
          currentQuantities,
          tokenPrices,
          ts,
        );

        if (price === null) continue;

        lastKnownPrice = price;
        const entry = {
          name: '',
          date: currentDate,
          price,
          value: price,
        };

        historicalData.push(entry);
        await this.storeDailyPrice(indexId, dateStr, price, currentQuantities);
      }
    }

    // Return sorted and deduplicated
    return historicalData
      .filter((v, i, a) => a.findIndex((t) => t.date === v.date) === i)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  private calculateTokenQuantities(
    weights: [string, number][],
    prices: Record<string, number>,
    portfolioValue: number,
  ): Record<string, number> {
    const quantities: Record<string, number> = {};

    for (const [token, weight] of weights) {
      const tokenPrice = prices[token];
      if (!tokenPrice) continue;

      quantities[token] = (portfolioValue * weight) / tokenPrice / 10000;
    }

    return quantities;
  }

  private calculateTokenQuantitiesFromTempRebalance(
    coins: Record<string, number>,
    prices: Record<string, number>,
    indexValue: number,
  ): Record<string, number> {
    const quantities: Record<string, number> = {};

    // Calculate total weight from coins object
    const totalWeight = Object.values(coins).reduce(
      (sum, weight) => sum + weight,
      0,
    );

    // Calculate the dollar amount to allocate to each asset
    const dollarAllocation = indexValue / totalWeight;

    // Iterate through coins instead of weights
    for (const [coinId, weight] of Object.entries(coins)) {
      if (coinId) {
        const price = prices[coinId];
        if (price && price > 0) {
          quantities[coinId] = (dollarAllocation * weight) / price;
        }
      }
    }

    return quantities;
  }

  private calculateIndexPrice(
    quantities: Record<string, number>,
    tokenPrices: Record<string, Array<{ timestamp: number; price: number }>>,
    timestamp: number,
  ): number | null {
    let portfolioValue = 0;
    let hasData = false;

    for (const [token, quantity] of Object.entries(quantities)) {
      const prices = tokenPrices[token];
      if (!prices) {
        continue;
      }

      const priceRecord = this.findClosestPrice(prices, timestamp);
      if (!priceRecord) {
        continue;
      }

      if (priceRecord) {
        portfolioValue += quantity * (priceRecord.price * 1);
        hasData = true;
      }
    }
    return hasData ? portfolioValue : null;
  }

  private async storeDailyPrice(
    indexId: number,
    date: string,
    price: number,
    quantities: Record<string, number>,
  ) {
    try {
      await this.dbService
        .getDb()
        .insert(dailyPrices)
        .values({
          indexId: indexId.toString(),
          date,
          price: price.toString(),
          quantities: JSON.stringify(quantities),
        })
        .onConflictDoUpdate({
          target: [dailyPrices.indexId, dailyPrices.date],
          set: {
            price: price.toString(),
            quantities: JSON.stringify(quantities),
            updatedAt: new Date(),
          },
        });
    } catch (error) {
      console.error('Error storing daily price:', error);
    }
  }

  // store daily etf prices for cron job
  async storeDailyETFPrices(indexIds: number[]) {
    try {
      const allIndexes = indexIds;
      const yesterday = new Date(Date.now()); // 86400000 ms = 1 day
      yesterday.setUTCHours(0, 0, 0, 0);

      for (const index of allIndexes) {
        try {
          // Check if yesterday's price already exists
          const history = await this.getLastDailyETFPrice(index);

          // The last entry should now include yesterday
          const latestEntry = history[history.length - 1];
          if (!latestEntry) return;
          const latestDate = latestEntry.date;
          if (new Date(latestEntry.date).getDate() === yesterday.getDate()) {
            const exists = await this.dbService
              .getDb()
              .select()
              .from(dailyPrices)
              .where(
                and(
                  eq(dailyPrices.indexId, index.toString()),
                  eq(
                    dailyPrices.date,
                    new Date(latestDate).toISOString().split('T')[0],
                  ),
                ),
              )
              .limit(1);

            if (exists.length === 0) {
              // 5. Store only the latest price if missing
              // await this.storeDailyPrice(index, latestDate, latestEntry.price);
              console.log(
                `Stored ${index} price for ${latestDate}: ${latestEntry.price}`,
              );
            }
          } else {
            console.log(
              `Skipped ${index} price for ${new Date(latestEntry.date).getDate()}: ${yesterday.getDate()}`,
            );
          }
        } catch (error) {
          console.error(`Error updating index ${index}: ${error.message}`);
        }
      }
    } catch (error) {
      console.error(`Job failed: ${error.message}`);
    }
  }

  async getIndexDailyPriceByIndexID(indexId: number) {
    const existingPrices = await this.dbService
      .getDb()
      .select({
        date: dailyPrices.date,
        price: dailyPrices.price,
        quantities: dailyPrices.quantities,
      })
      .from(dailyPrices)
      .where(eq(dailyPrices.indexId, indexId.toString()))
      .orderBy(asc(dailyPrices.date));

    return existingPrices;
  }

  async getTopHoldingsFromRebalance(indexId: number): Promise<{
    holdings: { name: string; percentage: string }[];
    summary: { top10: string; top20: string; top50: string };
    totalHoldings: string;
  }> {
    const rebalance = await this.dbService
      .getDb()
      .query.tempRebalances.findFirst({
        where: eq(tempRebalances.indexId, indexId.toString()),
        orderBy: desc(tempRebalances.timestamp),
      });

    if (!rebalance) throw new Error(`No rebalance found for index ${indexId}`);

    // Parse weights: [ [tokenName, weight], ... ]
    const weights =
      typeof rebalance.weights === 'string'
        ? (JSON.parse(rebalance.weights) as [string, number][])
        : rebalance.weights;

    const holdings = weights.map(([name, weight]) => ({
      name: name.split('.')[1].replace('USDC', '').replace('USDT', ''),
      percentage: (weight / 100).toFixed(2),
    }));

    const sumTop = (count: number) =>
      holdings
        .slice(0, count)
        .reduce((sum, h) => sum + parseFloat(h.percentage), 0)
        .toFixed(2);

    return {
      holdings: holdings.slice(0, 10),
      summary: {
        top10: sumTop(10),
        top20: sumTop(20),
        top50: sumTop(50),
      },
      totalHoldings: String(holdings.length),
    };
  }

  async getDailyPriceData(indexId: number): Promise<any[]> {
    const indexData = await this.getIndexDataFromFile(indexId);

    const existingPrices = await this.dbService
      .getDb()
      .select({
        date: dailyPrices.date,
        price: dailyPrices.price,
        quantities: dailyPrices.quantities,
      })
      .from(dailyPrices)
      .where(eq(dailyPrices.indexId, indexId.toString()))
      .orderBy(asc(dailyPrices.date));

    if (existingPrices.length === 0) return [];

    // Step 1: Parse quantities and collect all unique coinIds
    const parsedData = existingPrices.map((row) => ({
      ...row,
      quantities: row.quantities as Record<string, number>,
    }));

    const allCoinIds = new Set<string>();
    parsedData.forEach((row) => {
      Object.keys(row.quantities).forEach((coinId) => allCoinIds.add(coinId));
    });

    // Step 2: Get full timestamp range for daily_prices
    const timestamps = parsedData.map((row) =>
      Math.floor(new Date(row.date).getTime() / 1000),
    );
    const minTimestamp = Math.min(...timestamps);
    const maxTimestamp = Math.max(...timestamps);

    // Step 3: Query historical prices in batch
    const coinIdList = Array.from(allCoinIds);
    const historical = await this.dbService
      .getDb()
      .select()
      .from(historicalPrices)
      .where(
        and(
          inArray(historicalPrices.coinId, coinIdList),
          between(
            historicalPrices.timestamp,
            minTimestamp - 86400,
            maxTimestamp + 86400,
          ),
        ),
      );

    // Step 4: Build a price lookup map: { coinId => [ { timestamp, price } ] }
    const priceMap = new Map<string, { timestamp: number; price: number }[]>();
    for (const row of historical) {
      if (!priceMap.has(row.coinId)) {
        priceMap.set(row.coinId, []);
      }
      priceMap
        .get(row.coinId)!
        .push({ timestamp: row.timestamp, price: row.price });
    }

    // Ensure each list is sorted by timestamp
    for (const [_, list] of priceMap) {
      list.sort((a, b) => a.timestamp - b.timestamp);
    }

    // Helper: Find nearest price by timestamp (assumes sorted list)
    const findNearestPrice = (coinId: string, targetTs: number) => {
      const prices = priceMap.get(coinId);
      if (!prices) return null;
      let left = 0;
      let right = prices.length - 1;
      while (left < right) {
        const mid = Math.floor((left + right) / 2);
        if (prices[mid].timestamp < targetTs) left = mid + 1;
        else right = mid;
      }
      const best = prices[left];
      if (!best) return null;

      // Compare with previous to find closer one
      if (left > 0) {
        const prev = prices[left - 1];
        return Math.abs(prev.timestamp - targetTs) <
          Math.abs(best.timestamp - targetTs)
          ? prev.price
          : best.price;
      }
      return best.price;
    };

    // Step 5: Build final output
    const results = parsedData.map((row) => {
      const targetTs = Math.floor(new Date(row.date).getTime() / 1000);

      const dailyCoinPrices: Record<string, number> = {};
      for (const coinId of Object.keys(row.quantities)) {
        const price = findNearestPrice(coinId, targetTs);
        if (price !== null) dailyCoinPrices[coinId] = price;
      }

      return {
        index: indexData?.name,
        indexId,
        date: row.date,
        quantities: row.quantities,
        price: Number(row.price),
        value: Number(row.price),
        coinPrices: dailyCoinPrices, // Add per-day coin prices
      };
    });

    return results;
  }

  async getTempRebalancedData(indexId: number): Promise<any[]> {
    const indexData = await this.getIndexDataFromFile(indexId);
    const result: any[] = [];

    // 1. Get all rebalance events
    const rebalanceData = await this.dbService.getDb().execute(
      sql`
        SELECT timestamp, weights, prices, coins
        FROM (
          SELECT *,
                 ROW_NUMBER() OVER (PARTITION BY timestamp ORDER BY created_at DESC) as rn
          FROM ${tempRebalances}
          WHERE ${tempRebalances.indexId} = ${indexId.toString()}
        ) sub
        WHERE rn = 1
        ORDER BY timestamp ASC;
      `,
    );
    const rebalanceEvents = rebalanceData.rows;
    if (rebalanceEvents.length === 0) return [];

    const historicalData: HistoricalEntry[] = [];
    let currentQuantities: Record<string, number> = {};
    let lastKnownPrice = 10000; // Initial value

    // 2. Get all unique Coingecko IDs
    const allCoinIds = new Set<string>();
    rebalanceEvents.forEach((event) => {
      const coins =
        typeof event.coins === 'string' ? JSON.parse(event.coins) : event.coins;
      Object.keys(coins).forEach((id) => allCoinIds.add(id));
    });

    const symbolMappings = await this.dbService
      .getDb()
      .select({
        coinId: coinSymbols.coinId,
        symbol: coinSymbols.symbol,
      })
      .from(coinSymbols)
      .where(inArray(coinSymbols.coinId, Array.from(allCoinIds)));

    // Handle missing coinIds
    const existingCoinIds = new Set(symbolMappings.map((row) => row.coinId));
    const missingCoinIds = Array.from(allCoinIds).filter(
      (id) => !existingCoinIds.has(id),
    );
    if (missingCoinIds.length > 0) {
      for (const coinId of missingCoinIds) {
        const _symbol =
          await this.coinGeckoService.getSymbolFromCoinGecko(coinId);
        _symbol && symbolMappings.push({ coinId, symbol: _symbol });
      }
    }

    // 3. Find the correct trading pair (prioritize Binance USDC > Binance USDT > Bitget USDC > Bitget USDT)
    const findTradingPair = (
      prices: Record<string, number>,
      symbol: string,
    ): string | null => {
      const upperSymbol = symbol.toUpperCase();
      const possiblePairs = [
        `bi.${upperSymbol}USDC`, // Binance USDC
        `bi.${upperSymbol}USDT`, // Binance USDT
        `bg.${upperSymbol}USDC`, // Bitget USDC
        `bg.${upperSymbol}USDT`, // Bitget USDT
      ];
      return possiblePairs.find((pair) => prices[pair] !== undefined) || null;
    };

    // 4. Process each period between rebalances
    for (let i = 0; i < rebalanceEvents.length; i++) {
      // for (let i = 40; i < 41; i++) {
      const rebalance = {
        timestamp: Number(rebalanceEvents[i].timestamp),
        weights: JSON.parse(rebalanceEvents[i].weights) as [string, number][],
        prices:
          typeof rebalanceEvents[i].prices === 'string'
            ? JSON.parse(rebalanceEvents[i].prices)
            : rebalanceEvents[i].prices,
        coins: rebalanceEvents[i].coins as Record<string, number>,
      };

      const nextRebalance = rebalanceEvents[i + 1];
      const endTimestamp = nextRebalance
        ? Number(nextRebalance.timestamp)
        : Math.floor(Date.now() / 1000 - 86400);

      // Create price map using the best available pairs
      const tokenPrices: Record<string, number> = {};
      symbolMappings.forEach((row) => {
        const pair = findTradingPair(rebalance.prices, row.symbol);
        if (pair) {
          tokenPrices[row.coinId] = rebalance.prices[pair];
        }
      });
      // Calculate quantities at rebalance point
      currentQuantities = this.calculateTokenQuantitiesFromTempRebalance(
        typeof rebalance.coins === 'string'
          ? JSON.parse(rebalance.coins)
          : rebalance.coins,
        tokenPrices,
        lastKnownPrice,
      );

      // Set date range for this period
      const startDate = this.normalizeToNextUtcMidnight(
        new Date(rebalance.timestamp * 1000),
      );
      startDate.setUTCHours(0, 0, 0, 0);

      let endDate;
      if (this.isUtcMidnight(new Date(endTimestamp * 1000))) {
        endDate = this.normalizeToNextUtcMidnight(
          new Date(endTimestamp * 1000),
        );
      } else {
        endDate = new Date(endTimestamp * 1000);
      }

      // Get historical prices for this period
      const coingeckoIdMap = symbolMappings.reduce(
        (acc, row) => {
          acc[row.symbol] = row.coinId;
          return acc;
        },
        {} as Record<string, string>,
      );

      const dailyTokenPrices =
        await this.getHistoricalPricesForPeriodWithCoinId(
          coingeckoIdMap,
          startDate.getTime() / 1000,
          endDate.getTime() / 1000,
        );
      // Process each day in the period
      for (
        let d = new Date(startDate);
        d < endDate;
        d.setUTCDate(d.getUTCDate() + 1)
      ) {
        const date = new Date(d);
        const dateStr = date.toISOString().split('T')[0];
        const ts = Math.floor(date.getTime() / 1000);
        const price = this.calculateIndexPrice(
          currentQuantities,
          dailyTokenPrices,
          ts,
        );
        if (price === null) continue;
        lastKnownPrice = Number(price.toFixed(2));

        historicalData.push({
          name: indexData?.name || '',
          date: new Date(ts * 1000),
          price: lastKnownPrice,
          value: lastKnownPrice,
          quantities: currentQuantities,
        });

        await this.storeDailyPrice(
          indexId,
          dateStr,
          lastKnownPrice,
          currentQuantities,
        );
      }

      const formattedAssetPrices = Object.entries(currentQuantities).map(
        ([symbol, quantity]) => {
          const startPrice = dailyTokenPrices[symbol]?.[0]?.price;
          const endPrice =
            dailyTokenPrices[symbol]?.[dailyTokenPrices[symbol].length - 1]
              ?.price || startPrice;

          return {
            asset: symbol,
            startPrice: startPrice?.toFixed(4) || '0.0000', // Handle undefined
            endPrice: endPrice?.toFixed(4) || '0.0000', // Handle undefined
            quantity: quantity, // Include quantity if needed
          };
        },
      );

      result.push({
        index: indexData?.name,
        indexId,
        rebalanceDate: startDate,
        indexPrice: lastKnownPrice.toFixed(2),
        weights: JSON.stringify(rebalance.weights),
        assetPrices: JSON.stringify(formattedAssetPrices),
        // quantities: JSON.stringify(currentQuantities),
      });
    }

    return result;
  }

  async getAssetPriceChanges(
    coingeckoIdMap: Record<string, string>,
    startTimestamp: number,
    endTimestamp: number,
    symbols: string[],
  ) {
    const result: Record<string, { startPrice: number; endPrice: number }> = {};

    for (const symbol of symbols) {
      const coingeckoId = coingeckoIdMap[symbol];
      if (!coingeckoId) continue;

      // Get price at start of period
      const startPrice =
        await this.coinGeckoService.getOrFetchTokenPriceAtTimestamp(
          coingeckoId,
          symbol,
          startTimestamp,
        );

      // Get price at end of period
      const endPrice =
        await this.coinGeckoService.getOrFetchTokenPriceAtTimestamp(
          coingeckoId,
          symbol,
          endTimestamp,
        );

      result[symbol] = {
        startPrice: startPrice || 0,
        endPrice: endPrice || startPrice || 0,
      };
    }

    return result;
  }

  async getRebalancedData(indexId: number): Promise<any[]> {
    // Fetch rebalance events from PostgreSQL
    const rebalanceEvents = await this.dbService
      .getDb()
      .select({
        timestamp: rebalances.timestamp,
        weights: rebalances.weights,
        prices: rebalances.prices,
      })
      .from(tempRebalances)
      .where(eq(rebalances.indexId, indexId.toString()))
      .orderBy(desc(rebalances.timestamp)); // Newest first to match original logic

    // Process events
    const reversedEvents = rebalanceEvents
      .map((event) => {
        const weights = JSON.parse(event.weights) as [string, number][];
        const prices = event.prices as Record<string, number>;

        // Calculate index price using the same method as historical data
        const price = weights.reduce((sum, [token, weight]) => {
          const tokenPrice = prices[token] || 0;
          return sum + tokenPrice * weight;
        }, 0);

        return {
          timestamp: Number(event.timestamp),
          date: new Date(Number(event.timestamp) * 1000),
          price: price / 1e6, // Maintain same scaling as original
          weights: weights,
          prices: prices,
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp); // Reverse sort (newest first)

    // Deduplicate by date (keeping latest)
    const eventsByDate = new Map<string, any>();
    reversedEvents.forEach((event) => {
      const dateKey = event.date.toISOString().split('T')[0];
      eventsByDate.set(dateKey, event);
    });

    return Array.from(eventsByDate.values());
  }

  private async getHistoricalPricesForPeriod(
    coingeckoIdMap: Record<string, string>,
    startTimestamp: number,
    endTimestamp: number,
  ): Promise<Record<string, Array<{ timestamp: number; price: number }>>> {
    const result: Record<
      string,
      Array<{ timestamp: number; price: number }>
    > = {};

    // Get all prices for all needed tokens in one query
    const coinIds = Object.values(coingeckoIdMap);
    const prices = await this.dbService
      .getDb()
      .select()
      .from(historicalPrices)
      .where(
        and(
          inArray(historicalPrices.coinId, coinIds),
          gte(historicalPrices.timestamp, startTimestamp),
          lte(historicalPrices.timestamp, endTimestamp),
        ),
      )
      .orderBy(asc(historicalPrices.timestamp));

    // Group by symbol
    const symbolToCoinId = Object.entries(coingeckoIdMap).reduce(
      (acc, [symbol, coinId]) => {
        acc[coinId] = symbol;
        return acc;
      },
      {} as Record<string, string>,
    );

    for (const priceRecord of prices) {
      const symbol = symbolToCoinId[priceRecord.coinId];
      if (!result[symbol]) {
        result[symbol] = [];
      }
      result[symbol].push({
        timestamp: priceRecord.timestamp,
        price: priceRecord.price,
      });
    }

    return result;
  }

  private async getHistoricalPricesForPeriodWithCoinId(
    coinIdMap: Record<string, string>, // { [symbol]: coinId }
    startTimestamp: number,
    endTimestamp: number,
  ): Promise<Record<string, Array<{ timestamp: number; price: number }>>> {
    const result: Record<
      string,
      Array<{ timestamp: number; price: number }>
    > = {};
    const coinIds = Object.values(coinIdMap);

    if (coinIds.length === 0) {
      return {};
    }

    // 1. Get all available historical prices for the period
    const allPrices = await this.dbService
      .getDb()
      .select()
      .from(historicalPrices)
      .where(
        and(
          inArray(historicalPrices.coinId, coinIds),
          gte(historicalPrices.timestamp, startTimestamp - 86400 * 90), // Include 30 days before for nearest lookup
          lte(historicalPrices.timestamp, endTimestamp + 86400 * 90),
        ),
      )
      .orderBy(asc(historicalPrices.timestamp));

    // 2. Group prices by coinId
    const pricesByCoin: Record<
      string,
      Array<{ timestamp: number; price: number }>
    > = {};
    for (const priceRecord of allPrices) {
      const coinId = priceRecord.coinId;
      if (!pricesByCoin[coinId]) {
        pricesByCoin[coinId] = [];
      }
      pricesByCoin[coinId].push({
        timestamp: priceRecord.timestamp,
        price: priceRecord.price,
      });
    }

    // 3. Generate daily prices for each coin
    for (const coinId of coinIds) {
      const coinPrices = pricesByCoin[coinId] || [];
      if (coinPrices.length === 0) continue;

      result[coinId] = [];
      const priceTimestamps = coinPrices.map((p) => p.timestamp);

      // Generate each day in the period
      for (let ts = startTimestamp; ts <= endTimestamp; ts += 86400) {
        const utcDate = new Date(ts * 1000);
        utcDate.setUTCHours(0, 0, 0, 0); // Normalize to UTC midnight
        const dayTimestamp = Math.floor(utcDate.getTime() / 1000);

        // Find the closest price (before or equal to this day)
        const nearestPrice = this.findNearestPrice(coinPrices, dayTimestamp);
        if (nearestPrice) {
          result[coinId].push({
            timestamp: dayTimestamp,
            price: nearestPrice.price,
          });
        }
      }
    }

    return result;
  }

  private findNearestPrice(
    prices: Array<{ timestamp: number; price: number }>,
    targetTimestamp: number,
  ): { timestamp: number; price: number } | null {
    if (prices.length === 0) return null;

    // Find the most recent price at or before the target timestamp
    let nearest: any = null;
    let minDiff = Infinity;

    for (const price of prices) {
      const diff = targetTimestamp - price.timestamp;
      if (diff >= 0 && diff < minDiff) {
        minDiff = diff;
        nearest = price;
      }
    }

    // If no price before target, use the first available price
    return nearest || prices[0];
  }

  private calculateIndexPriceFromDb(
    weights: Array<[string, number]>,
    tokenPrices: Record<string, Array<{ timestamp: number; price: number }>>,
    targetTimestamp: number,
  ): number | null {
    let totalValue = 0;
    let totalWeight = 0;

    for (const [symbol, weight] of weights) {
      const prices = tokenPrices[symbol];
      if (!prices || prices.length === 0) {
        // No price data for this token
        continue;
      }

      // Find the closest price to our target timestamp
      const priceRecord = this.findClosestPrice(prices, targetTimestamp);
      if (!priceRecord) continue;

      totalValue += priceRecord.price * weight;
      totalWeight += weight;
    }

    if (totalWeight === 0) return null;
    return totalValue / totalWeight;
  }

  private findClosestPrice(
    prices: Array<{ timestamp: number; price: number }>,
    targetTimestamp: number,
  ): { timestamp: number; price: number } | null {
    // Prices are already sorted by timestamp
    for (let i = 0; i < prices.length; i++) {
      if (prices[i].timestamp >= targetTimestamp) {
        // Return the first price that's >= target, or the last one if none found
        return prices[i] || prices[prices.length - 1];
      }
    }
    return prices[prices.length - 1] || null;
  }

  private async mapToCoingeckoIds(
    binanceSymbols: string[],
  ): Promise<Record<string, string>> {
    const symbolToIdsMap = await this.coinGeckoService.getSymbolToIdsMap(); // Now: Record<string, string[]>

    const result: Record<string, string> = {};
    for (const binSymbol of binanceSymbols) {
      const symbol = binSymbol
        .replace(/^bi\./, '')
        .replace(/^bg\./, '')
        .replace(/(USDT|USDC)$/i, '')
        .toUpperCase();
      const ids = symbolToIdsMap[symbol];

      if (ids) {
        result[binSymbol] = ids;
      } else {
        console.warn(`Missing CoinGecko ID for ${binSymbol}`);
      }
    }

    return result;
  }

  private getPriceAtDate(
    prices: Array<[number, number]>,
    targetDate: string,
  ): number | null {
    const target = new Date(targetDate).setUTCHours(0, 0, 0, 0);

    for (const [ts, price] of prices) {
      const day = new Date(ts).setUTCHours(0, 0, 0, 0);
      if (day === target) return price;
    }

    return null;
  }

  // private calculateIndexPrice(
  //   weights: Weight[],
  //   tokenPriceHistories: Record<string, Array<[number, number]>>,
  //   dateStr: string,
  // ): number | null {
  //   const totalWeight = weights.reduce((acc, [, w]) => acc + w, 0);
  //   let priceSum = 0;
  //   let valid = false;

  //   for (const [symbol, weight] of weights) {
  //     const prices = tokenPriceHistories[symbol];
  //     if (!prices) continue;

  //     const tokenPrice = this.getPriceAtDate(prices, dateStr);
  //     if (!tokenPrice) continue;

  //     priceSum += (weight / totalWeight) * tokenPrice;
  //     valid = true;
  //   }

  //   return valid ? priceSum : null;
  // }

  async fetchCoinHistoricalData(
    coinId: string = 'bitcoin',
    startDate: Date = new Date('2019-01-01'),
    endDate: Date = new Date(),
  ): Promise<HistoricalEntry[] | null> {
    try {
      // Fetch BTC price data from CoinGecko
      const coinPriceData =
        await this.coinGeckoService.getTokenMarketChart(coinId);

      // Convert to timestamp seconds
      const endTimestamp = Math.floor(endDate.getTime() / 1000);
      const startTimestamp = Math.floor(startDate.getTime() / 1000);

      // Create a map of date to price for efficient lookup
      const priceMap = new Map<string, number>();
      coinPriceData.forEach(([timestamp, price]) => {
        const date = new Date(timestamp).toISOString().split('T')[0];
        priceMap.set(date, price);
      });

      const historicalData: HistoricalEntry[] = [];
      let baseValue = 10000; // Starting value (100%)
      let prevPrice: number | null = null;

      // Iterate through each day in the range
      for (let ts = startTimestamp; ts <= endTimestamp; ts += 86400) {
        const dateStr = new Date(ts * 1000).toISOString().split('T')[0];
        const price = priceMap.get(dateStr);

        // Skip if no price data for this date
        if (price === undefined) continue;

        // Calculate normalized value
        if (prevPrice === null) {
          // First data point
          prevPrice = price;
        } else {
          baseValue = baseValue * (price / prevPrice);
          prevPrice = price;
        }

        historicalData.push({
          name: 'Bitcoin (BTC)',
          date: new Date(ts * 1000),
          price,
          value: baseValue,
        });
      }

      return historicalData;
    } catch (error) {
      console.error('Error fetching BTC historical data:', error);
      return null;
    }
  }

  // fetch Index Lists
  async getIndexList(): Promise<IndexListEntry[]> {
    const INDEX_DECIMALS = 30; // index token precision (use your real value)
    const LOWER = (s?: string) => (s ? s.toLowerCase() : '');

    // tolerant decimal -> bigint raw units
    const normalizeDecimalString = (s: string, decimals: number): string => {
      if (!s) return '0';
      s = s.trim();
      if (/e/i.test(s)) {
        const n = Number(s);
        if (!Number.isFinite(n) || n === 0) return '0';
        s = n.toFixed(Math.min(decimals, 100));
      }
      if (s.startsWith('+')) s = s.slice(1);
      if (!s.includes('.')) return s;
      let [intPart, fracPart = ''] = s.split('.');
      if (fracPart.length > decimals) fracPart = fracPart.slice(0, decimals);
      fracPart = fracPart.replace(/0+$/, '');
      return fracPart.length ? `${intPart}.${fracPart}` : intPart;
    };
    const toBigIntUnits = (v: unknown, decimals: number): bigint => {
      if (v == null) return 0n;
      if (typeof v === 'bigint') return v;
      if (typeof v === 'number') {
        const s = normalizeDecimalString(v.toString(), decimals);
        return s.includes('.')
          ? ethers.parseUnits(s, decimals)
          : BigInt(s || '0');
      }
      if (typeof v === 'string') {
        const s = normalizeDecimalString(v, decimals);
        return s.includes('.')
          ? ethers.parseUnits(s, decimals)
          : BigInt(s || '0');
      }
      return 0n;
    };

    const indexList: IndexListEntry[] = [];
    const indexMetadata: Record<
      string,
      { category: string; assetClass: string }
    > = {
      SY100: {
        category: 'Top 100 Market-Cap Tokens',
        assetClass: 'Cryptocurrencies',
      },
      SYL2: { category: 'Layer-2', assetClass: 'Cryptocurrencies' },
      SYAI: {
        category: 'Artificial Intelligence',
        assetClass: 'Cryptocurrencies',
      },
      SYME: { category: 'Meme Tokens', assetClass: 'Cryptocurrencies' },
      SYDF: {
        category: 'Decentralized Finance (DeFi)',
        assetClass: 'Cryptocurrencies',
      },
      SYAZ: {
        category: 'Andreessen Horowitz (a16z) Portfolio',
        assetClass: 'Cryptocurrencies',
      },
    };

    const raw = await fs.readFile(this.INDEX_LIST_PATH, 'utf8');
    const list: Array<any> = JSON.parse(raw);

    const db = this.dbService.getDb();
    const network = 'base';

    await Promise.all(
      list.map(async (_index) => {
        const indexId = Number(_index.indexId);
        const indexData = await this.getIndexDataFromFile(indexId);

        // latest weights for logos (unchanged; safe-guard if no row)
        const recent = await db
          .select()
          .from(tempRebalances)
          .where(eq(tempRebalances.indexId, indexId.toString()))
          .orderBy(desc(tempRebalances.timestamp))
          .limit(1);

        const weightsStr = recent[0]?.weights ?? '[]';
        const tokenLists = JSON.parse(weightsStr) as Array<
          [string, string | number]
        >;
        const tokenSymbols = tokenLists.map(([token]) => token);
        const logos = await this.getLogosForSymbols(tokenSymbols);

        // ---- NEW: compute total minted quantity from DB (no RPC) ----
        const indexAddress = LOWER(indexData?.address || '');
        let totalQtyBase = 0n;

        if (indexAddress) {
          const mintRows = await db
            .select({ quantity: blockchainEvents.quantity })
            .from(blockchainEvents)
            .where(
              and(
                eq(blockchainEvents.contractAddress, indexAddress),
                eq(blockchainEvents.network, network),
                eq(blockchainEvents.eventType, 'mint'),
              ),
            );

          for (const r of mintRows) {
            totalQtyBase += toBigIntUnits(r.quantity ?? 0, INDEX_DECIMALS);
          }
        }

        const totalMintedQuantity = Number(
          ethers.formatUnits(totalQtyBase, INDEX_DECIMALS),
        );

        // latest price from daily_prices
        const latestPriceRow = await db
          .select({ price: dailyPrices.price, date: dailyPrices.date })
          .from(dailyPrices)
          .where(eq(dailyPrices.indexId, String(indexId)))
          .orderBy(desc(dailyPrices.date))
          .limit(1);

        const latestPrice =
          latestPriceRow[0] != null
            ? Number(latestPriceRow[0].price as unknown as string)
            : null;

        // USD value of supply = total minted qty * latest index price (if we have it)
        const totalSupplyUSD =
          latestPrice != null ? totalMintedQuantity * latestPrice : 0;

        // performance & ratings (unchanged)
        let ytdReturn = await this.calculateYtdReturn(indexId);
        const oneYearReturn = await this.calculatePeriodReturn(indexId, 365);
        const threeYearReturn = await this.calculatePeriodReturn(
          indexId,
          365 * 3,
        );
        const fiveYearReturn = await this.calculatePeriodReturn(
          indexId,
          365 * 5,
        );
        const tenYearReturn = await this.calculatePeriodReturn(
          indexId,
          365 * 10,
        );
        const ratings = await this.calculateRatings(indexId);
        ytdReturn = Math.floor(ytdReturn * 100) / 100;

        const inceptionDate = await this.getInceptionDateForIndex(indexId);

        const { category, assetClass } = indexMetadata[
          indexData?.symbol || ''
        ] ?? {
          category: 'General Cryptocurrencies',
          assetClass: 'Cryptocurrencies',
        };

        indexList.push({
          indexId,
          name: indexData?.name || '',
          address: indexData?.address || '',
          ticker: indexData?.symbol || '',
          curator: process.env.OTC_CUSTODY_ADDRESS!,
          // totalSupply now represents TOTAL MINTED QUANTITY (index tokens)
          totalSupply: totalMintedQuantity,
          totalSupplyUSD,
          ytdReturn,
          collateral: logos,
          managementFee: Number(ethers.parseUnits('2', 18)) / 1e18,
          assetClass,
          category,
          inceptionDate: inceptionDate ? inceptionDate : 'N/A',
          performance: {
            ytdReturn,
            oneYearReturn,
            threeYearReturn,
            fiveYearReturn,
            tenYearReturn,
          },
          ratings,
          // Optionally expose the latest price if your IndexListEntry supports it:
          indexPrice: latestPrice || 0,
        });
      }),
    );

    indexList.sort((a, b) => a.indexId - b.indexId);
    return indexList;
  }

  private async calculatePeriodReturn(
    indexId: number,
    days: number,
  ): Promise<number> {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 2); // Similar to YTD calculation
    endDate.setUTCHours(0, 0, 0, 0);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setUTCHours(0, 0, 0, 0);

    const endPrice = await this.getPriceForDate(indexId, endDate.getTime());
    const startPrice = await this.getPriceForDate(indexId, startDate.getTime());

    if (!startPrice || startPrice === 0) return 0;
    return (((endPrice ? endPrice : 0) - startPrice) / startPrice) * 100;
  }

  // Method to calculate ratings (example implementation)
  private async calculateRatings(indexId: number): Promise<FundRating> {
    // Implement your actual rating logic here
    // This is just a placeholder example
    return {
      overallRating: 'A+',
      expenseRating: 'B',
      riskRating: 'C+',
    };
  }

  async getInceptionDateForIndex(indexId: number) {
    const priceRow = await this.dbService
      .getDb()
      .select()
      .from(dailyPrices)
      .where(eq(dailyPrices.indexId, indexId.toString()))
      .orderBy(asc(dailyPrices.date))
      .limit(1);

    if (priceRow[0]) {
      return priceRow[0].date;
    }
    return null;
  }

  async getPriceForDate(
    indexId: number,
    targetDate: number,
  ): Promise<number | null> {
    const priceRow = await this.dbService
      .getDb()
      .select()
      .from(dailyPrices)
      .where(
        and(
          eq(dailyPrices.indexId, indexId.toString()),
          eq(
            dailyPrices.date,
            new Date(targetDate).toISOString().split('T')[0],
          ),
        ),
      )
      .orderBy(desc(dailyPrices.date))
      .limit(1);
    return priceRow[0] && priceRow[0].price ? priceRow[0].price : null;
    // 1. Fetch the most recent rebalance before target date from DB
    // const applicableRebalance = await this.dbService
    //   .getDb()
    //   .select()
    //   .from(rebalances)
    //   .where(
    //     and(
    //       eq(rebalances.indexId, indexId.toString()),
    //       lte(rebalances.timestamp, Math.floor(targetDate / 1000)),
    //     ),
    //   )
    //   .orderBy(desc(rebalances.timestamp))
    //   .limit(1);

    // if (!applicableRebalance.length) return null;

    // const rebalanceData = applicableRebalance[0];

    // // Parse weights from DB (stored as JSON string)
    // const weights: [string, number][] = JSON.parse(rebalanceData.weights);

    // // 2. Get price data for the target date
    // const targetTimestamp = Math.floor(targetDate / 1000);
    // const uniqueSymbols = [...new Set(weights.map((w) => w[0]))];
    // const coingeckoIdMap = await this.mapToCoingeckoIds(uniqueSymbols);

    // const tokenPrices = await this.getHistoricalPricesForPeriod(
    //   coingeckoIdMap,
    //   targetTimestamp,
    //   targetTimestamp,
    // );

    // // 3. Calculate index price
    // return this.calculateIndexPriceFromDb(
    //   weights,
    //   tokenPrices,
    //   targetTimestamp,
    // );
  }

  async getLogosForSymbols(
    symbols: string[],
    maxResults: number = 5, // Default to 5 API calls
  ): Promise<{ name: string; logo: string }[]> {
    // Step 1: Prepare all symbols (trim "bi." and quote assets)
    const processedSymbols = symbols.map((symbol) => ({
      original: symbol,
      cleaned: symbol
        .replace(/^bi\./, '')
        .replace(/(USDT|USDC)$/i, '')
        .toUpperCase(),
    }));

    // Step 2: Only fetch CoinGecko IDs for the first `maxResults` symbols
    const symbolsToFetch = symbols.slice(0, maxResults);
    const coingeckoIdMap = await this.mapToCoingeckoIds(symbolsToFetch);

    // Step 3: Fetch logos only for the first `maxResults` symbols
    const apiResults = await Promise.all(
      symbolsToFetch.map(async (symbol) => {
        const id = coingeckoIdMap[symbol];
        if (!id) return { name: symbol, logo: '' };

        const data = await this.coinGeckoService.getCoinData(`/coins/${id}`);
        return {
          name: processedSymbols.find((s) => s.original === symbol)!.cleaned,
          logo: data?.image?.thumb || '',
        };
      }),
    );

    // Step 4: Combine results (API results + empty placeholders for the rest)
    return processedSymbols.map((symbol, index) => {
      if (index < maxResults) {
        return apiResults[index]; // Return API result for first 5
      }
      return {
        name: symbol.cleaned,
        logo: '', // Empty for symbols beyond maxResults
      };
    });
  }

  // async getTotalSupplyForIndex(name: string): Promise<string> {
  //   const rawData = await fs.readFile(this.INDEX_LIST_PATH, 'utf8');
  //   this.indexes = JSON.parse(rawData);
  //   const index = this.indexes.find((index) => index.name === name);
  //   if (!index || !index.address) return '0';

  //   const totalSupply = await this.otcCustody.getCustodyBalances(
  //     index.custodyId,
  //     process.env.USDC_ADDRESS_IN_BASE,
  //   );

  //   return Number(ethers.formatUnits(totalSupply, 6)).toFixed(2); // Use actual decimals
  // }

  async getTotalSupplyForIndex(name: string): Promise<string> {
    // 1. Load index metadata
    const rawData = await fs.readFile(this.INDEX_LIST_PATH, 'utf8');
    this.indexes = JSON.parse(rawData);
    const index = this.indexes.find((idx) => idx.name === name);
    if (!index || !index.address) return '0';

    // 2. Query blockchain_events to sum deposits minus withdrawals
    //    Adjust the numeric field you sum (amount vs. quantity) based on how you record events.
    const [{ total }] = await this.dbService
      .getDb()
      .select({
        total: sql<number>`
          COALESCE(
            SUM(
              CASE
                WHEN ${blockchainEvents.eventType} = 'deposit' THEN ${blockchainEvents.amount}
                WHEN ${blockchainEvents.eventType} = 'withdraw' THEN -${blockchainEvents.amount}
                ELSE 0
              END
            ),
            0
          )
        `,
      })
      .from(blockchainEvents)
      .where(
        and(
          eq(blockchainEvents.contractAddress, index.address.toLowerCase()),
          eq(blockchainEvents.network, 'base'), // or whatever network you want
        ),
      );

    // 3. Format according to your token’s decimals (here 6 for USDC)
    //    `total` comes back as a JS number (from a SQL NUMERIC), so we can
    //    directly format it. If your library returns string you may need `Number(total)`.
    return (Number(total) / 1000000).toFixed(2);
  }

  async calculateYtdReturn(indexId: number): Promise<number> {
    const previousDay = new Date();
    previousDay.setDate(previousDay.getDate() - 1); // Go back 1 day
    previousDay.setUTCHours(0, 0, 0, 0); // Normalize to midnight UTC

    const jan1 = new Date(new Date().getFullYear(), 0, 1).setUTCHours(
      0,
      0,
      0,
      0,
    );
    const latestPrice = await this.getPriceForDate(
      indexId,
      previousDay.getTime(),
    );
    const jan1Price = await this.getPriceForDate(indexId, jan1);
    if (!jan1Price || jan1Price === 0) return 0;
    return (((latestPrice || 0) - jan1Price) / jan1Price) * 100;
  }

  async calculateCalendarYearReturns(
    indexId: number,
    years: number[],
  ): Promise<number[]> {
    const results: number[] = [];

    for (const year of years) {
      const jan1 = new Date(Date.UTC(year, 0, 1)).getTime();
      const dec31 = new Date(Date.UTC(year, 11, 31)).getTime();

      const startPrice = await this.getPriceForDate(indexId, jan1);
      const endPrice = await this.getPriceForDate(indexId, dec31);

      if (!startPrice || startPrice === 0 || !endPrice || endPrice === 0) {
        results.push(0); // or null, or skip if you want
      } else {
        const returnPct = ((endPrice - startPrice) / startPrice) * 100;
        results.push(parseFloat(returnPct.toFixed(2)));
      }
    }

    return results;
  }

  async getHistoricalPriceForDate(
    indexId: number,
    timestamp: number,
  ): Promise<number> {
    const rounded = timestamp - (timestamp % 86400);
    const history = await this.getHistoricalData(indexId);
    const entry = history.find((e) => {
      const ts = Math.floor(new Date(e.date).getTime() / 1000);
      return Math.abs(ts - rounded) < 43200;
    });
    return entry?.price ?? 0;
  }

  async fetchVaultAssets(indexId: number): Promise<VaultAsset[]> {
    // 1. Get latest rebalance data
    const rebalance = await this.dbService
      .getDb()
      .query.tempRebalances.findFirst({
        where: eq(tempRebalances.indexId, indexId.toString()),
        orderBy: desc(tempRebalances.timestamp),
      });

    if (!rebalance) {
      console.log(`No rebalance found for index ${indexId}`);
      return []; // Return empty array if no rebalance found
    }
    // 2. Get latest daily prices with quantities
    const latestDailyPrice = await this.dbService
      .getDb()
      .query.dailyPrices.findFirst({
        where: eq(dailyPrices.indexId, indexId.toString()),
        orderBy: desc(dailyPrices.date),
      });

    const weights = JSON.parse(rebalance.weights) as [string, number][];
    // First, safely parse or normalize the coins data
    let coins: Array<[string, number]>;
    if (typeof rebalance.coins === 'string') {
      try {
        coins = JSON.parse(rebalance.coins) as Array<[string, number]>;
      } catch (e) {
        throw new Error(`Invalid coins JSON: ${rebalance.coins}`);
      }
    } else if (Array.isArray(rebalance.coins)) {
      coins = rebalance.coins as Array<[string, number]>;
    } else {
      // If it's an object, convert to array of entries
      coins = Object.entries(rebalance.coins as Record<string, number>);
    }

    const uniqueIds = [
      ...new Set(coins.map(([coinId]) => coinId.toLowerCase())),
    ];

    // Fetch market data
    const { marketData } = await this.fetchMarketData(uniqueIds);

    // Parse quantities if they exist
    const quantities = latestDailyPrice?.quantities
      ? typeof latestDailyPrice.quantities === 'string'
        ? JSON.parse(latestDailyPrice.quantities)
        : latestDailyPrice.quantities
      : {};

    // 3. Get or create categories
    const assets = await Promise.all(
      coins.map(async ([coinId, weight], idx) => {
        if (!marketData) return null;

        const coinData = marketData.find((c) => c.id === coinId);
        if (!coinData) return null;

        const sector = await this.coinGeckoService.getOrCreateCategory(coinId);
        const symbol = coinData.symbol?.toLowerCase();
        if (!symbol) return null;
        const listingEntry = weights.find(([pair]) => {
          const parts = pair.split('.');
          // parts[0] is the exchange code, parts[1] is the symbol
          return (
            parts[1]?.toLowerCase() === symbol + 'usdc' ||
            parts[1]?.toLowerCase() === symbol + 'usdt'
          );
        });
        const listing = listingEntry
          ? listingEntry[0].split('.')[0] // e.g. 'bi' or 'bg'
          : symbol;

        return {
          id: idx + 1,
          ticker: coinData.symbol.toUpperCase(),
          pair: listingEntry?.[0].split('.')[1] || symbol,
          listing,
          assetname: coinData?.name || coinData.symbol,
          sector,
          market_cap: coinData?.market_cap || 0,
          weights: (weight / 100).toFixed(2),
          quantity: quantities[coinId] || 0,
        };
      }),
    );

    // Filter out nulls and sort by market cap
    const sortAssets = assets
      .filter((a): a is NonNullable<typeof a> => a !== null)
      .filter((a) => a.market_cap > 0)
      .sort((a, b) => b.market_cap - a.market_cap);

    return sortAssets;
  }

  safeParseJSON<T>(v: unknown): T | null {
    if (v == null) return null;
    if (typeof v === 'string') {
      try {
        return JSON.parse(v) as T;
      } catch {
        return null;
      }
    }
    return v as T;
  }

  toLowerId(id: string) {
    return id?.toLowerCase();
  }

  chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  async fetchAllAssets(): Promise<Asset[]> {
    const db = this.dbService.getDb();

    // 1) Find all indexIds that have at least one rebalance
    const distinct = await db
      .selectDistinct({ indexId: tempRebalances.indexId })
      .from(tempRebalances);

    // 2) For each index, pull the latest rebalance and the latest dailyPrices
    const perIndex = await Promise.all(
      distinct.map(async ({ indexId }: { indexId: string }) => {
        const rebalance = await db.query.tempRebalances.findFirst({
          where: eq(tempRebalances.indexId, indexId.toString()),
          orderBy: desc(tempRebalances.timestamp),
        });
        if (!rebalance) return null;

        const daily = await db.query.dailyPrices.findFirst({
          where: eq(dailyPrices.indexId, indexId.toString()),
          orderBy: desc(dailyPrices.date),
        });

        // coins: Array<[coingeckoId, weight]>
        let coins: Array<[string, number]> = [];
        if (typeof rebalance.coins === 'string') {
          const parsed = this.safeParseJSON<Array<[string, number]>>(
            rebalance.coins,
          );
          if (parsed) coins = parsed;
        } else if (Array.isArray(rebalance.coins)) {
          coins = rebalance.coins as Array<[string, number]>;
        } else if (rebalance.coins && typeof rebalance.coins === 'object') {
          coins = Object.entries(rebalance.coins as Record<string, number>);
        }

        // quantities keyed by coingeckoId
        const quantities =
          (daily?.quantities
            ? this.safeParseJSON<Record<string, number>>(daily.quantities)
            : null) ?? {};

        return { coins, quantities };
      }),
    );

    const valid = perIndex.filter(Boolean) as Array<{
      coins: Array<[string, number]>;
      quantities: Record<string, number>;
    }>;

    if (!valid.length) return [];

    // 3) Collect all unique coin ids from latest rebalances
    const allCoinIds = new Set<string>();
    for (const { coins } of valid) {
      for (const [coinId] of coins) allCoinIds.add(this.toLowerId(coinId));
    }
    const ids = Array.from(allCoinIds);

    // 4) Fetch market rows once (chunked to be safe with URL limits)
    const chunks = this.chunk(ids, 150);
    let marketRows: MarketRow[] = [];
    for (const c of chunks) {
      const { marketData } = await this.fetchMarketData(c);
      if (marketData?.length) marketRows = marketRows.concat(marketData);
    }
    const byId = new Map(marketRows.map((r) => [this.toLowerId(r.id), r]));

    // 5) Aggregate expected_inventory across indexes, but only for coins in their latest rebalance
    const expectedById = new Map<string, number>();
    for (const { coins, quantities } of valid) {
      for (const [coinId] of coins) {
        const key = this.toLowerId(coinId);
        const qty = Number(quantities[coinId] ?? 0);
        expectedById.set(
          key,
          (expectedById.get(key) ?? 0) + (Number.isFinite(qty) ? qty : 0),
        );
      }
    }

    // 6) Build the combined Asset[] (deduped by id), sorted by market cap
    const combined: Asset[] = ids
      .map((id) => {
        const row = byId.get(id);
        if (!row) return null;

        return {
          id: row.id,
          symbol: (row.symbol ?? id).toUpperCase(),
          name: row.name ?? row.id,
          total_supply: Number(row.total_supply ?? 0),
          circulating_supply: Number(row.circulating_supply ?? 0),
          price_usd: Number(row.current_price ?? 0),
          market_cap: Number(row.market_cap ?? 0),
          expected_inventory: Number(expectedById.get(id) ?? 0),
          thumb: row.image ?? '',
        } as Asset;
      })
      .filter((a): a is Asset => !!a)
      .filter((a) => a.market_cap > 0)
      .sort((a, b) => b.market_cap - a.market_cap);

    return combined;
  }

  async fetchSubIndustryDiversification(
    indexId: number,
  ): Promise<{ name: string; percentage: string }[]> {
    const db = this.dbService.getDb();

    const rebalance = await db.query.tempRebalances.findFirst({
      where: eq(tempRebalances.indexId, indexId.toString()),
      orderBy: desc(tempRebalances.timestamp),
    });

    if (!rebalance) {
      console.warn(`No rebalance found for index ${indexId}`);
      return [];
    }

    const weights = JSON.parse(rebalance.weights) as [string, number][];
    let coins: Array<[string, number]>;

    if (typeof rebalance.coins === 'string') {
      try {
        coins = JSON.parse(rebalance.coins);
      } catch (e) {
        throw new Error(`Invalid coins JSON: ${rebalance.coins}`);
      }
    } else if (Array.isArray(rebalance.coins)) {
      coins = rebalance.coins;
    } else {
      coins = Object.entries(rebalance.coins as Record<string, number>);
    }

    const sectorMap = new Map<string, number>();

    for (const [coinId, weight] of coins) {
      const category = await this.coinGeckoService.getOrCreateCategory(coinId);
      const currentWeight = sectorMap.get(category) || 0;
      sectorMap.set(category, currentWeight + weight);
    }

    const result = Array.from(sectorMap.entries()).map(([name, total]) => ({
      name,
      percentage: (total / 100).toFixed(2),
    }));

    // Sort descending by weight
    return result.sort(
      (a, b) => parseFloat(b.percentage) - parseFloat(a.percentage),
    );
  }

  async fetchAssetAllocation(
    indexId: number,
  ): Promise<{ name: string; percentage: string }[]> {
    const db = this.dbService.getDb();

    const rebalance = await db.query.tempRebalances.findFirst({
      where: eq(tempRebalances.indexId, indexId.toString()),
      orderBy: desc(tempRebalances.timestamp),
    });

    if (!rebalance) return [];

    const coins =
      typeof rebalance.coins === 'string'
        ? JSON.parse(rebalance.coins)
        : Array.isArray(rebalance.coins)
          ? rebalance.coins
          : Object.entries(rebalance.coins as Record<string, number>);

    const allocationMap = new Map<string, number>();

    for (const [coinId, weight] of coins) {
      const category = await this.coinGeckoService.getOrCreateCategory(coinId); // You can rename this as needed
      const existing = allocationMap.get(category) || 0;
      allocationMap.set(category, existing + weight);
    }

    return Array.from(allocationMap.entries())
      .map(([name, value]) => ({
        name,
        percentage: value.toFixed(2),
      }))
      .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));
  }

  async fetchMarketData(coinIds: string[]) {
    const marketData =
      await this.coinGeckoService.fetchCoinGeckoMarkets(coinIds);
    return { marketData };
  }

  private async getIndexDataFromFile(indexId: number): Promise<{
    name: string;
    symbol: string;
    address: string;
    indexId: number;
    custodyId: string;
  } | null> {
    try {
      const raw = await fs.readFile(this.INDEX_LIST_PATH, 'utf8');
      const list: Array<any> = JSON.parse(raw);

      const entry = list.find((item) => {
        // allow both number or string "21" matches
        return Number(item.indexId) == indexId;
      });

      if (!entry) return null;

      return {
        name: entry.name,
        symbol: entry.symbol,
        address: entry.address,
        indexId: Number(entry.indexId),
        custodyId: entry.custodyId,
      };
    } catch (err: any) {
      console.error('Failed to read index data from file:', err);
      return null;
    }
  }

  private async getIndexAddressFromSymbol(symbol: string): Promise<string> {
    try {
      const raw = await fs.readFile(this.INDEX_LIST_PATH, 'utf8');
      const list: Array<any> = JSON.parse(raw);

      const entry = list.find((item) => {
        // allow both number or string "21" matches
        return item.symbol == symbol;
      });

      if (!entry) return '';

      return entry.address;
    } catch (err: any) {
      console.error('Failed to read index data from file:', err);
      return '';
    }
  }

  async saveBlockchainEvent(dto: CreateDepositTransactionDto) {
    await this.dbService
      .getDb()
      .insert(blockchainEvents)
      .values({
        txHash: dto.txHash,
        blockNumber: dto.blockNumber,
        logIndex: dto.logIndex,
        eventType: dto.eventType,
        contractAddress: dto.contractAddress,
        network: dto.network,
        userAddress: dto.userAddress,
        amount: dto.amount,
        quantity: dto.quantity,
        timestamp: new Date(),
      })
      .onConflictDoUpdate({
        target: blockchainEvents.txHash, // 👈 match tx_hash
        set: {
          blockNumber: dto.blockNumber,
          logIndex: dto.logIndex,
          eventType: dto.eventType,
          contractAddress: dto.contractAddress,
          network: dto.network,
          userAddress: dto.userAddress,
          amount: dto.amount,
          quantity: dto.quantity,
          timestamp: new Date(),
        },
      });

    return { success: true };
  }

  async syncMintInvoices() {
    const from = new Date('2025-01-01');

    // yesterday as "to"
    const now = new Date();
    const to = new Date(now);
    to.setDate(now.getDate() + 1);
    await this.dbService.getDb().delete(blockchainEvents);
    const invoices = await this.fetchMintInvoices(from, to);
    const mapped = await Promise.all(
      invoices.map(async (inv) => {
        const contractAddress = await this.getIndexAddressFromSymbol(
          inv.symbol,
        );

        return {
          txHash:
            '0x' + createHash('sha256').update(randomUUID()).digest('hex'), // fake txHash
          blockNumber: -1, // invalid placeholder
          logIndex: 0,
          eventType: 'mint',
          contractAddress,
          network: 'base',
          userAddress: inv.address,
          amount: inv.amount_paid,
          quantity: inv.filled_quantity ?? 0,
          timestamp: inv.timestamp ? new Date(inv.timestamp) : new Date(),
        };
      }),
    );
    if (mapped.length > 0) {
      await this.dbService.getDb().insert(blockchainEvents).values(mapped);
    }

    return { synced: mapped.length };
  }

  formatAPIDateUTC = (d: Date, to: boolean) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = d.getUTCDate(); // no pad
    return to
      ? `${y}-${m}-${day}T23:59:59.000Z`
      : `${y}-${m}-${day}T00:00:00.000Z`;
  };

  toUTCStartOfDay = (d: Date) =>
    new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
    );

  async fetchMintInvoices(from: Date, to: Date): Promise<MintInvoice[]> {
    try {
      const fromStr = this.formatAPIDateUTC(this.toUTCStartOfDay(from), false);
      const toStr = this.formatAPIDateUTC(this.toUTCStartOfDay(to), true);

      const url = `${'https://issuer-network-1.indexmaker.global/api/v1'}/mint_invoices/from/${fromStr}/to/${toStr}`;
      const response = await fetch(url, { cache: 'no-store' });

      if (!response.ok) {
        throw new Error(`Failed to fetch mint invoices (${response.status})`);
      }
      return await response.json();
    } catch (error) {
      console.warn(
        'Failed to fetch mint invoices from API, using mock data:',
        error,
      );
      return []; // keep your existing fallback
    }
  }
}

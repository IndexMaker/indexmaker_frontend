import { Injectable, Logger } from '@nestjs/common';
import { CoinGeckoService } from '../data-fetcher/coingecko.service';
import { BinanceService } from '../data-fetcher/binance.service';
import { IndexRegistryService } from '../blockchain/index-registry.service';
import {
  binanceListings,
  bitgetListings,
  compositions,
  dailyPrices,
  listingsTable,
  rebalances,
  subscriptions,
  tempCompositions,
  tempRebalances,
} from '../../db/schema';
import {
  ethers,
  BigNumberish,
  toBigInt,
  hexlify,
  randomBytes,
  SigningKey,
  zeroPadValue,
} from 'ethers';
import { DbService } from 'src/db/db.service';
import * as path from 'path';
import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import { BitgetService } from '../data-fetcher/bitget.service';
import { promises as fs } from 'fs';
import { CAHelper } from 'src/common/utils/CAHelper';
import { buildCallData } from 'src/common/utils/utils';
import {
  OTCCustody,
  MockERC20,
  OTCIndex,
  IndexFactory,
} from '../../../typechain-types';
interface VerificationData {
  id: string;
  state: number;
  timestamp: number;
  pubKey: { parity: number; x: string };
  sig: { e: string; s: string };
  merkleProof: string[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
@Injectable()
export class EtfMainService {
  private readonly logger = new Logger(EtfMainService.name);
  private readonly fallbackStablecoins = ['usdt', 'usdc', 'dai', 'busd'];
  private readonly fallbackWrappedTokens = ['wbtc', 'weth'];
  private readonly blacklistedCategories = [
    'Stablecoins',
    'Wrapped-Tokens',
    'Bridged-Tokens',
    'Bridged',
    'Cross-Chain',
    'USD Strablecoin',
    'Fiat-backed Steblecoin',
  ];
  private readonly blacklistedToken = ['BNSOL'];

  private readonly provider: ethers.JsonRpcProvider;
  private readonly signer: ethers.Wallet;
  private otcCustody: ethers.Contract;
  private readonly INDEX_LIST_PATH = path.resolve(
    process.cwd(),
    'deployedIndexes.json',
  );

  constructor(
    private coinGeckoService: CoinGeckoService,
    private binanceService: BinanceService,
    private bitgetService: BitgetService,
    private indexRegistryService: IndexRegistryService,
    private dbService: DbService,
  ) {
    const rpcUrl = 'https://mainnet.base.org'; // Use testnet URL for Sepolia if needed
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

  async rebalanceSY100(rebalanceTimestamp: number): Promise<void> {
    const name = 'SY100';
    const symbol = 'SY100';
    const indexId = 21;
    this.logger.log(
      `Starting ${symbol} rebalance at ${new Date(rebalanceTimestamp * 1000).toISOString()}…`,
    );

    // 1) load (or init) your JSON index list
    let list: Array<{
      name: string;
      symbol: string;
      indexId: string;
      address: string;
    }> = [];
    try {
      const raw = await fs.readFile(this.INDEX_LIST_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed;
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err; // ignore "file not found"
    }

    // 2) find SY100 in that list
    let entry = list.find((r) => r.name === name && r.symbol === symbol);
    let indexAddress: string;

    if (!entry) {
      this.logger.log(`${symbol} not found locally, deploying…`);
      indexAddress = await this.deployIndex(name, symbol, indexId);
      this.logger.log(`🆕 Deployed ${symbol} → ${indexAddress}`);
      entry = {
        name,
        symbol,
        indexId: indexId.toString(),
        address: indexAddress,
      };
      list.push(entry);
      await fs.writeFile(
        this.INDEX_LIST_PATH,
        JSON.stringify(list, null, 2),
        'utf8',
      );
      this.logger.log(`💾 Recorded ${symbol} in ${this.INDEX_LIST_PATH}`);
    } else {
      indexAddress = entry.address;
      this.logger.log(
        `✅ ${symbol} already at ${indexAddress}, skipping deploy`,
      );
    }

    // 3) compute new weights & price
    const { weights, price } = await this.computeSY100Weights(
      /* indexId */ 21, // you can still pass indexId if your compute uses it
      rebalanceTimestamp,
    );
    // weights: Array<[tokenAddress: string, amount: number]>
    // price: number (e.g. NAV in USD)
    // 4) ABI-encode the weights array into a single `bytes` blob
    const encodedWeights = this.indexRegistryService.encodeWeights(weights);

    // 5) scale price the same way you used to for registry (e.g. USDC 6 decimals)
    const priceScaled = BigInt(Math.floor(price * 1e6));

    // 6) push on-chain via your helper
    // await this.updateWeights(
    //   indexAddress,
    //   rebalanceTimestamp,
    //   encodedWeights,
    //   priceScaled,
    // );
    // this.logger.log(
    //   `🔄 Rebalanced ${symbol}: pushed ${weights.length} tokens at price ${priceScaled.toString()}`,
    // );
  }

  // private async computeSY100Weights(
  //   indexId: number,
  //   rebalanceTimestamp: number,
  // ): Promise<{ weights: [string, number][]; price: number }> {
  //   const db = this.dbService.getDb();
  //   const chunkSize = 250;
  //   let eligibleTokens: {
  //     symbol: string;
  //     coin: string;
  //     exchangePair: string;
  //     historical_price: number;
  //   }[] = [];

  //   // 1. Prefetch all Binance listings and Bitget pairs
  //   const [_binanceListings, bitgetPairs] = await Promise.all([
  //     db
  //       .select({
  //         pair: binanceListings.pair,
  //         timestamp: binanceListings.timestamp,
  //       })
  //       .from(binanceListings),

  //     db
  //       .select({
  //         base_asset: bitgetListings.baseAsset,
  //         quote_asset: bitgetListings.quoteAsset,
  //       })
  //       .from(bitgetListings),
  //   ]);

  //   // Create lookup maps
  //   const binanceListingMap = new Map<string, number>();
  //   for (const listing of _binanceListings) {
  //     binanceListingMap.set(listing.pair, listing.timestamp);
  //   }

  //   const bitgetPairMap = new Map<string, Set<string>>(); // symbol -> Set<quote_asset>
  //   for (const pair of bitgetPairs) {
  //     if (!bitgetPairMap.has(pair.base_asset)) {
  //       bitgetPairMap.set(pair.base_asset, new Set());
  //     }
  //     bitgetPairMap.get(pair.base_asset)!.add(pair.quote_asset);
  //   }
  //   // 2. Process coins by market cap rank until we get 100
  //   let page = 1;
  //   const includedSymbols = new Set<string>();

  //   const MINIMUM_MARKET_CAP = 100000; // $100k for example
  //   let continueProcessing = true;
  //   while (eligibleTokens.length < 100 && continueProcessing) {
  //     const marketCapChunk = await this.coinGeckoService.getMarketCapsByRank(
  //       page,
  //       chunkSize,
  //     );
  //     console.log(includedSymbols);
  //     if (marketCapChunk.length === 0) break;

  //     for (const coin of marketCapChunk) {
  //       if (eligibleTokens.length >= 100) break;
  //       if (coin.market_cap < MINIMUM_MARKET_CAP) {
  //         continueProcessing = false;
  //         break;
  //       }
  //       if (!coin.market_cap_rank) continue
  //       const symbolUpper = coin.symbol.toUpperCase();
  //       if (includedSymbols.has(symbolUpper)) continue;

  //       // Try to find the best available pair
  //       let selectedPair: string | null = null;

  //       // Check Binance USDC
  //       const binanceUsdcPair = `${symbolUpper}USDC`;
  //       const binanceUsdcTimestamp = binanceListingMap.get(binanceUsdcPair);
  //       if (
  //         binanceUsdcTimestamp &&
  //         Math.floor(binanceUsdcTimestamp / 1000) <= rebalanceTimestamp
  //       ) {
  //         selectedPair = `bi.${binanceUsdcPair}`;
  //       }

  //       // Check Binance USDT
  //       if (!selectedPair) {
  //         const binanceUsdtPair = `${symbolUpper}USDT`;
  //         const binanceUsdtTimestamp = binanceListingMap.get(binanceUsdtPair);
  //         if (
  //           binanceUsdtTimestamp &&
  //           Math.floor(binanceUsdtTimestamp / 1000) <= rebalanceTimestamp
  //         ) {
  //           selectedPair = `bi.${binanceUsdtPair}`;
  //         }
  //       }

  //       // Check Bitget USDC
  //       if (!selectedPair && bitgetPairMap.get(symbolUpper)?.has('USDC')) {
  //         selectedPair = `bg.${symbolUpper}USDC`;
  //       }

  //       // Check Bitget USDT
  //       if (!selectedPair && bitgetPairMap.get(symbolUpper)?.has('USDT')) {
  //         selectedPair = `bg.${symbolUpper}USDT`;
  //       }

  //       if (!selectedPair) continue;

  //       // Check blacklist
  //       const categories = await this.coinGeckoService.getCategories(coin.id);
  //       const isBlacklisted =
  //         categories.some((c) => this.blacklistedCategories.includes(c)) ||
  //         this.blacklistedToken.includes(symbolUpper);
  //       if (isBlacklisted) {
  //         this.logger.warn(
  //           `Excluded ${coin.id} (categories: ${categories.join(', ')})`,
  //         );
  //         continue;
  //       }

  //       // Get historical price
  //       const h_price =
  //         await this.coinGeckoService.getOrFetchTokenPriceAtTimestamp(
  //           coin.id,
  //           coin.symbol,
  //           rebalanceTimestamp,
  //         );

  //       if (!h_price) continue;

  //       await this.coinGeckoService.storeDailyPricesForToken(
  //         coin.id,
  //         coin.symbol,
  //         rebalanceTimestamp,
  //       );

  //       eligibleTokens.push({
  //         symbol: coin.symbol,
  //         coin: coin.id,
  //         exchangePair: selectedPair,
  //         historical_price: h_price,
  //       });

  //       includedSymbols.add(symbolUpper);
  //     }

  //     page++;
  //   }

  //   if (eligibleTokens.length === 0) {
  //     throw new Error('No eligible tokens found for the given rebalance date.');
  //   }

  //   // 3. Normalize weights
  //   const numTokens = eligibleTokens.length;
  //   const baseWeight = Math.floor(10000 / numTokens);
  //   const remainder = 10000 - baseWeight * numTokens;

  //   const weightsForContract: [string, number][] = eligibleTokens.map(
  //     (token, index) => [
  //       token.exchangePair,
  //       index < remainder ? baseWeight + 1 : baseWeight,
  //     ],
  //   );
  //   console.log(
  //     Object.fromEntries(
  //       eligibleTokens.map((token, index) => [
  //         token.coin,
  //         index < remainder ? baseWeight + 1 : baseWeight,
  //       ]),
  //     ),
  //   );
  //   const etfPrice = weightsForContract.reduce((sum, [pair, weight]) => {
  //     const token = eligibleTokens.find((t) => t.exchangePair === pair);
  //     return sum + token!.historical_price * (weight / 10000);
  //   }, 0);

  //   // 4. Save to database
  //   await this.dbService.getDb().transaction(async (tx) => {
  //     // await tx.insert(tempCompositions).values(
  //     //   eligibleTokens.map((token, index) => ({
  //     //     indexId: indexId.toString(),
  //     //     tokenAddress: token.exchangePair,
  //     //     coin_id: token.coin,
  //     //     weight: ((index < remainder ? baseWeight + 1 : baseWeight) / 100).toString(),
  //     //     validUntil: new Date(),
  //     //     rebalanceTimestamp,
  //     //   })),
  //     // );
  //     await tx
  //       .insert(tempRebalances)
  //       .values({
  //         indexId: indexId.toString(),
  //         weights: JSON.stringify(weightsForContract),
  //         prices: Object.fromEntries(
  //           eligibleTokens.map((token) => [
  //             token.exchangePair,
  //             token.historical_price,
  //           ]),
  //         ),
  //         timestamp: rebalanceTimestamp,
  //         coins: Object.fromEntries(
  //           eligibleTokens.map((token, index) => [
  //             token.coin,
  //             index < remainder ? baseWeight + 1 : baseWeight,
  //           ]),
  //         ),
  //       })
  //       .onConflictDoUpdate({
  //         target: [tempRebalances.indexId, tempRebalances.timestamp],
  //         set: {
  //           weights: JSON.stringify(weightsForContract),
  //           prices: Object.fromEntries(
  //             eligibleTokens.map((token) => [
  //               token.exchangePair,
  //               token.historical_price,
  //             ]),
  //           ),
  //           coins: Object.fromEntries(
  //             eligibleTokens.map((token, index) => [
  //               token.coin,
  //               index < remainder ? baseWeight + 1 : baseWeight,
  //             ]),
  //           ),
  //         },
  //       });
  //   });

  //   return { weights: weightsForContract, price: etfPrice };
  // }

  private async computeSY100Weights(
    indexId: number,
    rebalanceTimestamp: number,
  ): Promise<{ weights: [string, number][]; price: number }> {
    const db = this.dbService.getDb();
    const chunkSize = 250;

    let eligibleTokens: {
      symbol: string;
      coin: string;
      exchangePair: string;
      historical_price: number;
    }[] = [];

    const rebalanceDate = new Date(rebalanceTimestamp * 1000);

    // 1) Prefetch: listingsTable + Binance whitelist (binance_listings)
    const [allListings, binanceWhitelistRows] = await Promise.all([
      db
        .select({
          token: listingsTable.token,
          tokenName: listingsTable.tokenName,
          listingAnnouncementDate: listingsTable.listingAnnouncementDate,
          listingDate: listingsTable.listingDate,
          delistingAnnouncementDate: listingsTable.delistingAnnouncementDate,
          delistingDate: listingsTable.delistingDate,
        })
        .from(listingsTable),
      db.select({ pair: binanceListings.pair }).from(binanceListings),
      // if you store only valid rows, no need to filter; otherwise keep the action filter:
      // .where(eq(binanceListings.action, 'listing'))
    ]);

    // Build maps/sets
    const listingsMap = new Map<string, (typeof allListings)[0]>();
    for (const l of allListings) listingsMap.set(l.token.toUpperCase(), l);

    // Authoritative Binance SPOT pairs (uppercase)
    const binanceWhitelist = new Set(
      binanceWhitelistRows.map((r) => r.pair.toUpperCase()),
    );

    // Generic date-aware listing check using listingsTable (used for Bitget and for Binance date gate)
    const isListedViaListingsTable = (
      token: string,
      exchange: 'binance' | 'bitget',
    ) => {
      const data = listingsMap.get(token.toUpperCase());
      if (!data) return false;

      // Delisting first
      if (data.delistingDate?.[exchange]) {
        if (new Date(data.delistingDate[exchange]) <= rebalanceDate)
          return false;
      } else if (data.delistingAnnouncementDate?.[exchange]) {
        if (new Date(data.delistingAnnouncementDate[exchange]) <= rebalanceDate)
          return false;
      }

      // Listing checks
      if (data.listingDate?.[exchange]) {
        return new Date(data.listingDate[exchange]) <= rebalanceDate;
      } else if (data.listingAnnouncementDate?.[exchange]) {
        return (
          new Date(data.listingAnnouncementDate[exchange]) <= rebalanceDate
        );
      }
      return false;
    };

    // 2) Walk market-cap pages until we collect 100
    let page = 1;
    const includedSymbols = new Set<string>();
    const MINIMUM_MARKET_CAP = 1_000_000; // 1M
    let continueProcessing = true;

    while (eligibleTokens.length < 100 && continueProcessing) {
      const marketCapChunk = await this.coinGeckoService.getMarketCapsByRank(
        page,
        chunkSize,
      );
      if (marketCapChunk.length === 0) break;

      for (const coin of marketCapChunk) {
        if (eligibleTokens.length >= 100) break;
        if (coin.market_cap < MINIMUM_MARKET_CAP) {
          continueProcessing = false;
          break;
        }
        if (!coin.market_cap_rank) continue;

        const symbolUpper = coin.symbol.toUpperCase();
        if (includedSymbols.has(symbolUpper)) continue;

        let selectedPair: string | null = null;

        // ---------- BINANCE: must pass BOTH date gate (listingsTable) AND whitelist (binance_listings) ----------
        if (
          isListedViaListingsTable(`${symbolUpper}USDC`, 'binance') &&
          binanceWhitelist.has(`${symbolUpper}USDC`)
        ) {
          selectedPair = `bi.${symbolUpper}USDC`;
        } else if (
          isListedViaListingsTable(`${symbolUpper}USDT`, 'binance') &&
          binanceWhitelist.has(`${symbolUpper}USDT`)
        ) {
          selectedPair = `bi.${symbolUpper}USDT`;
        }

        // ---------- BITGET fallback: date logic only ----------
        if (
          !selectedPair &&
          isListedViaListingsTable(`${symbolUpper}USDC`, 'bitget')
        ) {
          selectedPair = `bg.${symbolUpper}USDC`;
        } else if (
          !selectedPair &&
          isListedViaListingsTable(`${symbolUpper}USDT`, 'bitget')
        ) {
          selectedPair = `bg.${symbolUpper}USDT`;
        }

        if (!selectedPair) continue;

        // Blacklist
        const categories = await this.coinGeckoService.getCategories(coin.id);
        const isBlacklisted =
          categories.some((c) => this.blacklistedCategories.includes(c)) ||
          this.blacklistedToken.includes(symbolUpper);
        if (isBlacklisted) {
          this.logger.warn(
            `Excluded ${coin.id} (categories: ${categories.join(', ')})`,
          );
          continue;
        }

        // Price
        const h_price =
          await this.coinGeckoService.getOrFetchTokenPriceAtTimestamp(
            coin.id,
            coin.symbol,
            rebalanceTimestamp,
          );
        if (!h_price) continue;

        await this.coinGeckoService.storeDailyPricesForToken(
          coin.id,
          coin.symbol,
          rebalanceTimestamp,
        );

        eligibleTokens.push({
          symbol: coin.symbol,
          coin: coin.id,
          exchangePair: selectedPair,
          historical_price: h_price,
        });
        includedSymbols.add(symbolUpper);
      }

      page++;
    }

    if (eligibleTokens.length === 0) {
      throw new Error('No eligible tokens found for the given rebalance date.');
    }

    // 3) Normalize weights
    const numTokens = eligibleTokens.length;
    const baseWeight = Math.floor(10000 / numTokens);
    const remainder = 10000 - baseWeight * numTokens;

    const weightsForContract: [string, number][] = eligibleTokens.map(
      (t, i) => [t.exchangePair, i < remainder ? baseWeight + 1 : baseWeight],
    );

    const etfPrice = weightsForContract.reduce((sum, [pair, weight]) => {
      const t = eligibleTokens.find((x) => x.exchangePair === pair)!;
      return sum + t.historical_price * (weight / 10000);
    }, 0);

    // 4) Save
    await db.transaction(async (tx) => {
      await tx
        .insert(tempRebalances)
        .values({
          indexId: indexId.toString(),
          weights: JSON.stringify(weightsForContract),
          prices: Object.fromEntries(
            eligibleTokens.map((t) => [t.exchangePair, t.historical_price]),
          ),
          timestamp: rebalanceTimestamp,
          coins: Object.fromEntries(
            eligibleTokens.map((t, i) => [
              t.coin,
              i < remainder ? baseWeight + 1 : baseWeight,
            ]),
          ),
        })
        .onConflictDoUpdate({
          target: [tempRebalances.indexId, tempRebalances.timestamp],
          set: {
            weights: JSON.stringify(weightsForContract),
            prices: Object.fromEntries(
              eligibleTokens.map((t) => [t.exchangePair, t.historical_price]),
            ),
            coins: Object.fromEntries(
              eligibleTokens.map((t, i) => [
                t.coin,
                i < remainder ? baseWeight + 1 : baseWeight,
              ]),
            ),
          },
        });
    });

    return { weights: weightsForContract, price: etfPrice };
  }

  async rebalanceETF(
    etfType:
      | 'andreessen-horowitz-a16z-portfolio'
      | 'layer-2'
      | 'artificial-intelligence'
      | 'meme-token'
      | 'decentralized-finance-defi',
    indexId: number,
    rebalanceTimestamp: number,
  ): Promise<void> {
    const name = this.getETFName(etfType);
    const symbol = this.getETFSymbol(etfType);
    const custodyId = name; // deployIndex will do formatBytes32String for us

    this.logger.log(
      `🔄 Starting ${symbol} rebalance @ ${new Date(rebalanceTimestamp * 1000).toISOString()}`,
    );

    // 1) load or init deployedIndexes.json
    const INDEX_LIST_PATH = path.resolve(process.cwd(), 'deployedIndexes.json');
    let list: Array<{
      name: string;
      symbol: string;
      indexId: string;
      address: string;
    }> = [];
    try {
      const raw = await fs.readFile(INDEX_LIST_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed;
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
    }

    // 2) see if we already have an entry for this symbol
    let entry = list.find((r) => r.name === name && r.symbol === symbol);
    let indexAddress: string;

    if (!entry) {
      this.logger.log(`🆕 ${symbol} not deployed yet — deploying now`);
      indexAddress = await this.deployIndex(name, symbol, indexId);
      this.logger.log(`✅ ${symbol} deployed @ ${indexAddress}`);
      entry = {
        name,
        symbol,
        indexId: indexId.toString(),
        address: indexAddress,
      };
      list.push(entry);
      await fs.writeFile(
        INDEX_LIST_PATH,
        JSON.stringify(list, null, 2),
        'utf8',
      );
      this.logger.log(`💾 Recorded ${symbol} in ${INDEX_LIST_PATH}`);
    } else {
      indexAddress = entry.address;
      this.logger.log(`✅ ${symbol} already deployed @ ${indexAddress}`);
    }

    // 3) fetch fresh weights & price
    const { weights, etfPrice } = await this.fetchETFWeights(
      etfType,
      indexId,
      rebalanceTimestamp,
    );
    if (!weights?.length) {
      this.logger.warn(`⚠️ No weights returned for ${symbol}; skipping`);
      return;
    }

    const encodedWeights = this.indexRegistryService.encodeWeights(weights);

    // 5) scale price to 6 decimals (USDC style)
    const priceScaled = BigInt(Math.floor(etfPrice * 1e6));

    // 6) push on‐chain
    // await this.updateWeights(
    //   indexAddress,
    //   rebalanceTimestamp,
    //   encodedWeights,
    //   priceScaled,
    // );
    // this.logger.log(
    //   `🔄 ${symbol} rebalanced: ${weights.length} tokens @ index price ${priceScaled}`,
    // );
  }

  // async simulateRebalances(
  //   startDate: Date,
  //   now: Date,
  //   etfType:
  //     | 'andreessen-horowitz-a16z-portfolio'
  //     | 'layer-2'
  //     | 'artificial-intelligence'
  //     | 'meme-token'
  //     | 'decentralized-finance-defi',
  //   indexId: number,
  // ) {
  //   // Get all binance listings upfront
  //   const [_binanceListings, allTokens, activePairs] = await Promise.all([
  //     this.dbService
  //       .getDb()
  //       .select({
  //         pair: binanceListings.pair,
  //         timestamp: binanceListings.timestamp,
  //       })
  //       .from(binanceListings),
  //     this.coinGeckoService.getPortfolioTokens(etfType),
  //     this.binanceService.fetchTradingPairs(),
  //   ]);

  //   // Create lookup maps
  //   const binanceListingMap = new Map<string, number>();
  //   for (const listing of _binanceListings) {
  //     binanceListingMap.set(listing.pair, listing.timestamp);
  //   }

  //   // Create a map of token symbols to their listing dates
  //   const tokenListingDates = new Map<string, Date>();

  //   for (const token of allTokens) {
  //     const symbolUpper = token.symbol.toUpperCase();
  //     const pair = activePairs.find(
  //       (p) =>
  //         p.symbol.startsWith(symbolUpper) &&
  //         (p.symbol.endsWith('USDC') || p.symbol.endsWith('USDT')),
  //     );

  //     if (pair) {
  //       const listingTimestamp = binanceListingMap.get(pair.symbol);
  //       if (listingTimestamp) {
  //         tokenListingDates.set(token.symbol, new Date(listingTimestamp));
  //       }
  //     }
  //   }

  //   // Normalize to UTC midnight
  //   const normalizeToUTCMidnight = (date: Date): Date => {
  //     const isMidnight =
  //       date.getUTCHours() === 0 &&
  //       date.getUTCMinutes() === 0 &&
  //       date.getUTCSeconds() === 0 &&
  //       date.getUTCMilliseconds() === 0;

  //     if (isMidnight) return date;

  //     // Move to next day at 00:00:00 UTC
  //     return new Date(
  //       Date.UTC(
  //         date.getUTCFullYear(),
  //         date.getUTCMonth(),
  //         date.getUTCDate() + 1,
  //       ),
  //     );
  //   };

  //   // Now find all unique listing dates after our start date
  //   const listingDates = Array.from(tokenListingDates.values())
  //     .filter((date) => date >= startDate && date <= now)
  //     .map(normalizeToUTCMidnight) // <- normalize here
  //     .sort((a, b) => a.getTime() - b.getTime());

  //   const rebalanceDates = [
  //     normalizeToUTCMidnight(startDate), // <- also normalize startDate
  //     ...listingDates,
  //   ];

  //   // Process each rebalance date in sequence
  //   for (const rebalanceDate of rebalanceDates) {
  //     console.log(
  //       `Simulating ${etfType} rebalance at ${rebalanceDate.toISOString()}`,
  //     );
  //     await this.rebalanceETF(
  //       etfType,
  //       indexId,
  //       Math.floor(rebalanceDate.getTime() / 1000),
  //     );
  //   }
  // }

  async simulateRebalances(
    startDate: Date,
    now: Date,
    etfType:
      | 'andreessen-horowitz-a16z-portfolio'
      | 'layer-2'
      | 'artificial-intelligence'
      | 'meme-token'
      | 'decentralized-finance-defi',
    indexId: number,
  ) {
    const db = this.dbService.getDb();

    // Get all relevant data
    const [allListings, allTokens, binanceWhitelistRows] = await Promise.all([
      db
        .select({
          token: listingsTable.token, // trading pair, e.g., BTCUSDC
          tokenName: listingsTable.tokenName,
          listingAnnouncementDate: listingsTable.listingAnnouncementDate,
          listingDate: listingsTable.listingDate,
          delistingAnnouncementDate: listingsTable.delistingAnnouncementDate,
          delistingDate: listingsTable.delistingDate,
        })
        .from(listingsTable),
      this.coinGeckoService.getPortfolioTokens(etfType),
      // 🔒 Authoritative Binance spot whitelist
      db.select({ pair: binanceListings.pair }).from(binanceListings),
      // if your table has mixed actions, uncomment:
      // .where(eq(binanceListings.action, 'listing'))
    ]);

    const binanceWhitelist = new Set(
      binanceWhitelistRows.map((r) => r.pair.toUpperCase()),
    );

    // Create a map of token symbols to their events
    const tokenEvents = new Map<
      string,
      { listingDate?: Date; delistingDate?: Date }
    >();

    for (const token of allTokens) {
      const symbolUpper = token.symbol.toUpperCase();

      // Prefer USDC, then USDT — but ONLY if the pair is in the Binance whitelist
      const candidatePairs = [`${symbolUpper}USDC`, `${symbolUpper}USDT`];
      const chosenPair =
        candidatePairs.find((p) => binanceWhitelist.has(p)) ?? null;

      if (!chosenPair) {
        // Not a valid Binance spot pair -> skip this token entirely for Binance-based events
        continue;
      }

      // Find this pair in listingsTable (some rows may exist for non-listed pairs; whitelist filters those out)
      const listingInfo =
        allListings.find((l) => l.token === chosenPair) ||
        // (very rare) if the other stable also passes whitelist, allow fallback:
        allListings.find(
          (l) =>
            l.token === candidatePairs[1] &&
            binanceWhitelist.has(candidatePairs[1]),
        );

      if (!listingInfo) continue;

      const events: { listingDate?: Date; delistingDate?: Date } = {};

      // Determine listing date (Binance listing date first, then announcement)
      if (
        listingInfo.listingDate &&
        (listingInfo.listingDate as Record<string, string>).binance
      ) {
        events.listingDate = new Date(
          (listingInfo.listingDate as Record<string, string>).binance,
        );
      } else if (
        listingInfo.listingAnnouncementDate &&
        (listingInfo.listingAnnouncementDate as Record<string, string>).binance
      ) {
        events.listingDate = new Date(
          (
            listingInfo.listingAnnouncementDate as Record<string, string>
          ).binance,
        );
      }

      // Determine delisting date (Binance delisting date first, then announcement)
      if (
        listingInfo.delistingDate &&
        (listingInfo.delistingDate as Record<string, string>).binance
      ) {
        events.delistingDate = new Date(
          (listingInfo.delistingDate as Record<string, string>).binance,
        );
      } else if (
        listingInfo.delistingAnnouncementDate &&
        (listingInfo.delistingAnnouncementDate as Record<string, string>)
          .binance
      ) {
        events.delistingDate = new Date(
          (
            listingInfo.delistingAnnouncementDate as Record<string, string>
          ).binance,
        );
        // If you want to *exclude* at announcement time, keep as-is.
        // If you only want actual delist effective time, prefer delistingDate above.
      }

      if (events.listingDate || events.delistingDate) {
        tokenEvents.set(token.symbol, events);
      }
    }

    // Normalize to UTC midnight
    const normalizeToUTCMidnight = (date: Date): Date => {
      const isMidnight =
        date.getUTCHours() === 0 &&
        date.getUTCMinutes() === 0 &&
        date.getUTCSeconds() === 0 &&
        date.getUTCMilliseconds() === 0;

      if (isMidnight) return date;

      // Move to next day at 00:00:00 UTC
      return new Date(
        Date.UTC(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          date.getUTCDate() + 1,
        ),
      );
    };

    // Collect all relevant event dates
    const eventDates: Date[] = [];
    for (const [, events] of tokenEvents) {
      if (
        events.listingDate &&
        events.listingDate >= startDate &&
        events.listingDate <= now
      ) {
        eventDates.push(normalizeToUTCMidnight(events.listingDate));
      }
      if (
        events.delistingDate &&
        events.delistingDate >= startDate &&
        events.delistingDate <= now
      ) {
        eventDates.push(normalizeToUTCMidnight(events.delistingDate));
      }
    }

    // Sort and deduplicate dates
    const uniqueSortedDates = Array.from(
      new Set(eventDates.map((date) => date.getTime()).sort((a, b) => a - b)),
    ).map((time) => new Date(time));

    const rebalanceDates = [
      normalizeToUTCMidnight(startDate), // initial rebalance
      ...uniqueSortedDates,
    ];

    // Process each rebalance date in sequence
    for (const rebalanceDate of rebalanceDates) {
      console.log(
        `Simulating ${etfType} rebalance at ${rebalanceDate.toISOString()}`,
      );
      await this.rebalanceETF(
        etfType,
        indexId,
        Math.floor(rebalanceDate.getTime() / 1000),
      );
    }
  }

  // Helper: Deploy pSymmIndex contract
  // async deployIndex(
  //   name: string,
  //   symbol: string,
  //   custodyId: string,
  // ): Promise<string> {
  //   const otcCustodyAddress = process.env.OTC_CUSTODY_ADDRESS!;
  //   const collateralToken = process.env.USDC_ADDRESS_IN_BASE!;
  //   if (!otcCustodyAddress || !collateralToken) {
  //     throw new Error(
  //       'Missing OTC_CUSTODY_ADDRESS or USDC_ADDRESS_IN_BASE in env',
  //     );
  //   }

  //   // constructor params
  //   const collateralTokenPrecision = ethers.parseUnits('1', 6);
  //   const managementFee = ethers.parseUnits('2', 18);
  //   const performanceFee = ethers.parseUnits('1', 18);
  //   const maxMintPerBlock = ethers.parseUnits('10000', 18);
  //   const maxRedeemPerBlock = ethers.parseUnits('10000', 18);
  //   const voteThreshold = 50;
  //   const votePeriod = 1440 * 7;
  //   const initialPrice = ethers.parseUnits('10000', 18);

  //   // load artifact
  //   const artifactPath = path.resolve(
  //     __dirname,
  //     '../../../../artifacts/contracts/Connectors/OTCIndex/OTCIndex.sol/OTCIndex.json',
  //   );
  //   const { abi, bytecode } = require(artifactPath);
  //   const factory = new ethers.ContractFactory(abi, bytecode, this.signer);

  //   // deploy
  //   const index = await factory.deploy(
  //     otcCustodyAddress,
  //     name,
  //     symbol,
  //     ethers.keccak256(ethers.toUtf8Bytes(custodyId)),
  //     collateralToken,
  //     collateralTokenPrecision,
  //     managementFee,
  //     performanceFee,
  //     maxMintPerBlock,
  //     maxRedeemPerBlock,
  //     voteThreshold,
  //     votePeriod,
  //     initialPrice,
  //   );
  //   await index.waitForDeployment();
  //   const deployedAddress = await index.getAddress();
  //   this.logger.log(`✅ Deployed ${symbol} at ${deployedAddress}`);

  //   // record
  //   await this.recordDeployedIndex({ name, symbol, address: deployedAddress });
  //   this.logger.log(`💾 Recorded ${symbol}`);

  //   return deployedAddress;
  // }

  async deployIndex(
    name: string,
    symbol: string,
    indexId: number,
  ): Promise<string> {
    const chainId = 8453;

    const publicKey = {
      parity: 0,
      x: hexlify(zeroPadValue(this.signer.address, 32)) as `0x${string}`,
    };

    const caHelper = new CAHelper(
      Number(chainId),
      process.env.OTC_CUSTODY_ADDRESS! as `0x${string}`,
    );

    const erc20Json = require(
      path.resolve(
        __dirname,
        '../../../../artifacts/contracts/mocks/MockERC20.sol/MockERC20.json',
      ),
    );
    const usdcContract = new ethers.Contract(
      process.env.USDC_ADDRESS_IN_BASE!,
      erc20Json.abi,
      this.signer,
    );

    const otcCustodyAddress = process.env.OTC_CUSTODY_ADDRESS!;
    const indexFactoryAddress = process.env.INDEX_FACTORY_ADDRESS!;
    const collateralToken = process.env.USDC_ADDRESS_IN_BASE!;
    if (!otcCustodyAddress || !indexFactoryAddress || !collateralToken) {
      throw new Error(
        'Missing OTC_CUSTODY_ADDRESS or INDEX_FACTORY_ADDRESS or USDC_ADDRESS_IN_BASE',
      );
    }

    const factoryAbi = require(
      path.resolve(
        __dirname,
        '../../../../artifacts/contracts/Connectors/OTCIndex/OTCIndexFactory.sol/IndexFactory.json',
      ),
    ).abi;
    const factoryContract = new ethers.Contract(
      otcCustodyAddress,
      factoryAbi,
      this.signer,
    );
    const factoryIface = new ethers.Interface(factoryAbi);

    const indexParams = [
      name, // string _name
      symbol, // string _symbol
      process.env.USDC_ADDRESS_IN_BASE!, // address _collateralToken
      ethers.parseUnits('1', 6), // uint256 _collateralTokenPrecision
      ethers.parseUnits('2', 18), // uint256 _managementFee
      ethers.parseUnits('1', 18), // uint256 _performanceFee
      ethers.parseUnits('10000', 18), // uint256 _maxMintPerBlock
      ethers.parseUnits('10000', 18), // uint256 _maxRedeemPerBlock
      50, // uint256 _voteThreshold
      1440 * 7, // uint256 _votePeriod
      ethers.parseUnits('10000', 18), // uint256 _initialPrice
    ] as const;

    // 2) the matching ABI‐types tuple:
    const types = [
      'string',
      'string',
      'address',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'uint256',
    ] as const;

    // 3) raw encode the parameters (this is the `data` for your factory)
    const deployCallData = ethers.AbiCoder.defaultAbiCoder().encode(
      types,
      indexParams,
    ) as `0x${string}`;

    const proofIndex = caHelper.deployConnector(
      'IndexFactory',
      indexFactoryAddress as `0x${string}`,
      deployCallData,
      /*custodyState=*/ 0,
      publicKey,
    );

    const _custodyId = caHelper.getCustodyID();
    console.log('Factory deployment custody ID:', _custodyId);

    // const depositAmount = ethers.parseUnits('0.01', 6);
    // await (usdcContract.connect(this.signer) as MockERC20).approve(
    //   process.env.OTC_CUSTODY_ADDRESS!,
    //   depositAmount,
    // );
    // await (otcCustody.connect(this.signer) as OTCCustody).addressToCustody(
    //   _custodyId,
    //   process.env.USDC_ADDRESS_IN_BASE!,
    //   depositAmount,
    // );
    // console.log('Custody setup with tokens');

    const deployTimestamp = Math.floor(Date.now() / 1000);
    const verificationData = {
      id: _custodyId,
      state: 0,
      timestamp: deployTimestamp,
      pubKey: publicKey,
      sig: {
        e: hexlify(randomBytes(32)) as `0x${string}`,
        s: hexlify(randomBytes(32)) as `0x${string}`,
      },
      merkleProof: caHelper.getMerkleProof(proofIndex),
    };

    console.log('Deploying index via factory...');
    const tx = await this.otcCustody.deployConnector(
      'IndexFactory',
      indexFactoryAddress,
      deployCallData,
      verificationData,
    );
    this.logger.log(`📝 deployConnector(IndexFactory) sent: ${tx.hash}`);
    const receipt = await tx.wait();
    const indexDeployedEvent = receipt?.logs.find((log) => {
      try {
        const decoded = factoryContract.interface.parseLog(log);
        return decoded?.name === 'IndexDeployed';
      } catch {
        return false;
      }
    });

    if (!indexDeployedEvent) {
      throw new Error('IndexDeployed event not found');
    }
    const decoded = factoryContract.interface.parseLog(indexDeployedEvent);
    const deployedIndexAddress = decoded?.args[0] as string;
    this.logger.log(
      `✅ ${symbol} deployed via factory to ${deployedIndexAddress}`,
    );

    await this.recordDeployedIndex({
      name,
      symbol,
      indexId: indexId.toString(),
      address: deployedIndexAddress,
    });
    this.logger.log(`💾 Recorded ${symbol} at ${deployedIndexAddress}`);

    return deployedIndexAddress;
  }

  // async fetchETFWeights(
  //   etfType: string,
  //   indexId: number,
  //   rebalanceTimestamp: number,
  // ) {
  //   try {
  //     // Get all binance listings upfront
  //     const _binanceListings = await this.dbService
  //       .getDb()
  //       .transaction(async (tx) => {
  //         return tx
  //           .select({
  //             pair: binanceListings.pair,
  //             timestamp: binanceListings.timestamp,
  //           })
  //           .from(binanceListings);
  //       });

  //     const binanceListingMap = new Map<string, number>();
  //     for (const listing of _binanceListings) {
  //       binanceListingMap.set(listing.pair, listing.timestamp);
  //     }

  //     // Get tokens based on ETF type
  //     const tokens = await this.coinGeckoService.getPortfolioTokens(etfType);
  //     const activePairs = await this.binanceService.fetchTradingPairs();

  //     // Create a map of tokens to their preferred pairs (USDC > USDT)
  //     const tokenToPairMap = new Map<string, string>();
  //     activePairs.forEach((pair) => {
  //       const quote = pair.quoteAsset;
  //       const base = pair.symbol.replace(quote, '');

  //       // Only consider USDC/USDT pairs
  //       if (quote === 'USDC' || quote === 'USDT') {
  //         // Prefer USDC if available, otherwise keep USDT if no USDC exists
  //         if (!tokenToPairMap.has(base) || quote === 'USDC') {
  //           tokenToPairMap.set(base, `bi.${pair.symbol}`);
  //         }
  //       }
  //     });

  //     const eligibleTokens: {
  //       symbol: string;
  //       coin: string;
  //       binancePair: string;
  //       historical_price: number;
  //     }[] = [];

  //     // Filter for tokens listed on Binance and validate coin_id
  //     for (const coin of tokens) {
  //       if (!coin.id || coin.id.trim() === '') {
  //         this.logger.warn(`Skipping token ${coin.symbol} with empty coin_id`);
  //         continue;
  //       }

  //       const symbolUpper = coin.symbol.toUpperCase();
  //       const pair = tokenToPairMap.get(symbolUpper);

  //       // Ensure the pair exists AND ends with USDC or USDT
  //       if (!pair || !(pair.endsWith('USDC') || pair.endsWith('USDT'))) {
  //         continue;
  //       }

  //       // Get the Binance pair symbol without the 'bi.' prefix
  //       const binancePairSymbol = pair.split('.')[1];
  //       const listingTimestamp = binanceListingMap.get(binancePairSymbol);

  //       if (!listingTimestamp || listingTimestamp / 1000 > rebalanceTimestamp) {
  //         this.logger.warn(
  //           `${coin.id} skipped: listed after rebalancing date.`,
  //         );
  //         continue;
  //       }

  //       await this.coinGeckoService.storeDailyPricesForToken(
  //         coin.id,
  //         coin.symbol,
  //         rebalanceTimestamp,
  //       );

  //       const h_price =
  //         await this.coinGeckoService.getOrFetchTokenPriceAtTimestamp(
  //           coin.id,
  //           coin.symbol,
  //           rebalanceTimestamp,
  //         );

  //       if (h_price) {
  //         // Check if we already have this symbol in eligibleTokens
  //         const existingIndex = eligibleTokens.findIndex(
  //           (t) => t.symbol === coin.symbol,
  //         );
  //         if (existingIndex === -1) {
  //           eligibleTokens.push({
  //             symbol: coin.symbol,
  //             coin: coin.id,
  //             binancePair: pair,
  //             historical_price: h_price,
  //           });
  //         } else {
  //           // Replace if the new pair is USDC and existing is USDT
  //           const existingPair = eligibleTokens[existingIndex].binancePair;
  //           if (pair.endsWith('USDC') && existingPair.endsWith('USDT')) {
  //             eligibleTokens[existingIndex] = {
  //               symbol: coin.symbol,
  //               coin: coin.id,
  //               binancePair: pair,
  //               historical_price: h_price,
  //             };
  //           }
  //         }
  //       }
  //     }
  //     // ... rest of the function remains the same ...
  //     if (eligibleTokens.length === 0) {
  //       this.logger.log(
  //         `No eligible tokens in ${etfType} portfolio - skipping rebalance`,
  //       );
  //       return { weights: null, etfPrice: null };
  //     }

  //     // Get current active composition
  //     const currentComposition = await this.dbService
  //       .getDb()
  //       .select()
  //       .from(tempCompositions)
  //       .where(
  //         and(
  //           eq(tempCompositions.indexId, indexId.toString()),
  //           isNull(tempCompositions.validUntil),
  //         ),
  //       );

  //     // Check for composition changes
  //     const currentTokenSet = new Set(eligibleTokens.map((t) => t.binancePair));
  //     const previousTokenSet = new Set(
  //       currentComposition.map((c) => c.tokenAddress),
  //     );

  //     const hasChanges =
  //       [...currentTokenSet].some((t) => !previousTokenSet.has(t)) ||
  //       [...previousTokenSet].some((t: string) => !currentTokenSet.has(t));

  //     if (!hasChanges && currentComposition.length > 0) {
  //       this.logger.log(
  //         `No changes in ${etfType} portfolio - skipping rebalance`,
  //       );
  //       return { weights: null, etfPrice: null };
  //     }

  //     // Calculate equal weights
  //     const weightPerToken = Math.floor(10000 / eligibleTokens.length);
  //     const remainder = 10000 - weightPerToken * eligibleTokens.length;
  //     const weights: [string, number][] = eligibleTokens.map((token, index) => [
  //       token.binancePair,
  //       index < remainder ? weightPerToken + 1 : weightPerToken,
  //     ]);

  //     // Compute ETF price
  //     const etfPrice = weights.reduce(
  //       (sum, [pair, weight], i) =>
  //         sum + eligibleTokens[i].historical_price * (weight / 10000),
  //       0,
  //     );

  //     // Begin transaction
  //     await this.dbService.getDb().transaction(async (tx) => {
  //       // Mark previous compositions as invalid
  //       if (currentComposition.length > 0) {
  //         await tx
  //           .update(tempCompositions)
  //           .set({ validUntil: new Date() })
  //           .where(
  //             and(
  //               eq(tempCompositions.indexId, indexId.toString()),
  //               isNull(tempCompositions.validUntil),
  //             ),
  //           );
  //       }

  //       // Insert new compositions
  //       await tx.insert(tempCompositions).values(
  //         eligibleTokens.map((token, index) => ({
  //           indexId: indexId.toString(),
  //           tokenAddress: token.binancePair,
  //           coin_id: token.coin,
  //           weight: (weights[index][1] / 100).toString(),
  //           validUntil: null,
  //           rebalanceTimestamp,
  //         })),
  //       );

  //       // Record rebalance event using drizzle's native syntax
  //       await tx
  //         .insert(tempRebalances)
  //         .values({
  //           indexId: indexId.toString(),
  //           weights: JSON.stringify(weights),
  //           prices: Object.fromEntries(
  //             eligibleTokens.map((token) => [
  //               token.binancePair,
  //               token.historical_price,
  //             ]),
  //           ),
  //           timestamp: rebalanceTimestamp,
  //           coins: Object.fromEntries(
  //             eligibleTokens.map((token, index) => [
  //               token.coin,
  //               weights[index][1],
  //             ]),
  //           ),
  //         })
  //         .onConflictDoUpdate({
  //           target: [tempRebalances.indexId, tempRebalances.timestamp],
  //           set: {
  //             weights: JSON.stringify(weights),
  //             prices: Object.fromEntries(
  //               eligibleTokens.map((token) => [
  //                 token.binancePair,
  //                 token.historical_price,
  //               ]),
  //             ),
  //             coins: Object.fromEntries(
  //               eligibleTokens.map((token, index) => [
  //                 token.coin,
  //                 weights[index][1],
  //               ]),
  //             ),
  //           },
  //         });
  //     });

  //     return { weights, etfPrice };
  //   } catch (error) {
  //     this.logger.error(`Error fetching ${etfType} weights:`, error);
  //     throw error;
  //   }
  // }

  async fetchETFWeights(
    etfType: string,
    indexId: number,
    rebalanceTimestamp: number,
  ) {
    try {
      // Get all listings data upfront
      const [allListings, tokens] = await Promise.all([
        this.dbService
          .getDb()
          .select({
            token: listingsTable.token,
            listingAnnouncementDate: listingsTable.listingAnnouncementDate,
            listingDate: listingsTable.listingDate,
            delistingAnnouncementDate: listingsTable.delistingAnnouncementDate,
            delistingDate: listingsTable.delistingDate,
          })
          .from(listingsTable),
        this.coinGeckoService.getPortfolioTokens(etfType),
      ]);

      const eligibleTokens: {
        symbol: string;
        coin: string;
        binancePair: string;
        historical_price: number;
      }[] = [];
      const processedSymbols = new Set<string>();

      // Process each token in the ETF
      for (const coin of tokens) {
        if (!coin.id || coin.id.trim() === '') {
          this.logger.warn(`Skipping token ${coin.symbol} with empty coin_id`);
          continue;
        }

        const symbolUpper = coin.symbol.toUpperCase();

        // Skip if we've already processed this symbol
        if (processedSymbols.has(symbolUpper)) continue;

        const rebalanceDate = new Date(rebalanceTimestamp * 1000);

        // Check USDC pair first, then USDT
        const possiblePairs = [`${symbolUpper}USDC`, `${symbolUpper}USDT`];
        let selectedPair: string | null = null;
        let selectedCoinId = coin.id;

        for (const pair of possiblePairs) {
          const listingInfo = allListings.find((l) => l.token === pair);
          if (!listingInfo) continue;

          // Determine listing date (Binance listing date first, then announcement)
          let listingDate: Date | null = null;
          if (
            listingInfo.listingDate &&
            (listingInfo.listingDate as Record<string, string>).binance
          ) {
            listingDate = new Date(
              (listingInfo.listingDate as Record<string, string>).binance,
            );
          } else if (
            listingInfo.listingAnnouncementDate &&
            (listingInfo.listingAnnouncementDate as Record<string, string>)
              .binance
          ) {
            listingDate = new Date(
              (
                listingInfo.listingAnnouncementDate as Record<string, string>
              ).binance,
            );
          }

          // Determine delisting date (Binance delisting date first, then announcement)
          let delistingDate: Date | null = null;
          if (
            listingInfo.delistingDate &&
            (listingInfo.delistingDate as Record<string, string>).binance
          ) {
            delistingDate = new Date(
              (listingInfo.delistingDate as Record<string, string>).binance,
            );
          } else if (
            listingInfo.delistingAnnouncementDate &&
            (listingInfo.delistingAnnouncementDate as Record<string, string>)
              .binance
          ) {
            delistingDate = new Date(
              (
                listingInfo.delistingAnnouncementDate as Record<string, string>
              ).binance,
            );
          }

          // Check if token is eligible
          const isListed = listingDate && listingDate <= rebalanceDate;
          const isNotDelisted = !delistingDate || delistingDate > rebalanceDate;

          if (isListed && isNotDelisted) {
            selectedPair = pair;
            break; // Found a valid pair, no need to check USDT if we found USDC
          }
        }

        if (!selectedPair) continue; // No valid pair found for this symbol

        // Mark this symbol as processed

        await this.coinGeckoService.storeDailyPricesForToken(
          selectedCoinId,
          coin.symbol,
          rebalanceTimestamp,
        );

        const h_price =
          await this.coinGeckoService.getOrFetchTokenPriceAtTimestamp(
            selectedCoinId,
            coin.symbol,
            rebalanceTimestamp,
          );

        if (h_price) {
          processedSymbols.add(symbolUpper);

          eligibleTokens.push({
            symbol: coin.symbol,
            coin: selectedCoinId,
            binancePair: `bi.${selectedPair}`,
            historical_price: h_price,
          });
        }
      }

      // Rest of the function remains the same...
      if (eligibleTokens.length === 0) {
        this.logger.log(
          `No eligible tokens in ${etfType} portfolio - skipping rebalance`,
        );
        return { weights: null, etfPrice: null };
      }

      // Get current active composition
      const currentComposition = await this.dbService
        .getDb()
        .select()
        .from(tempCompositions)
        .where(
          and(
            eq(tempCompositions.indexId, indexId.toString()),
            isNull(tempCompositions.validUntil),
          ),
        );

      // Check for composition changes
      const currentTokenSet = new Set(eligibleTokens.map((t) => t.binancePair));
      const previousTokenSet = new Set(
        currentComposition.map((c) => c.tokenAddress),
      );

      const hasChanges =
        [...currentTokenSet].some((t) => !previousTokenSet.has(t)) ||
        [...previousTokenSet].some((t: string) => !currentTokenSet.has(t));

      if (!hasChanges && currentComposition.length > 0) {
        this.logger.log(
          `No changes in ${etfType} portfolio - skipping rebalance`,
        );
        return { weights: null, etfPrice: null };
      }

      // Calculate equal weights
      const weightPerToken = Math.floor(10000 / eligibleTokens.length);
      const remainder = 10000 - weightPerToken * eligibleTokens.length;
      const weights: [string, number][] = eligibleTokens.map((token, index) => [
        token.binancePair,
        index < remainder ? weightPerToken + 1 : weightPerToken,
      ]);

      // Compute ETF price
      const etfPrice = weights.reduce(
        (sum, [pair, weight], i) =>
          sum + eligibleTokens[i].historical_price * (weight / 10000),
        0,
      );

      // Begin transaction
      await this.dbService.getDb().transaction(async (tx) => {
        // Mark previous compositions as invalid
        if (currentComposition.length > 0) {
          await tx
            .update(tempCompositions)
            .set({ validUntil: new Date() })
            .where(
              and(
                eq(tempCompositions.indexId, indexId.toString()),
                isNull(tempCompositions.validUntil),
              ),
            );
        }

        // Insert new compositions
        await tx.insert(tempCompositions).values(
          eligibleTokens.map((token, index) => ({
            indexId: indexId.toString(),
            tokenAddress: token.binancePair,
            coin_id: token.coin,
            weight: (weights[index][1] / 100).toString(),
            validUntil: null,
            rebalanceTimestamp,
          })),
        );

        // Record rebalance event
        await tx
          .insert(tempRebalances)
          .values({
            indexId: indexId.toString(),
            weights: JSON.stringify(weights),
            prices: Object.fromEntries(
              eligibleTokens.map((token) => [
                token.binancePair,
                token.historical_price,
              ]),
            ),
            timestamp: rebalanceTimestamp,
            coins: Object.fromEntries(
              eligibleTokens.map((token, index) => [
                token.coin,
                weights[index][1],
              ]),
            ),
          })
          .onConflictDoUpdate({
            target: [tempRebalances.indexId, tempRebalances.timestamp],
            set: {
              weights: JSON.stringify(weights),
              prices: Object.fromEntries(
                eligibleTokens.map((token) => [
                  token.binancePair,
                  token.historical_price,
                ]),
              ),
              coins: Object.fromEntries(
                eligibleTokens.map((token, index) => [
                  token.coin,
                  weights[index][1],
                ]),
              ),
            },
          });
      });

      return { weights, etfPrice };
    } catch (error) {
      this.logger.error(`Error fetching ${etfType} weights:`, error);
      throw error;
    }
  }

  async getRebalancesByIndex(indexId: number) {
    const rebalance = await this.dbService
      .getDb()
      .select()
      .from(tempRebalances)
      .where(
        eq(tempRebalances.indexId, indexId.toString()),
        eq(tempRebalances.deployed, false),
      )
      .orderBy(desc(tempRebalances.timestamp));

    return rebalance;
  }

  async getCurrentRebalanceById(indexId: number) {
    const rebalance = await this.dbService.getDb().query.rebalances.findFirst({
      where: eq(rebalances.indexId, indexId.toString()),
      orderBy: desc(rebalances.timestamp),
    });

    return rebalance;
  }
  // Helper: Check if index exists
  async indexExists(indexId: number, indexRegistry) {
    try {
      const indexData = await indexRegistry.getIndexDatas(indexId.toString());
      return indexData[2] !== ethers.ZeroAddress;
    } catch (error) {
      return false;
    }
  }

  private getETFName(etfType: string): string {
    const names = {
      'andreessen-horowitz-a16z-portfolio': 'A16Z Crypto Portfolio',
      'layer-2': 'Layer 2 Tokens',
      'artificial-intelligence': 'Artificial Intelligence Tokens',
      'meme-token': 'Meme Tokens',
      'decentralized-finance-defi': 'Decentralized Finance Tokens',
    };
    return names[etfType] || '';
  }

  private getETFSymbol(etfType: string): string {
    const symbols = {
      'andreessen-horowitz-a16z-portfolio': 'SYAZ',
      'layer-2': 'SYL2',
      'artificial-intelligence': 'SYAI',
      'meme-token': 'SYME',
      'decentralized-finance-defi': 'SYDF',
    };
    return symbols[etfType] || '';
  }

  private async recordDeployedIndex(record: {
    name: string;
    symbol: string;
    indexId: string;
    address: string;
  }) {
    let list: Array<{
      name: string;
      symbol: string;
      indexId: string;
      address: string;
    }> = [];
    try {
      const raw = await fs.readFile(this.INDEX_LIST_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed;
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
    }
    list.push(record);
    await fs.writeFile(
      this.INDEX_LIST_PATH,
      JSON.stringify(list, null, 2),
      'utf8',
    );
  }

  // async updateWeights(
  //   indexAddress: string,
  //   timestamp: number,
  //   weightsBytes: string,
  //   priceScaled: ethers.BigNumberish,
  // ) {
  //   const custodySigner = await this.provider.getSigner(process.env.OTC_CUSTODY_ADDRESS);
  //   const artifactPath = path.resolve(
  //     __dirname,
  //     '../../../../artifacts/contracts/Connectors/OTCIndex/OTCIndex.sol/OTCIndex.json',
  //   );
  //   const { abi } = require(artifactPath);
  //   const index = new ethers.Contract(indexAddress, abi, custodySigner);

  //   const tx = await index.curatorUpdate(timestamp, weightsBytes, priceScaled);
  //   this.logger.log(`📝 curatorUpdate sent: ${tx.hash}`);
  //   await tx.wait();
  //   this.logger.log(`✅ curatorUpdate confirmed`);
  // }

  async updateWeights(
    indexAddress: string,
    timestamp: number,
    weightsBytes: string,
    priceScaled: ethers.BigNumberish,
  ) {
    const custodyState = 0;
    const chainId = 8453;
    const publicKey = {
      parity: 0,
      x: hexlify(zeroPadValue(this.signer.address, 32)) as `0x${string}`,
    };
    const caHelper = new CAHelper(
      Number(chainId),
      process.env.OTC_CUSTODY_ADDRESS! as `0x${string}`,
    );

    const erc20Json = require(
      path.resolve(
        __dirname,
        '../../../../artifacts/contracts/mocks/MockERC20.sol/MockERC20.json',
      ),
    );
    const usdcContract = new ethers.Contract(
      process.env.USDC_ADDRESS_IN_BASE!,
      erc20Json.abi,
      this.signer,
    );

    const callData = buildCallData('curatorUpdate(uint256,bytes,uint256)', [
      timestamp,
      weightsBytes,
      priceScaled,
    ]);

    const callConnectorActionIndex = caHelper.callConnector(
      'OTCIndexConnector',
      process.env.OTC_CUSTODY_ADDRESS! as `0x${string}`,
      callData,
      custodyState,
      publicKey,
    );
    const custodyId = caHelper.getCustodyID();
    // const depositAmount = ethers.parseUnits('0.01', 6);
    // await (usdcContract.connect(this.signer) as MockERC20).approve(
    //   process.env.OTC_CUSTODY_ADDRESS!,
    //   depositAmount,
    // );
    // await (otcCustody.connect(this.signer) as OTCCustody).addressToCustody(
    //   custodyId,
    //   process.env.USDC_ADDRESS_IN_BASE!,
    //   depositAmount,
    // );
    // console.log('Custody setup with tokens');
    const verificationData = {
      id: custodyId,
      state: 0,
      timestamp: Math.floor(Date.now() / 1000),
      pubKey: publicKey,
      sig: {
        e: hexlify(randomBytes(32)) as `0x${string}`,
        s: hexlify(randomBytes(32)) as `0x${string}`,
      },
      merkleProof: [],
    };

    // 3) call through the custody contract’s connector entrypoint
    const tx = await this.otcCustody.callConnector(
      'OTCIndexConnector',
      indexAddress,
      callData,
      '0x',
      verificationData,
    );
    this.logger.log(`📝 callConnector(curatorUpdate) sent: ${tx.hash}`);
    await tx.wait();
    this.logger.log(`✅ curatorUpdate relayed via custody`);
    sleep(1000);
  }

  // purpose for initial deploying

  async processAllPendingRebalances(): Promise<void> {
    this.logger.log(`🚀 Scanning for all pending rebalances…`);

    // 1) fetch all pending rows with indexId & timestamp
    const rows = await this.dbService
      .getDb()
      .select({
        indexId: tempRebalances.indexId,
        timestamp: tempRebalances.timestamp,
      })
      .from(tempRebalances)
      .where(eq(tempRebalances.deployed, false))
      .orderBy(asc(tempRebalances.timestamp));

    if (rows.length === 0) {
      this.logger.log(`✅ No pending rebalances found.`);
      return;
    }

    // 2) for each indexId, keep only the first (smallest) timestamp
    const firstByIndex = new Map<number, number>();
    for (const r of rows) {
      const idx = Number(r.indexId);
      const ts = Number(r.timestamp);
      if (!firstByIndex.has(idx)) {
        firstByIndex.set(idx, ts);
      }
    }

    this.logger.log(
      `🔢 Found ${firstByIndex.size} index(es) with pending rebalances.`,
    );

    // 3) process each (indexId, earliestTimestamp)
    for (const [indexId, timestamp] of firstByIndex.entries()) {
      try {
        await this.processPendingRebalances(indexId, timestamp);
      } catch (err: any) {
        this.logger.error(
          `⚠️  Failed processing indexId=${indexId}, timestamp=${timestamp}: ${err}`,
        );
      }
    }

    this.logger.log(
      `🎯 Done processing first pending rebalance for each index.`,
    );
  }

  async processPendingRebalances(
    indexNumericId: number,
    rebalanceTimestamp: number,
  ): Promise<void> {
    // 1) figure out symbol & name
    const idToEtfType: Record<number, string> = {
      22: 'andreessen-horowitz-a16z-portfolio',
      23: 'layer-2',
      24: 'artificial-intelligence',
      25: 'meme-token',
      27: 'decentralized-finance-defi',
    };
    let name: string, symbol: string;
    if (indexNumericId === 21) {
      name = symbol = 'SY100';
    } else {
      const etfType = idToEtfType[indexNumericId];
      if (!etfType) throw new Error(`Unknown indexId ${indexNumericId}`);
      name = this.getETFName(etfType);
      symbol = this.getETFSymbol(etfType);
    }

    this.logger.log(
      `🔄 Processing ${symbol} @ ${new Date(rebalanceTimestamp * 1000).toISOString()}`,
    );

    // 2) load any pending temp_rebalances rows
    const pending = await this.dbService
      .getDb()
      .select()
      .from(tempRebalances)
      .where(
        and(
          eq(tempRebalances.indexId, indexNumericId.toString()),
          eq(tempRebalances.deployed, false),
        ),
      )
      .orderBy(asc(tempRebalances.timestamp));

    if (pending.length === 0) {
      this.logger.log(
        `✅ No pending rows for ${symbol} at ${rebalanceTimestamp}`,
      );
      return;
    }

    // 3) find or deploy the on-chain index
    const listRaw = await fs
      .readFile(this.INDEX_LIST_PATH, 'utf8')
      .catch(() => '[]');
    const indexList: Array<{
      name: string;
      symbol: string;
      indexId: string;
      address: string;
    }> = JSON.parse(listRaw);
    let entry = indexList.find((e) => e.symbol === symbol);

    let indexAddress: string;
    if (!entry) {
      this.logger.log(`🆕 Deploying ${symbol}`);
      indexAddress = await this.deployIndex(
        name,
        symbol,
        indexNumericId /*indexId*/,
      );
      entry = {
        name,
        symbol,
        indexId: indexNumericId.toString(),
        address: indexAddress,
      };
      indexList.push(entry);
      await fs.writeFile(
        this.INDEX_LIST_PATH,
        JSON.stringify(indexList, null, 2),
        'utf8',
      );
      this.logger.log(`💾 Recorded ${symbol} → ${indexAddress}`);
    } else {
      indexAddress = entry.address;
      this.logger.log(`✅ Found deployed ${symbol} @ ${indexAddress}`);
    }

    // Validate updated weights from Blockchain

    // const custodyArtifact = require(
    //   path.resolve(
    //     __dirname,
    //     '../../../../artifacts/contracts/Connectors/OTCIndex/OTCIndex.sol/OTCIndex.json',
    //   ),
    // );
    // const otcIndex = new ethers.Contract(
    //   indexAddress,
    //   custodyArtifact.abi,
    //   this.signer,
    // );
    // const [curatorW, curatorP, ,] = await otcIndex.getWeightsAt(
    //   1547510400,
    // );
    // console.log(this.indexRegistryService.decodeWeights(curatorW), curatorP);
    // return;

    // 4) fetch the NAV price for that day
    const date = new Date(rebalanceTimestamp * 1000).toISOString().slice(0, 10);
    const dp = await this.dbService
      .getDb()
      .select({ price: dailyPrices.price })
      .from(dailyPrices)
      .where(
        and(
          eq(dailyPrices.indexId, indexNumericId.toString()),
          eq(dailyPrices.date, date),
        ),
      )
      .limit(1);
    if (!dp.length) throw new Error(`No daily_prices for ${symbol} at ${date}`);
    const nav = parseFloat(dp[0].price.toString());

    // 5) for each pending row: parse weights, encode & on-chain update
    for (const row of pending) {
      let weights: [string, number][] = JSON.parse(row.weights);
      if (indexNumericId === 21 && row === pending[pending.length - 1]) {
        weights =
          this.indexRegistryService.replaceBitgetWeightsWithBTC(weights);
        this.logger.log(
          `🔁 Replaced Bitget weights with BTCUSDC in last SY100 rebalance`,
        );
      }

      const encoded = this.indexRegistryService.encodeWeights(
        weights,
      ) as `0x${string}`;

      // scale NAV to 6 decimals:
      const scaledPrice = BigInt(Math.floor(nav * 1e6)) as ethers.BigNumberish;
      // push on-chain
      await this.updateWeights(
        indexAddress,
        row.timestamp,
        encoded,
        scaledPrice,
      );

      this.logger.log(
        `📝 curatorUpdate sent for row ${row.id} at timestamp ${row.timestamp}.`,
      );

      // mark deployed
      await this.dbService
        .getDb()
        .update(tempRebalances)
        .set({ deployed: true })
        .where(eq(tempRebalances.id, row.id));
      this.logger.log(`✅ Marked row ${row.id} deployed`);
    }

    this.logger.log(
      `🎉 Completed processing ${pending.length} rows for ${symbol}`,
    );
    await sleep(1000);
  }

  async storeEmail(email: string, _twitter?: string) {
    const twitter = _twitter ?? ''; // Fallback to empty string

    await this.dbService
      .getDb()
      .insert(subscriptions)
      .values({ email, twitter })
      .onConflictDoUpdate({
        target: [subscriptions.email], // 🔑 conflict on the unique "email" column
        set: { twitter }, // 🔄 update twitter if conflict
      });
  }
}

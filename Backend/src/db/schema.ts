import { sql } from 'drizzle-orm';
import {
  pgTable,
  serial,
  varchar,
  decimal,
  timestamp,
  jsonb,
  bigint,
  text,
  integer,
  doublePrecision,
  json,
  numeric,
  primaryKey,
  date,
  unique,
  boolean,
} from 'drizzle-orm/pg-core';

export const compositions = pgTable('compositions', {
  id: serial('id').primaryKey(),
  indexId: varchar('index_id', { length: 66 }).notNull(),
  tokenAddress: varchar('token_address', { length: 66 }).notNull(),
  weight: decimal('weight', { precision: 7, scale: 4 }).notNull(),
  rebalanceTimestamp: bigint('rebalance_timestamp', {
    mode: 'number',
  }).notNull(),
  validUntil: timestamp('valid_until'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const rebalances = pgTable('rebalances', {
  id: serial('id').primaryKey(),
  indexId: varchar('index_id', { length: 66 }).notNull(),
  weights: text('weights').notNull(), // Store as hex string
  prices: jsonb('prices').notNull(),
  timestamp: bigint('timestamp', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const userActivities = pgTable('user_activities', {
  id: serial('id').primaryKey(),
  indexId: varchar('index_id', { length: 66 }).notNull(),
  userAddress: varchar('user_address', { length: 66 }).notNull(),
  action: varchar('action', { length: 20 }).notNull(),
  amount: decimal('amount', { precision: 18, scale: 8 }).notNull(),
  txHash: varchar('tx_hash', { length: 66 }).notNull(),
  chainId: serial('chain_id').notNull(),
  timestamp: bigint('timestamp', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const binancePairs = pgTable('binance_pairs', {
  id: serial('id').primaryKey(),
  symbol: varchar('symbol', { length: 50 }).notNull(), // e.g., BTCUSDT
  quoteAsset: varchar('quote_asset', { length: 10 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(), // TRADING, BREAK, HALTED, etc.
  fetchedAt: timestamp('fetched_at').defaultNow(), // When the data was fetched
});

export const tokenMetadata = pgTable('token_metadata', {
  id: serial('id').primaryKey(),
  coinGeckoId: varchar('coin_gecko_id', { length: 100 }).notNull(),
  symbol: varchar('symbol', { length: 50 }).notNull(),
  categories: jsonb('categories').notNull(), // Store as JSON array
  marketCap: bigint('market_cap', { mode: 'number' }),
  fetchedAt: timestamp('fetched_at').defaultNow(),
});

export const binanceListings = pgTable('binance_listings', {
  id: serial('id').primaryKey(),
  pair: varchar('pair', { length: 20 }).notNull(), // e.g., BTCUSDT
  action: varchar('action', { length: 10 }).notNull(), // listing or delisting
  timestamp: bigint('timestamp', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const tokenOhlc = pgTable('token_ohlc', {
  id: serial('id').primaryKey(),
  coinId: varchar('coin_id', { length: 100 }).notNull(), // e.g., bitcoin
  open: decimal('open', { precision: 18, scale: 8 }).notNull(),
  high: decimal('high', { precision: 18, scale: 8 }).notNull(),
  low: decimal('low', { precision: 18, scale: 8 }).notNull(),
  close: decimal('close', { precision: 18, scale: 8 }).notNull(),
  timestamp: bigint('timestamp', { mode: 'number' }).notNull(), // Daily timestamp
  createdAt: timestamp('created_at').defaultNow(),
});

export const tokenCategories = pgTable('token_categories', {
  id: serial('id').primaryKey(),
  coinId: varchar('coin_id', { length: 100 }).notNull(),
  categories: jsonb('categories').notNull(), // Array of categories
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  projectId: varchar('project_id', { length: 50 }).unique().notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 50 }).notNull(),
  websiteUrl: varchar('website_url', { length: 255 }),
  docsUrl: varchar('docs_url', { length: 255 }),
  twitterUrl: varchar('twitter_url', { length: 255 }),
  discordUrl: varchar('discord_url', { length: 255 }),
  screenshots: json('screenshots').$type<string[]>(), // Array of URLs
  overview: text('overview'),
  integrationDetails: text('integration_details'),
});

export const historicalPrices = pgTable('historical_prices', {
  id: serial('id').primaryKey(),
  coinId: text('coin_id').notNull(), // e.g., 'ethereum'
  symbol: text('symbol').notNull(), // e.g., 'ETH'
  timestamp: integer('timestamp').notNull(), // Unix timestamp (daily granularity)
  price: doublePrecision('price').notNull(), // USD price
});

export const coinSymbols = pgTable('coin_symbols', {
  coinId: text('coin_id').primaryKey(),
  symbol: text('symbol').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const dailyPrices = pgTable(
  'daily_prices',
  {
    indexId: text('index_id').notNull(),
    date: date('date').notNull(),
    price: numeric('price').notNull(),
    quantities: jsonb('quantities'), // Store token quantities as JSON
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.indexId, table.date] }),
  }),
);

export const tempCompositions = pgTable('temp_compositions', {
  id: serial('id').primaryKey(),
  indexId: varchar('index_id', { length: 66 }).notNull(),
  tokenAddress: varchar('token_address', { length: 66 }).notNull(),
  coin_id: varchar('coin_id', { length: 66 }).notNull(),
  weight: decimal('weight', { precision: 7, scale: 4 }).notNull(),
  rebalanceTimestamp: bigint('rebalance_timestamp', {
    mode: 'number',
  }).notNull(),
  validUntil: timestamp('valid_until'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const tempRebalances = pgTable(
  'temp_rebalances',
  {
    id: serial('id').primaryKey(),
    indexId: varchar('index_id', { length: 66 }).notNull(),
    weights: text('weights').notNull(),
    prices: jsonb('prices').notNull(),
    timestamp: bigint('timestamp', { mode: 'number' }).notNull(),
    coins: jsonb('coins').notNull(),
    deployed: boolean('deployed').default(false),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    // Add this unique constraint
    uniqueIndexTimestamp: unique('unique_index_timestamp').on(
      table.indexId,
      table.timestamp,
    ),
  }),
);

export const bitgetListings = pgTable('bitget_listings', {
  id: serial('id').primaryKey(),
  symbol: varchar('symbol', { length: 50 }).notNull(), // e.g., "VELOUSDT"
  baseAsset: varchar('base_asset', { length: 50 }).notNull(), // e.g., "VELO"
  quoteAsset: varchar('quote_asset', { length: 50 }).notNull(), // e.g., "USDT"
  productType: varchar('product_type', { length: 50 }).notNull(), // "umcbl" or "cmcbl"
  status: boolean('status').notNull(), // true if active
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const listingsTable = pgTable('crypto_listings', {
  id: serial('id').primaryKey(),
  token: text('token').notNull(),
  tokenName: text('token_name').notNull(),
  listingAnnouncementDate: jsonb('listing_announcement_date').notNull(),
  listingDate: jsonb('listing_date').notNull(),
  delistingAnnouncementDate: jsonb('delisting_announcement_date'),
  delistingDate: jsonb('delisting_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const apiKeysTable = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  key_name: text('key_name'),
  key: text('key').notNull().unique(),
  expired_date: timestamp('expired_date'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const announcementsTable = pgTable('announcements', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  source: text('source').notNull(),
  announceDate: timestamp('announce_date').notNull(),
  content: text('content').notNull(),
  parsed: boolean('parsed').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const blockchainEvents = pgTable(
  'blockchain_events',
  {
    id: serial('id').primaryKey(),
    txHash: text('tx_hash').notNull(),
    blockNumber: integer('block_number').notNull(),
    logIndex: integer('log_index').notNull(),
    eventType: text('event_type').notNull(), // e.g. 'deposit', 'withdraw'
    contractAddress: text('contract_address').notNull(),
    network: text('network').notNull(), // e.g. 'base', 'mainnet'
    userAddress: text('user_address'),
    amount: numeric('amount'),
    quantity: numeric('quantity').default('0'),
    timestamp: timestamp('timestamp', { withTimezone: true }), // optional
  },
  (table) => ({
    uniqueTxHash: unique().on(table.txHash),
  }),
);

export const syncState = pgTable(
  'sync_state',
  {
    id: serial('id').primaryKey(),
    contractAddress: text('contract_address').notNull(),
    network: text('network').notNull(),
    lastSyncedBlock: integer('last_synced_block').notNull(),
  },
  (table) => ({
    uniqueSyncKey: unique().on(table.contractAddress, table.network),
  }),
);

export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  twitter: text('twitter').default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const indexEvents = pgTable(
  'index_events',
  {
    id: serial('id').primaryKey(),
    indexId: integer('index_id').notNull(),
    txHash: text('tx_hash').notNull(),
    logIndex: integer('log_index').notNull(),
    timestamp: integer('timestamp').notNull(),
    nav: text('nav').notNull(),
    weights: text('weights').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).default(
      sql`now()`,
    ),
  },
  (table) => ({
    // add the composite unique constraint in Drizzle as well
    uniqueTxLog: unique().on(table.txHash),
  }),
);

// testing purpose
export const tempTop20Rebalances = pgTable( 
  'temp_top20_rebalances', 
  {
    id: serial('id').primaryKey(),
    indexId: varchar('index_id', { length: 66 }).notNull(),
    weights: text('weights').notNull(),
    prices: jsonb('prices').notNull(),
    timestamp: bigint('timestamp', { mode: 'number' }).notNull(),
    coins: jsonb('coins').notNull(),
    deployed: boolean('deployed').default(false),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    uniqueTop20IndexTimestamp: unique().on(
      table.indexId,
      table.timestamp,
    ),
  }),
);
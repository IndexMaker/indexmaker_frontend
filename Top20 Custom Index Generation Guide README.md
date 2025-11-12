# Table of Contents

* ✅ How to create a **custom index** (e.g., top 20 market cap assets of a specific CoinGecko category)
* ⚙️ How it integrates with your **rebalance and deployment flow**
* 🧠 How to simulate and push weights on-chain

---

# 📈 Custom Index Creation & Deployment Guide

This document outlines how to create, simulate, and deploy **custom ETF-style indexes** that represent the **top 20 market cap assets** from a specific [CoinGecko category](https://www.coingecko.com/en/categories). These indexes are equal-weighted and can be simulated historically or deployed live on-chain.

---

## 🧩 What Is a Custom Index?

A custom index (e.g., `Top20DeFi`, `Top20Meme`) is defined by:

- A **CoinGecko category** (e.g. `decentralized-finance-defi`, `meme-token`)
- The **top 20 assets** by market cap in that category
- **Equal weighting** (5% per asset)
- Support for **rebalancing** on listing/delisting events

---

## 🛠️ How to Create a Custom Index

### 1. Choose a Category

Pick a category slug from CoinGecko such as:

- `andreessen-horowitz-a16z-portfolio`
- `decentralized-finance-defi`
- `meme-token`
- `artificial-intelligence`
- `layer-2`

> Full list: [https://www.coingecko.com/en/categories](https://www.coingecko.com/en/categories)

---

### 2. Get Top 20 Tokens

Use the CoinGecko `/coins/markets` endpoint:

```http
GET /api/v3/coins/markets?vs_currency=usd
&category=decentralized-finance-defi
&order=market_cap_desc
&per_page=20&page=1
```

You’ll receive the top 20 tokens sorted by market cap in that category. Extract:

* `symbol` (e.g., `bitcoin`)
* `id`
* `market_cap`

---

### 3. Assign Equal Weights

Each token receives a weight of `0.05` (5%).

Example:

```ts
const weights: [string, number][] = top20.map((token) => [token.symbol, 0.05]);
```

---

### 4. Deploy or Simulate Index

Use the index rebalance system:

#### A. Simulate Historical Rebalances

```ts
simulateRebalances(
  startDate: Date,
  now: Date,
  etfType: 'decentralized-finance-defi', // category slug
  indexId: 27                            // unique numeric ID (will not deploy to on-chain, just for local indicating purpose)
);
```

This will:

* Track listing/delisting events from `listingsTable`
* Generate rebalance timestamps
* Call `rebalanceETF(...)` for each timestamp

#### B. Rebalance / Deploy Index Live

```ts
rebalanceETF(
  etfType: 'decentralized-finance-defi',
  indexId: 27,
  rebalanceTimestamp: 1720000000 // UTC timestamp
);
```

This performs:

* Deployment (if not already deployed)
* Fetches updated weights and NAV
* Encodes and pushes weights on-chain

> All deployed addresses are recorded in `deployedIndexes.json`.

---

## 🔁 Rebalance Flow Summary

When a rebalance occurs (automated or manual):

1. Check if the index is deployed (or deploy it)
2. Fetch top 20 category tokens and assign equal weights
3. Scale NAV price to 6 decimals
4. Encode weights and submit `curatorUpdate` to on-chain index
5. Log and persist result

For pending updates, use:

```ts
processPendingRebalances(indexNumericId: number, rebalanceTimestamp: number)
```

This will:

* Load undelivered weights from `tempRebalances`
* Deploy the index if needed
* Submit weights and mark as deployed

---

## 🧠 Storage Notes

* Index metadata is stored in `deployedIndexes.json`
* Historical prices are fetched from `dailyPrices` table
* Listing/delisting events are tracked via `listingsTable`
* Unprocessed rebalances are buffered in `tempRebalances`

---

## 🧪 Developer Tips

* You can simulate weights and inspect encoded values before pushing them live.
* To test a new index without deploying, mock `deployIndex(...)` to return a test address.
* Use `getPortfolioTokens(etfType)` to fetch CoinGecko assets from a category.
* Final weights are encoded using `this.indexRegistryService.encodeWeights(...)`.

---

## 📌 Example IDs

| Category                   | ETF Type Slug              | Index ID |
| -------------------------- | -------------------------- | -------- |
| SYAZ                | andreessen-horowitz-a16z-portfolio | 22       |
| SYDF                | decentralized-finance-defi | 27       |
| SYME                | meme-token                 | 25       |
| SYAI                  | artificial-intelligence    | 24       |
| SYL2             | layer-2                    | 23       |

---

## 🧾 Final Notes

* Equal-weight indexing simplifies gas costs and logic
* Rebalances should ideally be monthly, or triggered by listing changes
* The system supports backfilled historical simulation and live production execution

---

For further questions or deployment help, contact the Carbon or protocol engineering team.


import { Asset, CollateralSide, InventoryResponse, Lot, MintInvoice, Position } from "@/types";

const API_BASE_URL = "/api/issuer";
const API_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API;
const toUTCStartOfDay = (d: Date) =>
  new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0)
  );
const formatAPIDateUTC = (d: Date, to: boolean) => {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = d.getUTCDate(); // no pad
  return to ? `${y}-${m}-${day}T23:59:59.000Z` : `${y}-${m}-${day}T00:00:00.000Z`;
};
// Mock data for fallback
const mockAssets: Asset[] = [
  {
    id: "1",
    symbol: "BTC",
    name: "Bitcoin",
    total_supply: 21000000,
    circulating_supply: 19500000,
    price_usd: 45000,
    market_cap: 877500000000,
    expected_inventory: 240,
    created_at: "2025-08-01T00:00:00Z",
    thumb: "",
  },
  {
    id: "2",
    symbol: "ETH",
    name: "Ethereum",
    total_supply: 120000000,
    circulating_supply: 120000000,
    price_usd: 2800,
    market_cap: 336000000000,
    expected_inventory: 150,
    created_at: "2025-08-01T00:00:00Z",
    thumb: "",
  },
];

const mockInvoices: MintInvoice[] = [
  {
    id: "invoice_001",
    chain_id: "8453",
    address: "0x1a64a446e31f19172c6eb3197a1e85ff664af380",
    client_order_id: "Q-1756899471364",
    payment_id: "pay_67890",
    symbol: "SY100",
    amount_paid: 10000,
    amount_remaining: 150.75,
    exchange_fee: 25.5,
    management_fee: 15.25,
    assets_value: 0.95,
    filled_quantity: 0.95,
    fill_rate: 0.98085,
    status: "completed",
    timestamp: "2025-09-15T10:30:00Z",
    updated_at: "2025-09-15T11:45:00Z",
    lots: [
      {
        lot_id: "lot_001",
        symbol: "BTC",
        price: 45000,
        assigned_quantity: 0.1,
        assigned_fee: 5.0,
        assigned_timestamp: "2025-08-15T10:35:00Z",
        original_quantity: 0.5,
        remaining_quantity: 0.4,
        original_fee: 25.0,
        created_timestamp: "2025-08-15T09:00:00Z",
      },
      {
        lot_id: "lot_002",
        symbol: "ETH",
        price: 2800,
        assigned_quantity: 1.5,
        assigned_fee: 8.5,
        assigned_timestamp: "2025-08-15T10:40:00Z",
        original_quantity: 3.0,
        remaining_quantity: 1.5,
        original_fee: 17.0,
        created_timestamp: "2025-08-15T09:15:00Z",
      },
    ],
    position: {
      chain_id: 1,
      address: "",
      side_dr: {
        unconfirmed_balance: "",
        ready_balance: "",
        preauth_balance: "",
        spent_balance: "",
        open_lots: [],
        closed_lots: [],
      },
      side_cr: {
        unconfirmed_balance: "",
        ready_balance: "",
        preauth_balance: "",
        spent_balance: "",
        open_lots: [],
        closed_lots: [],
      },
    },
  },
];

export async function fetchAssets(): Promise<Asset[]> {
  try {
    const response = await fetch(`${API_BACKEND_URL}/indices/fetchAllAssets`);
    // const response = await fetch(`${API_BASE_URL}/inventory/all`);

    if (!response.ok) {
      throw new Error("Failed to fetch assets");
    }
    return await response.json();
  } catch (error) {
    console.warn("Failed to fetch assets from API, using mock data:", error);
    return mockAssets;
  }
}

export async function fetchInventory(): Promise<InventoryResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/inventory/all`);
    console.log("Fetching inventory from:", response);

    if (!response.ok) {
      throw new Error("Failed to fetch inventory");
    }
    return await response.json();
  } catch (error) {
    console.warn("Failed to fetch inventory from API, using mock data:", error);
    return { positions: {} };
  }
}

export async function fetchMintInvoices(
  from: Date,
  to: Date
): Promise<MintInvoice[]> {
  try {
    const fromStr = formatAPIDateUTC(toUTCStartOfDay(from), false);
    const toStr = formatAPIDateUTC(toUTCStartOfDay(to), true);

    const url = `${API_BASE_URL}/mint_invoices/from/${fromStr}/to/${toStr}`;
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Failed to fetch mint invoices (${response.status})`);
    }
    return await response.json();
  } catch (error) {
    console.warn(
      "Failed to fetch mint invoices from API, using mock data:",
      error
    );
    return mockInvoices; // keep your existing fallback
  }
}

export async function fetchMintInvoiceById(
  client_order_id: string,
  chain_id: string,
  address: string
): Promise<MintInvoice | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/mint_invoices/invoice/${chain_id}/${address}/${client_order_id}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch mint invoice");
    }
    const json = await response.json();
    return deserializeMintInvoice(json);
  } catch (error) {
    console.warn(
      "Failed to fetch mint invoice from API, using mock data:",
      error
    );
    return (
      mockInvoices.find(
        (invoice) => invoice.client_order_id === client_order_id
      ) || null
    );
  }
}

// --- Utils ---
const toNum = (v: unknown, fallback = 0): number => {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
};

const toStr = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : v != null ? String(v) : fallback;

// --- Deserializer ---
export function deserializeMintInvoice(raw: any): MintInvoice {
  // Some backends nest values under `invoice:{...}` and keep others at root.
  const inv = raw?.invoice ?? raw;

  // Prefer explicit status if present; otherwise infer from amount_remaining.
  const amountRemaining = toNum(inv.amount_remaining ?? raw.amount_remaining);
  const inferredStatus: MintInvoice["status"] =
    (toStr(inv.status ?? raw.status) as any) ||
    (amountRemaining > 0 ? "pending" : "completed");

  const createdAt =
    toStr(inv.timestamp ?? raw.timestamp ?? raw.timestamp) ||
    new Date().toISOString();

  const updatedAt = toStr(inv.timestamp ?? raw.timestamp) || createdAt;

  // lots can be at inv.lots or root.lots
  const lotsRaw: any[] = Array.isArray(inv.lots)
    ? inv.lots
    : Array.isArray(raw.lots)
    ? raw.lots
    : [];

  const lots: Lot[] = lotsRaw.map((l: any) => ({
    lot_id: toStr(l.lot_id),
    symbol: toStr(l.symbol),
    ...l, // keep the rest (price, quantity, etc) if present
  }));

  // ---- POSITION: normalize to a single Position (matches your types) ----
  const posRaw = inv.position ?? raw.position;
  const posObj = Array.isArray(posRaw) ? posRaw[0] : posRaw;

  // Helpers for DR/CR sides (convert numeric strings -> numbers, coerce arrays)
  const normalizeSpend = (s: any) => ({
    ...s,
    preauth_amount: toNum(s?.preauth_amount),
    spent_amount: toNum(s?.spent_amount),
  });

  const normalizeLot = (l: any) => ({
    ...l,
    unconfirmed_amount: toNum(l?.unconfirmed_amount),
    ready_amount: toNum(l?.ready_amount),
    preauth_amount: toNum(l?.preauth_amount),
    spent_amount: toNum(l?.spent_amount),
    spends: Array.isArray(l?.spends) ? l.spends.map(normalizeSpend) : [],
  });

  const normalizeSide = (side: any = {}): CollateralSide => ({
    unconfirmed_balance: toNum(side?.unconfirmed_balance),
    ready_balance: toNum(side?.ready_balance),
    preauth_balance: toNum(side?.preauth_balance),
    spent_balance: toNum(side?.spent_balance),
    open_lots: Array.isArray(side?.open_lots)
      ? side.open_lots.map(normalizeLot)
      : [],
    closed_lots: Array.isArray(side?.closed_lots)
      ? side.closed_lots.map(normalizeLot)
      : [],
  });

  const position: Position = posObj
    ? {
        chain_id: (posObj.chain_id ??
          raw.chain_id ??
          inv.chain_id) as Position["chain_id"], // number | string is OK
        address: toStr(posObj.address ?? raw.address ?? inv.address),
        side_cr: normalizeSide(posObj.side_cr ?? posObj.cr),
        side_dr: normalizeSide(posObj.side_dr ?? posObj.dr),
      }
    : {
        chain_id: (raw.chain_id ?? inv.chain_id) as Position["chain_id"],
        address: toStr(raw.address ?? inv.address),
        side_cr: normalizeSide(),
        side_dr: normalizeSide(),
      };
  // ---- END POSITION ----

  const chainId = toStr(raw.chain_id ?? inv.chain_id);
  const address = toStr(raw.address ?? inv.address);
  const clientOrderId = toStr(inv.client_order_id ?? raw.client_order_id);
  const paymentId = toStr(inv.payment_id ?? raw.payment_id);

  return {
    id: paymentId || clientOrderId || `${chainId}:${address}:${createdAt}`, // stable-ish fallback
    chain_id: chainId,
    address,
    client_order_id: clientOrderId,
    payment_id: paymentId,
    symbol: toStr(raw.symbol ?? inv.symbol),
    amount_paid: toNum(inv.amount_paid ?? raw.amount_paid),
    amount_remaining: amountRemaining,
    exchange_fee: toNum(inv.exchange_fee ?? raw.exchange_fee),
    management_fee: toNum(inv.management_fee ?? raw.management_fee),
    assets_value: toNum(inv.assets_value ?? raw.assets_value),
    filled_quantity: toNum(inv.filled_quantity ?? raw.filled_quantity),
    fill_rate: toNum(inv.fill_rate ?? raw.fill_rate),
    status: inferredStatus,
    timestamp: createdAt,
    updated_at: updatedAt,
    lots,
    position, // <-- now a single Position (not an array)
  };
}

import { NextResponse } from "next/server";

const CG_BASE = "https://pro-api.coingecko.com/api/v3/coins/markets";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id"); // CoinGecko asset id (e.g., 'bitcoin')
  const vs = searchParams.get("vs") || "usd";

  if (!id) {
    return NextResponse.json(
      { error: "Missing 'id' query param" },
      { status: 400 }
    );
  }

  const key = process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Server missing CG_PRO_API_KEY" },
      { status: 500 }
    );
  }

  const url = new URL(CG_BASE);
  url.searchParams.set("vs_currency", vs);
  url.searchParams.set("ids", id);

  // CoinGecko Pro requires header OR query param; we’ll use header:
  const res = await fetch(url.toString(), {
    headers: { "x-cg-pro-api-key": key },
    // Keep it fresh
    cache: "no-store",
    // Abort properly on slow networks
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `CoinGecko error ${res.status}` },
      { status: res.status }
    );
  }

  const data = (await res.json()) as Array<any>;
  // markets returns an array; pick the first
  const m = data[0];
  if (!m) {
    return NextResponse.json(
      { error: "Asset not found on CoinGecko" },
      { status: 404 }
    );
  }

  // Normalize just the fields you need in the client
  return NextResponse.json({
    id: m.id,
    symbol: m.symbol,
    name: m.name,
    price_usd: m.current_price,
    market_cap: m.market_cap,
    total_supply: m.total_supply, // may be null for some assets
    circulating_supply: m.circulating_supply,
    last_updated: m.last_updated,
    thumb: m.image, // CoinGecko provides image url
  });
}

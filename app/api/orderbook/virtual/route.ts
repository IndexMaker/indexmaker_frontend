import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/utils/logger";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API || "http://localhost:3002";

export interface VirtualOrderbookRequest {
  symbols: string[];
  weights: number[];
  levels?: number;
  quote?: string;
}

export interface OrderbookLevel {
  price: number;
  quantity: number;
  usd_value: number;
}

export interface AssetOrderbookSummary {
  symbol: string;
  weight_bps: number;
  mid_price: number;
  spread_bps: number;
  bid_depth_usd: number;
  ask_depth_usd: number;
}

export interface VirtualOrderbookResponse {
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  mid_price: number;
  spread_bps: number;
  total_bid_depth_usd: number;
  total_ask_depth_usd: number;
  assets_included: number;
  assets_failed: string[];
  asset_details: AssetOrderbookSummary[];
}

export async function POST(request: NextRequest) {
  try {
    const body: VirtualOrderbookRequest = await request.json();

    // Validate request
    if (!body.symbols || body.symbols.length === 0) {
      return NextResponse.json(
        { error: "symbols array is required" },
        { status: 400 }
      );
    }

    if (!body.weights || body.weights.length !== body.symbols.length) {
      return NextResponse.json(
        { error: "weights array must have same length as symbols" },
        { status: 400 }
      );
    }

    log.info("Fetching virtual orderbook from backend", {
      symbols: body.symbols,
      weights: body.weights,
    });

    const response = await fetch(`${BACKEND_URL}/api/orderbook/virtual`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        symbols: body.symbols,
        weights: body.weights,
        levels: body.levels ?? 10,
        quote: body.quote ?? "USDT",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "No error details");
      log.error("Backend error fetching virtual orderbook", {
        status: response.status,
        error: errorText,
      });

      return NextResponse.json(
        { error: errorText },
        { status: response.status }
      );
    }

    const rawData = await response.json();

    // Backend wraps response in {success, data, error}
    if (!rawData.success || !rawData.data) {
      return NextResponse.json(
        { error: rawData.error || "Failed to fetch orderbook" },
        { status: 500 }
      );
    }

    // Map backend response to frontend expected format
    const backendData = rawData.data;
    const data: VirtualOrderbookResponse = {
      bids: backendData.bids || [],
      asks: backendData.asks || [],
      mid_price: backendData.mid_price || 0,
      spread_bps: backendData.spread_bps || 0,
      total_bid_depth_usd: backendData.total_bid_depth_usd || 0,
      total_ask_depth_usd: backendData.total_ask_depth_usd || 0,
      assets_included: backendData.assets_included || 0,
      assets_failed: backendData.assets_failed || [],
      // Map asset_liquidity to asset_details (field name difference)
      asset_details: (backendData.asset_liquidity || []).map((a: any) => ({
        symbol: a.symbol,
        weight_bps: a.weight_bps,
        mid_price: a.mid_price,
        spread_bps: a.spread_bps,
        bid_depth_usd: a.bid_depth_usd,
        ask_depth_usd: a.ask_depth_usd,
      })),
    };

    log.info("Successfully fetched virtual orderbook", {
      assets_included: data.assets_included,
      mid_price: data.mid_price,
      spread_bps: data.spread_bps,
      bids_count: data.bids.length,
      asks_count: data.asks.length,
    });

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    log.error("Virtual Orderbook API Route Error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      {
        error: "Failed to fetch virtual orderbook",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

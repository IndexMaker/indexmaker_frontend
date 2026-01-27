import { NextResponse } from "next/server";
import { log } from "@/lib/utils/logger";

// Server-side only - use non-public env var (falls back to public for compatibility)
const BACKEND_URL = process.env.BACKEND_API || process.env.NEXT_PUBLIC_BACKEND_API || "http://localhost:3002";
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ nonce: string }> }
) {
  try {
    const { nonce } = await params;
    const url = new URL(req.url);
    const fromBlock = url.searchParams.get("from_block");
    const admin = url.searchParams.get("admin");

    if (!fromBlock) {
      return NextResponse.json(
        { error: "from_block query parameter is required" },
        { status: 400 }
      );
    }

    log.debug("ITP Status API: Checking status", { nonce, fromBlock, admin });

    // Build query string with optional admin parameter
    const queryParams = new URLSearchParams({ from_block: fromBlock });
    if (admin) {
      queryParams.set("admin", admin);
    }

    const response = await fetch(
      `${BACKEND_URL}/api/itp/status/${nonce}?${queryParams.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(ADMIN_API_KEY && { "X-API-Key": ADMIN_API_KEY }),
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "No error details");
      log.error("Backend error", { status: response.status, error: errorText });
      return NextResponse.json(
        { error: errorText },
        { status: response.status }
      );
    }

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    log.error("ITP Status API Route Error", {
      error: error instanceof Error ? error.message : "Unknown error"
    });
    return NextResponse.json(
      { error: "Failed to check ITP status" },
      { status: 500 }
    );
  }
}

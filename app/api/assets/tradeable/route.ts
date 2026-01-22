import { NextResponse } from "next/server";
import { log } from "@/lib/utils/logger";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API || "http://localhost:3002";

export async function GET() {
  try {
    log.info("Fetching all tradeable assets from backend");

    const response = await fetch(`${BACKEND_URL}/api/exchange/all-tradeable-assets`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // Cache for 10 minutes (same as backend cache)
      next: { revalidate: 600 },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "No error details");
      log.error("Backend error fetching assets", { status: response.status, error: errorText });

      return NextResponse.json(
        { error: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    log.info("Successfully fetched tradeable assets", { count: data.total_count });

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    log.error("Assets API Route Error", {
      error: error instanceof Error ? error.message : "Unknown error"
    });
    return NextResponse.json(
      {
        error: "Failed to connect to backend server",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

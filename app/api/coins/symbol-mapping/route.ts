import { NextResponse } from "next/server";
import { log } from "@/lib/utils/logger";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API || "http://localhost:3002";

export async function GET() {
  try {
    log.info("Fetching coin symbol mappings from backend");

    const response = await fetch(`${BACKEND_URL}/api/coins/symbol-mapping`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // Cache for 1 hour (coin mappings don't change often)
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "No error details");
      log.error("Backend error fetching coin mappings", { status: response.status, error: errorText });

      return NextResponse.json(
        { error: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    log.info("Successfully fetched coin mappings", { count: data.total_count });

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    log.error("Coin Mapping API Route Error", {
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

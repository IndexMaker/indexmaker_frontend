import { NextResponse } from "next/server";
import { log } from "@/lib/utils/logger";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API || "http://localhost:3002";
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    log.info("ITP Create API: Proxying to backend", { payload: body });

    // Convert initial_price from dollars to USDC (6 decimals)
    const payload = {
      ...body,
      initial_price: Math.round(body.initial_price * 1_000_000),
    };

    log.debug("Backend URL", { url: `${BACKEND_URL}/api/itp/create` });

    const response = await fetch(`${BACKEND_URL}/api/itp/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(ADMIN_API_KEY && { "X-API-Key": ADMIN_API_KEY }),
      },
      body: JSON.stringify(payload),
    });

    log.info("Backend response", { status: response.status, statusText: response.statusText });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "No error details");
      log.error("Backend error", { status: response.status, error: errorText });

      // Map error codes to user-friendly messages
      let userMessage = errorText;
      if (response.status === 400) {
        userMessage = `Validation error: ${errorText}`;
      } else if (response.status === 401) {
        userMessage = "Admin access required";
      } else if (response.status === 504) {
        userMessage = "Bridge confirmation timed out - check transaction status";
      } else if (response.status >= 500) {
        userMessage = "Creation failed, please try again";
      }

      return NextResponse.json(
        { error: userMessage, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json().catch(() => ({}));
    log.info("ITP creation successful", { data });

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    log.error("ITP Create API Route Error", {
      error: error instanceof Error ? error.message : "Unknown error"
    });
    return NextResponse.json(
      {
        error: "Failed to connect to backend server",
        message: error instanceof Error ? error.message : "Unknown error",
        hint: "Make sure the backend server is running on the configured port"
      },
      { status: 500 }
    );
  }
}

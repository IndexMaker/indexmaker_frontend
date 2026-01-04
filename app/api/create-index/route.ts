import { NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API || "http://localhost:3002";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("🚀 API Route: Proxying vault creation to backend...");
    console.log("📦 Payload:", JSON.stringify(body, null, 2));
    console.log("🌐 Backend URL:", `${BACKEND_URL}/create-index`);

    const response = await fetch(`${BACKEND_URL}/create-index`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    console.log("📡 Backend response status:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "No error details");
      console.error("❌ Backend error:", errorText);
      return NextResponse.json(
        { error: `Backend error: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json().catch(() => ({}));
    console.log("✅ Backend response data:", data);

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("🔥 API Route Error:", error);
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

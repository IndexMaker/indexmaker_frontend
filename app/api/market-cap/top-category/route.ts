import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_API || "http://127.0.0.1:3002";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("category_id");
    const top = searchParams.get("top") || "50";
    const date = searchParams.get("date");

    if (!categoryId) {
      return NextResponse.json(
        { error: "category_id is required" },
        { status: 400 }
      );
    }

    const params = new URLSearchParams({ category_id: categoryId, top });
    if (date) {
      params.append("date", date);
    }

    const url = `${BACKEND_URL}/api/market-cap/top-category?${params.toString()}`;
    console.log(`[top-category] Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store", // Disable cache to ensure fresh data
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || `Backend error: ${response.status}`;
      } catch {
        errorMessage = errorText || `Backend error: ${response.status} ${response.statusText}`;
      }
      console.error(`[top-category] Backend error: ${errorMessage}`);
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[top-category] Success: ${data.coins?.length || 0} coins`);
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[top-category] Error: ${errorMessage}`);
    return NextResponse.json(
      { error: `Failed to fetch category data: ${errorMessage}` },
      { status: 500 }
    );
  }
}

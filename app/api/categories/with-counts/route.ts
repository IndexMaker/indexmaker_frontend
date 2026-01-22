import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_API || "http://127.0.0.1:3002";

export interface CategoryWithCount {
  categoryId: string;
  name: string;
  tradeableCount: number;
}

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/categories/with-counts`, {
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 600 }, // Cache for 10 minutes
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status} ${response.statusText}`);
    }

    const categories: CategoryWithCount[] = await response.json();
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Failed to fetch categories with counts:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

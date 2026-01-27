import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { log } from "@/lib/utils/logger";
import type { AssetJSON } from "@/lib/types/assets";

/**
 * GET /api/assets/registry
 *
 * Returns assets from the centralized asset registry (vendor/assets.json).
 * This is the single source of truth for asset IDs used in ITP creation.
 *
 * Response format: { assets: AssetJSON[], total_count: number }
 */
export async function GET() {
  try {
    // vendor/assets.json is one directory up from indexmaker_frontend
    const assetsPath = join(process.cwd(), "..", "vendor", "assets.json");
    const fileContent = await readFile(assetsPath, "utf-8");
    const assets: AssetJSON[] = JSON.parse(fileContent);

    log.info("Registry assets loaded", { event: "registry_loaded", count: assets.length });

    return NextResponse.json(
      { assets, total_count: assets.length },
      {
        status: 200,
        headers: {
          // Assets rarely change - cache for 1 hour
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    log.error("Failed to load asset registry", {
      event: "registry_load_failed",
      error: errorMessage,
    });

    // Structured error response per project-context.md
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to load asset registry",
          details: { reason: errorMessage },
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}

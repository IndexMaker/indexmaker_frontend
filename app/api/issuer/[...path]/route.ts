export const runtime = "edge"; // or "nodejs"
export const dynamic = "force-dynamic"; // optional: avoid caching

const UPSTREAM = process.env.NEXT_PUBLIC_INDEXMAKER_API || "https://issuer-network-1.indexmaker.global/api/v1";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization", // Removed x-api-key
};

function toUpstream(segments: string[], search: string) {
  const url = new URL(UPSTREAM);
  url.pathname = [url.pathname.replace(/\/$/, ""), ...segments].join("/");
  url.search = search;
  return url.toString();
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// --- GET Handler ---
export async function GET(req: Request, context: any) {
  const raw = context?.params?.path;
  const segments = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const upstreamUrl = toUpstream(segments, new URL(req.url).search);

  const r = await fetch(upstreamUrl, {
    headers: {
      Authorization: req.headers.get("authorization") ?? "",
      // REMOVED: "x-api-key"
    },
    cache: "no-store",
  });

  return new Response(r.body, {
    status: r.status,
    headers: {
      "Content-Type": r.headers.get("content-type") ?? "application/json",
      ...CORS_HEADERS,
    },
  });
}

// --- POST Handler ---
export async function POST(req: Request, context: any) {
  const raw = context?.params?.path;
  const segments = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const upstreamUrl = toUpstream(segments, new URL(req.url).search);

  const r = await fetch(upstreamUrl, {
    method: "POST",
    headers: {
      "content-type": req.headers.get("content-type") ?? "application/json",
      Authorization: req.headers.get("authorization") ?? "",
      // REMOVED: "x-api-key"
    },
    body: await req.text(),
    cache: "no-store",
  });

  return new Response(r.body, {
    status: r.status,
    headers: {
      "Content-Type": r.headers.get("content-type") ?? "application/json",
      ...CORS_HEADERS,
    },
  });
}
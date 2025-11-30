export const runtime = "nodejs"; // Changed from edge to nodejs for better compatibility
export const dynamic = "force-dynamic"; // optional: avoid caching

const UPSTREAM = process.env.NEXT_PUBLIC_INDEXMAKER_API || "https://www.indexmaker.global/api/v1";
// In production, use production backend URL, fallback to localhost for development
const LOCAL_BACKEND = process.env.NEXT_PUBLIC_BACKEND_API ||
  (process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_BACKEND_API || "https://backend.indexmaker.global"
    : "http://localhost:5000");

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

function toLocalBackend(segments: string[], search: string) {
  const url = new URL(LOCAL_BACKEND);
  url.pathname = [url.pathname.replace(/\/$/, ""), ...segments].join("/");
  url.search = search;
  return url.toString();
}

async function tryLocalBackend(
  segments: string[],
  search: string,
  method: string = "GET",
  body?: string,
): Promise<Response | null> {
  // Only try local backend for mint_invoices endpoints
  if (segments[0] === "mint_invoices") {
    try {
      const localUrl = toLocalBackend(segments, search);
      const fetchOptions: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        // Add timeout - longer for production
        signal: AbortSignal.timeout(process.env.NODE_ENV === 'production' ? 10000 : 5000),
      };

      if (body && method === "POST") {
        fetchOptions.body = body;
      }

      const response = await fetch(localUrl, fetchOptions);

      if (response.ok) {
        return response;
      }
    } catch (error) {
      // Local backend not available, fall through to upstream
      // Only log in development to avoid noise in production
      if (process.env.NODE_ENV !== 'production') {
        console.log("Local backend not available, using upstream:", error);
      }
    }
  }
  return null;
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// --- GET Handler ---
export async function GET(req: Request, context: any) {
  const raw = context?.params?.path;
  const segments = Array.isArray(raw) ? raw : raw ? [raw] : [];

  // Try local backend first for mint_invoices
  const localResponse = await tryLocalBackend(segments, new URL(req.url).search, "GET");
  if (localResponse) {
    const body = await localResponse.text();
    return new Response(body, {
      status: localResponse.status,
      headers: {
        "Content-Type": localResponse.headers.get("content-type") ?? "application/json",
        ...CORS_HEADERS,
      },
    });
  }

  // Fallback to upstream
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
  const requestBody = await req.text();

  // Try local backend first for mint_invoices
  const localResponse = await tryLocalBackend(segments, new URL(req.url).search, "POST", requestBody);
  if (localResponse) {
    const body = await localResponse.text();
    return new Response(body, {
      status: localResponse.status,
      headers: {
        "Content-Type": localResponse.headers.get("content-type") ?? "application/json",
        ...CORS_HEADERS,
      },
    });
  }

  // Fallback to upstream
  const upstreamUrl = toUpstream(segments, new URL(req.url).search);

  const r = await fetch(upstreamUrl, {
    method: "POST",
    headers: {
      "content-type": req.headers.get("content-type") ?? "application/json",
      Authorization: req.headers.get("authorization") ?? "",
      // REMOVED: "x-api-key"
    },
    body: requestBody,
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
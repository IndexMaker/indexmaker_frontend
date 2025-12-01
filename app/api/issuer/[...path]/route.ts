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
        credentials: "omit", // Prevent cookie forwarding to avoid header size issues
        // Add timeout - longer for production
        signal: AbortSignal.timeout(process.env.NODE_ENV === 'production' ? 10000 : 5000),
      };

      if (body && method === "POST") {
        fetchOptions.body = body;
      }

      const response = await fetch(localUrl, fetchOptions);

      // Return response even if not ok, so we can see the actual error
      // The caller will handle non-ok responses appropriately
      if (response.status === 401 || response.status === 403) {
        // If we get auth errors from local backend, log but don't fall through to upstream
        // (upstream might also require auth we don't have)
        console.error(`Local backend returned ${response.status} for ${localUrl}`);
        return null; // Return null to prevent fallback to upstream
      }

      if (response.ok) {
        return response;
      }

      // For other errors (500, 404, etc), still return null to try upstream
      // But log in development
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Local backend returned ${response.status} for ${localUrl}, trying upstream`);
      }
    } catch (error) {
      // Local backend not available (network error, timeout, etc), fall through to upstream
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
export async function GET(req: Request, context: { params: Promise<{ path: string | string[] }> }) {
  const params = await context.params;
  const raw = params?.path;
  const segments = Array.isArray(raw) ? raw : raw ? [raw] : [];

  // Check total header size to prevent REQUEST_HEADER_TOO_LARGE error
  // Vercel's limit is typically 8-16KB for total request headers
  let totalHeaderSize = 0;
  for (const [key, value] of req.headers.entries()) {
    totalHeaderSize += new TextEncoder().encode(key + value).length;
  }

  // If headers are too large, return error early with helpful message
  if (totalHeaderSize > 12000) { // Leave buffer below 16KB limit
    return new Response(
      JSON.stringify({
        error: 'Request headers too large',
        message: 'The request contains too many or too large headers. Please clear your browser cookies and try again.',
        headerSize: totalHeaderSize
      }),
      {
        status: 431, // HTTP 431 Request Header Fields Too Large
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
        }
      }
    );
  }

  // Limit query string size to prevent header size issues
  const url = new URL(req.url);
  const search = url.search.length > 2000 ? "" : url.search; // Limit query string to 2000 chars

  // Try local backend first for mint_invoices
  const localResponse = await tryLocalBackend(segments, search, "GET");
  if (localResponse) {
    // If local backend returned an error status, return it directly instead of falling back
    if (!localResponse.ok) {
      const errorBody = await localResponse.text();
      return new Response(errorBody, {
        status: localResponse.status,
        headers: {
          "Content-Type": localResponse.headers.get("content-type") ?? "application/json",
          ...CORS_HEADERS,
        },
      });
    }

    const body = await localResponse.text();
    // Aggressively filter out Set-Cookie and other potentially large headers
    const responseHeaders = new Headers();

    // Only copy safe, small headers - explicitly exclude all cookie-related headers
    const safeHeaders = ['content-type', 'content-length', 'cache-control', 'expires', 'last-modified', 'etag'];
    for (const [key, value] of localResponse.headers.entries()) {
      const lowerKey = key.toLowerCase();
      // Explicitly exclude all cookie-related and potentially large headers
      if (
        lowerKey === 'set-cookie' ||
        lowerKey === 'cookie' ||
        lowerKey.startsWith('x-') ||
        lowerKey.includes('cookie') ||
        value.length > 1000 // Skip any header value larger than 1KB
      ) {
        continue;
      }
      // Only include safe headers
      if (safeHeaders.includes(lowerKey)) {
        responseHeaders.set(key, value);
      }
    }

    // Always set Content-Type if available
    const contentType = localResponse.headers.get("content-type");
    if (contentType && !responseHeaders.has("content-type")) {
      responseHeaders.set("Content-Type", contentType);
    }

    // Add CORS headers
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
      responseHeaders.set(key, value);
    });

    return new Response(body, {
      status: localResponse.status,
      headers: responseHeaders,
    });
  }

  // Fallback to upstream - use limited search to prevent header size issues
  const upstreamUrl = toUpstream(segments, search);

  // Build minimal headers - only include essential ones, exclude cookies and other large headers
  const requestHeaders: HeadersInit = {};
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    requestHeaders["Authorization"] = authHeader;
  }
  // Explicitly DO NOT forward: Cookie, Set-Cookie, or any other potentially large headers

  const r = await fetch(upstreamUrl, {
    headers: requestHeaders,
    cache: "no-store",
    credentials: "omit", // Prevent cookie forwarding to avoid header size issues
  });

  // Aggressively filter out Set-Cookie and other potentially large headers from response
  const responseHeaders = new Headers();

  // Only copy safe, small headers - explicitly exclude all cookie-related headers
  const safeHeaders = ['content-type', 'content-length', 'cache-control', 'expires', 'last-modified', 'etag'];
  for (const [key, value] of r.headers.entries()) {
    const lowerKey = key.toLowerCase();
    // Explicitly exclude all cookie-related and potentially large headers
    if (
      lowerKey === 'set-cookie' ||
      lowerKey === 'cookie' ||
      lowerKey.startsWith('x-') ||
      lowerKey.includes('cookie') ||
      value.length > 1000 // Skip any header value larger than 1KB
    ) {
      continue;
    }
    // Only include safe headers
    if (safeHeaders.includes(lowerKey)) {
      responseHeaders.set(key, value);
    }
  }

  // Always set Content-Type if available
  const contentType = r.headers.get("content-type");
  if (contentType && !responseHeaders.has("content-type")) {
    responseHeaders.set("Content-Type", contentType);
  }

  // Add CORS headers
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    responseHeaders.set(key, value);
  });

  return new Response(r.body, {
    status: r.status,
    headers: responseHeaders,
  });
}

// --- POST Handler ---
export async function POST(req: Request, context: { params: Promise<{ path: string | string[] }> }) {
  const params = await context.params;
  const raw = params?.path;
  const segments = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const requestBody = await req.text();

  // Limit query string size to prevent header size issues
  const url = new URL(req.url);
  const search = url.search.length > 2000 ? "" : url.search; // Limit query string to 2000 chars

  // Try local backend first for mint_invoices
  const localResponse = await tryLocalBackend(segments, search, "POST", requestBody);
  if (localResponse) {
    // If local backend returned an error status, return it directly instead of falling back
    if (!localResponse.ok) {
      const errorBody = await localResponse.text();
      return new Response(errorBody, {
        status: localResponse.status,
        headers: {
          "Content-Type": localResponse.headers.get("content-type") ?? "application/json",
          ...CORS_HEADERS,
        },
      });
    }

    const body = await localResponse.text();
    // Aggressively filter out Set-Cookie and other potentially large headers
    const responseHeaders = new Headers();

    // Only copy safe, small headers - explicitly exclude all cookie-related headers
    const safeHeaders = ['content-type', 'content-length', 'cache-control', 'expires', 'last-modified', 'etag'];
    for (const [key, value] of localResponse.headers.entries()) {
      const lowerKey = key.toLowerCase();
      // Explicitly exclude all cookie-related and potentially large headers
      if (
        lowerKey === 'set-cookie' ||
        lowerKey === 'cookie' ||
        lowerKey.startsWith('x-') ||
        lowerKey.includes('cookie') ||
        value.length > 1000 // Skip any header value larger than 1KB
      ) {
        continue;
      }
      // Only include safe headers
      if (safeHeaders.includes(lowerKey)) {
        responseHeaders.set(key, value);
      }
    }

    // Always set Content-Type if available
    const contentType = localResponse.headers.get("content-type");
    if (contentType && !responseHeaders.has("content-type")) {
      responseHeaders.set("Content-Type", contentType);
    }

    // Add CORS headers
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
      responseHeaders.set(key, value);
    });

    return new Response(body, {
      status: localResponse.status,
      headers: responseHeaders,
    });
  }

  // Fallback to upstream - use limited search to prevent header size issues
  const upstreamUrl = toUpstream(segments, search);

  // Build minimal headers - only include essential ones, exclude cookies and other large headers
  const requestHeaders: HeadersInit = {
    "content-type": req.headers.get("content-type") ?? "application/json",
  };
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    requestHeaders["Authorization"] = authHeader;
  }
  // Explicitly DO NOT forward: Cookie, Set-Cookie, or any other potentially large headers

  const r = await fetch(upstreamUrl, {
    method: "POST",
    headers: requestHeaders,
    body: requestBody,
    cache: "no-store",
    credentials: "omit", // Prevent cookie forwarding to avoid header size issues
  });

  // Aggressively filter out Set-Cookie and other potentially large headers from response
  const responseHeaders = new Headers();

  // Only copy safe, small headers - explicitly exclude all cookie-related headers
  const safeHeaders = ['content-type', 'content-length', 'cache-control', 'expires', 'last-modified', 'etag'];
  for (const [key, value] of r.headers.entries()) {
    const lowerKey = key.toLowerCase();
    // Explicitly exclude all cookie-related and potentially large headers
    if (
      lowerKey === 'set-cookie' ||
      lowerKey === 'cookie' ||
      lowerKey.startsWith('x-') ||
      lowerKey.includes('cookie') ||
      value.length > 1000 // Skip any header value larger than 1KB
    ) {
      continue;
    }
    // Only include safe headers
    if (safeHeaders.includes(lowerKey)) {
      responseHeaders.set(key, value);
    }
  }

  // Always set Content-Type if available
  const contentType = r.headers.get("content-type");
  if (contentType && !responseHeaders.has("content-type")) {
    responseHeaders.set("Content-Type", contentType);
  }

  // Add CORS headers
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    responseHeaders.set(key, value);
  });

  return new Response(r.body, {
    status: r.status,
    headers: responseHeaders,
  });
}
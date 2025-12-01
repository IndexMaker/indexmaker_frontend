import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Only intercept API routes for issuer/invoices
  if (request.nextUrl.pathname.startsWith('/api/issuer')) {
    // Check if request has too many/large cookies
    const cookieHeader = request.headers.get('cookie') || '';
    const cookieSize = new TextEncoder().encode(cookieHeader).length;

    // If cookies are too large (>8KB), strip them to prevent REQUEST_HEADER_TOO_LARGE error
    // Vercel's limit is typically 8-16KB for total headers
    if (cookieSize > 6000) { // Leave some room for other headers
      // Create a new request without cookies
      const response = NextResponse.next();
      // Clear cookies from the request by creating a new request
      // Note: We can't modify incoming request, but we can prevent forwarding
      // The API route will handle this with credentials: "omit"
      return response;
    }

    const response = NextResponse.next();

    // CRITICAL: Strip ALL Set-Cookie headers from responses to prevent header size issues
    // This happens at the edge level before Vercel processes the response
    response.headers.delete('set-cookie');

    // Also delete any other potentially large headers
    response.headers.delete('x-vercel-id');
    response.headers.delete('x-vercel-trace');

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/issuer/:path*',
};

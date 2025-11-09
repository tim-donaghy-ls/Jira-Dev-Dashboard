import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Middleware function that checks for SKIP_AUTH environment variable
export default function middleware(req: NextRequest) {
  // Skip authentication for E2E tests
  if (process.env.SKIP_AUTH === 'true') {
    return NextResponse.next()
  }

  // Use NextAuth middleware for authentication
  return withAuth(
    function middleware(req) {
      return NextResponse.next()
    },
    {
      callbacks: {
        authorized: ({ token }) => !!token,
      },
      pages: {
        signIn: '/auth/signin',
      },
    }
  )(req as any)
}

// Protect all pages except auth pages
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - auth (authentication pages)
     * - api/auth (NextAuth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!auth|api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
}

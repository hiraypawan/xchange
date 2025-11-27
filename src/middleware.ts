import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Handle admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Skip API routes - they have their own auth
    if (request.nextUrl.pathname.startsWith('/api/admin')) {
      return NextResponse.next();
    }

    // Skip the login page itself
    if (request.nextUrl.pathname === '/admin/login') {
      return NextResponse.next();
    }

    // Check for admin session
    const adminSession = request.cookies.get('admin_session');
    if (!adminSession?.value) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    try {
      const sessionData = JSON.parse(adminSession.value);
      if (!sessionData.verified || sessionData.expires < Date.now()) {
        return NextResponse.redirect(new URL('/admin/login', request.url));
      }
    } catch (err) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Skip API user routes - they have their own auth via getServerSession
  if (request.nextUrl.pathname.startsWith('/api/user/')) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/user/:path*'
  ]
}
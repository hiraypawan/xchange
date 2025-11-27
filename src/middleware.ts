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

  // Handle data access routes
  if (request.nextUrl.pathname.startsWith('/api/user/')) {
    const userId = request.nextUrl.pathname.split('/')[3]; // Get user ID from URL
    const session = request.cookies.get('next-auth.session-token');

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      // Verify the user is accessing their own data
      const sessionData = JSON.parse(atob(session.value.split('.')[1])); // Decode JWT payload
      if (sessionData.id !== userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } catch (err) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/user/:path*'
  ]
}
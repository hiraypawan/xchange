import { NextRequest, NextResponse } from 'next/server';

const ADMIN_PASSWORD = 'Fæ7猫!RΦ9e@Z';

export async function adminAuth(request: NextRequest) {
  // Allow API routes to bypass this middleware
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Check if trying to access admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const adminSession = request.cookies.get('admin_session');
    
    // If no admin session, redirect to admin login
    if (!adminSession?.value) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    
    // Verify admin session
    try {
      const sessionData = JSON.parse(adminSession.value);
      if (!sessionData.verified || sessionData.expires < Date.now()) {
        return NextResponse.redirect(new URL('/admin/login', request.url));
      }
    } catch (err) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}
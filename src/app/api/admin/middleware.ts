import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function adminMiddleware(request: NextRequest) {
  const adminSession = request.cookies.get('admin_session');
  if (!adminSession?.value) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
  }

  try {
    const sessionData = JSON.parse(adminSession.value);
    if (!sessionData.verified || sessionData.expires < Date.now()) {
      return NextResponse.json({ error: 'Admin session expired' }, { status: 401 });
    }
    return null; // Allow request to proceed
  } catch (err) {
    return NextResponse.json({ error: 'Invalid admin session' }, { status: 401 });
  }
}
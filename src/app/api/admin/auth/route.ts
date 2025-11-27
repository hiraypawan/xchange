import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const ADMIN_PASSWORD = 'Fæ7猫!RΦ9e@Z';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    // Verify password
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid admin password' },
        { status: 401 }
      );
    }

    // Create admin session cookie
    const adminSession = {
      verified: true,
      expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      createdAt: Date.now()
    };

    // Set the admin session cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: 'admin_session',
      value: JSON.stringify(adminSession),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json(
      { error: 'Failed to process authentication' },
      { status: 500 }
    );
  }
}
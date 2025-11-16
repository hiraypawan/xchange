import { NextRequest, NextResponse } from 'next/server';

// Endpoint to check remote core version
export async function GET(request: NextRequest) {
  try {
    const version = `remote-core-${Date.now().toString().slice(-8)}`;
    
    return new NextResponse(JSON.stringify({
      version,
      timestamp: Date.now(),
      available: true
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Code-Version': version,
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to get version info'
    }, { status: 500 });
  }
}

// Handle HEAD requests for version checking
export async function HEAD(request: NextRequest) {
  const version = `remote-core-${Date.now().toString().slice(-8)}`;
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      'X-Code-Version': version,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Extension-Version'
    }
  });
}
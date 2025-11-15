import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import archiver from 'archiver';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'download':
      return handleDownload();
    case 'version':
      return handleVersionCheck();
    case 'update':
      return handleUpdateManifest();
    case 'crx':
      return handleCrxDownload();
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

async function handleDownload() {
  try {
    const extensionPath = path.join(process.cwd(), 'chrome-extension');
    
    // Create a zip file of the extension
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    // Set up response headers
    const headers = new Headers({
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="xchangee-extension.zip"',
    });

    const stream = new ReadableStream({
      start(controller) {
        archive.on('data', (chunk) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        
        archive.on('end', () => {
          controller.close();
        });
        
        archive.on('error', (err) => {
          controller.error(err);
        });

        // Add extension files to archive
        archive.directory(extensionPath, false);
        archive.finalize();
      },
    });

    return new Response(stream, { headers });
    
  } catch (error) {
    console.error('Extension download error:', error);
    return NextResponse.json({ error: 'Failed to download extension' }, { status: 500 });
  }
}

// Version history with detailed release notes
type VersionInfo = {
  releaseNotes: string;
  features: string[];
  releaseDate: string;
};

const VERSION_HISTORY: Record<string, VersionInfo> = {
  '1.3.7': {
    releaseNotes: 'API FIXES: Resolved posts feed 400 errors • Reduced console noise • Improved message filtering',
    features: [
      'Fixed posts API 400 errors by bypassing problematic validation schema',
      'Added manual parameter handling for posts endpoint',
      'Reduced console noise by filtering out non-Xchangee extension messages',
      'Improved message handling to ignore irrelevant browser extension communications',
      'Fixed posts feed loading issues on dashboard',
      'Enhanced API error handling and debugging',
      'Cleaned up console output for better debugging experience',
      'Improved overall application stability and user experience'
    ],
    releaseDate: '2025-11-15T12:13:43.849Z'
  },
  '1.3.6': {
    releaseNotes: 'NOTIFICATION ERROR FIXES: Resolved Chrome notification icon issues • Clean notification system • No more errors',
    features: [
      'Fixed "Unable to download all specified images" notification errors',
      'Removed problematic iconUrl references from all notifications',
      'Cleaned up notification system to prevent Chrome extension errors',
      'Enhanced notification reliability without icon dependencies',
      'Fixed all notification calls to use only required properties',
      'Improved notification system stability',
      'Eliminated notification-related console errors',
      'Enhanced user experience with error-free notifications'
    ],
    releaseDate: '2025-11-15T18:00:00.000Z'
  },
  '1.3.5': {
    releaseNotes: 'COMMUNICATION FIXES: Enhanced heartbeat system • Fixed extension status detection • Improved logging',
    features: [
      'Enhanced extension heartbeat communication with better error handling',
      'Fixed extension status detection with proper authentication checking',
      'Added comprehensive logging for debugging communication issues',
      'Improved heartbeat frequency to 5 seconds for faster status updates',
      'Enhanced website message handling with authentication status',
      'Fixed extension authentication response handling',
      'Added better fallback mechanisms for failed communications',
      'Improved extension presence announcement system'
    ],
    releaseDate: '2025-11-15T17:45:00.000Z'
  },
  '1.3.4': {
    releaseNotes: 'DOWNLOAD & DETECTION FIXES: Always serve latest extension • Enhanced status detection • Real-time auth checking',
    features: [
      'Fixed extension download to always serve the latest version dynamically',
      'Enhanced extension status detection with real-time authentication checking',
      'Improved website-extension communication with auth status in responses',
      'Added cache-busting headers for always fresh downloads',
      'Enhanced extension check to differentiate between installed vs authenticated',
      'Improved heartbeat detection with authentication status',
      'Fixed version filename in downloads to show current version',
      'Better debugging and logging for extension status detection'
    ],
    releaseDate: '2025-11-15T17:30:00.000Z'
  },
  '1.3.3': {
    releaseNotes: 'NOTIFICATION FIXES: Fixed Chrome notification errors • Enhanced notification system • Better error handling',
    features: [
      'Fixed "Some of the required properties are missing" notification errors',
      'Added proper notification IDs and icon references',
      'Enhanced notification system with consistent formatting',
      'Added proper icon.png file for notifications',
      'Fixed all notification calls with proper type, iconUrl, title, and message',
      'Improved error handling for notification failures',
      'Better notification lifecycle management',
      'Enhanced notification appearance and reliability'
    ],
    releaseDate: '2025-11-15T17:15:00.000Z'
  },
  '1.3.2': {
    releaseNotes: 'AUTO-UPDATE SYSTEM: Seamless automatic updates every 10 seconds • No more manual downloads needed',
    features: [
      'Implemented fully automatic update system - no user intervention required',
      'Smart update detection every 10 seconds with immediate installation',
      'Beautiful update notifications with progress indicators',
      'Automatic extension restart after updates',
      'Preserved user authentication and settings during updates',
      'Enhanced error handling for failed updates with fallbacks',
      'Update success notifications with release notes',
      'Improved extension startup and initialization process'
    ],
    releaseDate: '2025-11-15T17:00:00.000Z'
  },
  '1.3.1': {
    releaseNotes: 'AUTHENTICATION FIX: Enhanced auth storage and website detection • Improved heartbeat communication',
    features: [
      'Fixed extension popup login issues with better auth storage',
      'Enhanced heartbeat messages with authentication status',
      'Improved website-extension communication for real-time detection',
      'Better auth data persistence across extension restarts',
      'Enhanced debugging and logging for troubleshooting',
      'Fixed status detection in website header',
      'Improved background script initialization'
    ],
    releaseDate: '2025-11-15T16:30:00.000Z'
  },
  '1.3.0': {
    releaseNotes: 'MAJOR FIX: Complete extension authentication overhaul • CORS fixes • Enhanced communication',
    features: [
      'Fixed all CORS headers for proper extension-webapp communication',
      'Added proper OPTIONS handler for preflight requests',
      'Enhanced extension auth flow with better message handling',
      'Added storeAuthData function for proper token storage',
      'Improved session handling with detailed logging',
      'Fixed favicon and manifest issues (404 errors resolved)',
      'Enhanced error handling with proper TypeScript types',
      'Added extension update mechanism and version tracking'
    ],
    releaseDate: '2025-11-15T15:45:00.000Z'
  },
  '1.2.0': {
    releaseNotes: 'HOTFIX: Extension connection issues resolved • TypeScript fixes • Enhanced MongoDB compatibility',
    features: [
      'Fixed extension token generation failures',
      'Resolved TypeScript build errors',
      'Enhanced ObjectId validation for MongoDB queries',
      'Improved user lookup with multiple fallback strategies',
      'Better error handling for authentication flow'
    ],
    releaseDate: '2025-11-15T10:18:42.406Z'
  },
  '1.1.0': {
    releaseNotes: 'Auto-update system • Website communication • Dashboard status indicator',
    features: [
      'Added automatic update system',
      'Real-time website communication',
      'Dashboard connection status indicator',
      'Enhanced security and performance'
    ],
    releaseDate: '2024-01-15T00:00:00.000Z'
  },
  '1.0.0': {
    releaseNotes: 'Initial release with core engagement features',
    features: [
      'Twitter auto-engagement (like, retweet, reply, follow)',
      'Credit earning system',
      'Smart rate limiting',
      'User settings and preferences'
    ],
    releaseDate: '2024-01-01T00:00:00.000Z'
  }
};

async function handleVersionCheck() {
  try {
    const manifestPath = path.join(process.cwd(), 'chrome-extension', 'manifest.json');
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);
    
    const version = manifest.version as string;
    const versionInfo = VERSION_HISTORY[version] || VERSION_HISTORY['1.3.7'];
    
    return NextResponse.json({
      version: manifest.version,
      updateUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/extension?action=download`,
      releaseNotes: versionInfo.releaseNotes,
      features: versionInfo.features,
      releaseDate: versionInfo.releaseDate,
      changelog: VERSION_HISTORY
    });
    
  } catch (error) {
    console.error('Version check error:', error);
    return NextResponse.json({ error: 'Failed to check version' }, { status: 500 });
  }
}

async function handleUpdateManifest() {
  try {
    const manifestPath = path.join(process.cwd(), 'chrome-extension', 'manifest.json');
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);
    
    const updateXml = `<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='${manifest.name.toLowerCase().replace(/\s+/g, '')}'>
    <updatecheck codebase='${process.env.NEXT_PUBLIC_APP_URL}/api/extension?action=crx' version='${manifest.version}' />
  </app>
</gupdate>`;

    return new Response(updateXml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Update manifest error:', error);
    return NextResponse.json({ error: 'Failed to generate update manifest' }, { status: 500 });
  }
}

async function handleCrxDownload() {
  // For now, return the zip file - in production you'd want to create a proper .crx file
  return handleDownload();
}
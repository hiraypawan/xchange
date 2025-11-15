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

async function handleVersionCheck() {
  try {
    const manifestPath = path.join(process.cwd(), 'chrome-extension', 'manifest.json');
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);
    
    return NextResponse.json({
      version: manifest.version,
      updateUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/extension?action=download`,
      releaseNotes: 'Latest features and bug fixes'
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
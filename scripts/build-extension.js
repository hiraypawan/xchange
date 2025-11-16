#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');

async function buildExtension() {
  console.log('🔧 Building Xchangee Extension...');
  
  try {
    const extensionPath = path.join(process.cwd(), 'chrome-extension');
    const outputPath = path.join(process.cwd(), 'public', 'downloads');
    
    // Ensure output directory exists
    await fs.mkdir(outputPath, { recursive: true });
    
    // Read manifest to get version
    const manifestPath = path.join(extensionPath, 'manifest.json');
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);
    
    const version = manifest.version;
    const zipFileName = `xchangee-extension-v${version}.zip`;
    const zipPath = path.join(outputPath, zipFileName);
    
    console.log(`📦 Creating ${zipFileName}...`);
    
    // Create ZIP archive
    const output = await fs.open(zipPath, 'w');
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    return new Promise((resolve, reject) => {
      archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
          console.warn('Warning:', err.message);
        } else {
          reject(err);
        }
      });
      
      archive.on('error', reject);
      
      archive.on('end', () => {
        console.log(`✅ Extension built successfully!`);
        console.log(`📁 Output: ${zipPath}`);
        console.log(`📊 Size: ${archive.pointer()} bytes`);
        resolve();
      });
      
      // Pipe archive data to the file
      archive.pipe(output.createWriteStream());
      
      // Add extension files
      archive.directory(extensionPath, false);
      
      // Finalize the archive
      archive.finalize();
    });
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Auto-update version info with current timestamp
async function updateVersionInfo() {
  try {
    const apiPath = path.join(process.cwd(), 'src', 'app', 'api', 'extension', 'route.ts');
    let content = await fs.readFile(apiPath, 'utf-8');
    
    // Update the release date to current time
    content = content.replace(
      /releaseDate: new Date\(\)\.toISOString\(\)/,
      `releaseDate: '${new Date().toISOString()}'`
    );
    
    await fs.writeFile(apiPath, content);
    console.log('📅 Updated release timestamp');
  } catch (error) {
    console.warn('⚠️ Could not update version info:', error.message);
  }
}

async function main() {
  // Auto-bump version before building
  const { bumpExtensionVersion } = require('./auto-version-bump.js');
  const newVersion = await bumpExtensionVersion();
  
  await updateVersionInfo();
  await buildExtension();
  
  console.log('\n🎉 Extension build complete!');
  console.log(`📦 New version: ${newVersion}`);
  console.log('💡 Users can now download the latest version from:');
  console.log('   • /api/extension?action=download');
  console.log('   • /extension/download');
  console.log('🔄 Extension will auto-update for users');
}

if (require.main === module) {
  main();
}

module.exports = { buildExtension, updateVersionInfo };
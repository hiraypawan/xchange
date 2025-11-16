#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

async function bumpExtensionVersion() {
  try {
    const manifestPath = path.join(process.cwd(), 'chrome-extension', 'manifest.json');
    
    // Read current manifest
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);
    
    // Parse current version
    const currentVersion = manifest.version;
    const versionParts = currentVersion.split('.').map(Number);
    
    // Bump patch version
    versionParts[2]++;
    
    const newVersion = versionParts.join('.');
    console.log(`🔄 Bumping extension version: ${currentVersion} → ${newVersion}`);
    
    // Update manifest
    manifest.version = newVersion;
    
    // Write back to file
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    
    console.log(`✅ Extension version updated to ${newVersion}`);
    return newVersion;
    
  } catch (error) {
    console.error('❌ Failed to bump version:', error.message);
    process.exit(1);
  }
}

// Auto-run if called directly
if (require.main === module) {
  bumpExtensionVersion();
}

module.exports = { bumpExtensionVersion };
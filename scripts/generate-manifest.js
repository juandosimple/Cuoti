import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const target = process.argv[2]; // 'darwin-aarch64', 'darwin-x86_64', 'windows-x86_64', etc.
const version = process.argv[3];
const baseUrl = `https://github.com/juandosimple/Cuoti/releases/download/v${version}`;

const paths = {
  'darwin': 'src-tauri/target/release/bundle/macos',
  'windows': 'src-tauri/target/release/bundle/nsis',
  'linux': 'src-tauri/target/release/bundle/appimage' // assuming appimage for linux
};

// Map platform inputs to Tauri bundle paths and extensions
const platformConfig = {
  'darwin-aarch64': {
    os: 'darwin',
    ext: '.app.tar.gz',
    sigExt: '.app.tar.gz.sig'
  },
  'darwin-x86_64': {
    os: 'darwin',
    ext: '.app.tar.gz',
    sigExt: '.app.tar.gz.sig'
  },
  'windows-x86_64': {
    os: 'windows',
    ext: '-setup.exe', // Standard NSIS output usually
    sigExt: '-setup.exe.sig'
  },
  'linux-x86_64': {
    os: 'linux',
    ext: '.AppImage',
    sigExt: '.AppImage.sig'
  }
};

const config = platformConfig[target];

if (!config) {
  console.error(`Unknown target: ${target}`);
  process.exit(1);
}

const bundleDir = paths[config.os];
if (!fs.existsSync(bundleDir)) {
  console.error(`Bundle directory not found: ${bundleDir}`);
  process.exit(1);
}

// Find files
const files = fs.readdirSync(bundleDir);
const sigFile = files.find(f => f.endsWith(config.sigExt));

if (!sigFile) {
  console.error(`Signature file not found in ${bundleDir} with extension ${config.sigExt}`);
  // List files for debugging
  console.log('Files found:', files);
  process.exit(1);
}

const binFile = sigFile.replace('.sig', '');

// Read signature
const signature = fs.readFileSync(path.join(bundleDir, sigFile), 'utf-8');

// Construct JSON
const manifest = {
  version: version,
  notes: `Update to version ${version}`,
  pub_date: new Date().toISOString(),
  platforms: {
    [target]: {
      signature: signature,
      url: `${baseUrl}/${binFile}`
    }
  }
};

const outputPath = `manifest-${target}.json`;
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
console.log(`Generated ${outputPath}`);

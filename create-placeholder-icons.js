// Simple script to create placeholder PNG icons
// Run with: node create-placeholder-icons.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Minimal 1x1 transparent PNG (base64)
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Minimal solid green PNG for different sizes
function createGreenPNG(size) {
  // This is a placeholder - for production, you'd want proper icon generation
  // For now, just copy the transparent PNG
  return TRANSPARENT_PNG;
}

const iconsDir = path.join(__dirname, 'public', 'icons');

// Ensure directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create placeholder icons
const sizes = [16, 48, 128];
sizes.forEach(size => {
  const filename = `icon${size}.png`;
  const filepath = path.join(iconsDir, filename);

  // Only create if doesn't exist
  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, createGreenPNG(size));
    console.log(`✓ Created ${filename}`);
  } else {
    console.log(`- ${filename} already exists`);
  }
});

console.log('\n✅ Placeholder icons created!');
console.log('ℹ️  Replace these with proper icons later using the icon.svg as reference');

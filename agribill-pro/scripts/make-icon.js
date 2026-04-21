// Generates installer/assets/icon.ico — a 256x256 green leaf icon for AgriBill Pro
// Run: node scripts/make-icon.js
// No dependencies required.

const fs = require('fs');
const path = require('path');

// We'll create a simple ICO with a 256x256 32-bit BMP (BGRA) inside
// ICO format: header + directory entry + image data

const SIZE = 256;
const PIXEL_COUNT = SIZE * SIZE;

// Color scheme: Deep Teal #1F6F5F background, white leaf shape
function toRGBA(r, g, b, a) { return [b, g, r, a]; } // ICO uses BGRA

function lerp(a, b, t) { return a + (b - a) * t; }

// Draw a filled circle test
function isLeaf(x, y) {
  // Normalize to [-1, 1]
  const nx = (x / SIZE) * 2 - 1;
  const ny = (y / SIZE) * 2 - 1;

  // Background circle
  const r = Math.sqrt(nx * nx + ny * ny);
  if (r > 0.95) return 'transparent';

  // Leaf shape: teardrop pointing up-right
  // Rotate 45 degrees
  const angle = Math.PI / 4;
  const rx = nx * Math.cos(angle) - ny * Math.sin(angle);
  const ry = nx * Math.sin(angle) + ny * Math.cos(angle);

  // Leaf body: ellipse
  const leafX = rx - 0.1;
  const leafY = ry - 0.1;
  const inLeaf = (leafX * leafX) / (0.55 * 0.55) + (leafY * leafY) / (0.72 * 0.72) < 1;

  // Stem: thin vertical line at bottom-left
  const inStem = Math.abs(rx + 0.3) < 0.07 && ry > -0.1 && ry < 0.55;

  if (inLeaf) return 'leaf';
  if (inStem) return 'stem';
  return 'bg';
}

const pixelData = Buffer.alloc(PIXEL_COUNT * 4);

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const idx = (y * SIZE + x) * 4;
    const part = isLeaf(x, y);

    let pixel;
    if (part === 'transparent') {
      // Outer: deep teal circle edge — anti-alias by making transparent
      pixel = [0, 0, 0, 0];
    } else if (part === 'leaf') {
      // Light green leaf
      pixel = toRGBA(52, 211, 153, 255); // emerald-400
    } else if (part === 'stem') {
      // Slightly darker stem
      pixel = toRGBA(16, 185, 129, 255); // emerald-500
    } else {
      // Deep teal background #1F6F5F
      pixel = toRGBA(31, 111, 95, 255);
    }

    pixelData[idx + 0] = pixel[0]; // B
    pixelData[idx + 1] = pixel[1]; // G
    pixelData[idx + 2] = pixel[2]; // R
    pixelData[idx + 3] = pixel[3]; // A
  }
}

// Build ICO file manually
// ICO Header: 6 bytes
// Directory entry: 16 bytes
// BITMAPINFOHEADER: 40 bytes
// Pixel data: SIZE*SIZE*4 bytes
// AND mask: SIZE*(SIZE/8) bytes

const bmpHeaderSize = 40;
const pixelDataSize = PIXEL_COUNT * 4;
const andMaskSize = SIZE * Math.ceil(SIZE / 8); // 1 bit per pixel, padded to 4 bytes per row
const imageDataSize = bmpHeaderSize + pixelDataSize + andMaskSize;

const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0);       // Reserved
icoHeader.writeUInt16LE(1, 2);       // Type: 1 = ICO
icoHeader.writeUInt16LE(1, 4);       // Number of images

const dirEntry = Buffer.alloc(16);
dirEntry.writeUInt8(0, 0);           // Width: 0 = 256
dirEntry.writeUInt8(0, 1);           // Height: 0 = 256
dirEntry.writeUInt8(0, 2);           // ColorCount (0 for >256 colors)
dirEntry.writeUInt8(0, 3);           // Reserved
dirEntry.writeUInt16LE(1, 4);        // Planes
dirEntry.writeUInt16LE(32, 6);       // BitCount
dirEntry.writeUInt32LE(imageDataSize, 8); // SizeInBytes
dirEntry.writeUInt32LE(6 + 16, 12);  // ImageOffset (after header + directory)

// BITMAPINFOHEADER
const bmpHeader = Buffer.alloc(bmpHeaderSize);
bmpHeader.writeUInt32LE(bmpHeaderSize, 0); // biSize
bmpHeader.writeInt32LE(SIZE, 4);            // biWidth
bmpHeader.writeInt32LE(SIZE * 2, 8);        // biHeight (doubled for ICO)
bmpHeader.writeUInt16LE(1, 12);             // biPlanes
bmpHeader.writeUInt16LE(32, 14);            // biBitCount
bmpHeader.writeUInt32LE(0, 16);             // biCompression (BI_RGB)
bmpHeader.writeUInt32LE(pixelDataSize, 20); // biSizeImage
bmpHeader.writeInt32LE(0, 24);              // biXPelsPerMeter
bmpHeader.writeInt32LE(0, 28);              // biYPelsPerMeter
bmpHeader.writeUInt32LE(0, 32);             // biClrUsed
bmpHeader.writeUInt32LE(0, 36);             // biClrImportant

// Flip pixel data vertically (BMP is bottom-up)
const flippedPixels = Buffer.alloc(pixelDataSize);
for (let y = 0; y < SIZE; y++) {
  const srcRow = (SIZE - 1 - y) * SIZE * 4;
  const dstRow = y * SIZE * 4;
  pixelData.copy(flippedPixels, dstRow, srcRow, srcRow + SIZE * 4);
}

// AND mask: all zeros (fully opaque, using alpha channel)
const andMask = Buffer.alloc(andMaskSize, 0);

const icoBuffer = Buffer.concat([icoHeader, dirEntry, bmpHeader, flippedPixels, andMask]);

const outPath = path.join(__dirname, '../installer/assets/icon.ico');
fs.writeFileSync(outPath, icoBuffer);
console.log(`Icon written: ${outPath} (${icoBuffer.length} bytes)`);

import fs from "fs";
import path from "path";
import zlib from "zlib";

function createPNG(width, height) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // color type RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const ihdrChunk = createChunk("IHDR", ihdr);

  // Generate pixels (InIsai purple/teal gradient with music note silhouette)
  const rowBytes = width * 4;
  const rawData = Buffer.alloc((rowBytes + 1) * height);

  let offset = 0;
  const cx = width / 2;
  const cy = height / 2;
  const r = width * 0.45;

  for (let y = 0; y < height; y++) {
    rawData.writeUInt8(0, offset++); // No filter
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background gradient: #08090d with vibrant center glow
      const t = y / height;
      let red = Math.round(139 * (1 - t) + 6 * t);
      let green = Math.round(92 * (1 - t) + 182 * t);
      let blue = Math.round(246 * (1 - t) + 212 * t);
      let alpha = 255;

      // Note circle boundary
      if (dist < r) {
        // Musical note interior
        const inNote =
          (Math.abs(x - cx + width * 0.08) < width * 0.06 && y > cy - height * 0.25 && y < cy + height * 0.15) ||
          (Math.sqrt((x - cx + width * 0.08) ** 2 + (y - cy - height * 0.15) ** 2) < width * 0.14) ||
          (x >= cx - width * 0.08 && x <= cx + width * 0.2 && y >= cy - height * 0.28 && y <= cy - height * 0.16);

        if (inNote) {
          red = 255;
          green = 255;
          blue = 255;
        }
      } else {
        red = 8;
        green = 9;
        blue = 13;
      }

      rawData.writeUInt8(red, offset++);
      rawData.writeUInt8(green, offset++);
      rawData.writeUInt8(blue, offset++);
      rawData.writeUInt8(alpha, offset++);
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk("IDAT", compressedData);
  const iendChunk = createChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc >>> 0, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// CRC32 implementation
function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    let byte = buf[i];
    for (let j = 0; j < 8; j++) {
      const bit = (crc ^ byte) & 1;
      crc >>>= 1;
      if (bit) crc ^= 0xedb88320;
      byte >>>= 1;
    }
  }
  return (crc ^ -1) >>> 0;
}

const iconsDir = path.resolve("public/icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, "icon-192.png"), createPNG(192, 192));
fs.writeFileSync(path.join(iconsDir, "icon-512.png"), createPNG(512, 512));
fs.writeFileSync(path.join(iconsDir, "icon-maskable.png"), createPNG(512, 512));

console.log("Successfully generated InIsai PWA icons (192, 512, maskable)!");

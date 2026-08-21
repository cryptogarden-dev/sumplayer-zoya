// Menghasilkan ikon PWA sementara yang jelas (poin 20 permintaan Tahap 1):
// kotak solid berwarna brand dengan tanda "+" (melambangkan
// supplier/kemasan) dan bingkai kotak di dalamnya. Ditulis sebagai PNG
// mentah (tanpa dependensi library gambar) memakai zlib bawaan Node.
// GANTI dengan ikon/branding asli sebelum rilis produksi.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, "..", "public", "icons");
mkdirSync(outputDir, { recursive: true });

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function drawPixel(x, y, size) {
  const bg = [79, 70, 229, 255]; // indigo-600
  const fg = [255, 255, 255, 255];
  const margin = size * 0.2;
  const inLeft = margin;
  const inRight = size - margin;
  const inTop = margin;
  const inBottom = size - margin;
  const borderThickness = size * 0.045;
  const crossThickness = size * 0.05;
  const cx = size / 2;
  const cy = size / 2;

  const inFrame = x >= inLeft && x <= inRight && y >= inTop && y <= inBottom;
  const onBorder =
    inFrame &&
    (x <= inLeft + borderThickness ||
      x >= inRight - borderThickness ||
      y <= inTop + borderThickness ||
      y >= inBottom - borderThickness);
  const onCrossV = Math.abs(x - cx) <= crossThickness && y >= inTop && y <= inBottom;
  const onCrossH = Math.abs(y - cy) <= crossThickness && x >= inLeft && x <= inRight;

  return onBorder || onCrossV || onCrossH ? fg : bg;
}

function makePng(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  let offset = 0;
  for (let y = 0; y < size; y += 1) {
    raw[offset] = 0; // filter type: none
    offset += 1;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = drawPixel(x, y, size);
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = a;
      offset += 4;
    }
  }

  const idatData = deflateSync(raw, { level: 9 });
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: truecolor + alpha
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idatData),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  const png = makePng(size);
  const filePath = path.join(outputDir, `icon-${size}.png`);
  writeFileSync(filePath, png);
  console.log(`Wrote ${filePath} (${png.length} bytes)`);
}

const maskablePath = path.join(outputDir, "icon-maskable-512.png");
writeFileSync(maskablePath, makePng(512));
console.log(`Wrote ${maskablePath}`);

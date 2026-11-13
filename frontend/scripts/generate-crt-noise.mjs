// Run with node scripts/generate-crt-noise.mjs. Generates a repeatable, tiny
// monochrome texture once; CSS moves the bitmap instead of computing noise per frame.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
const size = 128;
let seed = 9182;
const pixels = Buffer.alloc((size + 1) * size);
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    // Bake the former CSS contrast(1.7) brightness(1.6) into the grayscale tile.
    // The animated screens can reuse it directly instead of filtering every frame.
    const noise = 25 + (seed % 210);
    pixels[y * (size + 1) + x + 1] = Math.round(
      Math.max(0, Math.min(255, ((noise / 255 - 0.5) * 1.7 + 0.5) * 1.6 * 255)),
    );
  }
}
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of body) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  const length = Buffer.alloc(4),
    checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, body, checksum]);
}
const header = Buffer.alloc(13);
header.writeUInt32BE(size, 0);
header.writeUInt32BE(size, 4);
header[8] = 8;
writeFileSync(
  new URL('../src/assets/crt-noise.png', import.meta.url),
  Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]),
);

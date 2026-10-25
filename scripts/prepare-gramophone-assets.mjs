// Shrinks the CC0 Poly Haven files used by the 3D gramophone into public/gramophone/:
//   artist_workshop_1k.hdr  -> studio.hdr          (Artist Workshop HDRI, 256 x 128, flat RGBE)
//   dark_wood_diff_1k.jpg   -> wood-color.jpg      (Dark Wood, 512 px)
//   dark_wood_rough_1k.jpg  -> wood-roughness.jpg  (Dark Wood, 256 px)
// Download the originals from polyhaven.com/a/artist_workshop and polyhaven.com/a/dark_wood,
// copy this file next to them, run `npm i sharp` there, then:
//   node prepare-gramophone-assets.mjs <folder with the originals> <repo>/public/gramophone
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const [inDir = '.', outDir = './gramophone'] = process.argv.slice(2);
await mkdir(outDir, { recursive: true });

// Radiance .hdr: text header, blank line, resolution line, then RLE-encoded RGBE scanlines.
function readHdr(buffer) {
  let offset = 0;
  const line = () => {
    const end = buffer.indexOf(0x0a, offset);
    const text = buffer.toString('ascii', offset, end);
    offset = end + 1;
    return text;
  };
  while (line() !== '');
  const [, height, , width] = line().split(' ').map((part) => (Number.isNaN(Number(part)) ? part : Number(part)));
  const pixels = new Float32Array(width * height * 3);
  const scan = new Uint8Array(width * 4);
  for (let y = 0; y < height; y += 1) {
    if (buffer[offset] !== 2 || buffer[offset + 1] !== 2) throw new Error('Only new-style RLE .hdr files are supported');
    offset += 4;
    for (let channel = 0; channel < 4; channel += 1) {
      let x = 0;
      while (x < width) {
        let count = buffer[offset++];
        if (count > 128) {
          count -= 128;
          const value = buffer[offset++];
          for (let i = 0; i < count; i += 1) scan[(x++) * 4 + channel] = value;
        } else {
          for (let i = 0; i < count; i += 1) scan[(x++) * 4 + channel] = buffer[offset++];
        }
      }
    }
    for (let x = 0; x < width; x += 1) {
      const e = scan[x * 4 + 3];
      const scale = e === 0 ? 0 : 2 ** (e - 136);
      for (let c = 0; c < 3; c += 1) pixels[(y * width + x) * 3 + c] = scan[x * 4 + c] * scale;
    }
  }
  return { width, height, pixels };
}

function downsample({ width, height, pixels }, factor) {
  const w = width / factor;
  const h = height / factor;
  const out = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      for (let c = 0; c < 3; c += 1) {
        let sum = 0;
        for (let dy = 0; dy < factor; dy += 1) {
          for (let dx = 0; dx < factor; dx += 1) sum += pixels[((y * factor + dy) * width + x * factor + dx) * 3 + c];
        }
        out[(y * w + x) * 3 + c] = sum / (factor * factor);
      }
    }
  }
  return { width: w, height: h, pixels: out };
}

// Flat (uncompressed) RGBE, which three's HDRLoader reads directly.
function writeHdr({ width, height, pixels }) {
  const header = Buffer.from(`#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${height} +X ${width}\n`, 'ascii');
  const body = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const [r, g, b] = [pixels[i * 3], pixels[i * 3 + 1], pixels[i * 3 + 2]];
    const max = Math.max(r, g, b);
    if (max < 1e-32) continue;
    const exponent = Math.ceil(Math.log2(max));
    const scale = 256 / 2 ** exponent;
    body[i * 4] = Math.min(255, Math.floor(r * scale));
    body[i * 4 + 1] = Math.min(255, Math.floor(g * scale));
    body[i * 4 + 2] = Math.min(255, Math.floor(b * scale));
    body[i * 4 + 3] = exponent + 128;
  }
  return Buffer.concat([header, body]);
}

const hdr = readHdr(await readFile(`${inDir}/artist_workshop_1k.hdr`));
await writeFile(`${outDir}/studio.hdr`, writeHdr(downsample(hdr, 4)));
await sharp(`${inDir}/dark_wood_diff_1k.jpg`).resize(512, 512).jpeg({ quality: 82 }).toFile(`${outDir}/wood-color.jpg`);
await sharp(`${inDir}/dark_wood_rough_1k.jpg`).resize(256, 256).greyscale().jpeg({ quality: 80 }).toFile(`${outDir}/wood-roughness.jpg`);
console.log(`studio.hdr from ${hdr.width}x${hdr.height}; wood maps resized; written to ${outDir}`);

// Regenerates public/scene-depth.jpg if the garden painting ever changes.
// Depth Anything V2 Small (Apache-2.0) via transformers.js. It is not a site dependency:
// copy this file into a scratch folder, run `npm i @huggingface/transformers@3 sharp` there, then
//   node generate-depth-map.mjs <repo>/public/scene-optimized.jpg <repo>/public
// The model (~100 MB) downloads from Hugging Face on first run.
import { pipeline, RawImage } from '@huggingface/transformers';
import sharp from 'sharp';

const [input, outDir = '.'] = process.argv.slice(2);
const estimator = await pipeline('depth-estimation', 'onnx-community/depth-anything-v2-small', { dtype: 'fp32' });

const meta = await sharp(input).metadata();
const image = await RawImage.read(input);
const t0 = Date.now();
const { depth } = await estimator(image);
console.log(`depth ${depth.width}x${depth.height} in ${Date.now() - t0}ms from ${meta.width}x${meta.height}`);

const raw = Buffer.from(depth.data);
const base = sharp(raw, { raw: { width: depth.width, height: depth.height, channels: 1 } });
// Web asset: half resolution of the painting, lightly blurred so parallax does not tear at edges.
await base.clone()
  .resize(960, 540, { fit: 'fill', kernel: 'lanczos3' })
  .blur(1.6)
  .jpeg({ quality: 88, chromaSubsampling: '4:4:4' })
  .toFile(`${outDir}/scene-depth.jpg`);
console.log('wrote', `${outDir}/scene-depth.jpg`);

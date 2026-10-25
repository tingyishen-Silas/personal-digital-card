# Personal Digital Card

Personal digital card website.

## Development

- `npm run dev`: local preview.
- `npm test`: asset, photo order, navigation, clipboard, scene panning and lock-screen metadata regression tests.
- `npm run build`: production build.

## Content

Edit `src/data/siteContent.js` for the profile, topics, contacts and memories.
Topics can include an optional ISO `date`; do not use a publication date until it is known.
Memory posts with `draft: true` stay hidden. Gallery order follows the `gallery` array.
Keep local assets inside `public` and use `assetPath` for GitHub Pages paths.

Album links use `#/castle/<post-id>/<photo-number>` and support browser Back.
The Pages workflow builds and runs the regression tests before publishing.

## Living painting

Once the garden painting is coloured, `src/livingPainting.js` renders it in a single WebGL pass:
depth parallax that follows the cursor (a slow drift on phones), impasto and linen relief under a
warm studio lamp, and a spotlight on the hovered object. With reduced motion the parallax, drift and
dust are off; without WebGL the plain painting stays.

Assets:

- `public/scene-depth.jpg`: depth map of the painting estimated with
  [Depth Anything V2 Small](https://huggingface.co/depth-anything/Depth-Anything-V2-Small) (Apache-2.0).
  Regenerate with `scripts/generate-depth-map.mjs` if the painting changes.
- `public/canvas-linen-normal.jpg`: [Rough Linen](https://polyhaven.com/a/rough_linen) normal map by
  colormass and Rico Cilliers, Poly Haven (CC0), resized to 512 px.

## 3D views

- **Paper diorama** (`转动看看` button after colouring): the same depth map pushes the painting back into
  four flat terraces, like cards in a paper theatre. Drag or use the arrow keys to turn it; objects stay
  clickable on their card; Esc folds it back into the painting. Code: `src/diorama.js`,
  `src/components/DioramaView`.
- **Gramophone** (record player window): a gramophone modelled in code with three.js (MIT). The record
  spins with the music, the cover is its label, and the tone arm tracks inward as the song plays. Drag
  to turn it; click the record to play or pause. Code: `src/gramophone.js`,
  `src/components/GramophoneScene`. Both load three.js only when opened and keep the 2D version without
  WebGL 2.

Assets in `public/gramophone/` (prepared by `scripts/prepare-gramophone-assets.mjs`):

- `studio.hdr`: [Artist Workshop](https://polyhaven.com/a/artist_workshop) HDRI by Oliksiy Yakovlyev,
  Poly Haven (CC0), downsampled to 256 x 128 for lighting.
- `wood-color.jpg`, `wood-roughness.jpg`: [Dark Wood](https://polyhaven.com/a/dark_wood) by Dimitrios
  Savva, Dario Barresi and Rico Cilliers, Poly Haven (CC0), resized.

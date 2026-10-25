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

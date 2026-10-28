# Aurora Atlas

An everyday clothing concept store built with HTML, CSS, vanilla JavaScript, and the existing local Three.js library. The original space aesthetic now carries through a collection of jackets, tees, knits, trousers, a dress, and everyday carry goods.

## Preview

From this directory, run:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Open http://localhost:4173. No install or build step is required. The page also opens directly from `index.html`; a local server is recommended for consistent browser storage behavior.

## Included

- A homepage with the draggable 3D jacket and links into the store.
- A dedicated `shop.html` collection page with categories, search, sorting, and shareable filter URLs.
- Dedicated product URLs such as `product.html?id=boreal&color=obsidian`, with photo galleries, close-up crops, fullscreen zoom, color and size selection, quantity selection, fit information, and care details.
- Twenty sample products across outerwear, essentials, bottoms, and accessories, with 43 real reference photographs covering every selectable color.
- A shared shopping bag with quantities, removal, totals, product links, and storage that persists between pages.
- Responsive desktop and mobile layouts, keyboard-accessible dialogs, reduced-motion support, and a homepage illustration fallback for devices without WebGL. Shopping pages do not load Three.js.
- Care and shipping information and a local newsletter interest form.

This is a front-end concept. Payments, order fulfillment, customer support, and email delivery need backend services before launch. The checkout and newsletter interfaces explain their current status; no orders or subscriptions are sent. Prices, product specifications, and store policies are concept content.

The homepage 3D illustration is generated locally with Three.js geometry and canvas fabric texture. Collection, product, and bag images are real product photographs stored in `assets/photos/`. Google Fonts supplies Barlow Condensed and DM Sans; system fonts are used if unavailable.

## Product photography

The current photographs are UNIQLO product reference images used for this concept, not photographs of Aurora Atlas inventory. Original source URLs and credits are recorded in `assets/photos/sources.json`; product pages identify the images as reference photography. The image rights remain with their respective owners. Replace these with your own approved inventory photography before a commercial launch.

Each photographed color has its own local image. Gallery detail views are clearly labeled crops of that color's original photograph, not invented rear or alternate-angle photographs. The Terrain product is a bomber jacket to match its actual reference photo.

`catalog.js` is the single source for product names, prices, colors, descriptions, and photo paths. `main.js` provides the shared shopping behavior; `scene.js` runs only on the homepage. The static pages use relative URLs and work on ordinary static hosting without rewrite rules.

## Extending the collection

Add product information to `catalog.js`, including a unique ID, category, price, sizes, fit notes, and colors. Each listed color needs its own matching `assets/photos/<id>-<color>-front.jpg` image. Add the original image URL to the photo downloader and source manifest. Category totals and shopping results update from the catalog automatically.

The homepage features four pieces; selecting a category previews up to four matches, with a link to the full filtered shop. Product pages show up to three related pieces. Add a new category to the filters and shared navigation in `index.html`, `shop.html`, and `main.js` when needed.

To restore missing reference photos, run `node scripts/download-photos.mjs`. Valid local files are reused. Pass a product ID, such as `node scripts/download-photos.mjs cloud`, to download only that product, or add `--refresh` to replace cached photos. The complete source manifest is written only after all catalog photos are present.

## Browser verification

With the preview server running, execute:

```powershell
node scripts/verify.mjs
```

Requires Node.js 22+ and Google Chrome at the standard Windows installation path. The script opens an isolated headless browser and checks actual page navigation, all product photos, gallery and zoom controls, color URLs, size validation, bag persistence between pages, quantities, filters, search, sorting, mobile interactions, narrow layouts, and the no-WebGL fallback. Screenshots are saved under `screenshots/`.

For DOM and asset checks without Chrome, install the optional `happy-dom` development package and run `node scripts/verify-pages.mjs`. You can also provide an existing `happy-dom/lib/index.js` path as the first argument, so installing packages in this project is unnecessary. These checks validate interactions and JPEG assets; they do not replace visual browser verification.

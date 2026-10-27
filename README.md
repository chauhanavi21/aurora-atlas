# Aurora Atlas

A technical outerwear concept store built with HTML, CSS, vanilla JavaScript, and the existing local Three.js library. The original space aesthetic now carries through a collection of jackets, layers, and everyday carry goods.

## Preview

From this directory, run:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Open http://localhost:4173. No install or build step is required. The page also opens directly from `index.html`; a local server is recommended for consistent browser storage behavior.

## Included

- Procedural 3D equipment with a draggable hero jacket and three colorways.
- Product collection, category filters, and search.
- Product details, color and size selection, and size guide.
- Shopping bag with quantities, removal, totals, and local storage persistence.
- Responsive desktop and mobile layouts, keyboard-accessible dialogs, reduced-motion support, and vector product fallbacks for devices without WebGL.
- Care and shipping information and a local newsletter interest form.

This is a front-end concept. Payments, order fulfillment, customer support, and email delivery need backend services before launch. The checkout and newsletter interfaces explain their current status; no orders or subscriptions are sent. Prices, product specifications, and store policies are concept content.

Product art is generated locally with Three.js geometry and canvas fabric texture. Google Fonts supplies Barlow Condensed and DM Sans; system fonts are used if unavailable.

## Browser verification

With the preview server running, execute:

```powershell
node scripts/verify.mjs
```

Requires Node.js 22+ and Google Chrome at the standard Windows installation path. The script opens an isolated headless browser and checks product options, size validation, bag persistence, quantities, filters, search, mobile interactions, narrow layouts, and the no-WebGL fallback. Screenshots are saved under `screenshots/`.

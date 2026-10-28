/* Shared product information for the home, shop, and product pages. */
(() => {
  const colors = {
    glacier: { name: 'Glacier', hex: '#dedbca' },
    obsidian: { name: 'Obsidian', hex: '#303330' },
    moss: { name: 'Moss', hex: '#696b46' },
    teal: { name: 'Deep teal', hex: '#345b66' },
    chalk: { name: 'Chalk', hex: '#ded6bd' },
    navy: { name: 'Midnight navy', hex: '#252f43' },
    mist: { name: 'Mist grey', hex: '#9a9b9d' }
  };
  const clothingSizes = ['XS', 'S', 'M', 'L', 'XL'];
  const products = [
    {
      id: 'boreal', name: 'Boreal Puffer', type: 'Insulated everyday outerwear', category: 'outerwear', price: 245,
      badge: 'THE SIGNATURE', colors: ['glacier', 'obsidian', 'teal'], sizes: clothingSizes,
      description: 'Cold starts. Long walks. One more hour outside. A softly quilted puffer with a protective stand collar and an easy, everyday silhouette. Your invitation to take the scenic route.',
      features: ['Quilted construction', 'Protective stand collar', 'Easy everyday layering'],
      details: 'Horizontal quilting, a high stand collar, concealed front closure, and practical side pockets. An understated outer layer with room for your favorite knit underneath.',
      fit: 'A relaxed, unisex silhouette. Choose your usual size for everyday layering, or size up for a more generous fit.',
      care: 'Wash cold on a gentle cycle. Follow the garment care label for drying and fill-specific instructions. Do not bleach.',
      gallery: ['Full view', 'Collar detail', 'Quilting detail']
    },
    {
      id: 'drift', name: 'Drift Fleece', type: 'Your go-everywhere midlayer', category: 'essentials', price: 115,
      badge: 'NEW TERRITORY', colors: ['moss', 'chalk', 'obsidian'], sizes: clothingSizes,
      description: 'The layer you reach for, without thinking. A soft, textured fleece with a high collar, a full zip, and an unhurried fit. From the first coffee to the last light.',
      features: ['Soft textured fleece', 'Full-length zip', 'Comfortable stand collar'],
      details: 'Plush fleece texture, a full-length front zipper, a comfortable stand collar, and side pockets. Made for wearing on its own or beneath your outer layer.',
      fit: 'A comfortable, relaxed silhouette with room to move. Choose your usual size. All sizes follow our unisex body-measurement guide.',
      care: 'Wash inside out at 30°C with similar colors. Air dry and avoid fabric softener to preserve the fleece texture.',
      gallery: ['Full view', 'Collar detail', 'Fleece texture']
    },
    {
      id: 'terrain', name: 'Terrain Bomber', type: 'A classic, reconsidered', category: 'outerwear', price: 165,
      badge: '', colors: ['obsidian', 'moss'], sizes: clothingSizes,
      description: 'A familiar shape. A fresh perspective. A clean bomber with a softly structured shell, ribbed edges, and just the right amount of utility. Ready when the day changes direction.',
      features: ['Ribbed collar & cuffs', 'Utility sleeve pocket', 'Everyday zip closure'],
      details: 'Classic bomber construction with a ribbed collar, cuffs and hem, a full front zip, angled front pockets, and a zipped utility pocket on the sleeve.',
      fit: 'A regular-to-relaxed fit that sits at the hip. Choose your usual size for a clean silhouette or size up to layer over heavier knits.',
      care: 'Fasten all zips before washing. Use a cold, gentle cycle and mild detergent. Follow the original garment care label.',
      gallery: ['Full view', 'Collar detail', 'Shell detail']
    },
    {
      id: 'transit', name: 'Transit Crossbody', type: 'Carry less. Go further.', category: 'accessories', price: 65,
      badge: 'EVERYDAY ESSENTIAL', colors: ['moss', 'obsidian', 'chalk'], sizes: ['ONE SIZE'],
      description: 'Your essentials. Within reach. A softly shaped crossbody with an adjustable strap, an easy-access zip, and a light footprint. For the everyday and the unexpected.',
      features: ['Adjustable woven strap', 'Secure zip closure', 'Comfortable curved shape'],
      details: 'A compact crescent-shaped bag with a zip-top opening and adjustable woven strap. Wear it across the body or shorten the strap for a shoulder fit.',
      fit: 'One size with an adjustable strap. Room for your phone, wallet, keys, and the small things that make a day.',
      care: 'Spot clean with a damp cloth and mild soap. Air dry away from direct heat. Do not machine dry.',
      gallery: ['Full view', 'Strap detail', 'Fabric detail']
    }
  ];
  const catalog = Object.fromEntries(products.map((product) => [product.id, product]));
  const photo = (product, color = product.colors[0]) => `assets/photos/${product.id}-${color}-front.jpg`;
  const productUrl = (product, color = product.colors[0]) => `product.html?id=${product.id}&color=${color}`;
  window.AuroraCatalog = { products, catalog, colors, photo, productUrl };
})();

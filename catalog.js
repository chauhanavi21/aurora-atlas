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
    },
    {
      "id": "core",
      "name": "Core Crew Tee",
      "type": "The starting point for every day",
      "price": 32,
      "colors": [
        "obsidian",
        "navy"
      ],
      "description": "A clean crew neck and an easy silhouette. The simple tee that starts a good everyday uniform, worn on its own or beneath your favorite layer.",
      "features": [
        "Classic crew neck",
        "Short sleeves",
        "Straight hem"
      ],
      "details": "A short-sleeved tee with a narrow crew neckline, clean seams, and a straight hem.",
      "fit": "A regular fit. Choose your usual size, or size up for a looser silhouette.",
      "category": "essentials",
      "badge": "",
      "sizes": [
        "XS",
        "S",
        "M",
        "L",
        "XL"
      ],
      "care": "Follow the original garment care label. Wash with similar colors, reshape gently, and dry away from direct heat.",
      "gallery": [
        "Full view",
        "Upper detail",
        "Fabric detail"
      ]
    },
    {
      "id": "motion",
      "name": "Motion Tee",
      "type": "An easy layer for changing plans",
      "price": 38,
      "colors": [
        "navy",
        "obsidian"
      ],
      "description": "For early starts and open afternoons. A pared-back crew tee with a clean neckline and an uncomplicated shape that works with denim, trousers, or a light jacket.",
      "features": [
        "Clean crew neckline",
        "Easy short sleeves",
        "Minimal finish"
      ],
      "details": "A simple short-sleeved crew tee with a neat neckline and a straight body. No extra details to get in the way.",
      "fit": "A regular silhouette with a neat shoulder. Use the chest measurement in the size guide.",
      "category": "essentials",
      "badge": "",
      "sizes": [
        "XS",
        "S",
        "M",
        "L",
        "XL"
      ],
      "care": "Follow the original garment care label. Wash with similar colors, reshape gently, and dry away from direct heat.",
      "gallery": [
        "Full view",
        "Upper detail",
        "Fabric detail"
      ]
    },
    {
      "id": "range",
      "name": "Range Oversized Tee",
      "type": "A little more room to roam",
      "price": 42,
      "colors": [
        "mist",
        "obsidian",
        "navy"
      ],
      "badge": "ROOM TO MOVE",
      "description": "Take a little space. A generous tee with a dropped shoulder and a longer sleeve, made for slow mornings and unhurried plans.",
      "features": [
        "Dropped shoulder",
        "Roomy body",
        "Longer short sleeves"
      ],
      "details": "An oversized crew-neck tee with a boxy body, dropped shoulders, and wide short sleeves. Some reference photos show the fit on a model.",
      "fit": "An oversized fit by design. Choose your usual size for the intended shape, or size down for less volume.",
      "category": "essentials",
      "sizes": [
        "XS",
        "S",
        "M",
        "L",
        "XL"
      ],
      "care": "Follow the original garment care label. Wash with similar colors, reshape gently, and dry away from direct heat.",
      "gallery": [
        "Full view",
        "Upper detail",
        "Fabric detail"
      ]
    },
    {
      "id": "studio",
      "name": "Studio Box Tee",
      "type": "Clean lines. Everyday ease.",
      "price": 45,
      "colors": [
        "obsidian",
        "navy"
      ],
      "description": "A new angle on the everyday tee. A boxy outline, a neat crew neck, and a quiet palette for days that move between work and whatever comes next.",
      "features": [
        "Boxy silhouette",
        "Ribbed crew neck",
        "Wide short sleeves"
      ],
      "details": "A structured-looking crew tee with a straight body and wide short sleeves. Keep it simple with tailored trousers or easy everyday pants.",
      "fit": "A boxy, relaxed fit. Check the chest guide and choose your usual size for a roomy silhouette.",
      "category": "essentials",
      "badge": "",
      "sizes": [
        "XS",
        "S",
        "M",
        "L",
        "XL"
      ],
      "care": "Follow the original garment care label. Wash with similar colors, reshape gently, and dry away from direct heat.",
      "gallery": [
        "Full view",
        "Upper detail",
        "Fabric detail"
      ]
    },
    {
      "id": "cloud",
      "name": "Cloud Crew Sweat",
      "type": "Off-duty comfort, on repeat",
      "price": 78,
      "colors": [
        "chalk",
        "obsidian"
      ],
      "badge": "SLOW MORNING FAVORITE",
      "description": "For the slower side of the week. A relaxed sweatshirt with a round neck, easy sleeves, and a softly gathered hem. Good company for coffee and a long way home.",
      "features": [
        "Round neckline",
        "Relaxed sleeves",
        "Gathered hem"
      ],
      "details": "A relaxed crew sweatshirt with long sleeves and ribbed edges. A slightly shortened body gives the silhouette its easy shape.",
      "fit": "A relaxed fit with a slightly cropped hem. Choose your usual size; size up if you prefer extra length.",
      "category": "essentials",
      "sizes": [
        "XS",
        "S",
        "M",
        "L",
        "XL"
      ],
      "care": "Follow the original garment care label. Wash with similar colors, reshape gently, and dry away from direct heat.",
      "gallery": [
        "Full view",
        "Upper detail",
        "Fabric detail"
      ]
    },
    {
      "id": "contour",
      "name": "Contour V-Neck Knit",
      "type": "A softer approach to getting dressed",
      "price": 95,
      "colors": [
        "obsidian"
      ],
      "description": "A familiar knit with a little more shape. A V neckline and relaxed shoulders make it an easy layer over a tee or a crisp shirt.",
      "features": [
        "V neckline",
        "Relaxed shoulders",
        "Ribbed edges"
      ],
      "details": "A long-sleeved knit with a V-shaped neckline, ribbed cuffs, and a ribbed hem. The dark finish keeps it easy to wear across the week.",
      "fit": "A relaxed knit silhouette. Use your chest measurement and leave room for an underlayer.",
      "category": "essentials",
      "badge": "",
      "sizes": [
        "XS",
        "S",
        "M",
        "L",
        "XL"
      ],
      "care": "Follow the original garment care label. Wash with similar colors, reshape gently, and dry away from direct heat.",
      "gallery": [
        "Full view",
        "Upper detail",
        "Fabric detail"
      ]
    },
    {
      "id": "summit",
      "name": "Summit Zip Hoodie",
      "type": "The layer that stays by the door",
      "price": 110,
      "colors": [
        "navy",
        "chalk",
        "obsidian"
      ],
      "description": "Zip up and head out. A classic hooded layer with a drawcord hood and front pockets, ready for the commute, the weekend, and the unexpected detour.",
      "features": [
        "Full-length zip",
        "Drawcord hood",
        "Front pockets"
      ],
      "details": "A zip-front hooded sweatshirt with a drawcord hood, split front pockets, and ribbed cuffs and hem.",
      "fit": "A regular-to-relaxed fit. Choose your usual size for layering over a tee.",
      "category": "essentials",
      "badge": "",
      "sizes": [
        "XS",
        "S",
        "M",
        "L",
        "XL"
      ],
      "care": "Follow the original garment care label. Wash with similar colors, reshape gently, and dry away from direct heat.",
      "gallery": [
        "Full view",
        "Upper detail",
        "Fabric detail"
      ]
    },
    {
      "id": "base",
      "name": "Base Long Sleeve",
      "type": "The quiet foundation",
      "price": 48,
      "colors": [
        "chalk",
        "obsidian"
      ],
      "description": "Some pieces make getting dressed easier. A long-sleeved crew layer with a clean front and a simple outline, ready for a jacket or a day on its own.",
      "features": [
        "Crew neckline",
        "Long sleeves",
        "Clean front"
      ],
      "details": "A plain long-sleeved crew top with a straight body and a neat neckline. A straightforward foundation for an everyday wardrobe.",
      "fit": "A comfortable regular fit. Choose your usual chest size; size up for a loose layering piece.",
      "category": "essentials",
      "badge": "",
      "sizes": [
        "XS",
        "S",
        "M",
        "L",
        "XL"
      ],
      "care": "Follow the original garment care label. Wash with similar colors, reshape gently, and dry away from direct heat.",
      "gallery": [
        "Full view",
        "Upper detail",
        "Fabric detail"
      ]
    },
    {
      "id": "meridian",
      "name": "Meridian Knit",
      "type": "From first light to last plans",
      "price": 98,
      "colors": [
        "navy",
        "obsidian"
      ],
      "description": "A quiet classic for busy days. This crew-neck knit brings a clean outline and an easy layer to your everyday rotation.",
      "features": [
        "Crew neckline",
        "Long sleeves",
        "Ribbed cuffs and hem"
      ],
      "details": "A fine-looking knit with a round neckline and ribbed cuffs and hem. Wear over a tee or beneath an outer layer.",
      "fit": "A regular knit fit. Choose your usual size and allow space for a light underlayer.",
      "category": "essentials",
      "badge": "",
      "sizes": [
        "XS",
        "S",
        "M",
        "L",
        "XL"
      ],
      "care": "Follow the original garment care label. Wash with similar colors, reshape gently, and dry away from direct heat.",
      "gallery": [
        "Full view",
        "Upper detail",
        "Fabric detail"
      ]
    }
  ];
  const catalog = Object.fromEntries(products.map((product) => [product.id, product]));
  const photo = (product, color = product.colors[0]) => `assets/photos/${product.id}-${color}-front.jpg`;
  const productUrl = (product, color = product.colors[0]) => `product.html?id=${product.id}&color=${color}`;
  window.AuroraCatalog = { products, catalog, colors, photo, productUrl };
})();

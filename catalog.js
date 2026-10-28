/* Shared product information for the home, shop, and product pages. */
(() => {
  const colors = {
    glacier: { name: 'Glacier', hex: '#dedbca' },
    obsidian: { name: 'Obsidian', hex: '#303330' },
    moss: { name: 'Moss', hex: '#696b46' },
    teal: { name: 'Deep teal', hex: '#345b66' },
    chalk: { name: 'Chalk', hex: '#ded6bd' },
    navy: { name: 'Midnight navy', hex: '#252f43' },
    mist: { name: 'Mist grey', hex: '#9a9b9d' },
    pictured: { name: 'As pictured', hex: '#b9b0a2' }
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
    },
    {
      "id": "polar",
      "name": "Polar Roll Neck",
      "type": "A high collar. A quiet statement.",
      "price": 105,
      "colors": [
        "chalk",
        "obsidian"
      ],
      "description": "A little extra coverage, without the bulk. A close-fitting roll neck with a clean body and long sleeves for easy layering through the cooler months.",
      "features": [
        "Fold-over roll neck",
        "Slim silhouette",
        "Long sleeves"
      ],
      "details": "A fine knit with a fold-over high neck, long sleeves, and a close-fitting body. A simple partner for a bomber or tailored trousers.",
      "fit": "A slim fit. Choose your usual size for a close silhouette or size up for more ease.",
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
      "id": "field",
      "name": "Field Graphic Long Sleeve",
      "type": "A small detail. A fresh perspective.",
      "price": 55,
      "colors": [
        "obsidian",
        "chalk"
      ],
      "description": "Everyday ease with a little character. A round-neck long-sleeved top with a small illustrated chest detail and a relaxed shape.",
      "features": [
        "Small chest illustration",
        "Round neckline",
        "Easy long sleeves"
      ],
      "details": "A long-sleeved crew top with a small decorative graphic at the chest. The reference photo shows the original supplier artwork.",
      "fit": "A relaxed, shorter silhouette. Check both chest fit and your preferred body length when selecting a size.",
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
      "id": "dune",
      "name": "Dune Everyday Shirt",
      "type": "An open invitation to slow down",
      "price": 89,
      "colors": [
        "navy",
        "obsidian"
      ],
      "description": "Button up, or leave it open over a tee. An easy long-sleeved shirt with a classic collar and an unhurried feel for everyday plans.",
      "features": [
        "Button front",
        "Classic collar",
        "Long sleeves"
      ],
      "details": "A button-front shirt with a pointed collar, long sleeves, and a softly relaxed body. Styled reference photos may include other garments; this listing is for the shirt only.",
      "fit": "A relaxed shirt silhouette. Choose your usual size and use the chest measurement as a starting point.",
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
      "id": "meadow",
      "name": "Meadow Button Dress",
      "type": "One piece. Plenty of possibility.",
      "price": 95,
      "colors": [
        "obsidian"
      ],
      "badge": "THE ONE-PIECE EDIT",
      "description": "An easy answer to an open day. A short button-front dress with a V neckline, loose sleeves, and a gathered shape that keeps things simple.",
      "features": [
        "Button front",
        "V neckline",
        "Gathered skirt"
      ],
      "details": "A short-sleeved dress with a V-shaped neckline, front buttons, a gathered waist, and a tiered skirt. The silhouette is loose and above the knee in the reference photo.",
      "fit": "A loose dress silhouette with a gathered waist. Use the chest and waist guide; choose your usual size for an easy fit.",
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
      "id": "traverse",
      "name": "Traverse Easy Trousers",
      "type": "Everyday trousers, an easier pace",
      "category": "bottoms",
      "price": 88,
      "colors": [
        "obsidian",
        "navy"
      ],
      "description": "For the walk to work and the longer way back. Clean-front trousers with a relaxed leg and an understated shape that pairs with almost everything.",
      "features": [
        "Clean front",
        "Easy leg shape",
        "Side pockets"
      ],
      "details": "Everyday trousers with a clean waistband, side pockets, and a relaxed leg that narrows toward the hem.",
      "fit": "A relaxed leg with a neat waist. Select your size using the waist column in our concept size guide.",
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
      "id": "metro",
      "name": "Metro Tailored Trousers",
      "type": "A sharper line for everyday plans",
      "category": "bottoms",
      "price": 98,
      "colors": [
        "navy",
        "obsidian"
      ],
      "description": "A little more polish, just as much possibility. Flat-front trousers with a clean leg and simple pocket details, ready for a shirt or a favorite tee.",
      "features": [
        "Flat-front waistband",
        "Clean leg line",
        "Belt loops"
      ],
      "details": "Tailored-looking trousers with a flat front, belt loops, side pockets, and a straight-to-tapered leg.",
      "fit": "A neat waist with a straight-to-tapered leg. Start with your natural waist measurement in the size guide.",
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
      "id": "horizon",
      "name": "Horizon Wide Leg Pants",
      "type": "Room for a different perspective",
      "category": "bottoms",
      "price": 92,
      "colors": [
        "obsidian",
        "navy"
      ],
      "description": "A wider view of the everyday. Full-length trousers with a generous leg and a flowing outline, balanced with a tucked tee or a clean knit.",
      "features": [
        "Wide leg",
        "Full-length silhouette",
        "Clean waistband"
      ],
      "details": "Full-length, wide-leg trousers shown on a model. Other clothing and footwear in the reference photos are styling suggestions and are not included.",
      "fit": "A generous wide leg. Choose using your natural waist measurement; the reference model styling is illustrative.",
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
  // BEGIN IMPORTED SAMPLES
  products.push(...[
    {
      "id": "sample-83",
      "name": "Blue & Black Check Shirt",
      "type": "Mens shirts",
      "category": "essentials",
      "price": 29.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "XS",
        "S",
        "M",
        "L",
        "XL"
      ],
      "description": "The Blue & Black Check Shirt is a stylish and comfortable men's shirt featuring a classic check pattern. Made from high-quality fabric, it's suitable for both casual and semi-formal occasions.",
      "features": [
        "Everyday styling",
        "Easy to pair",
        "Sample collection"
      ],
      "details": "The Blue & Black Check Shirt is a stylish and comfortable men's shirt featuring a classic check pattern. Made from high-quality fabric, it's suitable for both casual and semi-formal occasions. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "Sizes XS–XL. Check your body measurements before choosing.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-83-pictured-1.webp",
          "assets/photos/sample-83-pictured-2.webp",
          "assets/photos/sample-83-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-84",
      "name": "Gigabyte Aorus Men Tshirt",
      "type": "Mens shirts",
      "category": "essentials",
      "price": 24.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "XS",
        "S",
        "M",
        "L",
        "XL"
      ],
      "description": "The Gigabyte Aorus Men Tshirt is a cool and casual shirt for gaming enthusiasts. With the Aorus logo and sleek design, it's perfect for expressing your gaming style.",
      "features": [
        "Everyday styling",
        "Easy to pair",
        "Sample collection"
      ],
      "details": "The Gigabyte Aorus Men Tshirt is a cool and casual shirt for gaming enthusiasts. With the Aorus logo and sleek design, it's perfect for expressing your gaming style. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "Sizes XS–XL. Check your body measurements before choosing.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-84-pictured-1.webp",
          "assets/photos/sample-84-pictured-2.webp",
          "assets/photos/sample-84-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-85",
      "name": "Man Plaid Shirt",
      "type": "Mens shirts",
      "category": "essentials",
      "price": 34.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "XS",
        "S",
        "M",
        "L",
        "XL"
      ],
      "description": "The Man Plaid Shirt is a timeless and versatile men's shirt with a classic plaid pattern. Its comfortable fit and casual style make it a wardrobe essential for various occasions.",
      "features": [
        "Everyday styling",
        "Easy to pair",
        "Sample collection"
      ],
      "details": "The Man Plaid Shirt is a timeless and versatile men's shirt with a classic plaid pattern. Its comfortable fit and casual style make it a wardrobe essential for various occasions. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "Sizes XS–XL. Check your body measurements before choosing.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-85-pictured-1.webp",
          "assets/photos/sample-85-pictured-2.webp",
          "assets/photos/sample-85-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-86",
      "name": "Man Short Sleeve Shirt",
      "type": "Mens shirts",
      "category": "essentials",
      "price": 19.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "XS",
        "S",
        "M",
        "L",
        "XL"
      ],
      "description": "The Man Short Sleeve Shirt is a breezy and stylish option for warm days. With a comfortable fit and short sleeves, it's perfect for a laid-back yet polished look.",
      "features": [
        "Everyday styling",
        "Easy to pair",
        "Sample collection"
      ],
      "details": "The Man Short Sleeve Shirt is a breezy and stylish option for warm days. With a comfortable fit and short sleeves, it's perfect for a laid-back yet polished look. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "Sizes XS–XL. Check your body measurements before choosing.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-86-pictured-1.webp",
          "assets/photos/sample-86-pictured-2.webp",
          "assets/photos/sample-86-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-87",
      "name": "Men Check Shirt",
      "type": "Mens shirts",
      "category": "essentials",
      "price": 27.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "XS",
        "S",
        "M",
        "L",
        "XL"
      ],
      "description": "The Men Check Shirt is a classic and versatile shirt featuring a stylish check pattern. Suitable for various occasions, it adds a smart and polished touch to your wardrobe.",
      "features": [
        "Everyday styling",
        "Easy to pair",
        "Sample collection"
      ],
      "details": "The Men Check Shirt is a classic and versatile shirt featuring a stylish check pattern. Suitable for various occasions, it adds a smart and polished touch to your wardrobe. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "Sizes XS–XL. Check your body measurements before choosing.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-87-pictured-1.webp",
          "assets/photos/sample-87-pictured-2.webp",
          "assets/photos/sample-87-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-162",
      "name": "Blue Frock",
      "type": "Tops",
      "category": "essentials",
      "price": 29.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "XS",
        "S",
        "M",
        "L",
        "XL"
      ],
      "description": "The Blue Frock is a charming and stylish dress for various occasions. With a vibrant blue color and a comfortable design, it adds a touch of elegance to your wardrobe.",
      "features": [
        "Everyday styling",
        "Easy to pair",
        "Sample collection"
      ],
      "details": "The Blue Frock is a charming and stylish dress for various occasions. With a vibrant blue color and a comfortable design, it adds a touch of elegance to your wardrobe. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "Sizes XS–XL. Check your body measurements before choosing.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-162-pictured-1.webp",
          "assets/photos/sample-162-pictured-2.webp",
          "assets/photos/sample-162-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-163",
      "name": "Girl Summer Dress",
      "type": "Tops",
      "category": "essentials",
      "price": 19.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "XS",
        "S",
        "M",
        "L",
        "XL"
      ],
      "description": "The Girl Summer Dress is a cute and breezy dress designed for warm weather. With playful patterns and lightweight fabric, it's perfect for keeping cool and stylish during the summer.",
      "features": [
        "Everyday styling",
        "Easy to pair",
        "Sample collection"
      ],
      "details": "The Girl Summer Dress is a cute and breezy dress designed for warm weather. With playful patterns and lightweight fabric, it's perfect for keeping cool and stylish during the summer. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "Sizes XS–XL. Check your body measurements before choosing.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-163-pictured-1.webp",
          "assets/photos/sample-163-pictured-2.webp",
          "assets/photos/sample-163-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-164",
      "name": "Gray Dress",
      "type": "Tops",
      "category": "essentials",
      "price": 34.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "XS",
        "S",
        "M",
        "L",
        "XL"
      ],
      "description": "The Gray Dress is a versatile and chic option for various occasions. With a neutral gray color, it can be dressed up or down, making it a wardrobe staple for any fashion-forward individual.",
      "features": [
        "Everyday styling",
        "Easy to pair",
        "Sample collection"
      ],
      "details": "The Gray Dress is a versatile and chic option for various occasions. With a neutral gray color, it can be dressed up or down, making it a wardrobe staple for any fashion-forward individual. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "Sizes XS–XL. Check your body measurements before choosing.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-164-pictured-1.webp",
          "assets/photos/sample-164-pictured-2.webp",
          "assets/photos/sample-164-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-165",
      "name": "Short Frock",
      "type": "Tops",
      "category": "essentials",
      "price": 24.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "XS",
        "S",
        "M",
        "L",
        "XL"
      ],
      "description": "The Short Frock is a playful and trendy dress with a shorter length. Ideal for casual outings or special occasions, it combines style and comfort for a fashionable look.",
      "features": [
        "Everyday styling",
        "Easy to pair",
        "Sample collection"
      ],
      "details": "The Short Frock is a playful and trendy dress with a shorter length. Ideal for casual outings or special occasions, it combines style and comfort for a fashionable look. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "Sizes XS–XL. Check your body measurements before choosing.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-165-pictured-1.webp",
          "assets/photos/sample-165-pictured-2.webp",
          "assets/photos/sample-165-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-166",
      "name": "Tartan Dress",
      "type": "Tops",
      "category": "essentials",
      "price": 39.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "XS",
        "S",
        "M",
        "L",
        "XL"
      ],
      "description": "The Tartan Dress features a classic tartan pattern, bringing a timeless and sophisticated touch to your wardrobe. Perfect for fall and winter, it adds a hint of traditional charm.",
      "features": [
        "Everyday styling",
        "Easy to pair",
        "Sample collection"
      ],
      "details": "The Tartan Dress features a classic tartan pattern, bringing a timeless and sophisticated touch to your wardrobe. Perfect for fall and winter, it adds a hint of traditional charm. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "Sizes XS–XL. Check your body measurements before choosing.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-166-pictured-1.webp",
          "assets/photos/sample-166-pictured-2.webp",
          "assets/photos/sample-166-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-177",
      "name": "Black Women's Gown",
      "type": "Womens dresses",
      "category": "essentials",
      "price": 129.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "XS",
        "S",
        "M",
        "L",
        "XL"
      ],
      "description": "The Black Women's Gown is an elegant and timeless evening gown. With a sleek black design, it's perfect for formal events and special occasions, exuding sophistication and style.",
      "features": [
        "Everyday styling",
        "Easy to pair",
        "Sample collection"
      ],
      "details": "The Black Women's Gown is an elegant and timeless evening gown. With a sleek black design, it's perfect for formal events and special occasions, exuding sophistication and style. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "Sizes XS–XL. Check your body measurements before choosing.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-177-pictured-1.webp",
          "assets/photos/sample-177-pictured-2.webp",
          "assets/photos/sample-177-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-178",
      "name": "Corset Leather With Skirt",
      "type": "Womens dresses",
      "category": "essentials",
      "price": 89.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "XS",
        "S",
        "M",
        "L",
        "XL"
      ],
      "description": "The Corset Leather With Skirt is a bold and edgy ensemble that combines a stylish corset with a matching skirt. Ideal for fashion-forward individuals, it makes a statement at any event.",
      "features": [
        "Everyday styling",
        "Easy to pair",
        "Sample collection"
      ],
      "details": "The Corset Leather With Skirt is a bold and edgy ensemble that combines a stylish corset with a matching skirt. Ideal for fashion-forward individuals, it makes a statement at any event. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "Sizes XS–XL. Check your body measurements before choosing.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-178-pictured-1.webp",
          "assets/photos/sample-178-pictured-2.webp",
          "assets/photos/sample-178-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-179",
      "name": "Corset With Black Skirt",
      "type": "Womens dresses",
      "category": "essentials",
      "price": 79.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "XS",
        "S",
        "M",
        "L",
        "XL"
      ],
      "description": "The Corset With Black Skirt is a chic and versatile outfit that pairs a fashionable corset with a classic black skirt. It offers a trendy and coordinated look for various occasions.",
      "features": [
        "Everyday styling",
        "Easy to pair",
        "Sample collection"
      ],
      "details": "The Corset With Black Skirt is a chic and versatile outfit that pairs a fashionable corset with a classic black skirt. It offers a trendy and coordinated look for various occasions. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "Sizes XS–XL. Check your body measurements before choosing.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-179-pictured-1.webp",
          "assets/photos/sample-179-pictured-2.webp",
          "assets/photos/sample-179-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-180",
      "name": "Dress Pea",
      "type": "Womens dresses",
      "category": "essentials",
      "price": 49.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "XS",
        "S",
        "M",
        "L",
        "XL"
      ],
      "description": "The Dress Pea is a stylish and comfortable dress with a pea pattern. Perfect for casual outings, it adds a playful and fun element to your wardrobe, making it a great choice for day-to-day wear.",
      "features": [
        "Everyday styling",
        "Easy to pair",
        "Sample collection"
      ],
      "details": "The Dress Pea is a stylish and comfortable dress with a pea pattern. Perfect for casual outings, it adds a playful and fun element to your wardrobe, making it a great choice for day-to-day wear. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "Sizes XS–XL. Check your body measurements before choosing.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-180-pictured-1.webp",
          "assets/photos/sample-180-pictured-2.webp",
          "assets/photos/sample-180-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-181",
      "name": "Marni Red & Black Suit",
      "type": "Womens dresses",
      "category": "essentials",
      "price": 179.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "XS",
        "S",
        "M",
        "L",
        "XL"
      ],
      "description": "The Marni Red & Black Suit is a sophisticated and fashion-forward suit ensemble. With a combination of red and black tones, it showcases a modern design for a bold and confident look.",
      "features": [
        "Everyday styling",
        "Easy to pair",
        "Sample collection"
      ],
      "details": "The Marni Red & Black Suit is a sophisticated and fashion-forward suit ensemble. With a combination of red and black tones, it showcases a modern design for a bold and confident look. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "Sizes XS–XL. Check your body measurements before choosing.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-181-pictured-1.webp",
          "assets/photos/sample-181-pictured-2.webp",
          "assets/photos/sample-181-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-88",
      "name": "Nike Air Jordan 1 Red And Black",
      "type": "Mens shoes",
      "category": "footwear",
      "price": 149.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "7",
        "8",
        "9",
        "10",
        "11"
      ],
      "description": "The Nike Air Jordan 1 in Red and Black is an iconic basketball sneaker known for its stylish design and high-performance features, making it a favorite among sneaker enthusiasts and athletes.",
      "features": [
        "Everyday footwear",
        "Sizes 7–11",
        "Sample collection"
      ],
      "details": "The Nike Air Jordan 1 in Red and Black is an iconic basketball sneaker known for its stylish design and high-performance features, making it a favorite among sneaker enthusiasts and athletes. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "US shoe sizes 7–11. Check the size chart for length and fit before ordering.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-88-pictured-1.webp",
          "assets/photos/sample-88-pictured-2.webp",
          "assets/photos/sample-88-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-89",
      "name": "Nike Baseball Cleats",
      "type": "Mens shoes",
      "category": "footwear",
      "price": 79.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "7",
        "8",
        "9",
        "10",
        "11"
      ],
      "description": "Nike Baseball Cleats are designed for maximum traction and performance on the baseball field. They provide stability and support for players during games and practices.",
      "features": [
        "Everyday footwear",
        "Sizes 7–11",
        "Sample collection"
      ],
      "details": "Nike Baseball Cleats are designed for maximum traction and performance on the baseball field. They provide stability and support for players during games and practices. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "US shoe sizes 7–11. Check the size chart for length and fit before ordering.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-89-pictured-1.webp",
          "assets/photos/sample-89-pictured-2.webp",
          "assets/photos/sample-89-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-90",
      "name": "Puma Future Rider Trainers",
      "type": "Mens shoes",
      "category": "footwear",
      "price": 89.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "7",
        "8",
        "9",
        "10",
        "11"
      ],
      "description": "The Puma Future Rider Trainers offer a blend of retro style and modern comfort. Perfect for casual wear, these trainers provide a fashionable and comfortable option for everyday use.",
      "features": [
        "Everyday footwear",
        "Sizes 7–11",
        "Sample collection"
      ],
      "details": "The Puma Future Rider Trainers offer a blend of retro style and modern comfort. Perfect for casual wear, these trainers provide a fashionable and comfortable option for everyday use. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "US shoe sizes 7–11. Check the size chart for length and fit before ordering.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-90-pictured-1.webp",
          "assets/photos/sample-90-pictured-2.webp",
          "assets/photos/sample-90-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-91",
      "name": "Sports Sneakers Off White & Red",
      "type": "Mens shoes",
      "category": "footwear",
      "price": 119.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "7",
        "8",
        "9",
        "10",
        "11"
      ],
      "description": "The Sports Sneakers in Off White and Red combine style and functionality, making them a fashionable choice for sports enthusiasts. The red and off-white color combination adds a bold and energetic touch.",
      "features": [
        "Everyday footwear",
        "Sizes 7–11",
        "Sample collection"
      ],
      "details": "The Sports Sneakers in Off White and Red combine style and functionality, making them a fashionable choice for sports enthusiasts. The red and off-white color combination adds a bold and energetic touch. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "US shoe sizes 7–11. Check the size chart for length and fit before ordering.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-91-pictured-1.webp",
          "assets/photos/sample-91-pictured-2.webp",
          "assets/photos/sample-91-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-92",
      "name": "Sports Sneakers Off White Red",
      "type": "Mens shoes",
      "category": "footwear",
      "price": 109.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "7",
        "8",
        "9",
        "10",
        "11"
      ],
      "description": "Another variant of the Sports Sneakers in Off White Red, featuring a unique design. These sneakers offer style and comfort for casual occasions.",
      "features": [
        "Everyday footwear",
        "Sizes 7–11",
        "Sample collection"
      ],
      "details": "Another variant of the Sports Sneakers in Off White Red, featuring a unique design. These sneakers offer style and comfort for casual occasions. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "US shoe sizes 7–11. Check the size chart for length and fit before ordering.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-92-pictured-1.webp",
          "assets/photos/sample-92-pictured-2.webp",
          "assets/photos/sample-92-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-185",
      "name": "Black & Brown Slipper",
      "type": "Womens shoes",
      "category": "footwear",
      "price": 19.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "7",
        "8",
        "9",
        "10",
        "11"
      ],
      "description": "The Black & Brown Slipper is a comfortable and stylish choice for casual wear. Featuring a blend of black and brown colors, it adds a touch of sophistication to your relaxation.",
      "features": [
        "Everyday footwear",
        "Sizes 7–11",
        "Sample collection"
      ],
      "details": "The Black & Brown Slipper is a comfortable and stylish choice for casual wear. Featuring a blend of black and brown colors, it adds a touch of sophistication to your relaxation. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "US shoe sizes 7–11. Check the size chart for length and fit before ordering.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-185-pictured-1.webp",
          "assets/photos/sample-185-pictured-2.webp",
          "assets/photos/sample-185-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-186",
      "name": "Calvin Klein Heel Shoes",
      "type": "Womens shoes",
      "category": "footwear",
      "price": 79.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "7",
        "8",
        "9",
        "10",
        "11"
      ],
      "description": "Calvin Klein Heel Shoes are elegant and sophisticated, designed for formal occasions. With a classic design and high-quality materials, they complement your stylish ensemble.",
      "features": [
        "Everyday footwear",
        "Sizes 7–11",
        "Sample collection"
      ],
      "details": "Calvin Klein Heel Shoes are elegant and sophisticated, designed for formal occasions. With a classic design and high-quality materials, they complement your stylish ensemble. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "US shoe sizes 7–11. Check the size chart for length and fit before ordering.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-186-pictured-1.webp",
          "assets/photos/sample-186-pictured-2.webp",
          "assets/photos/sample-186-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-187",
      "name": "Golden Shoes Woman",
      "type": "Womens shoes",
      "category": "footwear",
      "price": 49.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "7",
        "8",
        "9",
        "10",
        "11"
      ],
      "description": "The Golden Shoes for Women are a glamorous choice for special occasions. Featuring a golden hue and stylish design, they add a touch of luxury to your outfit.",
      "features": [
        "Everyday footwear",
        "Sizes 7–11",
        "Sample collection"
      ],
      "details": "The Golden Shoes for Women are a glamorous choice for special occasions. Featuring a golden hue and stylish design, they add a touch of luxury to your outfit. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "US shoe sizes 7–11. Check the size chart for length and fit before ordering.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-187-pictured-1.webp",
          "assets/photos/sample-187-pictured-2.webp",
          "assets/photos/sample-187-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-188",
      "name": "Pampi Shoes",
      "type": "Womens shoes",
      "category": "footwear",
      "price": 29.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "7",
        "8",
        "9",
        "10",
        "11"
      ],
      "description": "Pampi Shoes offer a blend of comfort and style for everyday use. With a versatile design, they are suitable for various casual occasions, providing a trendy and relaxed look.",
      "features": [
        "Everyday footwear",
        "Sizes 7–11",
        "Sample collection"
      ],
      "details": "Pampi Shoes offer a blend of comfort and style for everyday use. With a versatile design, they are suitable for various casual occasions, providing a trendy and relaxed look. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "US shoe sizes 7–11. Check the size chart for length and fit before ordering.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-188-pictured-1.webp",
          "assets/photos/sample-188-pictured-2.webp",
          "assets/photos/sample-188-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-189",
      "name": "Red Shoes",
      "type": "Womens shoes",
      "category": "footwear",
      "price": 34.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "7",
        "8",
        "9",
        "10",
        "11"
      ],
      "description": "The Red Shoes make a bold statement with their vibrant red color. Whether for a party or a casual outing, these shoes add a pop of color and style to your wardrobe.",
      "features": [
        "Everyday footwear",
        "Sizes 7–11",
        "Sample collection"
      ],
      "details": "The Red Shoes make a bold statement with their vibrant red color. Whether for a party or a casual outing, these shoes add a pop of color and style to your wardrobe. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "US shoe sizes 7–11. Check the size chart for length and fit before ordering.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-189-pictured-1.webp",
          "assets/photos/sample-189-pictured-2.webp",
          "assets/photos/sample-189-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-172",
      "name": "Blue Women's Handbag",
      "type": "Womens bags",
      "category": "accessories",
      "price": 49.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "ONE SIZE"
      ],
      "description": "The Blue Women's Handbag is a stylish and spacious accessory for everyday use. With a vibrant blue color and multiple compartments, it combines fashion and functionality.",
      "features": [
        "Everyday accessories",
        "As pictured",
        "Sample collection"
      ],
      "details": "The Blue Women's Handbag is a stylish and spacious accessory for everyday use. With a vibrant blue color and multiple compartments, it combines fashion and functionality. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "One size. The sample photo shows the style and finish.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-172-pictured-1.webp",
          "assets/photos/sample-172-pictured-2.webp",
          "assets/photos/sample-172-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-173",
      "name": "Heshe Women's Leather Bag",
      "type": "Womens bags",
      "category": "accessories",
      "price": 129.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "ONE SIZE"
      ],
      "description": "The Heshe Women's Leather Bag is a luxurious and high-quality leather bag for the sophisticated woman. With a timeless design and durable craftsmanship, it's a versatile accessory.",
      "features": [
        "Everyday accessories",
        "As pictured",
        "Sample collection"
      ],
      "details": "The Heshe Women's Leather Bag is a luxurious and high-quality leather bag for the sophisticated woman. With a timeless design and durable craftsmanship, it's a versatile accessory. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "One size. The sample photo shows the style and finish.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-173-pictured-1.webp",
          "assets/photos/sample-173-pictured-2.webp",
          "assets/photos/sample-173-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-174",
      "name": "Prada Women Bag",
      "type": "Womens bags",
      "category": "accessories",
      "price": 599.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "ONE SIZE"
      ],
      "description": "The Prada Women Bag is an iconic designer bag that exudes elegance and luxury. Crafted with precision and featuring the Prada logo, it's a statement piece for fashion enthusiasts.",
      "features": [
        "Everyday accessories",
        "As pictured",
        "Sample collection"
      ],
      "details": "The Prada Women Bag is an iconic designer bag that exudes elegance and luxury. Crafted with precision and featuring the Prada logo, it's a statement piece for fashion enthusiasts. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "One size. The sample photo shows the style and finish.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-174-pictured-1.webp",
          "assets/photos/sample-174-pictured-2.webp",
          "assets/photos/sample-174-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-175",
      "name": "White Faux Leather Backpack",
      "type": "Womens bags",
      "category": "accessories",
      "price": 39.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "ONE SIZE"
      ],
      "description": "The White Faux Leather Backpack is a trendy and practical backpack for the modern woman. With a sleek white design and ample storage space, it's perfect for both casual and on-the-go styles.",
      "features": [
        "Everyday accessories",
        "As pictured",
        "Sample collection"
      ],
      "details": "The White Faux Leather Backpack is a trendy and practical backpack for the modern woman. With a sleek white design and ample storage space, it's perfect for both casual and on-the-go styles. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "One size. The sample photo shows the style and finish.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-175-pictured-1.webp",
          "assets/photos/sample-175-pictured-2.webp",
          "assets/photos/sample-175-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-176",
      "name": "Women Handbag Black",
      "type": "Womens bags",
      "category": "accessories",
      "price": 59.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "ONE SIZE"
      ],
      "description": "The Women Handbag in Black is a classic and versatile accessory that complements various outfits. With a timeless black color and functional design, it's a must-have in every woman's wardrobe.",
      "features": [
        "Everyday accessories",
        "As pictured",
        "Sample collection"
      ],
      "details": "The Women Handbag in Black is a classic and versatile accessory that complements various outfits. With a timeless black color and functional design, it's a must-have in every woman's wardrobe. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "One size. The sample photo shows the style and finish.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-176-pictured-1.webp",
          "assets/photos/sample-176-pictured-2.webp",
          "assets/photos/sample-176-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-154",
      "name": "Black Sun Glasses",
      "type": "Sunglasses",
      "category": "accessories",
      "price": 29.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "ONE SIZE"
      ],
      "description": "The Black Sun Glasses are a classic and stylish choice, featuring a sleek black frame and tinted lenses. They provide both UV protection and a fashionable look.",
      "features": [
        "Everyday accessories",
        "As pictured",
        "Sample collection"
      ],
      "details": "The Black Sun Glasses are a classic and stylish choice, featuring a sleek black frame and tinted lenses. They provide both UV protection and a fashionable look. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "One size. The sample photo shows the style and finish.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-154-pictured-1.webp",
          "assets/photos/sample-154-pictured-2.webp",
          "assets/photos/sample-154-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-155",
      "name": "Classic Sun Glasses",
      "type": "Sunglasses",
      "category": "accessories",
      "price": 24.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "ONE SIZE"
      ],
      "description": "The Classic Sun Glasses offer a timeless design with a neutral frame and UV-protected lenses. These sunglasses are versatile and suitable for various occasions.",
      "features": [
        "Everyday accessories",
        "As pictured",
        "Sample collection"
      ],
      "details": "The Classic Sun Glasses offer a timeless design with a neutral frame and UV-protected lenses. These sunglasses are versatile and suitable for various occasions. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "One size. The sample photo shows the style and finish.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-155-pictured-1.webp",
          "assets/photos/sample-155-pictured-2.webp",
          "assets/photos/sample-155-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-156",
      "name": "Green and Black Glasses",
      "type": "Sunglasses",
      "category": "accessories",
      "price": 34.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "ONE SIZE"
      ],
      "description": "The Green and Black Glasses feature a bold combination of green and black colors, adding a touch of vibrancy to your eyewear collection. They are both stylish and eye-catching.",
      "features": [
        "Everyday accessories",
        "As pictured",
        "Sample collection"
      ],
      "details": "The Green and Black Glasses feature a bold combination of green and black colors, adding a touch of vibrancy to your eyewear collection. They are both stylish and eye-catching. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "One size. The sample photo shows the style and finish.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-156-pictured-1.webp",
          "assets/photos/sample-156-pictured-2.webp",
          "assets/photos/sample-156-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-157",
      "name": "Party Glasses",
      "type": "Sunglasses",
      "category": "accessories",
      "price": 19.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "ONE SIZE"
      ],
      "description": "The Party Glasses are designed to add flair to your party outfit. With unique shapes or colorful frames, they're perfect for adding a playful touch to your look during celebrations.",
      "features": [
        "Everyday accessories",
        "As pictured",
        "Sample collection"
      ],
      "details": "The Party Glasses are designed to add flair to your party outfit. With unique shapes or colorful frames, they're perfect for adding a playful touch to your look during celebrations. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "One size. The sample photo shows the style and finish.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-157-pictured-1.webp",
          "assets/photos/sample-157-pictured-2.webp",
          "assets/photos/sample-157-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-158",
      "name": "Sunglasses",
      "type": "Sunglasses",
      "category": "accessories",
      "price": 22.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "ONE SIZE"
      ],
      "description": "The Sunglasses offer a classic and simple design with a focus on functionality. These sunglasses provide essential UV protection while maintaining a timeless look.",
      "features": [
        "Everyday accessories",
        "As pictured",
        "Sample collection"
      ],
      "details": "The Sunglasses offer a classic and simple design with a focus on functionality. These sunglasses provide essential UV protection while maintaining a timeless look. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "One size. The sample photo shows the style and finish.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-158-pictured-1.webp",
          "assets/photos/sample-158-pictured-2.webp",
          "assets/photos/sample-158-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-93",
      "name": "Brown Leather Belt Watch",
      "type": "Mens watches",
      "category": "accessories",
      "price": 89.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "ONE SIZE"
      ],
      "description": "The Brown Leather Belt Watch is a stylish timepiece with a classic design. Featuring a genuine leather strap and a sleek dial, it adds a touch of sophistication to your look.",
      "features": [
        "Everyday accessories",
        "As pictured",
        "Sample collection"
      ],
      "details": "The Brown Leather Belt Watch is a stylish timepiece with a classic design. Featuring a genuine leather strap and a sleek dial, it adds a touch of sophistication to your look. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "One size. The sample photo shows the style and finish.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-93-pictured-1.webp",
          "assets/photos/sample-93-pictured-2.webp",
          "assets/photos/sample-93-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-94",
      "name": "Longines Master Collection",
      "type": "Mens watches",
      "category": "accessories",
      "price": 1499.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "ONE SIZE"
      ],
      "description": "The Longines Master Collection is an elegant and refined watch known for its precision and craftsmanship. With a timeless design, it's a symbol of luxury and sophistication.",
      "features": [
        "Everyday accessories",
        "As pictured",
        "Sample collection"
      ],
      "details": "The Longines Master Collection is an elegant and refined watch known for its precision and craftsmanship. With a timeless design, it's a symbol of luxury and sophistication. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "One size. The sample photo shows the style and finish.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-94-pictured-1.webp",
          "assets/photos/sample-94-pictured-2.webp",
          "assets/photos/sample-94-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-95",
      "name": "Rolex Cellini Date Black Dial",
      "type": "Mens watches",
      "category": "accessories",
      "price": 8999.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "ONE SIZE"
      ],
      "description": "The Rolex Cellini Date with Black Dial is a classic and prestigious watch. With a black dial and date complication, it exudes sophistication and is a symbol of Rolex's heritage.",
      "features": [
        "Everyday accessories",
        "As pictured",
        "Sample collection"
      ],
      "details": "The Rolex Cellini Date with Black Dial is a classic and prestigious watch. With a black dial and date complication, it exudes sophistication and is a symbol of Rolex's heritage. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "One size. The sample photo shows the style and finish.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-95-pictured-1.webp",
          "assets/photos/sample-95-pictured-2.webp",
          "assets/photos/sample-95-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-96",
      "name": "Rolex Cellini Moonphase",
      "type": "Mens watches",
      "category": "accessories",
      "price": 12999.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "ONE SIZE"
      ],
      "description": "The Rolex Cellini Moonphase is a masterpiece of horology, featuring a moon phase complication and exquisite design. It reflects Rolex's commitment to precision and elegance.",
      "features": [
        "Everyday accessories",
        "As pictured",
        "Sample collection"
      ],
      "details": "The Rolex Cellini Moonphase is a masterpiece of horology, featuring a moon phase complication and exquisite design. It reflects Rolex's commitment to precision and elegance. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "One size. The sample photo shows the style and finish.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-96-pictured-1.webp",
          "assets/photos/sample-96-pictured-2.webp",
          "assets/photos/sample-96-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-97",
      "name": "Rolex Datejust",
      "type": "Mens watches",
      "category": "accessories",
      "price": 10999.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "ONE SIZE"
      ],
      "description": "The Rolex Datejust is an iconic and versatile timepiece with a date window. Known for its timeless design and reliability, it's a symbol of Rolex's watchmaking excellence.",
      "features": [
        "Everyday accessories",
        "As pictured",
        "Sample collection"
      ],
      "details": "The Rolex Datejust is an iconic and versatile timepiece with a date window. Known for its timeless design and reliability, it's a symbol of Rolex's watchmaking excellence. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "One size. The sample photo shows the style and finish.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-97-pictured-1.webp",
          "assets/photos/sample-97-pictured-2.webp",
          "assets/photos/sample-97-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-98",
      "name": "Rolex Submariner Watch",
      "type": "Mens watches",
      "category": "accessories",
      "price": 13999.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "ONE SIZE"
      ],
      "description": "The Rolex Submariner is a legendary dive watch with a rich history. Known for its durability and water resistance, it's a symbol of adventure and exploration.",
      "features": [
        "Everyday accessories",
        "As pictured",
        "Sample collection"
      ],
      "details": "The Rolex Submariner is a legendary dive watch with a rich history. Known for its durability and water resistance, it's a symbol of adventure and exploration. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "One size. The sample photo shows the style and finish.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-98-pictured-1.webp",
          "assets/photos/sample-98-pictured-2.webp",
          "assets/photos/sample-98-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-190",
      "name": "IWC Ingenieur Automatic Steel",
      "type": "Womens watches",
      "category": "accessories",
      "price": 4999.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "ONE SIZE"
      ],
      "description": "The IWC Ingenieur Automatic Steel watch is a durable and sophisticated timepiece. With a stainless steel case and automatic movement, it combines precision and style for watch enthusiasts.",
      "features": [
        "Everyday accessories",
        "As pictured",
        "Sample collection"
      ],
      "details": "The IWC Ingenieur Automatic Steel watch is a durable and sophisticated timepiece. With a stainless steel case and automatic movement, it combines precision and style for watch enthusiasts. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "One size. The sample photo shows the style and finish.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-190-pictured-1.webp",
          "assets/photos/sample-190-pictured-2.webp",
          "assets/photos/sample-190-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-191",
      "name": "Rolex Cellini Moonphase",
      "type": "Womens watches",
      "category": "accessories",
      "price": 15999.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "ONE SIZE"
      ],
      "description": "The Rolex Cellini Moonphase watch is a masterpiece of horology. Featuring a moon phase complication, it showcases the craftsmanship and elegance that Rolex is renowned for.",
      "features": [
        "Everyday accessories",
        "As pictured",
        "Sample collection"
      ],
      "details": "The Rolex Cellini Moonphase watch is a masterpiece of horology. Featuring a moon phase complication, it showcases the craftsmanship and elegance that Rolex is renowned for. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "One size. The sample photo shows the style and finish.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-191-pictured-1.webp",
          "assets/photos/sample-191-pictured-2.webp",
          "assets/photos/sample-191-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-192",
      "name": "Rolex Datejust Women",
      "type": "Womens watches",
      "category": "accessories",
      "price": 10999.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "ONE SIZE"
      ],
      "description": "The Rolex Datejust Women's watch is an iconic timepiece designed for women. With a timeless design and a date complication, it offers both elegance and functionality.",
      "features": [
        "Everyday accessories",
        "As pictured",
        "Sample collection"
      ],
      "details": "The Rolex Datejust Women's watch is an iconic timepiece designed for women. With a timeless design and a date complication, it offers both elegance and functionality. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "One size. The sample photo shows the style and finish.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-192-pictured-1.webp",
          "assets/photos/sample-192-pictured-2.webp",
          "assets/photos/sample-192-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-193",
      "name": "Watch Gold for Women",
      "type": "Womens watches",
      "category": "accessories",
      "price": 799.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "ONE SIZE"
      ],
      "description": "The Gold Women's Watch is a stunning accessory that combines luxury and style. Featuring a gold-plated case and a chic design, it adds a touch of glamour to any outfit.",
      "features": [
        "Everyday accessories",
        "As pictured",
        "Sample collection"
      ],
      "details": "The Gold Women's Watch is a stunning accessory that combines luxury and style. Featuring a gold-plated case and a chic design, it adds a touch of glamour to any outfit. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "One size. The sample photo shows the style and finish.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-193-pictured-1.webp",
          "assets/photos/sample-193-pictured-2.webp",
          "assets/photos/sample-193-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-194",
      "name": "Women's Wrist Watch",
      "type": "Womens watches",
      "category": "accessories",
      "price": 129.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "ONE SIZE"
      ],
      "description": "The Women's Wrist Watch is a versatile and fashionable timepiece for everyday wear. With a comfortable strap and a simple yet elegant design, it complements various styles.",
      "features": [
        "Everyday accessories",
        "As pictured",
        "Sample collection"
      ],
      "details": "The Women's Wrist Watch is a versatile and fashionable timepiece for everyday wear. With a comfortable strap and a simple yet elegant design, it complements various styles. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "One size. The sample photo shows the style and finish.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-194-pictured-1.webp",
          "assets/photos/sample-194-pictured-2.webp",
          "assets/photos/sample-194-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-182",
      "name": "Green Crystal Earring",
      "type": "Womens jewellery",
      "category": "accessories",
      "price": 29.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "ONE SIZE"
      ],
      "description": "The Green Crystal Earring is a dazzling accessory that features a vibrant green crystal. With a classic design, it adds a touch of elegance to your ensemble, perfect for formal or special occasions.",
      "features": [
        "Everyday accessories",
        "As pictured",
        "Sample collection"
      ],
      "details": "The Green Crystal Earring is a dazzling accessory that features a vibrant green crystal. With a classic design, it adds a touch of elegance to your ensemble, perfect for formal or special occasions. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "One size. The sample photo shows the style and finish.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-182-pictured-1.webp",
          "assets/photos/sample-182-pictured-2.webp",
          "assets/photos/sample-182-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-183",
      "name": "Green Oval Earring",
      "type": "Womens jewellery",
      "category": "accessories",
      "price": 24.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "ONE SIZE"
      ],
      "description": "The Green Oval Earring is a stylish and versatile accessory with a unique oval shape. Whether for casual or dressy occasions, its green hue and contemporary design make it a standout piece.",
      "features": [
        "Everyday accessories",
        "As pictured",
        "Sample collection"
      ],
      "details": "The Green Oval Earring is a stylish and versatile accessory with a unique oval shape. Whether for casual or dressy occasions, its green hue and contemporary design make it a standout piece. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "One size. The sample photo shows the style and finish.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-183-pictured-1.webp",
          "assets/photos/sample-183-pictured-2.webp",
          "assets/photos/sample-183-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-184",
      "name": "Tropical Earring",
      "type": "Womens jewellery",
      "category": "accessories",
      "price": 19.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "ONE SIZE"
      ],
      "description": "The Tropical Earring is a fun and playful accessory inspired by tropical elements. Featuring vibrant colors and a lively design, it's perfect for adding a touch of summer to your look.",
      "features": [
        "Everyday accessories",
        "As pictured",
        "Sample collection"
      ],
      "details": "The Tropical Earring is a fun and playful accessory inspired by tropical elements. Featuring vibrant colors and a lively design, it's perfect for adding a touch of summer to your look. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "One size. The sample photo shows the style and finish.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Second view",
        "Third view"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-184-pictured-1.webp",
          "assets/photos/sample-184-pictured-2.webp",
          "assets/photos/sample-184-pictured-3.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    },
    {
      "id": "sample-137",
      "name": "American Football",
      "type": "Sports accessories",
      "category": "accessories",
      "price": 19.99,
      "badge": "SAMPLE EDIT",
      "colors": [
        "pictured"
      ],
      "sizes": [
        "ONE SIZE"
      ],
      "description": "The American Football is a classic ball used in American football games. It is designed for throwing and catching, making it an essential piece of equipment for the sport.",
      "features": [
        "Everyday accessories",
        "As pictured",
        "Sample collection"
      ],
      "details": "The American Football is a classic ball used in American football games. It is designed for throwing and catching, making it an essential piece of equipment for the sport. This is a sample listing with reference photography. Other items shown for styling are not included.",
      "fit": "One size. The sample photo shows the style and finish.",
      "care": "Follow the original product care instructions. Keep clean and dry; store away from direct heat.",
      "gallery": [
        "Full view",
        "Upper detail",
        "Detail crop"
      ],
      "images": {
        "pictured": [
          "assets/photos/sample-137-pictured-1.webp"
        ]
      },
      "photoCredit": "DummyJSON sample product photography. Demo reference only."
    }
  ]);
  // END IMPORTED SAMPLES
  const catalog = Object.fromEntries(products.map((product) => [product.id, product]));
  const photo = (product, color = product.colors[0], view = 0) => {
    const images = product.images?.[color];
    return images?.[view] || images?.[0] || `assets/photos/${product.id}-${color}-front.jpg`;
  };
  const productUrl = (product, color = product.colors[0]) => `product.html?id=${product.id}&color=${color}`;
  if (typeof window !== 'undefined') window.AuroraCatalog = { products, catalog, colors, photo, productUrl };
  if (typeof module !== 'undefined' && module.exports) module.exports = { products, colors };
})();

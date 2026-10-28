// Import 50 demo apparel/accessory records and save their real product photographs locally.
// Existing products and photography are preserved. Run from the project directory.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const groups = [
  ['mens-shirts', 5, 'essentials'], ['tops', 5, 'essentials'],
  ['womens-dresses', 5, 'essentials'], ['mens-shoes', 5, 'footwear'],
  ['womens-shoes', 5, 'footwear'], ['womens-bags', 5, 'accessories'],
  ['sunglasses', 5, 'accessories'], ['mens-watches', 6, 'accessories'],
  ['womens-watches', 5, 'accessories'], ['womens-jewellery', 3, 'accessories'],
  ['sports-accessories', 1, 'accessories']
];
const catalogFile = 'catalog.js';
let code = await readFile(catalogFile, 'utf8');
const marker = '  // BEGIN IMPORTED SAMPLES';
const end = '  // END IMPORTED SAMPLES';
const products = [], sources = [];
await mkdir('assets/photos', { recursive:true });
for (const [group, count, category] of groups) {
  const response = await fetch(`https://dummyjson.com/products/category/${group}?limit=${count}`, { signal:AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Could not read ${group}`);
  const items = (await response.json()).products;
  if (items.length !== count) throw new Error(`Expected ${count} items in ${group}`);
  for (const item of items) {
    const id = `sample-${item.id}`, images = [];
    for (const [index, url] of item.images.slice(0,3).entries()) {
      const file = `${id}-pictured-${index + 1}.webp`;
      const path = `assets/photos/${file}`;
      let bytes;
      try { bytes = await readFile(path); } catch {}
      if (!bytes || bytes.toString('ascii',0,4) !== 'RIFF' || bytes.toString('ascii',8,12) !== 'WEBP') {
        const image = await fetch(url, { signal:AbortSignal.timeout(30000) });
        bytes = Buffer.from(await image.arrayBuffer());
        if (!image.ok || bytes.toString('ascii',0,4) !== 'RIFF' || bytes.toString('ascii',8,12) !== 'WEBP' || bytes.length < 1000) throw new Error(`Invalid photo ${url}`);
        await writeFile(path, bytes);
      }
      images.push(path);
      sources.push({ file, url, credit:'DummyJSON sample product photography. Demonstration catalog; not Aurora Atlas inventory.' });
    }
    if (!images.length) throw new Error(`No image for ${id}`);
    const label = group.replaceAll('-', ' ');
    products.push({
      id, name:item.title, type:label.charAt(0).toUpperCase() + label.slice(1), category,
      price:item.price, badge:'SAMPLE EDIT', colors:['pictured'],
      sizes:category === 'essentials' ? ['XS','S','M','L','XL'] : category === 'footwear' ? ['7','8','9','10','11'] : ['ONE SIZE'],
      description:item.description,
      features:category === 'essentials' ? ['Everyday styling','Easy to pair','Sample collection'] : category === 'footwear' ? ['Everyday footwear','Sizes 7–11','Sample collection'] : ['Everyday accessories','As pictured','Sample collection'],
      details:`${item.description} This is a sample listing with reference photography. Other items shown for styling are not included.`,
      fit:category === 'essentials' ? 'Sizes XS–XL. Check your body measurements before choosing.' : category === 'footwear' ? 'US shoe sizes 7–11. Check the size chart for length and fit before ordering.' : 'One size. The sample photo shows the style and finish.',
      care:'Follow the original product care instructions. Keep clean and dry; store away from direct heat.',
      gallery:['Full view', images.length > 1 ? 'Second view' : 'Upper detail', images.length > 2 ? 'Third view' : 'Detail crop'],
      images:{ pictured:images }, photoCredit:'DummyJSON sample product photography. Demo reference only.'
    });
  }
  console.log(`Prepared ${count} ${group.replaceAll('-', ' ')}.`);
}
if (products.length !== 50 || new Set(products.map((product)=>product.id)).size !== 50) throw new Error('Exactly 50 unique products are required.');
const block = marker + '\n  products.push(...' + JSON.stringify(products,null,2).replaceAll('\n','\n  ') + ');\n' + end;
if (code.includes(marker)) code = code.slice(0,code.indexOf(marker)) + block + code.slice(code.indexOf(end)+end.length);
else code = code.replace('  const catalog =', block + '\n  const catalog =');
await writeFile(catalogFile, code);
await writeFile('assets/photos/sample-sources.json', JSON.stringify(sources,null,2)+'\n');
console.log(`Imported ${products.length} products and ${sources.length} locally stored photographs.`);

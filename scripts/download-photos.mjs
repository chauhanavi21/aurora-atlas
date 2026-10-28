// Download the demo product photography used by this concept storefront.
// Source URLs and image credits are kept in assets/photos/sources.json.
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const samples = [
  ['studio-obsidian-front', '465185', '09', 'item'],
  ['studio-navy-front', '465185', '69', 'item'],
  ['range-mist-front', '422992', '04', 'item'],
  ['range-obsidian-front', '422992', '09', 'item'],
  ['range-navy-front', '422992', '69', 'item'],
  ['motion-navy-front', '424873', '69', 'item'],
  ['motion-obsidian-front', '424873', '09', 'item'],
  ['core-obsidian-front', '422990', '09', 'item'],
  ['core-navy-front', '422990', '69', 'item'],
  ['boreal-obsidian-front', '460914', '09', 'item'],
  ['boreal-glacier-front', '460914', '01', 'item'],
  ['boreal-teal-front', '460914', '58', 'item'],
  ['drift-moss-front', '449753', '56', 'item'],
  ['drift-chalk-front', '449753', '01', 'item'],
  ['drift-obsidian-front', '449753', '09', 'item'],
  ['terrain-obsidian-front', '459618', '09', 'item'],
  ['terrain-moss-front', '459618', '57', 'item'],
  ['transit-moss-front', '461053', '57', 'item'],
  ['transit-obsidian-front', '461053', '09', 'item'],
  ['transit-chalk-front', '461053', '30', 'item']
];
const sources = samples.map(([name, code, color, view]) => {
  const path = view === 'item' ? `item/goods_${color}_${code}_3x4.jpg` : `sub/goods_${color}_${code}_${view}_3x4.jpg`;
  const url = `https://image.uniqlo.com/UQ/ST3/WesternCommon/imagesgoods/${code}/${path}?width=1200`;
  return { file: `${name}.jpg`, url, credit: 'UNIQLO product photography. Demo reference only; not Aurora Atlas inventory.' };
});
const product = process.argv.slice(2).find((argument) => !argument.startsWith('--'));
const pending = sources.filter((source) => !product || source.file.startsWith(`${product}-`));
if (!pending.length) throw new Error(`Unknown product: ${product}`);
await mkdir('assets/photos', { recursive: true });
const isJpeg = (bytes) => bytes.length > 10000 && bytes[0] === 0xff && bytes[1] === 0xd8;
async function download(source) {
  const target = `assets/photos/${source.file}`;
  if (!process.argv.includes('--refresh')) {
    try { if (isJpeg(await readFile(target))) return; } catch {}
  }
  const response = await fetch(source.url, { signal: AbortSignal.timeout(30000) });
  const bytes = Buffer.from(await response.arrayBuffer());
  const url = source.url;
  if (!response.ok || !response.headers.get('content-type')?.includes('image')) throw new Error(`Photo unavailable: ${url}`);
  if (!isJpeg(bytes)) throw new Error(`Invalid JPEG: ${source.file}`);
  await writeFile(target, bytes);
  console.log(`${source.file}: ${bytes.length} bytes`);
}
const failures = [];
for (let index = 0; index < pending.length; index += 6) {
  const results = await Promise.allSettled(pending.slice(index, index + 6).map(download));
  failures.push(...results.filter((result) => result.status === 'rejected'));
}
if (failures.length) throw new AggregateError(failures.map((result) => result.reason), 'Some photos could not be downloaded; source manifest left unchanged.');
// Keep the full manifest even when downloading just one product.
for (const source of sources) {
  if (!isJpeg(await readFile(`assets/photos/${source.file}`))) throw new Error(`Missing or invalid photo: ${source.file}`);
}
await writeFile('assets/photos/sources.json', JSON.stringify(sources.sort((a, b) => a.file.localeCompare(b.file)), null, 2) + '\n');

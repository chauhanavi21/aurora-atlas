// Download the demo product photography used by this concept storefront.
// Source URLs and image credits are kept in assets/photos/sources.json.
import { mkdir, writeFile } from 'node:fs/promises';

const samples = [
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
await mkdir('assets/photos', { recursive: true });
const sources = [];
const results = await Promise.allSettled(samples.map(async ([name, code, color, view]) => {
  const path = view === 'item' ? `item/goods_${color}_${code}_3x4.jpg` : `sub/goods_${color}_${code}_${view}_3x4.jpg`;
  const url = `https://image.uniqlo.com/UQ/ST3/WesternCommon/imagesgoods/${code}/${path}?width=1200`;
  const response = await fetch(url);
  if (!response.ok || !response.headers.get('content-type')?.includes('image')) throw new Error(`Photo unavailable: ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(`assets/photos/${name}.jpg`, bytes);
  sources.push({ file: `${name}.jpg`, url, credit: 'UNIQLO product photography. Demo reference only; not Aurora Atlas inventory.' });
  console.log(`${name}: ${bytes.length} bytes`);
}));
const failures = results.filter((result) => result.status === 'rejected');
failures.forEach((result) => console.error(result.reason.message));
if (failures.length) process.exitCode = 1;
await writeFile('assets/photos/sources.json', JSON.stringify(sources.sort((a, b) => a.file.localeCompare(b.file)), null, 2) + '\n');

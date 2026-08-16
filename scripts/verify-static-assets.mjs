import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const swPath = resolve(root, 'sw.js');
const sw = readFileSync(swPath, 'utf8');

const match = sw.match(/const STATIC_ASSETS=\[(.*?)\];/s);
if (!match) throw new Error('STATIC_ASSETS was not found in sw.js');

const assets = [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
const missing = assets.filter((asset) => {
  if (!asset.startsWith('/')) return false;
  return !existsSync(resolve(root, `.${asset}`));
});

if (missing.length) {
  console.error('Missing service-worker assets:');
  for (const asset of missing) console.error(`- ${asset}`);
  process.exit(1);
}

console.log(`Static asset integrity: PASS (${assets.length} assets)`);

import fs from 'node:fs';
import path from 'node:path';

const src = process.cwd();
const out = path.join(src, 'dist');

const skipNames = new Set([
  '.git', '.github', '.devcontainer', '.vscode',
  'node_modules', 'dist', 'scripts', 'supabase',
  'tests', 'docs'
]);

const skipSuffixes = [
  '.md', '.MD', '.txt', '.patch', '.sql', '.dump', '.bak',
  '.log', '.pem', '.key', '.crt', '.tf', '.tfvars'
];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

function shouldSkip(name) {
  if (name === 'package.json' || name === 'package-lock.json') return true;
  return skipSuffixes.some((suffix) => name.endsWith(suffix));
}

function copyEntry(relativePath) {
  const source = path.join(src, relativePath);
  const target = path.join(out, relativePath);
  const stat = fs.lstatSync(source);

  if (stat.isDirectory()) {
    if (skipNames.has(path.basename(relativePath))) return;
    fs.mkdirSync(target, { recursive: true });
    for (const child of fs.readdirSync(source)) {
      copyEntry(path.join(relativePath, child));
    }
    return;
  }

  if (!shouldSkip(path.basename(relativePath))) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
}

for (const entry of fs.readdirSync(src)) {
  if (!skipNames.has(entry)) copyEntry(entry);
}

const commit =
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.CF_PAGES_GIT_COMMIT_SHA ||
  'unknown';

const branch = process.env.CF_PAGES_BRANCH || 'main';

fs.writeFileSync(
  path.join(out, 'release.json'),
  JSON.stringify({ service: 'globall-cloud', commit, ref: branch }) + '\n',
  'utf8'
);

if (!fs.existsSync(path.join(out, 'index.html'))) {
  throw new Error('Cloudflare build error: dist/index.html was not created');
}

if (!fs.existsSync(path.join(out, 'functions'))) {
  throw new Error('Cloudflare build error: dist/functions was not created');
}

console.log('Cloudflare Pages: dist bundle created');

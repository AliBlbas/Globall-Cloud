import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'dist');
const workerTemplate = path.join(root, 'scripts', 'cloudflare-worker.js');

const skippedDirectories = new Set([
  '.git',
  '.github',
  '.devcontainer',
  '.vscode',
  'node_modules',
  'dist',
  'scripts',
  'supabase',
  'tests',
  'docs',
  'functions',
]);

const skippedSuffixes = [
  '.md',
  '.MD',
  '.txt',
  '.patch',
  '.sql',
  '.dump',
  '.bak',
  '.log',
  '.pem',
  '.key',
  '.crt',
  '.tf',
  '.tfvars',
];

function shouldSkipFile(name) {
  if (name === 'package.json' || name === 'package-lock.json') return true;
  if (name === '.env' || name.startsWith('.env.')) return true;
  return skippedSuffixes.some((suffix) => name.endsWith(suffix));
}

function copyEntry(relativePath) {
  const source = path.join(root, relativePath);
  const target = path.join(out, relativePath);
  const stat = fs.lstatSync(source);
  const name = path.basename(relativePath);

  if (stat.isDirectory()) {
    if (skippedDirectories.has(name)) return;
    fs.mkdirSync(target, { recursive: true });

    for (const child of fs.readdirSync(source)) {
      copyEntry(path.join(relativePath, child));
    }
    return;
  }

  if (shouldSkipFile(name)) return;

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

if (!fs.existsSync(workerTemplate)) {
  throw new Error('Cloudflare build error: scripts/cloudflare-worker.js is missing');
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const entry of fs.readdirSync(root)) {
  if (!skippedDirectories.has(entry)) {
    copyEntry(entry);
  }
}

fs.copyFileSync(workerTemplate, path.join(out, '_worker.js'));

const commit =
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.CF_PAGES_GIT_COMMIT_SHA ||
  'unknown';

const branch = process.env.CF_PAGES_BRANCH || 'main';

fs.writeFileSync(
  path.join(out, 'release.json'),
  JSON.stringify({
    service: 'globall-cloud',
    commit,
    ref: branch,
  }) + '\n',
  'utf8',
);

if (!fs.existsSync(path.join(out, 'index.html'))) {
  throw new Error('Cloudflare build error: dist/index.html was not created');
}

if (!fs.existsSync(path.join(out, '_worker.js'))) {
  throw new Error('Cloudflare build error: dist/_worker.js was not created');
}

console.log('Cloudflare Pages: static bundle + advanced _worker.js created');

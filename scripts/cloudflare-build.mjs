/* Globall Cloud — Cloudflare Pages production build
 * Builds the deployable Pages root into ./public.
 * Keeps Pages Functions at ./public/functions so Cloudflare can execute them.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'public');

const skippedDirectories = new Set([
  '.git','.github','.devcontainer','.vscode','node_modules','dist','public','scripts','supabase','tests','docs'
]);
const skippedSuffixes = ['.md','.MD','.txt','.patch','.sql','.dump','.bak','.log','.pem','.key','.crt','.tf','.tfvars'];
const keepFiles = new Set(['package.json']);

function shouldSkipFile(name){
  if (name === 'package-lock.json' || name === 'pnpm-lock.yaml' || name === 'yarn.lock' || name === 'bun.lockb') return true;
  if (name === '.env' || name.startsWith('.env.')) return true;
  return !keepFiles.has(name) && skippedSuffixes.some(s => name.endsWith(s));
}

function copyEntry(relativePath){
  const source=path.join(root,relativePath);
  const target=path.join(out,relativePath);
  const stat=fs.lstatSync(source);
  const name=path.basename(relativePath);
  if(stat.isDirectory()){
    if(skippedDirectories.has(name)) return;
    fs.mkdirSync(target,{recursive:true});
    for(const child of fs.readdirSync(source)) copyEntry(path.join(relativePath,child));
    return;
  }
  if(shouldSkipFile(name)) return;
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.copyFileSync(source,target);
}

fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
for(const entry of fs.readdirSync(root)){
  if(entry==='functions') continue;
  if(!skippedDirectories.has(entry)) copyEntry(entry);
}

// Cloudflare Pages Functions must remain at the deploy root.
const functionsDir=path.join(root,'functions');
if(fs.existsSync(functionsDir)){
  fs.cpSync(functionsDir,path.join(out,'functions'),{recursive:true});
}

const commit=process.env.CF_PAGES_COMMIT_SHA||process.env.CF_PAGES_GIT_COMMIT_SHA||'unknown';
const branch=process.env.CF_PAGES_BRANCH||'main';
fs.writeFileSync(path.join(out,'release.json'),JSON.stringify({service:'globall-cloud',commit,ref:branch})+'\n','utf8');

for(const required of ['index.html','_headers','_redirects','functions/_middleware.js','functions/api/health.js']){
  if(!fs.existsSync(path.join(out,required))) throw new Error(`Cloudflare build error: missing ${required}`);
}

console.log('Cloudflare Pages: public bundle created with Pages Functions');

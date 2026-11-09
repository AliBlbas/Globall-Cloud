import fs from 'node:fs';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const releaseCss = fs.readFileSync(new URL('../gc-public-release-20261107.css', import.meta.url), 'utf8');
const redirects = fs.readFileSync(new URL('../_redirects', import.meta.url), 'utf8');

const checks = [
  ['homepage loads the final public release stylesheet', index.includes('gc-public-release-20261107.css?v=1')],
  ['homepage has a keyboard skip link', index.includes('class="gc-skip-link" href="#gcMain"')],
  ['homepage exposes Organization structured data', index.includes('"@type":"Organization"')],
  ['tracking input is bounded and spellcheck-safe', index.includes('maxlength="128" spellcheck="false" aria-label="GC Code یان Tracking ID"')],
  ['contact form fields expose autocomplete metadata', index.includes('name="name" autocomplete="name" required') && index.includes('name="email" autocomplete="email" required')],
  ['footer exposes privacy and terms entry points', index.includes('href="/#privacy"') && index.includes('href="/#terms"')],
  ['release CSS protects reduced motion', releaseCss.includes('@media (prefers-reduced-motion: reduce)')],
  ['release CSS provides mobile action layout', releaseCss.includes('@media (max-width: 760px)') && releaseCss.includes('.gc-public-site .gc-actions')],
  ['redirect file contains no escaped newline records', !redirects.includes('\\n')],
  ['staff portal aliases are individual redirect records', redirects.includes('/staff-portal /staff-os-v5.html 200') && redirects.includes('/staff-portal/ /staff-os-v5.html 200')],
  ['tracking aliases are loop-free direct rewrites', redirects.includes('/track /track/index.html 200') && redirects.includes('/tracking /track/index.html 200') && !redirects.includes('/tracking-integration.html /track 301')],
];

let failed = 0;
for (const [label, ok] of checks) {
  if (ok) console.log(`✓ ${label}`);
  else { console.error(`✗ ${label}`); failed += 1; }
}
if (failed) process.exit(1);
console.log(`Public release smoke: ${checks.length} checks passed`);

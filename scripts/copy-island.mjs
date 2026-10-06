// Copies the island game into public/island so the site serves it at /island/index.html.
// Only index.html and src/ go: _shots, _ref and _test are working files, never shipped.
// Runs before dev and build (package.json). public/island/ is gitignored, island/ is the source.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(root, 'island');
const to = join(root, 'public', 'island');

if (!existsSync(join(from, 'index.html'))) {
  console.error('copy-island: island/index.html is missing, nothing copied');
  process.exit(1);
}

// Start clean so a file deleted from island/src does not linger in the build.
rmSync(to, { recursive: true, force: true });
mkdirSync(to, { recursive: true });
cpSync(join(from, 'index.html'), join(to, 'index.html'));
cpSync(join(from, 'src'), join(to, 'src'), { recursive: true });
console.log('copy-island: island/index.html and island/src copied to public/island');

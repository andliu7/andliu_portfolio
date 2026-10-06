// The copy and content guard (SITE-PLAN.md 2.4, "Enforcement"). Every piece runs it before
// returning; integration runs it with no arguments, and it must pass.
//
//   node scripts/check-text.mjs                 the whole check
//   node scripts/check-text.mjs --only app/sections/hero,components/ui/portfolio-hero.tsx
//                                               the same check, reporting only findings in files
//                                               under those paths (for a piece checking its own
//                                               files while others are mid-edit)
//
// Rules:
//   copy       a string literal, template part or JSX text of more than 3 words in a section,
//              About, chat or mascot file (copy belongs in lib/site.ts), via the TypeScript API
//   emdash     no U+2014 in app/ components/ lib/ worker/ scripts/ SITE-PLAN.md
//   demo       no demo strings left over from the saved 21st.dev components
//   banned     no leftovers of the removed island metaphor (photo TODOs, the header map, zone ids)
//   island     no island image path outside app/sections/island* (the finale owns it)
//   title      the Blueberry title is typed once, in lib/site.ts (BLUEBERRY_TITLE)
//   garden     no "The garden" entry in lib/site.ts (gardening is not a hobby, plan A12)
//   mit        glyph-portal keeps its MIT notice
//   images     every IMAGES file that exists is at least its declared width
//   portraits  every PORTRAITS src and cutout exists
//   impact     lib/impact.json and IMPACT list the same series, each with a source; size caps
//   prompt     worker/system-prompt.txt is what scripts/build-system-prompt.mjs generates

import { existsSync, readFileSync, readdirSync, statSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rel = file => relative(root, file).split(sep).join('/');
const findings = [];
const fail = (rule, file, line, message) => findings.push({ rule, file, line, message });

const onlyArg = process.argv.indexOf('--only');
const only = onlyArg > -1 ? (process.argv[onlyArg + 1] ?? '').split(',').filter(Boolean) : null;

// ---------------------------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------------------------

const TEXT = /\.(tsx?|mjs|cjs|jsx?|css|json|md|txt|html|toml)$/;

function walk(dir, out = []) {
  const abs = join(root, dir);
  if (!existsSync(abs)) return out;
  if (statSync(abs).isFile()) { out.push(abs); return out; }
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const child = join(dir, entry.name);
    if (entry.isDirectory()) walk(child, out);
    else if (TEXT.test(entry.name)) out.push(join(root, child));
  }
  return out;
}

const files = dirs => [...new Set(dirs.flatMap(dir => walk(dir)))];
const read = file => readFileSync(file, 'utf8');
const lineOf = (text, index) => text.slice(0, index).split('\n').length;

function grepRule(rule, dirs, needles, { skip = () => false, message } = {}) {
  for (const file of files(dirs)) {
    if (skip(rel(file))) continue;
    const text = read(file);
    for (const needle of needles) {
      let at = text.indexOf(needle);
      while (at !== -1) {
        fail(rule, rel(file), lineOf(text, at), message ? message(needle) : `"${needle}"`);
        at = text.indexOf(needle, at + needle.length);
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------
// copy: more than 3 words inline in a section, About, chat or mascot file
// ---------------------------------------------------------------------------------------------

// A "word" is natural language: letters, maybe an apostrophe, maybe one closing punctuation mark.
// Selectors, class lists, CSS values and paths ("a[href]", "var(--line)", "expo.out") are not.
const WORD = /^[A-Za-z][A-Za-z'’]*[,.;:!?]?$/;
const words = text => text.split(/\s+/).filter(token => WORD.test(token)).length;

const SKIP_ATTRS = new Set(['className', 'style', 'd', 'viewBox', 'points', 'transform', 'sizes', 'srcSet', 'media', 'aria-hidden']);

function skipped(node) {
  for (let up = node.parent; up; up = up.parent) {
    if (ts.isImportDeclaration(up) || ts.isExportDeclaration(up)) return true;
    if (ts.isJsxAttribute(up) && SKIP_ATTRS.has(up.name.getText())) return true;
    if (ts.isPropertyAssignment(up) && SKIP_ATTRS.has(up.name.getText().replace(/['"]/g, ''))) return true;
    if (ts.isLiteralTypeNode(up)) return true;
  }
  return false;
}

function checkCopy(file) {
  const text = read(file);
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const report = (node, value) => {
    if (words(value) > 3 && !skipped(node)) {
      const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      fail('copy', rel(file), line, `inline copy "${value.trim().slice(0, 60)}" (move it to lib/site.ts)`);
    }
  };
  const visit = node => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) report(node, node.text);
    else if (ts.isTemplateExpression(node)) {
      report(node, node.head.text);
      node.templateSpans.forEach(span => report(span.literal, span.literal.text));
    } else if (ts.isJsxText(node)) report(node, node.text);
    ts.forEachChild(node, visit);
  };
  visit(source);
}

const COPY_DIRS = ['app/sections', 'app/about', 'components/chat', 'components/mascot'];
for (const file of files(COPY_DIRS)) {
  const name = rel(file);
  if (!/\.tsx?$/.test(name) || /\.test\.|\/fixtures\//.test(name) || name.endsWith('.d.ts')) continue;
  checkCopy(file);
}

// ---------------------------------------------------------------------------------------------
// emdash, demo, banned, island, title, garden, mit
// ---------------------------------------------------------------------------------------------

grepRule('emdash', ['app', 'components', 'lib', 'worker', 'scripts', 'SITE-PLAN.md'], [String.fromCharCode(0x2014)], { message: () => 'an em dash' });

grepRule('demo', ['app', 'components/site', 'components/chat', 'components/mascot', 'lib'], [
  '21st.dev', 'cdn.21st', 'design-layer', 'Orbit Delivery', 'guglielmo', 'SUBLIME', 'Happy Clients',
  'Hover me', '#C3E41D', 'Lobster', 'Cormorant', 'Saira', 'Jost', 'Discover', 'Skiper', '#6366f1',
  'bg-orange-500',
]);

grepRule('banned', ['app', 'components', 'lib'], ['TODO(photo)', 'minimap', 'data-zone', 'data-island-zone', 'visitIsland', 'zoneName']);

// lib/site.ts is the image registry: it declares the island still for #island (plan 2.6).
grepRule('island', ['app', 'components', 'lib'], ['/images/island/', '/media/island/'], {
  skip: name => name.startsWith('app/sections/island') || name === 'lib/site.ts',
  message: needle => `${needle} outside #island`,
});

const TITLE = /co-?founder/i;
for (const file of files(['app', 'components', 'lib', 'scripts', 'worker/prompt-header.txt'])) {
  const name = rel(file);
  read(file).split('\n').forEach((line, i) => {
    if (!TITLE.test(line)) return;
    if (name === 'lib/site.ts' && line.startsWith('export const BLUEBERRY_TITLE =')) return;
    fail('title', name, i + 1, 'the Blueberry title typed outside BLUEBERRY_TITLE');
  });
}

const sitePath = join(root, 'lib/site.ts');
const siteText = read(sitePath);
if (siteText.split('\n').filter(line => line.startsWith('export const BLUEBERRY_TITLE =')).length !== 1) {
  fail('title', 'lib/site.ts', 0, 'BLUEBERRY_TITLE must be declared exactly once');
}
if (siteText.includes('The garden')) fail('garden', 'lib/site.ts', lineOf(siteText, siteText.indexOf('The garden')), '"The garden" (gardening is not a hobby)');

const portal = join(root, 'components/ui/glyph-portal.tsx');
if (!existsSync(portal) || !/Glyph Portal © 2026 Christian Katzmann\. MIT\./.test(read(portal)) || !read(portal).includes('Keep this notice with copies.')) {
  fail('mit', 'components/ui/glyph-portal.tsx', 1, 'the MIT notice is missing or changed');
}

// ---------------------------------------------------------------------------------------------
// images and portraits: lib/site.ts has no imports, so it transpiles and loads on its own
// ---------------------------------------------------------------------------------------------

async function loadSite() {
  const js = ts.transpileModule(siteText, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const dir = mkdtempSync(join(tmpdir(), 'check-text-'));
  const out = join(dir, 'site.mjs');
  writeFileSync(out, js);
  try { return await import(pathToFileURL(out).href); } finally { rmSync(dir, { recursive: true, force: true }); }
}

// The pixel width from the file header: PNG, JPEG, WebP (VP8, VP8L, VP8X) or SVG.
function imageWidth(file) {
  const b = readFileSync(file);
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return b.readUInt32BE(16);
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i += 1; continue; }
      const marker = b[i + 1];
      const size = b.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return b.readUInt16BE(i + 7);
      i += 2 + size;
    }
    return null;
  }
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = b.toString('ascii', 12, 16);
    if (chunk === 'VP8 ') return b.readUInt16LE(26) & 0x3fff;
    if (chunk === 'VP8L') return 1 + (((b[22] & 0x3f) << 8) | b[21]);
    if (chunk === 'VP8X') return 1 + b.readUIntLE(24, 3);
  }
  // SVG: the root's width attribute, else the third number of its viewBox (it scales, so this
  // is the size it was drawn at, not a pixel limit).
  const svg = /<svg\b[^>]*>/i.exec(b.toString('latin1', 0, 4096));
  if (svg) {
    const width = /\swidth=['"]([\d.]+)/i.exec(svg[0]);
    const box = /\sviewBox=['"][\d.-]+[\s,]+[\d.-]+[\s,]+([\d.]+)/i.exec(svg[0]);
    if (width || box) return Number((width ?? box)[1]);
  }
  return null;
}

function checkWidth(key, src, min) {
  const file = join(root, 'public', src);
  if (!existsSync(file)) return; // not produced yet (capture runs in batch 2)
  const width = imageWidth(file);
  if (width === null) fail('images', `public${src}`, 0, `${key}: unreadable image header`);
  else if (width < min) fail('images', `public${src}`, 0, `${key}: ${width}px wide, declared ${min}px`);
}

const site = await loadSite();
for (const [key, image] of Object.entries(site.IMAGES)) {
  checkWidth(key, image.src, image.w);
  if (image.sm) checkWidth(key, image.sm, image.smW ?? 800);
  for (const entry of image.srcset ?? []) checkWidth(key, entry.src, entry.w);
}
for (const [id, portrait] of Object.entries(site.PORTRAITS)) {
  for (const src of [portrait.src, portrait.cutout]) {
    if (src && !existsSync(join(root, 'public', src))) fail('portraits', 'lib/site.ts', 0, `PORTRAITS.${id}: ${src} is not in public/`);
  }
}

// ---------------------------------------------------------------------------------------------
// impact and the deck: generated files, checked when they exist
// ---------------------------------------------------------------------------------------------

const impactPath = join(root, 'lib/impact.json');
if (existsSync(impactPath)) {
  const raw = read(impactPath);
  if (Buffer.byteLength(raw) > 40 * 1024) fail('impact', 'lib/impact.json', 0, 'over 40 KB');
  if (/[A-Za-z]:[\\/]/.test(raw)) fail('impact', 'lib/impact.json', 0, 'an absolute path (sources are relative to Projects/)');
  const json = JSON.parse(raw);
  const inJson = new Map();
  for (const panel of json.panels ?? []) for (const series of panel.series ?? []) inJson.set(series.id, series);
  const inCopy = new Set(site.IMPACT.flatMap(panel => panel.series.map(series => series.id)));
  for (const [id, series] of inJson) {
    if (!inCopy.has(id)) fail('impact', 'lib/impact.json', 0, `series ${id} has no IMPACT copy in lib/site.ts`);
    if (typeof series.source !== 'string' || !series.source.trim()) fail('impact', 'lib/impact.json', 0, `series ${id} has no source`);
  }
  for (const id of inCopy) if (!inJson.has(id)) fail('impact', 'lib/site.ts', 0, `IMPACT series ${id} is not in lib/impact.json`);
}

const deckPath = join(root, 'lib/bb-deck.json');
if (existsSync(deckPath) && statSync(deckPath).size > 20 * 1024) fail('impact', 'lib/bb-deck.json', 0, 'over 20 KB');

// ---------------------------------------------------------------------------------------------
// prompt: the chat piece's generator decides; --check exits 1 when the file is stale
// ---------------------------------------------------------------------------------------------

if (existsSync(join(root, 'scripts/build-system-prompt.mjs'))) {
  const run = spawnSync(process.execPath, ['scripts/build-system-prompt.mjs', '--check'], { cwd: root, encoding: 'utf8' });
  if (run.status !== 0) fail('prompt', 'worker/system-prompt.txt', 0, `not what scripts/build-system-prompt.mjs generates ${(run.stdout + run.stderr).trim().slice(0, 200)}`);
}

// ---------------------------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------------------------

const shown = only ? findings.filter(f => only.some(prefix => f.file.startsWith(prefix))) : findings;
for (const f of shown) console.log(`${f.rule.padEnd(9)} ${f.file}${f.line ? `:${f.line}` : ''}  ${f.message}`);
if (shown.length) {
  console.log(`\ncheck-text: ${shown.length} finding${shown.length === 1 ? '' : 's'}${only ? ` under ${only.join(', ')}` : ''}`);
  process.exit(1);
}
console.log(`check-text: clean${only ? ` under ${only.join(', ')}` : ''}`);

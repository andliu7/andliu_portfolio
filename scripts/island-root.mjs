// Runs after `vinext build`. For now andliu.dev opens straight into the island game (Andrew's call,
// 2026-09-30): the built portfolio page moves to /classic/ and the root becomes a tiny page that
// forwards to /island/. The game itself ships as plain files from public/island/, which Vite copies
// into dist/client untouched. Delete this script when the scroll site replaces the root.
import fs from 'node:fs';
import path from 'node:path';

const out = path.resolve('dist/client');
const root = path.join(out, 'index.html');
const classic = path.join(out, 'classic');

if (!fs.existsSync(path.join(out, 'island', 'index.html'))) {
  console.error('island-root: dist/client/island/index.html is missing, refusing to point the root at it');
  process.exit(1);
}

fs.mkdirSync(classic, { recursive: true });
fs.renameSync(root, path.join(classic, 'index.html'));   // asset URLs are absolute, so it still loads from /classic/

fs.writeFileSync(root, `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Andrew Liu</title>
<meta name="description" content="Andrew Liu: CS and pre-dental at UMD. Drive around an island built from my résumé.">
<meta http-equiv="refresh" content="0; url=/island/">
<link rel="canonical" href="https://andliu.dev/island/">
<script>location.replace('/island/' + location.hash);</script>
</head>
<body style="font-family:system-ui,sans-serif;padding:24px">
<p><a href="/island/">Enter the island</a> or read the <a href="/classic/">classic portfolio</a>.</p>
</body>
</html>
`);
console.log('island-root: / now forwards to /island/, the portfolio page is at /classic/');

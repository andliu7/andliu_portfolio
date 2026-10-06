// Builds the chatbot's system prompt from lib/site.ts, so the bot can only know what the site
// says (SITE-PLAN.md 6.5). worker/prompt-header.txt holds the hand-written rules and a {{FACTS}}
// marker; this script fills the marker and writes worker/system-prompt.txt, which the Worker
// bundles as a text module.
//
//   node scripts/build-system-prompt.mjs           write worker/system-prompt.txt
//   node scripts/build-system-prompt.mjs --check   exit 1 if the file on disk is stale
//                                                  (scripts/check-text.mjs runs this)
//
// How lib/site.ts is loaded: it is TypeScript with no imports, so ts.transpileModule turns it
// into plain JavaScript in memory, and a data: URL imports that string as a module. Nothing is
// written to disk and nothing else is compiled.
//
// Andrew's Blueberry title comes only from BLUEBERRY_TITLE (and what lib/site.ts derives from
// it); it is never typed here or in the header.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const HEADER = join(root, 'worker/prompt-header.txt');
const OUT = join(root, 'worker/system-prompt.txt');

async function loadSite() {
  const source = readFileSync(join(root, 'lib/site.ts'), 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
}

const plain = text => text.replace(/\*/g, ''); // two-voice markers, never meant for reading
const join2 = list => list.filter(Boolean).join(' ');

function facts(s) {
  const out = [];
  const section = (title, lines) => out.push(`## ${title}`, ...lines, '');

  section('Who he is', [
    `${s.IDENTITY.name}. ${s.IDENTITY.short}`,
    `${s.IDENTITY.degree}, ${s.IDENTITY.school}. ${s.IDENTITY.expected}.`,
    `Based in ${s.IDENTITY.based}.`,
    `In his words: "${s.IDENTITY.line}"`,
    `${s.IDENTITY.tagline} ${s.IDENTITY.why}`,
  ]);

  section('What he is doing now', s.CURRENTLY.map(line => `- ${line}`));

  section('Blueberry', [
    `His title: ${s.BLUEBERRY_TITLE}, ${s.TICKET.when}.`,
    `${s.BLUEBERRY_CHAPTER.headlinePlain} ${s.BLUEBERRY_CHAPTER.sell}`,
    s.BLUEBERRY_CHAPTER.story,
    ...s.BB_ENGINEERING.claims.map(claim => `- ${claim}`),
    s.BB_ENGINEERING.architecture,
    `Stack: ${s.BB_ENGINEERING.stack.join(', ')}.`,
    ...s.BB_FACTS.filter(f => f.value !== undefined).map(f => `- ${f.value} ${f.label}`),
    `Live: ${s.BLUEBERRY.live} Source: ${s.BLUEBERRY.source}`,
  ]);

  section('Projects', s.PROJECTS.map(p => {
    const head = join2([`${p.title}`, p.year ? `(${p.year})` : '', `: ${p.kind}.`]).replace(' :', ':');
    const links = p.links.map(l => `${l.kind} ${l.href}`).join(', ');
    return `- ${join2([head, ...p.lines, p.note ?? '', p.tags.length ? `Tags: ${p.tags.join(', ')}.` : '', links ? `Links: ${links}.` : ''])}`;
  }));

  section('Experience', s.JOBS.map(j => `- ${j.role}, ${j.org}, ${j.place}, ${j.when}. ${j.line}`));

  section('Education', [
    `${s.EDUCATION.degree}, ${s.EDUCATION.school}. ${s.EDUCATION.expected}.`,
    `${s.EDUCATION.courseworkLabel}: ${s.EDUCATION.coursework.join(', ')}.`,
    `${s.EDUCATION.certsLabel}: ${s.CERTS.map(c => `${c.name} (${c.issuer})`).join('; ')}.`,
  ]);

  section('Skills', s.SKILLS.map(g => `- ${g.group}: ${g.items.join(', ')}`));

  section('What he is good at', [
    ...s.ABOUT.things.map(t => `- ${t.title}: ${t.line}`),
    ...s.ABOUT.stats.map(st => `- ${st.value}${st.suffix} ${st.label}`),
  ]);

  section('Off the clock', [
    ...s.OFF_CLOCK.interests.map(i => `- ${i.word}: ${i.line}`),
    `- ${s.OFF_CLOCK.faith.word}: ${s.OFF_CLOCK.faith.line}`,
    `- ${s.OFF_CLOCK.garden}`,
  ]);

  section('The island', [
    `${s.ISLAND.tagline} It is the last thing on the home page, and it opens full screen only if the visitor chooses to play.`,
  ]);

  section('Contact', [
    `Email: ${s.EMAIL} (${plain(s.CONTACT.emailNote)})`,
    `GitHub: ${s.GITHUB}`,
    `LinkedIn: ${s.LINKEDIN}`,
    `Resume (PDF): https://andliu.dev${s.RESUME}`,
  ]);

  section('Approved short answers (match their facts, not necessarily their wording)',
    s.CHAT_FALLBACK.rules.map(r => `- ${r.intent}: ${r.answer}`));

  return out.join('\n').trim();
}

export async function build() {
  const site = await loadSite();
  const header = readFileSync(HEADER, 'utf8').replace(/\r\n/g, '\n');
  if (!header.includes('{{FACTS}}')) throw new Error('worker/prompt-header.txt has no {{FACTS}} marker');
  return header.replace('{{FACTS}}', facts(site)).trimEnd() + '\n';
}

const text = await build();
if (process.argv.includes('--check')) {
  const onDisk = existsSync(OUT) ? readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : null;
  if (onDisk !== text) {
    console.log('worker/system-prompt.txt is stale: run node scripts/build-system-prompt.mjs');
    process.exit(1);
  }
  console.log('worker/system-prompt.txt is current');
} else {
  writeFileSync(OUT, text);
  console.log(`wrote worker/system-prompt.txt (${text.length} chars)`);
}

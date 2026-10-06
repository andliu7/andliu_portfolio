// node --experimental-strip-types --test components/chat/
// The offline router against the real lib/site.ts: the four suggestion chips and five other
// questions each land on the right answer, and an off-topic question gets the default.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { route as Route } from './fallback';
import type * as Site from '@/lib/site';

// Imported by URL at run time (see sse.test.ts for why).
const { route } = await import(new URL('./fallback.ts', import.meta.url).href) as { route: typeof Route };
const site = await import(new URL('../../lib/site.ts', import.meta.url).href) as typeof Site;

const intent = (question: string) => route(question, site.CHAT_FALLBACK).intent;

void test('the four chips', () => {
  const [blueberry, built, dental, reach] = site.CHAT_SUGGESTIONS;
  assert.equal(intent(blueberry), 'blueberry');
  assert.equal(intent(built), 'projects');
  assert.equal(intent(dental), 'dental');
  assert.equal(intent(reach), 'contact');
});

void test('five other questions', () => {
  assert.equal(intent('Where does he go to school?'), 'education');
  assert.equal(intent('Did he do an internship anywhere?'), 'experience');
  assert.equal(intent('What does he do for fun?'), 'personal');
  assert.equal(intent('Can I play the island game?'), 'island');
  assert.equal(intent('Which programming languages does he know?'), 'skills');
});

void test('a keyword only counts at the start of a word', () => {
  // "email" contains "ai" (a skills keyword); it must still route to contact.
  assert.equal(intent('What is his email?'), 'contact');
});

void test('an off-topic question gets the default answer', () => {
  const answer = route('What is the weather like today?', site.CHAT_FALLBACK);
  assert.equal(answer.intent, null);
  assert.equal(answer.answer, site.CHAT_FALLBACK.default);
});

void test('the Blueberry answer carries the title from BLUEBERRY_TITLE', () => {
  const answer = route('What is Blueberry?', site.CHAT_FALLBACK).answer;
  assert.ok(answer.includes(site.BLUEBERRY_TITLE.toLowerCase()));
});

void test('a second question on the same topic never repeats the paragraph', () => {
  const first = route('What is Blueberry?', site.CHAT_FALLBACK);
  const second = route('What did he do at Blueberry?', site.CHAT_FALLBACK, new Set([first.intent ?? '']));
  assert.notEqual(second.answer, first.answer);
});

void test('a repeated question moves to the next topic it names', () => {
  // "internship" (experience) and "school" (education): experience first, then education.
  const question = 'Did he do an internship while at school?';
  const first = route(question, site.CHAT_FALLBACK);
  const second = route(question, site.CHAT_FALLBACK, new Set([first.intent ?? '']));
  assert.ok(first.intent && second.intent);
  assert.notEqual(first.intent, second.intent);
});

import type { CHAT_FALLBACK } from '@/lib/site';

// The offline answers (SITE-PLAN.md 6.4): a keyword router over CHAT_FALLBACK in lib/site.ts, so
// every word it can say is already on the site. Used when there is no Worker URL, the network
// fails, the Worker reports an error, or no first word arrives within 8 seconds.
//
// The data is passed in rather than imported, and the import above is `import type`, which is
// erased when the file runs. That keeps this file loadable by plain node in the tests
// (node --experimental-strip-types cannot resolve the "@/" alias); the panel passes the real
// CHAT_FALLBACK.

export type FallbackData = typeof CHAT_FALLBACK;
export type FallbackAnswer = { intent: string | null; answer: string };

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A keyword matches at the start of a word, so "chem" finds "chemistry" and "dent" finds
// "pre-dental", but "ai" does not fire inside "email".
function hits(question: string, keywords: readonly string[]) {
  return keywords.filter(keyword => new RegExp(`\\b${escape(keyword.toLowerCase())}`).test(question)).length;
}

/**
 * The rule with the most keyword hits wins; a tie goes to the earlier rule; none gives the default.
 *
 * `said` is the intents already answered in this conversation. A question that lands on one of
 * them moves to the next rule it also hits, so two different questions never get the same
 * paragraph twice in a row ("What is Blueberry?" then "What did he do at Blueberry?"). When it
 * hits nothing else, the default (which lists the other topics) answers instead.
 */
export function route(question: string, data: FallbackData, said: ReadonlySet<string> = new Set()): FallbackAnswer {
  const text = question.toLowerCase();
  const ranked = data.rules
    .map((rule, order) => ({ rule, order, n: hits(text, rule.keywords) }))
    .filter(r => r.n > 0)
    .sort((a, b) => b.n - a.n || a.order - b.order);
  const fresh = ranked.find(r => !said.has(r.rule.intent));
  if (fresh) return { intent: fresh.rule.intent, answer: fresh.rule.answer };
  return { intent: null, answer: data.default };
}

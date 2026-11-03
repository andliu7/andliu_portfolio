// Turns what someone said into what they meant, with rules and no model. These rules run in the
// browser, cost nothing and send nothing anywhere. That covers this cleanup only: the browser's
// speech recognition that produces the input may use its maker's servers, so no wording on the
// form should promise that speech stays on the device. Tests: lib/dictation.test.mjs.
//
// The input is one string per pause, as the browser's speech recognition reports them, and it is
// usually unpunctuated. cleanDictation is pure and is rerun on the whole dictation after every
// pause, so a correction can reach words said earlier, and never anything outside this dictation.
//
// A self-correction has three parts: the words being replaced, a cue, and the replacement.
//   "meet at the coffee shop | i mean | the library"
// Finding the cue is easy; finding where the replaced words start is the hard part. In order:
//   1. Anchor: the replacement's first word appears just before the cue, so cut back to it.
//   2. Like for like: a number, day or month replaces the nearest one of its kind.
//   3. Parallel: both sides share a word and differ in one, "called him | texted him".
//   4. A short replacement with no evidence replaces the last phrase.
//   5. Otherwise leave it all alone. A wrong edit is worse than a stray "I mean".
// "Scratch that" and "never mind" delete words, so they need proof too. They count only when there
// is something to delete and either nothing follows, or a comma or full stop sets them apart, or
// what follows opens a sentence of its own. "Scratch that lottery ticket" is an ordinary request.
// "Actually", "sorry" and "wait" are everyday words, so they need more than that: see replaceWeak.
// Approach after openWispr's SelfCorrectionDetector (MIT, github.com/RohitAg13/openWispr), written
// fresh and changed to work without commas, which speech recognition rarely supplies. "Let me
// rephrase" and "let me start over" come from its cue list. Its cues can rewrite ordinary sentences,
// so every cue here that is also everyday English has a guard, and the sentences that break it
// ("Hi John, sorry for the late reply") are tests.

// "Uh huh" and "mm hmm" are answers, so they stay. A filler with a comma each side takes both commas.
const FILLERS = /\b(?:uh[- ]huh|mm+[- ]hm+)\b|,\s*\b(?:um+|uh+|er+|erm+|hm+|mm+)\b,|\b(?:um+|uh+|er+|erm+|hm+|mm+)\b[,.]?/gi;
// Capitals mean a name rather than a noise: "the ER", "UH Manoa".
const dropFiller = (found: string) => (/[A-Z]{2}/.test(found) || /^(?:uh[- ]huh|mm+[- ]hm+)$/i.test(found) ? found : ' ');
const RESTARTS = [
  ['let', 'me', 'rephrase', 'that'], ['let', 'me', 'rephrase'], ['let', 'me', 'start', 'over'],
  ['no', 'scratch', 'that'], ['actually', 'scratch', 'that'], ['scratch', 'that'], ['strike', 'that'], ['never', 'mind'],
];
// Always a correction, unless guarded in notACorrection.
const CUES = [
  ['sorry', 'i', 'mean'], ['sorry', 'i', 'meant'], ['i', 'mean'], ['i', 'meant'], ['no', 'wait'], ['wait', 'no'], ['or', 'rather'],
  ['actually', 'make', 'that'], ['no', 'make', 'that'], ['make', 'that'], ['actually', 'no'], ['no', 'actually'],
];
// Everyday words too, so these only correct a like-for-like swap: "at 2 actually 3".
const WEAK_CUES = [['or', 'actually'], ['actually'], ['sorry'], ['wait']];

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
// Not "tonight": "tomorrow morning | tonight" would keep the morning.
const NEAR_DAYS = ['today', 'tomorrow', 'yesterday'];
const MONTHS = ['january', 'february', 'april', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
// Not in MONTHS, so they keep a small letter when they are the plain words: "may", "march".
const PLAIN_MONTHS = ['march', 'may'];
// Before "may", these make it the month: "by may".
const BEFORE_A_DATE = new Set(['by', 'in', 'for', 'until', 'till', 'before', 'after', 'since', 'from', 'of', 'during', 'through']);
const DATE_MODIFIERS = new Set(['next', 'this', 'last']);
const BIG_NUMBERS = new Set(['hundred', 'thousand', 'million']);
const NUMBERS = /^(?:\d+(?:[:.,]\d+)*(?:am|pm)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|(?:thir|four|fif|six|seven|eigh|nine)teen|(?:twen|thir|for|fif|six|seven|eigh|nine)ty|hundred|thousand|million|noon|midnight)$/;
const DAYPARTS = new Set(['morning', 'afternoon', 'evening', 'night']);
// Both words of a repeat are real here: "I know that that is hard".
const REAL_REPEATS = new Set([
  'that', 'had', 'is', 'her', 'very', 'really', 'so', 'no', 'yes', 'bye', 'ha', 'go', 'knock', 'hey', 'hello', 'well',
  'yeah', 'ok', 'okay', 'please', 'many', 'long', 'far',
]);
// Real only mid-sentence: "is is that ok" is a stutter, "what it is is" is not.
const REPEAT_NEEDS_LEAD = new Set(['that', 'had', 'is', 'her']);
// Where a phrase opens, so a replacement can take the whole phrase: "in | new york city".
const OPENERS = new Set([
  'to', 'in', 'at', 'on', 'for', 'from', 'with', 'by', 'of', 'about', 'the', 'a', 'an', 'my', 'your', 'our',
  'his', 'her', 'their', 'this', 'that', 'is', 'are', 'was', 'were', 'and', 'or', 'but',
]);
// A replacement opening like this is a new thought: "i love it i mean who wouldn't".
const OPENS_CLAUSE = new Set([
  'who', 'what', 'why', 'how', 'when', 'where', 'you', 'we', 'they', 'he', 'she', 'it', 'there', 'if',
  'because', 'look', 'come', 'honestly', 'seriously', 'yes', 'yeah', 'no', 'well', 'like', 'i', "let's", 'lets',
  'sure', 'maybe', 'okay', 'ok', 'thanks', 'please', 'anyway', 'really', 'totally', 'absolutely', 'obviously', 'basically', 'literally',
]);
const PRONOUNS = new Set(['i', 'we', 'you', 'they', 'he', 'she']);
const DETERMINERS = new Set(['the', 'a', 'an', 'my', 'your', 'our', 'his', 'her', 'their', 'this', 'that']);
// Pointing words with nothing to swap: "i love this i mean great job" does not replace "this".
const POINTERS = new Set(['this', 'that', 'it', 'them', 'him', 'her', 'me', 'us', 'you', 'there', 'here']);
// Words that open a name, so the name goes whole: "los angeles county | orange county".
const NAME_STARTS = new Set(['los', 'las', 'san', 'santa', 'saint', 'st', 'new', 'fort', 'port', 'mount', 'el', 'la']);
// One of these, then one more word, then a stretch: the phrase began earlier and may be a name.
const LEADS_A_PLACE = new Set(['to', 'in', 'at', 'from', 'near', 'on', 'for', 'of', 'with', 'by']);
const BE = /^(?:is|are|was|were)$/;
const BE_WORD = /^(?:is|are|was|were|be|been|am)$/;
// Before "i mean", these make it the plain words: "what i mean", "and i mean".
const BEFORE_PLAIN_MEAN = new Set([
  'what', 'that', 'how', 'which', 'as', 'and', 'but', 'so', 'because', 'if',
  'think', 'know', 'guess', 'believe', 'hope', 'swear', 'promise', 'really', 'said', 'do', 'did',
]);
// After "wait no", the "no" belongs to the next word: "i can wait no problem".
const AFTER_PLAIN_WAIT_NO = new Set(['one', 'longer', 'more', 'problem', 'worries', 'way', 'need', 'matter']);
// Before "no wait", "no" is the plain word: "there is no wait".
const BEFORE_PLAIN_NO = new Set(['is', 'was', 'are', 'were', 'be', "there's", 'has', 'have', 'had', 'with']);
// Before "make that" or "scratch that", the first word is a verb: "should make that change".
const BEFORE_VERB = new Set([
  'to', 'will', 'can', 'could', 'should', 'would', 'must', 'might', 'may', "let's", 'let', 'please',
  "don't", "didn't", "won't", "can't", 'did', 'do', 'i', 'we', 'you', 'they', 'and', 'then', 'never', 'always',
  'he', 'she', 'it', 'who', 'not', 'cannot', 'just', "i'll", "we'll", "you'll", "he'll", "she'll", "they'll",
  "i'd", "we'd", 'said', 'says', 'say', 'told', 'gonna', 'wanna', 'lets',
]);
// With a pronoun next, these before "scratch that" make "scratch" a noun: "a deep scratch that you
// can see". Alone they are not enough: "the colours are bad scratch that the colours are great".
const DESCRIBES_A_SCRATCH = new Set(['deep', 'big', 'small', 'little', 'long', 'light', 'bad', 'nasty', 'tiny', 'huge', 'minor', 'first', 'last', 'next', 'general', 'labor', 'lucky']);
// After "scratch that" or "strike that", these make it a verb with an object: "scratch that off".
const AFTER_PLAIN_SCRATCH = new Set(['off', 'out', 'from', 'away', 'up', 'idea', 'plan', 'itch', 'surface', 'match', 'deal', 'line', 'word', 'day', 'week', 'month', 'year', 'time', 'morning', 'night']);
// After "to", these make "i mean to" the plain words: "i mean to call him".
const COMMON_VERBS = new Set([
  'add', 'ask', 'be', 'book', 'bring', 'buy', 'call', 'come', 'do', 'email', 'get', 'give', 'go', 'have', 'help',
  'keep', 'make', 'meet', 'order', 'pay', 'put', 'reply', 'say', 'see', 'send', 'start', 'take', 'talk', 'tell',
  'text', 'try', 'use', 'write', 'find', 'check', 'show', 'let', 'leave', 'read', 'visit', 'share', 'pick', 'learn', 'fix',
  'build', 'finish',
]);
// "never mind" with an object, or reported, is not a restart: "never mind the cost".
const AFTER_PLAIN_NEVER_MIND = new Set([
  'the', 'my', 'your', 'his', 'her', 'their', 'our', 'this', 'that', 'these', 'those', 'and', 'if', 'about',
  'how', 'who', 'where', 'why', 'when',
]);
const BEFORE_PLAIN_NEVER_MIND = new Set([
  'said', 'say', 'says', 'saying', 'told', 'tell', 'i', 'we', 'they', 'he', 'she', 'would', "i'd", "we'd", 'will', 'can', 'to',
  'me', 'him', 'us', 'could', 'should', 'might', 'may', 'must', 'you', 'if',
]);
// Evidence the words before a cue already say something: "dogs scratch that door" has none of these.
const AUXILIARIES = /^(?:am|be|will|can|could|should|would|must|might|may|do|did|does|has|have|had|want|need|like|love|think|[\p{L}]+'(?:ll|d|m|re|ve|s))$/u;
// A pause before one of these is not the end of a sentence.
const CONTINUES = /^(?:and|but|or|so|because|which|who|with|to|for|of|in|at|on|than|if|when|while)\b/i;
const QUESTION = /^(?:(?:so|and|but|also|okay|ok) |(?:hi|hey|hello),?(?: \S+)? )?(?:(?:can|could|would|will|should|did|does) (?:you|we|i|he|she|they|it|the|your|this|that)|(?:do|have|has) (?:you|we|i|he|she|they|anyone)|(?:is|are|was|were) (?:it|there|this|that|the|your|my|you|we|i|he|she|they)|(?:what|when|where|why|who|how) (?:is|are|was|were|do|does|did|can|could|would|should|will|about|much|many|don't|doesn't|didn't|can't|won't)|how (?:long|far|often|soon|old) (?:is|are|was|were|will|would|do|does|did|can|has|have)|what if|what time (?:is|do|does|did|can|should|would|works)|which (?:one|is|are)|why not|am i|(?:may|shall) (?:i|we)|(?:isn't|aren't|don't|doesn't|didn't|can't|won't|wouldn't|shouldn't|couldn't) (?:it|you|we|they|he|she|i|that|this)|what's|how's|where's)\b/i;

// These after a weak cue add to what was said rather than replace it.
const ADDS = new Set(['too', 'also', 'either']);
// After a swapped "one", these say it was never a number to swap: "one more thing".
const ONE_MOVES_ON = new Set(['more', 'of', 'thing', 'last', 'day', 'time', 'question']);
// After a swapped word, these start a new thought: "today | tomorrow works better".
const NEXT_THOUGHT = new Set(['i', 'we', 'you', 'they', 'he', 'she', 'works', 'work', 'would', 'will', 'could', 'should', 'sounds', 'seems', 'looks', 'came', 'went']);

const LOOK_BACK = 8; // how far a cue reaches for its anchor
const OPENER_LOOK_BACK = 5; // the same for an anchor as common as "the" or "to"
const SHORT = 4; // the longest replacement accepted with no anchor to confirm it
const SHORTEST = 2; // the same when the words it would replace already ended their sentence

const bare = (word: string) => word.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}']+$/gu, '');
const words = (text: string) => text.split(/\s+/).filter(Boolean);
const endsSentence = (word = '') => /[.?!]["')]*$/.test(word);

function kindOf(word: string) {
  const w = bare(word);
  if (NUMBERS.test(w)) return 'number';
  if (DAYS.includes(w) || NEAR_DAYS.includes(w)) return 'day';
  if (MONTHS.includes(w) || PLAIN_MONTHS.includes(w)) return 'month';
  return null;
}

// Where the sentence holding the last word starts, even if that sentence has just ended.
function sentenceStart(tokens: string[]) {
  let i = tokens.length - 1;
  while (i > 0 && !endsSentence(tokens[i - 1])) i -= 1;
  return Math.max(i, 0);
}

const saysSomething = (sentence: string[]) => sentence.some(word => {
  const w = bare(word);
  return PRONOUNS.has(w) || COMMON_VERBS.has(w) || BE.test(w) || AUXILIARIES.test(w);
});

// The cue that starts at tokens[at], longest first so "sorry i mean" beats "sorry".
function matchAt(tokens: string[], at: number, list: string[][]) {
  return list.find(cue => cue.every((word, i) => bare(tokens[at + i] ?? '') === word && (i === cue.length - 1 || !endsSentence(tokens[at + i]))));
}

// The replacement alone, stopping where another correction starts.
function untilNextCue(after: string[]) {
  const stop = after.findIndex((_word, i) => matchAt(after, i, CUES) || matchAt(after, i, RESTARTS));
  return stop < 0 ? after : after.slice(0, stop);
}

// The nearest earlier use of the replacement's first word, within this sentence.
function anchorAt(before: string[], first: string) {
  const reach = OPENERS.has(first) ? OPENER_LOOK_BACK : LOOK_BACK;
  const stop = Math.max(sentenceStart(before), before.length - reach);
  // "a window seat | an aisle seat": the two articles are one word.
  const article = (word: string) => (word === 'an' ? 'a' : word);
  for (let i = before.length - 1; i >= stop; i -= 1) {
    if (article(bare(before[i])) === article(first)) return i;
  }
  return -1;
}

const isMean = (cue: string[]) => /^mean/.test(cue.at(-1) ?? '');

// The cue's words are being used as plain English.
function notACorrection(cue: string[], before: string[], after: string[]) {
  const prev = bare(before.at(-1) ?? '');
  const next = bare(after[0] ?? '');
  if (isMean(cue)) {
    if (BEFORE_PLAIN_MEAN.has(prev) || ['it', 'by', 'that', 'this'].includes(next)) return true;
    if (next !== 'to') return false;
    // "i mean to" stays unless "to" is there to replace, and not when one is a verb and one a name.
    const anchor = anchorAt(before, 'to');
    return anchor < 0 || (COMMON_VERBS.has(bare(after[1] ?? '')) && !COMMON_VERBS.has(bare(before[anchor + 1] ?? '')));
  }
  if (cue.includes('no') && BEFORE_PLAIN_NO.has(prev)) return true;
  // "please wait no talking": "wait" is the verb here, and the "no" goes with what follows.
  if (cue[0] === 'wait' && BEFORE_VERB.has(prev)) return true;
  if (cue[1] === 'wait' && ['time', 'times', 'list', 'line', 'lines'].includes(next)) return true;
  if (cue.at(-1) === 'no' && AFTER_PLAIN_WAIT_NO.has(next)) return true;
  return cue[0] === 'make' && BEFORE_VERB.has(prev);
}

// "by may" is the month, and "we may" is not.
const isMonthMay = (before: string[]) => bare(before.at(-1) ?? '') === 'may' && BEFORE_A_DATE.has(bare(before.at(-2) ?? ''));

function notARestart(restart: string[], before: string[], rest: string[]) {
  const prev = bare(before.at(-1) ?? '');
  // These say what they are, so only being reported can make them plain: "she said let me rephrase".
  if (restart[0] === 'let') return prev === 'said' || prev === 'says' || prev === 'say' || prev === 'told';
  const setApart = /[,.?!]$/.test(rest[restart.length - 1] ?? '') || endsSentence(before.at(-1));
  // "the kids scratch that": a subject and no verb yet, so the cue is the verb.
  const sentence = before.slice(sentenceStart(before));
  // A number or day replacing one is proof enough: "my number ends in five scratch that six".
  const likeForLike = kindOf(prev) !== null && kindOf(prev) === kindOf(rest[restart.length] ?? '');
  if (!setApart && !likeForLike && DETERMINERS.has(bare(sentence[0] ?? '')) && !saysSomething(sentence)) return true;
  if (restart[0] !== 'never') {
    if (BEFORE_VERB.has(prev) && !isMonthMay(before)) return true;
    if (setApart) return false;
    // "built it from scratch that day", "went on strike that week".
    if (LEADS_A_PLACE.has(prev)) return true;
    if (rest.length <= restart.length) return false;
    const next = bare(rest[restart.length]);
    // "this" and "that" are left out because "scratch that scratch that" only repeats itself.
    const afterArticle = DETERMINERS.has(prev) && prev !== 'this' && prev !== 'that';
    return afterArticle || (DESCRIBES_A_SCRATCH.has(prev) && PRONOUNS.has(next)) || AFTER_PLAIN_SCRATCH.has(next);
  }
  if (BEFORE_PLAIN_NEVER_MIND.has(prev)) return true;
  // A comma after it says it stands alone: "Never mind, the cost is fine."
  if (setApart) return false;
  const next = bare(rest[restart.length] ?? '');
  return AFTER_PLAIN_NEVER_MIND.has(next) || (next === 'what' && bare(rest[restart.length + 1] ?? '') !== 'about');
}

// After a restart cue, is this a new sentence rather than the cue's object? Needs words to delete.
function opensNewSentence(before: string[], cueEnd: string, after: string[]) {
  if (!after.length || /[,.?!]$/.test(cueEnd)) return true;
  if (!before.length) return false;
  const first = bare(after[0]);
  if (OPENS_CLAUSE.has(first)) return true;
  // "kids scratch that call": a new order needs an old thought to replace.
  if (COMMON_VERBS.has(first)) return saysSomething(before.slice(sentenceStart(before)));
  return DETERMINERS.has(first) && after.some(word => BE.test(bare(word)));
}

// How many words at the end of the replacement repeat the end of what came before.
function sharedTail(before: string[], spoken: string[]) {
  let n = 0;
  while (n < before.length && n < spoken.length && bare(before[before.length - 1 - n]) === bare(spoken[spoken.length - 1 - n])) n += 1;
  return n;
}

type Plan = { cut: number; keep: number; take?: number; guess?: boolean };

// Same-length stretches that share words and differ in one. `strict` wants more than one shared
// word or a like-for-like difference, for cues that are also everyday words. UNSURE means they
// match but the phrase may begin earlier, so nothing should be touched.
const UNSURE = -1;
function parallelSpan(before: string[], after: string[], strict: boolean) {
  const stop = before.length - sentenceStart(before);
  for (let span = 2; span <= Math.min(4, stop, after.length); span += 1) {
    const a = before.slice(-span).map(bare);
    const b = after.slice(0, span).map(bare);
    const differ = a.flatMap((word, i) => (word === b[i] ? [] : [i]));
    if (differ.length !== 1) continue;
    const swap = differ[0];
    const alike = kindOf(a[swap]) !== null && kindOf(a[swap]) === kindOf(b[swap]);
    // Saying the end again counts, "whole milk | oat milk". The opening does not, "the plans | the priority".
    if (strict && span === 2 && swap !== 0 && !alike) continue;
    // "i talked to anna | i talked to her" is still about anna.
    if (strict && POINTERS.has(b[swap]) && !POINTERS.has(a[swap])) continue;
    if (span > 2 || swap !== 0) return span;
    // "it was good | really good" keeps the "was": the first word is grammar, not what changed.
    if ((BE.test(a[0]) || /'(?:m|re|s)$/.test(a[0])) && !BE.test(b[0])) return span - 1;
    // "a ticket | lottery ticket" and "call bob | uncle bob" are not like for like.
    if (DETERMINERS.has(a[0]) && !DETERMINERS.has(b[0])) return UNSURE;
    if (COMMON_VERBS.has(a[0]) && !COMMON_VERBS.has(b[0])) return UNSURE;
    const extra = bare(before.at(-span - 1) ?? '');
    if (NAME_STARTS.has(extra)) return span + 1;
    if (LEADS_A_PLACE.has(bare(before.at(-span - 2) ?? '')) && !COMMON_VERBS.has(extra) && !DETERMINERS.has(extra)) return UNSURE;
    // "i need milk | oat milk": the word after the pronoun is the verb, unless the swap is a verb too.
    if (PRONOUNS.has(extra) && !POINTERS.has(a[1]) && !COMMON_VERBS.has(b[0]) && !/.{2}ed$/.test(b[0])) return span - 1;
    return span;
  }
  return 0;
}

// Keep the words after a swapped number unless the replacement says them again, or goes on to say
// something else: "two dogs | three cats".
function keepAfterSwap(tail: string[], spoken: string[], take: number) {
  const next = bare(spoken[take] ?? '');
  if (next && !OPENERS.has(next) && !tail.map(bare).includes(next)) return 0;
  const said = spoken.slice(1).map(bare);
  const last = bare(tail.at(-1) ?? '');
  if (said.includes(last)) return 0;
  if (DAYPARTS.has(last) && said.some(word => DAYPARTS.has(word))) return 0;
  return tail.length;
}

// What the replacement is, read from its opening: "a thousand" is a number and "next friday" a day.
function kindOfOpening(spoken: string[]) {
  const first = bare(spoken[0] ?? '');
  const second = bare(spoken[1] ?? '');
  if ((first === 'a' || first === 'an') && BIG_NUMBERS.has(second)) return 'number';
  if (DATE_MODIFIERS.has(first) && (DAYS.includes(second) || kindOf(second) === 'month')) return kindOf(second);
  return kindOf(spoken[0] ?? '');
}

// Like for like: swap the nearest thing of the replacement's kind, whole, and keep the words after it.
function swapKind(before: string[], spoken: string[]) {
  const kind = kindOfOpening(spoken);
  if (!kind) return null;
  const start = sentenceStart(before);
  const joined = (i: number) => kind === 'number' && bare(before[i]) === 'and' && i > start && kindOf(before[i - 1]) === 'number';
  for (let i = before.length - 1; i >= Math.max(start, before.length - SHORT); i -= 1) {
    if (kindOf(before[i]) !== kind) continue;
    if (bare(before[i]) === 'may' && !BEFORE_A_DATE.has(bare(before[i - 1] ?? ''))) continue;
    // Take the whole of it: "three hundred and fifty", "a thousand", "next friday".
    let from = i;
    while (from > start && (kindOf(before[from - 1]) === kind || joined(from - 1))) from -= 1;
    const lead = bare(before[from - 1] ?? '');
    // "next friday | this monday" takes the "next", and "next friday | monday" leaves it.
    const led = kind === 'number' ? (lead === 'a' || lead === 'an') && BIG_NUMBERS.has(bare(before[from])) : DATE_MODIFIERS.has(lead) && DATE_MODIFIERS.has(bare(spoken[0]));
    if (from > start && led) from -= 1;
    // And the whole replacement, so the kept words land after it: not "four dollars hundred".
    let take = kindOf(spoken[0]) === kind ? 1 : 2;
    while (take < spoken.length && (kindOf(spoken[take]) === kind || (bare(spoken[take]) === 'and' && kindOf(spoken[take + 1] ?? '') === kind))) take += 1;
    const keep = keepAfterSwap(before.slice(i + 1), spoken, take);
    return { cut: before.length - from, keep, take };
  }
  return null;
}

// "add milk | oat milk": the last word is said again with a new word in front of it, so only the
// phrase goes and the verb stays. "add the milk | oat milk" takes the article too.
function swapHead(before: string[], spoken: string[]): Plan | null {
  const first = bare(spoken[0] ?? '');
  if (spoken.length < 2 || bare(before.at(-1) ?? '') !== bare(spoken[1]) || COMMON_VERBS.has(first) || DETERMINERS.has(first)) return null;
  const prev = bare(before.at(-2) ?? '');
  if (COMMON_VERBS.has(prev)) return { cut: 1, keep: 0 };
  return DETERMINERS.has(prev) && COMMON_VERBS.has(bare(before.at(-3) ?? '')) ? { cut: 2, keep: 0 } : null;
}

// Where the replaced words start, or null to leave everything as it is. `loose` is for a cue people
// also say between thoughts, where a replacement with its own verb is probably the next thought.
function replaceFrom(before: string[], after: string[], mostWithoutEvidence: number, loose: boolean): Plan | null {
  const first = bare(after[0] ?? '');
  const spoken = untilNextCue(after);
  // "a budget of nine hundred | a thousand" means the number, not the other "a".
  if (!kindOf(after[0] ?? '')) {
    const swap = swapKind(before, spoken);
    if (swap) return swap;
  }
  const newThought = spoken.some(word => BE.test(bare(word)));
  const anchor = anchorAt(before, first);
  // "the plans make that the priority": a cue needing proof gets none from a word as common as "the".
  if (anchor >= 0 && !(mostWithoutEvidence === 0 && OPENERS.has(first))) {
    const said = new Set(before.slice(anchor + 1).map(bare));
    // "i love the site i mean the colours are great" and "the food was great i mean the service was too"
    // are the next thought. "the price is fine i mean the price is high" redoes this one.
    if (loose && OPENERS.has(first) && newThought && !spoken.slice(1).some(word => !BE.test(bare(word)) && said.has(bare(word)))) return null;
    // "i love it i mean i really do" says it again; "i study chemistry i mean i study biology" redoes it.
    if (loose && PRONOUNS.has(first) && !spoken.slice(1).some(word => said.has(bare(word)))) return null;
    return { cut: before.length - anchor, keep: 0 };
  }
  // "add whole milk to the cart | oat milk to the cart": the end is said again, so what differs is ahead of it.
  const shared = sharedTail(before, spoken);
  if (shared >= 2 && shared < spoken.length) {
    const inner = replaceFrom(before.slice(0, -shared), spoken.slice(0, -shared), mostWithoutEvidence, loose);
    // Saying the end again is the proof, so this is no longer a guess.
    return inner && { cut: inner.cut + shared, keep: 0 };
  }
  const swap = swapKind(before, spoken);
  if (swap) return swap;
  // Needing proof, a parallel must differ like for like, or "the plans | the priority" would count.
  const span = parallelSpan(before, after, mostWithoutEvidence === 0);
  if (span === UNSURE) return null;
  if (span) return { cut: span, keep: 0 };
  if (!before.length || !spoken.length || spoken.length > mostWithoutEvidence) return null;
  if (OPENS_CLAUSE.has(first) || newThought || POINTERS.has(bare(before.at(-1) ?? ''))) return null;
  for (let i = before.length - 2; i >= Math.max(sentenceStart(before), before.length - 4); i -= 1) {
    const opener = bare(before[i]);
    if (!OPENERS.has(opener)) continue;
    // "send it to you tomorrow | noon": a person or thing in the stretch is not part of the mistake.
    if (before.slice(i + 1, -1).some(word => POINTERS.has(bare(word)))) break;
    // "to the cart | oat milk" would keep "the" and make nonsense; two words need more than a guess.
    if (spoken.length > 1 && DETERMINERS.has(opener)) return null;
    return { cut: before.length - 1 - i, keep: 0, guess: true };
  }
  // No phrase start in reach, so only one word can safely go: not "los angeles last year | orange county".
  return spoken.length > 1 ? null : { cut: 1, keep: 0, guess: true };
}

// A restart deletes, so its guess must have only one phrase it could mean: "i'll bring salad" yes,
// "add almond milk to the cart" no.
function clearGuess(before: string[]) {
  const lead = before.slice(sentenceStart(before), -1);
  return saysSomething(lead) && lead.filter(word => OPENERS.has(bare(word))).length < 2;
}

// The sentence cannot stop on this word, so the cue is inside it: "it was | actually three".
function leftOpen(before: string[]) {
  const prev = bare(before.at(-1) ?? '');
  if (isMonthMay(before)) return false;
  return BE.test(prev) || AUXILIARIES.test(prev) || PRONOUNS.has(prev) || DETERMINERS.has(prev) || CONTINUES.test(prev) || LEADS_A_PLACE.has(prev) || prev === 'not';
}

// A weak cue is an everyday word, so it corrects only what the words themselves prove, in order: the
// sentence said again, a like-for-like swap, a parallel, a repeated head, then a phrase with the same
// opening. Anything that adds ("the colours too") or says something new ("is better") is left alone.
function replaceWeak(before: string[], after: string[], cue: string[]): Plan | null {
  if (!before.length || leftOpen(before)) return null;
  const spoken = untilNextCue(after);
  if (ADDS.has(bare(spoken.at(-1) ?? ''))) return null;
  const sentence = before.slice(sentenceStart(before));
  const first = bare(after[0] ?? '');

  // "i love your portfolio | i love your photography", but "i talked to anna | i talked to her" is
  // still about anna.
  let same = 0;
  while (same < sentence.length && same < spoken.length && bare(sentence[same]) === bare(spoken[same])) same += 1;
  if (same >= 2 && same < sentence.length && same < spoken.length && !spoken.slice(same).some(word => POINTERS.has(bare(word)))) {
    return { cut: sentence.length, keep: 0 };
  }

  const swap = swapKind(before, spoken);
  // "two | one more thing" and "friday | friday is too soon" move on instead of correcting.
  const movesOn = (first === 'one' && ONE_MOVES_ON.has(bare(spoken[1] ?? ''))) || spoken.some(word => BE.test(bare(word)));
  if (swap && !movesOn && !NEXT_THOUGHT.has(bare(spoken[swap.take] ?? ''))) return swap;

  // "Sorry" and "wait" run on into these by themselves, "sorry about the delay", "wait at the door",
  // so one needs a like-for-like word behind it: "at two | at three".
  const lastKind = kindOf(before.at(-1) ?? '');
  const everyday = (cue[0] === 'sorry' || cue[0] === 'wait') && OPENERS.has(first) && !DETERMINERS.has(first);
  if (everyday && !(lastKind && lastKind === kindOf(spoken[1] ?? ''))) return null;

  const span = parallelSpan(before, after, true);
  if (span === UNSURE) return swapHead(before, spoken);
  if (span) return { cut: span, keep: 0 };

  // "meet at the cafe | the library".
  const opensPhrase = DETERMINERS.has(first) || LEADS_A_PLACE.has(first);
  const anchor = opensPhrase ? anchorAt(before, first) : -1;
  const replaced = anchor < 0 ? [] : before.slice(anchor + 1);
  const plainPhrase = (phrase: string[]) => phrase.every((word) => {
    const w = bare(word);
    return !PRONOUNS.has(w) && !POINTERS.has(w) && !COMMON_VERBS.has(w) && !BE.test(w) && !AUXILIARIES.test(w);
  });
  // A preposition needs both sides shaped alike: not "in paris | in the spring". "To the store | to
  // pick up milk" is a reason, so "to" takes one more word and no more. A swap at the very start of
  // the sentence takes one word: "the design looks great | the best" is a new thought.
  const alikeShape = DETERMINERS.has(first) || DETERMINERS.has(bare(replaced[0] ?? '')) === DETERMINERS.has(bare(spoken[1] ?? ''));
  const reach = anchor === sentenceStart(before) ? 1 : spoken.length;
  if (anchor >= 0 && alikeShape && replaced.length <= reach && spoken.length <= (first === 'to' ? 2 : SHORT) && plainPhrase(replaced) && plainPhrase(spoken.slice(1))) {
    return { cut: before.length - anchor, keep: 0 };
  }

  // "the size is medium | large": one word for one word after "is", and nothing more said.
  if (spoken.length === 1 && BE_WORD.test(bare(before.at(-2) ?? '')) && !OPENS_CLAUSE.has(first) && !POINTERS.has(bare(before.at(-1) ?? ''))) {
    return { cut: 1, keep: 0 };
  }

  // "Book the room for Monday. Actually, book it for Tuesday." Same opening, same kind of thing.
  if (bare(sentence[0]) !== first || BEFORE_PLAIN_MEAN.has(bare(before.at(-1) ?? ''))) return null;
  const kinds = new Set(sentence.map(kindOf));
  const swaps = spoken.some(word => kindOf(word) !== null && kinds.has(kindOf(word)));
  return swaps ? { cut: sentence.length, keep: 0 } : null;
}

// The replacement's opening goes in, then the words the swap kept, then the speech goes on. Returns
// how many words of the replacement went in.
function swapIn(out: string[], plan: Plan, after: string[]) {
  const take = plan.take ?? 1;
  const tail = plan.keep ? out.slice(out.length - plan.keep) : [];
  out.length -= plan.cut;
  out.push(...after.slice(0, take), ...tail);
  return take;
}

// Applies every correction in one stretch of speech; `earlier` is the stretch before this pause,
// and a cue that reaches back into it takes those words over into this stretch.
function repair(tokens: string[], earlier: string[] | null) {
  const out: string[] = [];
  const takeOverEarlier = () => {
    if (out.length === 0 && earlier?.length) out.push(...earlier.splice(0));
  };
  for (let at = 0; at < tokens.length;) {
    const rest = tokens.slice(at);
    const restart = matchAt(tokens, at, RESTARTS);
    const before = out.length ? out : earlier ?? [];
    if (restart && !notARestart(restart, before, rest)) {
      const after = rest.slice(restart.length);
      // "bring salad scratch that soup" swaps; a follow-up that opens a sentence restarts this one;
      // anything else was not a correction, so the words stay.
      const found = restart.includes('mind') ? null : swapHead(before, untilNextCue(after)) ?? replaceFrom(before, after, SHORTEST, true);
      const plan = found && (!found.guess || clearGuess(before)) ? found : null;
      if (!plan && !opensNewSentence(before, rest[restart.length - 1], after)) {
        out.push(tokens[at]);
        at += 1;
        continue;
      }
      takeOverEarlier();
      if (plan) {
        at += restart.length + swapIn(out, plan, after);
      } else {
        out.length = out.length ? sentenceStart(out) : 0;
        at += restart.length;
      }
      continue;
    }
    const strong = matchAt(tokens, at, CUES);
    const weak = strong ? undefined : matchAt(tokens, at, WEAK_CUES);
    const cue = strong ?? weak;
    if (!cue || cue.length === rest.length || notACorrection(cue, before, rest.slice(cue.length))) {
      out.push(tokens[at]);
      at += 1;
      continue;
    }
    const after = rest.slice(cue.length);
    const opening = out.length === 0;
    const closed = opening || endsSentence(before.at(-1));
    // "make that" is everyday English, so it needs evidence: "the plans make that clear".
    const most = cue[0] === 'make' ? 0 : closed ? SHORTEST : SHORT;
    // "call bob i mean uncle bob" says more about bob, so "i mean" alone does not swap the head.
    const plan = strong ? (isMean(cue) ? null : swapHead(before, untilNextCue(after))) ?? replaceFrom(before, after, most, isMean(cue)) : replaceWeak(before, after, cue);
    // Across a pause, be sure: a long follow-up is a new sentence.
    if (!plan || (opening && strong && untilNextCue(after).length > SHORT)) {
      // After a pause, a strong cue that corrects nothing only started a sentence, and it goes.
      if (opening && strong && before.length) at += cue.length;
      else {
        out.push(tokens[at]);
        at += 1;
      }
      continue;
    }
    takeOverEarlier();
    at += cue.length + swapIn(out, plan, after);
  }
  return out;
}

function withoutStutters(tokens: string[]) {
  const out: string[] = [];
  for (const word of tokens) {
    const w = bare(word);
    const prev = out.at(-1);
    const repeat = prev !== undefined && w === bare(prev) && !endsSentence(prev);
    const opening = out.length < 2 || endsSentence(out.at(-2));
    const real = kindOf(word) !== null || (REAL_REPEATS.has(w) && !(opening && REPEAT_NEEDS_LEAD.has(w)));
    if (!repeat || real) out.push(word);
    // "I, I think" drops the first, so its comma does not strand: not "I, think".
    else if (prev.endsWith(',')) out[out.length - 1] = word;
  }
  return out;
}

const QUANTIFIERS = 'one|no|any|another|each|every|some|complete|my|your|his|her|our|their|its';
// Empty means nothing came before it: a mark with nothing to mark is just the word.
const TALKED_ABOUT = new RegExp(`^(?:|the|a|an|this|that|${QUANTIFIERS})$`, 'i');
const BREAK_TALKED_ABOUT = new RegExp(`^(?:the|a|an|this|that|${QUANTIFIERS})$`, 'i');
const NAMES_A_PERIOD = new RegExp(`^(?:|the|a|an|this|that|${QUANTIFIERS}|time|trial|grace|long|short|free|billing|notice|same|hard|tough|difficult|busy|quiet|final|first|last|next|waiting|cooling|probation|transition|rainy|study|exam|class|pay|sales|holiday|summer|later|early)$`, 'i');
// After "new line" these make it a plain noun: "a new line of products", "new line items".
const NOT_A_BREAK = '\\b(?!\\s+(?:of|items?|up|extension|cook)\\b)';

// Swaps a spoken mark for the real one, unless the word before says it is being talked about:
// "the new line", "a question mark". No lookbehind, which breaks Safari before 16.4 at load.
function mark(text: string, said: string, real: string, talkedAbout = TALKED_ABOUT, end = '\\b') {
  const pattern = new RegExp(`(^|\\S+)\\s+(?:${said})${end}`, 'gi');
  return text.replace(pattern, (all, prev: string) => (talkedAbout.test(prev) ? all : prev + real));
}

// Spoken punctuation, then the end of the stretch.
function punctuate(text: string) {
  let out = ` ${text}`;
  out = mark(out, 'new paragraph', '\u0001', BREAK_TALKED_ABOUT, NOT_A_BREAK);
  out = mark(out, 'new line', '\u0002', BREAK_TALKED_ABOUT, NOT_A_BREAK);
  out = mark(out, 'comma', ',');
  out = mark(out, 'question mark', '?');
  out = mark(out, 'exclamation (?:point|mark)', '!');
  out = mark(out, 'full stop', '.');
  out = mark(out, 'period', '.', NAMES_A_PERIOD, '$');
  return out
    .trim()
    // Odd pieces are the breaks. Each one ends the sentence before it, unless that already ended.
    .split(/\s*([\u0001\u0002])\s*/)
    .map((piece, i, pieces) => {
      if (i % 2) return piece === '\u0001' ? '\n\n' : '\n';
      return i === pieces.length - 1 || !piece || /[.?!,]$/.test(piece) ? piece : piece + endOf(piece);
    })
    .join('');
}

function capitalize(text: string) {
  return text
    .replace(/\bi(?=\b|')/g, 'I')
    .replace(new RegExp(`\\b(${[...DAYS, ...MONTHS].join('|')})\\b`, 'gi'), name => name[0].toUpperCase() + name.slice(1).toLowerCase())
    .replace(new RegExp(`\\b(${[...BEFORE_A_DATE].join('|')}) (${PLAIN_MONTHS.join('|')})\\b`, 'gi'), (_all, lead: string, month: string) => `${lead} ${month[0].toUpperCase()}${month.slice(1).toLowerCase()}`)
    .replace(/(^|[.?!]\s+|\n+)(\p{Ll})/gu, (_all, start: string, letter: string) => start + letter.toUpperCase());
}

// A question mark if the last sentence opens like a question, else a full stop.
function endOf(text: string) {
  const last = text.split(/[.?!\n]\s*/).at(-1) ?? '';
  return QUESTION.test(last.trim()) ? '?' : '.';
}

// A stretch left ending on a comma ends cleanly instead of on ",.".
const finish = (text: string) => (/[.?!\n]$/.test(text) ? text : text.replace(/,$/, '') + endOf(text));

// Punctuation standing on its own joins the word before it, and none can open a stretch.
const tidy = (piece: string) => piece
  .replace(FILLERS, dropFiller)
  .replace(/\s+([,.?!]+)(?=\s|$)/g, '$1')
  .replace(/^[\s,.?!]+/, '');

export function cleanDictation(said: string[]) {
  const stretches: string[][] = [];
  for (const piece of said) {
    const tokens = withoutStutters(words(tidy(piece)));
    if (!tokens.length) continue;
    const repaired = repair(tokens, stretches.at(-1) ?? null);
    while (stretches.length && stretches.at(-1)?.length === 0) stretches.pop();
    if (repaired.length) stretches.push(repaired);
  }

  let text = '';
  for (const tokens of stretches) {
    const part = punctuate(tokens.join(' '));
    if (!part) continue;
    if (!text) text = part;
    else if ((CONTINUES.test(part) && !/[.?!]$/.test(text)) || text.endsWith(',')) text += ` ${part}`;
    else text = `${finish(text)} ${part}`;
  }
  return /[\p{L}\p{N}]/u.test(text) ? capitalize(finish(text)).trim() : '';
}

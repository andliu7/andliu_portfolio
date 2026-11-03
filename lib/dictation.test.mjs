// node --experimental-strip-types --test lib/dictation.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanDictation } from './dictation.ts';

const cases = (name, list) => void test(name, () => {
  for (const [spoken, want] of list) {
    assert.equal(cleanDictation(Array.isArray(spoken) ? spoken : [spoken]), want, String(spoken));
  }
});

cases('a correction changes only the words it corrects', [
  ['send it to mark i mean john', 'Send it to john.'],
  ['send it to mark i mean to john', 'Send it to john.'],
  ['meet at the coffee shop i mean the library', 'Meet at the library.'],
  ['see you next friday no wait monday', 'See you next Monday.'],
  ['i study chemistry i mean i study biology at maryland', 'I study biology at maryland.'],
  ['the site is great and the design or rather the layout is clean', 'The site is great and the layout is clean.'],
  ['book two seats make that three', 'Book three seats.'],
]);

cases('words before the correction survive untouched', [
  ['hello andrew i loved your project please call me tuesday no wait wednesday', 'Hello andrew I loved your project please call me Wednesday.'],
]);

cases('"actually" and friends only correct a like-for-like swap', [
  ["let's do coffee at 2 actually 3", "Let's do coffee at 3."],
  ['on tuesday actually on wednesday', 'On Wednesday.'],
  ['i actually enjoyed the movie', 'I actually enjoyed the movie.'],
  ['the movie was actually the best', 'The movie was actually the best.'],
  ['i am sorry i missed you', 'I am sorry I missed you.'],
  ['wait for me at the door', 'Wait for me at the door.'],
]);

cases('"i mean" that is not a correction stays', [
  ['you know what i mean', 'You know what I mean.'],
  ['i really i mean it', 'I really I mean it.'],
  ['that is what i mean by simple', 'That is what I mean by simple.'],
]);

cases('when it cannot tell what was corrected, it changes nothing', [
  ['i talked to mark i mean john and then we went to lunch together', 'I talked to mark I mean john and then we went to lunch together.'],
]);

cases('scratch that removes only the sentence it follows', [
  ['this is wrong scratch that this is right', 'This is right.'],
  [['i loved the site', 'the colours are bad', 'scratch that'], 'I loved the site.'],
  [['i loved the site', 'the colours are bad scratch that the colours are great'], 'I loved the site. The colours are great.'],
  ['never mind', ''],
  ['never mind the cost', 'Never mind the cost.'],
]);

cases('a correction after a pause reaches back one sentence only when it is short', [
  [['send it to mark', 'i mean john'], 'Send it to john.'],
  [['i loved it', 'i mean the design is great and so are the colours'], 'I loved it. The design is great and so are the colours.'],
]);

cases('fillers and stutters go', [
  ['um i think uh this is er great', 'I think this is great.'],
  ['the the site is good', 'The site is good.'],
  ['i know that that is hard', 'I know that that is hard.'],
  ['umbrella and hermit stay', 'Umbrella and hermit stay.'],
]);

cases('punctuation and capitals', [
  [['hello andrew', 'i saw your site'], 'Hello andrew. I saw your site.'],
  [['i went to the store', 'and bought milk'], 'I went to the store and bought milk.'],
  ['can you call me', 'Can you call me?'],
  ['what is your email', 'What is your email?'],
  ['how i built it', 'How I built it.'],
  ['already done.', 'Already done.'],
  ["i'm here and i've seen it", "I'm here and I've seen it."],
]);

cases('spoken formatting', [
  ['first line new line second line', 'First line.\nSecond line.'],
  ['one idea new paragraph another idea', 'One idea.\n\nAnother idea.'],
  ['well comma that works', 'Well, that works.'],
  ['is it free question mark yes', 'Is it free? Yes.'],
  ['what a site exclamation point thanks', 'What a site! Thanks.'],
]);

cases('the replacement takes the whole phrase or number it replaces', [
  ['we launched in new york city i mean san francisco', 'We launched in san francisco.'],
  ['my budget is around five thousand i mean six thousand', 'My budget is around six thousand.'],
  ['the total was three hundred dollars no wait four hundred and fifty dollars', 'The total was four hundred and fifty dollars.'],
  ["i'm free friday afternoon no wait saturday morning", "I'm free Saturday morning."],
  ["i'm free friday afternoon no wait saturday", "I'm free Saturday afternoon."],
  ['i called him i mean texted him', 'I texted him.'],
  ['we have four people actually five people on the team', 'We have five people on the team.'],
  ['i would like a blue logo actually a green logo', 'I would like a green logo.'],
]);

cases('corrections chain and can cross a pause', [
  ['tuesday no wait wednesday no wait thursday works for me', 'Thursday works for me.'],
  [['tuesday', 'no wait wednesday', 'no wait thursday'], 'Thursday.'],
  [['send the contract to anna', 'i mean to maria'], 'Send the contract to maria.'],
  [['the meeting is at two', 'actually three'], 'The meeting is at three.'],
  ['Book the room for Monday. Actually, book it for Tuesday.', 'Book it for Tuesday.'],
]);

cases('"i mean to" is the plain words unless "to" is being replaced', [
  ['i mean to call you tomorrow', 'I mean to call you tomorrow.'],
  ['send it to mark i mean to call him', 'Send it to mark I mean to call him.'],
  ['i want to call i mean to email him', 'I want to email him.'],
]);

// From reading openWispr's detector, these are the sentences a cue list without guards rewrites.
cases('everyday sentences with a cue in them stay exactly as said', [
  ['Hi John, sorry for the late reply.', 'Hi John, sorry for the late reply.'],
  ['we should make that change today', 'We should make that change today.'],
  ['the plans make that clear', 'The plans make that clear.'],
  ['there is no wait at that restaurant', 'There is no wait at that restaurant.'],
  ['the cat tried to scratch that door', 'The cat tried to scratch that door.'],
  ['he said never mind and walked out', 'He said never mind and walked out.'],
  ['i love it i mean who wouldnt', 'I love it I mean who wouldnt.'],
  ['i love the site i mean the colours are great', 'I love the site I mean the colours are great.'],
  ['the answer is actually no one knows', 'The answer is actually no one knows.'],
  ['i can wait no longer', 'I can wait no longer.'],
  ['I actually read your article, and I mean that.', 'I actually read your article, and I mean that.'],
  ['i thought it was two and it was actually three', 'I thought it was two and it was actually three.'],
  ['we can not come on friday', 'We can not come on Friday.'],
  ['the trial period is over', 'The trial period is over.'],
  ['i liked the trial period', 'I liked the trial period.'],
  ['we need a new line of products', 'We need a new line of products.'],
  ['i mean well', 'I mean well.'],
  ['no wait is too long', 'No wait is too long.'],
  ['put a comma here', 'Put a comma here.'],
]);

cases('a restart stops at the sentence it is in', [
  ["i'll bring salad scratch that soup", "I'll bring soup."],
  ['i can start monday. i also need a desk scratch that', 'I can start Monday.'],
  ['thanks for the call. is the office open on sunday never mind', 'Thanks for the call.'],
  ['Can you build a website? Never mind, I already have one.', 'I already have one.'],
  ['my dog is nice scratch that we have a cat', 'We have a cat.'],
  [['thanks for the call. the site is bad', 'scratch that'], 'Thanks for the call.'],
]);

// Each of these came out corrupted before: words deleted, and what was left meant something else.
cases('a restart cue with no proof of a correction leaves every word alone', [
  ['she said scratch that off the list', 'She said scratch that off the list.'],
  ['scratch that lottery ticket and see if you won', 'Scratch that lottery ticket and see if you won.'],
  ['the kids scratch that off the board', 'The kids scratch that off the board.'],
  ['he will strike that from the record', 'He will strike that from the record.'],
  ['add almond milk to the cart scratch that oat milk', 'Add almond milk to the cart scratch that oat milk.'],
  ['i like coffee never mind tea', 'I like coffee never mind tea.'],
  [['i bought a ticket', 'scratch that lottery ticket and see'], 'I bought a ticket. Scratch that lottery ticket and see.'],
]);

cases('a real restart still works, by whole sentence or by what it repeats', [
  ['add whole milk to the cart scratch that oat milk to the cart', 'Add oat milk to the cart.'],
  ['add milk to the cart scratch that eggs to the cart', 'Add eggs to the cart.'],
  ['add whole milk scratch that oat milk to the cart', 'Add oat milk to the cart.'],
  ['scratch that', ''],
  ['Scratch that. We need more time.', 'We need more time.'],
  ['i like the red one scratch that give me the blue one', 'Give me the blue one.'],
  ['i like tea scratch that i want coffee', 'I want coffee.'],
  ['my logo is old scratch that the logo is fine', 'The logo is fine.'],
  ['hello scratch that', ''],
]);

cases('a guessed replacement never lands inside the wrong phrase', [
  ['we moved to los angeles county i mean orange county', 'We moved to orange county.'],
  ['we moved to san diego county no wait orange county', 'We moved to orange county.'],
  ['we moved to baton rouge county i mean orange county', 'We moved to baton rouge county I mean orange county.'],
  ['we moved to los angeles last year i mean orange county', 'We moved to los angeles last year I mean orange county.'],
  ['add almond milk to the cart i mean oat milk', 'Add almond milk to the cart I mean oat milk.'],
  ['send the big red logo i mean blue logo', 'Send the big blue logo.'],
  ['i want to add whole milk i mean oat milk', 'I want to add oat milk.'],
  ['i want to call bob i mean uncle bob', 'I want to call bob I mean uncle bob.'],
  ['i love this i mean great job', 'I love this I mean great job.'],
]);

cases('more plain sentences a cue must not touch', [
  ['i can wait no problem', 'I can wait no problem.'],
  ['i think i mean business', 'I think I mean business.'],
  ['i love it i mean i really do', 'I love it I mean I really do.'],
  ['the plans make that the priority', 'The plans make that the priority.'],
]);

cases('a spoken break seals the sentence before it', [
  ['can you call me new paragraph is it free new line thanks', 'Can you call me?\n\nIs it free?\nThanks.'],
  ['well comma new line thanks', 'Well,\nThanks.'],
  ['new line hello', 'Hello.'],
]);

cases('words around a sentence end are not stutters or cues', [
  ['i like it. it is good.', 'I like it. It is good.'],
  ['is there a wait? no. wait for me.', 'Is there a wait? No. Wait for me.'],
  ['give her her keys', 'Give her her keys.'],
  ['bye bye', 'Bye bye.'],
]);

cases('questions and endings', [
  ['so can we talk next week', 'So can we talk next week?'],
  ['is the office open', 'Is the office open?'],
  ['can you call me new line thanks', 'Can you call me?\nThanks.'],
  [['hello,', 'i saw your site'], 'Hello, I saw your site.'],
  ['well,', 'Well.'],
]);

// Round 2 probes: each of these lost or changed words before the guard beside it was added.
cases('a subject and no verb means the cue is the verb', [
  ['dogs scratch that door', 'Dogs scratch that door.'],
  ['kids scratch that car', 'Kids scratch that car.'],
  ['my cats scratch that sofa', 'My cats scratch that sofa.'],
  ['cats and dogs scratch that door', 'Cats and dogs scratch that door.'],
  ['the kids scratch that', 'The kids scratch that.'],
  ['the kids scratch that call', 'The kids scratch that call.'],
  ['the kids never mind', 'The kids never mind.'],
  ['if you never mind', 'If you never mind.'],
  ['lets scratch that', 'Lets scratch that.'],
  ['the blue one, scratch that.', ''],
]);

cases('"scratch" as a noun', [
  ['i started from scratch that day', 'I started from scratch that day.'],
  ['we built it from scratch that year', 'We built it from scratch that year.'],
  ['we went on strike that week', 'We went on strike that week.'],
  ['it was a lucky strike that year', 'It was a lucky strike that year.'],
  ['the scratch that he left is deep', 'The scratch that he left is deep.'],
  ['the scratch that you saw is old', 'The scratch that you saw is old.'],
  ['there is a deep scratch that you can see', 'There is a deep scratch that you can see.'],
  ['the site is bad scratch that', ''],
  ['hello scratch that scratch that', ''],
]);

cases('a lead-in word before the swap stays', [
  ['it was good i mean really good', 'It was really good.'],
  ['we are late i mean very late', 'We are very late.'],
  ["i'm late i mean very late", "I'm very late."],
  ["it's good i mean really good", "It's really good."],
  ['please wait no talking', 'Please wait no talking.'],
  ['i want a window seat scratch that an aisle seat', 'I want an aisle seat.'],
  ['i would like a blue logo i mean an orange logo', 'I would like an orange logo.'],
]);

cases('a guess does not take a person or a next thought with it', [
  ["i'll send it to you tomorrow i mean friday", "I'll send it to you Friday."],
  ['i was there yesterday i mean last week', 'I was there yesterday I mean last week.'],
  ['the food was great i mean the service was too', 'The food was great I mean the service was too.'],
  ['the price is fine i mean the price is too high', 'The price is too high.'],
  ['i went to the store i mean to pick up milk', 'I went to the store I mean to pick up milk.'],
  ['i think so i mean sure', 'I think so I mean sure.'],
  ['call me tomorrow i mean monday', 'Call me Monday.'],
  ['we ship today i mean tomorrow', 'We ship tomorrow.'],
]);

cases('a spoken mark only counts when it marks something', [
  ['i had my period', 'I had my period.'],
  ['it was a hard period', 'It was a hard period.'],
  ['the final period', 'The final period.'],
  ['it was a complete full stop', 'It was a complete full stop.'],
  ['use one comma', 'Use one comma.'],
  ['use one exclamation point', 'Use one exclamation point.'],
  ['we need new line items', 'We need new line items.'],
  ['my new line of work', 'My new line of work.'],
  ['we signed the contract period', 'We signed the contract.'],
  ['comma', 'Comma.'],
  ['period', 'Period.'],
  ['question mark', 'Question mark.'],
]);

cases('fillers, not names or answers', [
  ['i went to the ER', 'I went to the ER.'],
  ['I work at UM.', 'I work at UM.'],
  ['uh huh that works', 'Uh huh that works.'],
  ['mm hmm', 'Mm hmm.'],
  ['I, uh, think so.', 'I think so.'],
  ['  um   ,  hello', 'Hello.'],
]);

cases('repeats', [
  ['go go go', 'Go go go.'],
  ['knock knock', 'Knock knock.'],
  ['is is that ok', 'Is that ok?'],
  ['that that is hard', 'That is hard.'],
  ['I, I think so.', 'I think so.'],
  ['Yes, yes, I know.', 'Yes, yes, I know.'],
]);

cases('stray punctuation', [
  [',', ''],
  ['?', ''],
  ['...', ''],
  [', hello', 'Hello.'],
  ['hello ,', 'Hello.'],
  ['hello ?', 'Hello?'],
  ['hello . world', 'Hello. World.'],
]);

cases('an order is not a question, and more questions are', [
  ['do it now', 'Do it now.'],
  ['do your homework', 'Do your homework.'],
  ['have the report ready', 'Have the report ready.'],
  ['did it work', 'Did it work?'],
  ['how long will it take', 'How long will it take?'],
  ['how long it took is not clear', 'How long it took is not clear.'],
  ['what time works', 'What time works?'],
  ['am i late', 'Am I late?'],
  ["isn't it nice", "Isn't it nice?"],
  ['hi andrew can you call me', 'Hi andrew can you call me?'],
  ['hello andrew, what is your rate', 'Hello andrew, what is your rate?'],
]);

// Round 3: "actually" and "scratch that" left the wrong value and the cue in the output, while
// near-identical phrasings were fixed. Each line below stayed run-on or came out garbled before.
cases('"actually" corrects whatever the words prove', [
  ['the rent is nine hundred actually a thousand', 'The rent is a thousand.'],
  ['the deposit is five hundred actually six hundred', 'The deposit is six hundred.'],
  ['it costs three hundred and fifty actually four hundred', 'It costs four hundred.'],
  ['we need a thousand chairs actually two thousand', 'We need two thousand chairs.'],
  ['the budget is two million actually a million', 'The budget is a million.'],
  ['The rent is nine hundred. Actually, a thousand.', 'The rent is a thousand.'],
  [['the rent is nine hundred', 'actually a thousand'], 'The rent is a thousand.'],
  ['meet at the cafe actually the library', 'Meet at the library.'],
  ['we went to paris actually to rome', 'We went to rome.'],
  ['the file is on my laptop actually my desktop', 'The file is on my desktop.'],
  ['send it to the sales team actually marketing team', 'Send it to the marketing team.'],
  ['i want whole milk actually oat milk', 'I want oat milk.'],
  ['add milk actually oat milk', 'Add oat milk.'],
  ['i called him actually texted him', 'I texted him.'],
  ['i like this one actually that one', 'I like that one.'],
  ['the price is fine actually the price is too high', 'The price is too high.'],
  ['i love your portfolio actually i love your photography', 'I love your photography.'],
  ['the deadline is friday actually the deadline is next monday', 'The deadline is next Monday.'],
  ["i'm free friday afternoon actually saturday", "I'm free Saturday afternoon."],
  ['the meeting is monday at noon actually tuesday', 'The meeting is Tuesday at noon.'],
  ['see you next friday actually this monday', 'See you this Monday.'],
  ['the meeting is at two actually three instead', 'The meeting is at three instead.'],
  ['meet at two or actually three', 'Meet at three.'],
  ['meet at two actually make that three', 'Meet at three.'],
  ['see you at two wait at three', 'See you at three.'],
  ['take the bus wait the train', 'Take the train.'],
  ['the color should be red actually blue', 'The color should be blue.'],
  ['the size is medium actually large', 'The size is large.'],
  ['i am tired actually exhausted', 'I am exhausted.'],
]);

cases('"actually" that only moves on or adds stays', [
  ['the movie was actually the best', 'The movie was actually the best.'],
  ['i went to the store actually to pick up milk', 'I went to the store actually to pick up milk.'],
  ['i love the design actually the colours too', 'I love the design actually the colours too.'],
  ['i love the site actually the colours are great', 'I love the site actually the colours are great.'],
  ['i want two tickets actually one more thing', 'I want two tickets actually one more thing.'],
  ['the deadline is friday actually friday is too soon', 'The deadline is Friday actually Friday is too soon.'],
  ["i can't do today actually tomorrow works better", "I can't do today actually tomorrow works better."],
  ['i thought two people but actually three', 'I thought two people but actually three.'],
  ['we expected two hundred people actually three hundred came', 'We expected two hundred people actually three hundred came.'],
  ['we met in paris actually in the spring', 'We met in paris actually in the spring.'],
  ['the design looks great actually the best', 'The design looks great actually the best.'],
  ['the team liked it actually the whole team', 'The team liked it actually the whole team.'],
  ['i talked to anna actually i talked to her yesterday', 'I talked to anna actually I talked to her yesterday.'],
  ["i'm writing about the site sorry about the delay", "I'm writing about the site sorry about the delay."],
  ['i went to the store sorry to bother you', 'I went to the store sorry to bother you.'],
  ['sit at the table wait at the door', 'Sit at the table wait at the door.'],
  ['it is fine actually thanks', 'It is fine actually thanks.'],
  ['she sold the car actually a week ago', 'She sold the car actually a week ago.'],
  ['we finished at noon actually pretty quickly', 'We finished at noon actually pretty quickly.'],
  ['he can run a mile actually two', 'He can run a mile actually two.'],
]);

cases('"scratch that" swaps the phrase and keeps the verb', [
  ['add milk scratch that oat milk to the cart', 'Add oat milk to the cart.'],
  ['add the milk scratch that oat milk', 'Add oat milk.'],
  ['i need milk scratch that oat milk', 'I need oat milk.'],
  ['we need almond milk scratch that oat milk', 'We need oat milk.'],
  [['add milk', 'scratch that oat milk to the cart'], 'Add oat milk to the cart.'],
  ['the rent is nine hundred scratch that a thousand', 'The rent is a thousand.'],
  ['the launch is in may scratch that june', 'The launch is in June.'],
  ['i live in boston scratch that chicago', 'I live in chicago.'],
  ['it costs ten dollars scratch that twenty dollars', 'It costs twenty dollars.'],
  ['email me on friday scratch that call me on friday', 'Call me on Friday.'],
  ['we had to scratch that idea from the list', 'We had to scratch that idea from the list.'],
  ['my number ends in five scratch that six', 'My number ends in six.'],
  ['the kids two scratch that door', 'The kids two scratch that door.'],
]);

cases('a swap carries the whole replacement, with the kept words after it', [
  ['the total was three hundred dollars no wait four hundred', 'The total was four hundred dollars.'],
  ['the rent is nine hundred dollars actually a thousand', 'The rent is a thousand dollars.'],
  ['i have a budget of nine hundred i mean a thousand', 'I have a budget of a thousand.'],
  ['i have two dogs i mean three cats', 'I have three cats.'],
  ['we have two dogs actually three', 'We have three dogs.'],
  ["i'm free friday afternoon no wait next saturday", "I'm free next Saturday afternoon."],
  ['see you next friday no wait monday', 'See you next Monday.'],
]);

cases('"may" and "march" are months only where a date goes', [
  ['we need it by march i mean april', 'We need it by April.'],
  ['we need it by april actually may', 'We need it by May.'],
  ['book it for may actually june', 'Book it for June.'],
  ['she may actually june', 'She may actually June.'],
  ['we may come', 'We may come.'],
]);

cases('"i meant" works like "i mean", and "let me rephrase" like "scratch that"', [
  ['send it to mark i meant john', 'Send it to john.'],
  ['send it to mark sorry i meant john', 'Send it to john.'],
  ['i said monday but i meant tuesday', 'I said Monday but I meant Tuesday.'],
  ['i meant to call you', 'I meant to call you.'],
  ['i told him i meant it', 'I told him I meant it.'],
  ['the site is slow let me rephrase the site could be faster', 'The site could be faster.'],
  ["i don't like it let me rephrase that i would like some changes", 'I would like some changes.'],
  ['this is bad let me start over we need a plan', 'We need a plan.'],
  ['she said let me rephrase', 'She said let me rephrase.'],
  ['let me start over with the design', 'Let me start over with the design.'],
]);

cases('the verb stays when the swap is only the object', [
  ['i need milk actually oat milk', 'I need oat milk.'],
  ['i bought milk i mean oat milk', 'I bought oat milk.'],
  ['i called mark i mean texted mark', 'I texted mark.'],
  ['add milk no wait oat milk to the cart', 'Add oat milk to the cart.'],
  ['send it to the sales team i mean marketing team', 'Send it to the marketing team.'],
]);

cases('nothing said is nothing', [
  ['', ''],
  ['   ', ''],
  ['um uh', ''],
]);

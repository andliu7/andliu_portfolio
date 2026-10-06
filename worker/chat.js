// The Cloudflare Worker entry (wrangler.toml: main = "chat.js"). Not deployed by the site
// build; the deploy steps are in wrangler.toml.
//
// system-prompt.txt is generated from lib/site.ts by scripts/build-system-prompt.mjs and bundled
// as a text module (the [[rules]] Text block in wrangler.toml). Rebuild it whenever lib/site.ts
// changes; scripts/check-text.mjs fails while it is stale.
//
// Two routes: POST /contact is the contact form's mailer (contact.js, setup in CONTACT.md);
// every other path is the chat, as before.
import SYSTEM_PROMPT from './system-prompt.txt';
import { EMAIL } from '../lib/site.ts';
import { handle } from './handler.js';
import { handleContact } from './contact.js';

const worker = {
  /** @param {Request} request @param {Record<string, any>} env */
  fetch(request, env) {
    if (new URL(request.url).pathname === '/contact') return handleContact(request, env, { to: EMAIL });
    return handle(request, env, { system: SYSTEM_PROMPT });
  },
};

export default worker;

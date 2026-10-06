// The Cloudflare Worker entry (wrangler.toml: main = "chat.js"). Not deployed by the site
// build; the deploy steps are in wrangler.toml.
//
// system-prompt.txt is generated from lib/site.ts by scripts/build-system-prompt.mjs and bundled
// as a text module (the [[rules]] Text block in wrangler.toml). Rebuild it whenever lib/site.ts
// changes; scripts/check-text.mjs fails while it is stale.
import SYSTEM_PROMPT from './system-prompt.txt';
import { handle } from './handler.js';

const worker = {
  /** @param {Request} request @param {Record<string, any>} env */
  fetch(request, env) {
    return handle(request, env, { system: SYSTEM_PROMPT });
  },
};

export default worker;

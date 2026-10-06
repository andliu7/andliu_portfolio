# The contact form: setup

The footer card's form posts to `POST /contact` on the same Cloudflare Worker as the chat
(`worker/contact.js`, routed in `worker/chat.js`). The Worker emails you through Resend. The site
only shows the form when it was built with `NEXT_PUBLIC_CHAT_URL` set; without it the form is not
rendered and the email link is the way in. Nothing below has been run for you.

All commands are PowerShell, run from `andliu-portfolio\worker` unless a step says otherwise.

## 1. Resend key (once)

1. Sign up at https://resend.com with **zeus.andrewliu@gmail.com**. Until you verify a domain
   (step 5) the sender is `onboarding@resend.dev`, which Resend only delivers to the account's own
   address, so the account must use the address the form sends to (`EMAIL` in `lib/site.ts`).
2. Dashboard, API Keys, Create API Key: permission **Sending access**. Copy the `re_...` key. It
   is shown once.

## 2. Put the key on the Worker and deploy

```powershell
cd C:\Users\zeusa\Downloads\Projects\andliu-portfolio\worker
npx wrangler login
node ..\scripts\build-system-prompt.mjs
npx wrangler secret put RESEND_API_KEY --config wrangler.toml
npx wrangler deploy --config wrangler.toml
```

- `secret put` asks for the value: paste the key. It is never written to a file.
- Keep `--config wrangler.toml`: without it wrangler also finds the site build's
  `..\.wrangler\deploy\config.json` and refuses to pick one.
- The deploy prints the Worker URL, like `https://andliu-chat.<your-subdomain>.workers.dev`.
- This is the chat's Worker too. Without `ANTHROPIC_API_KEY` (see `wrangler.toml`) the chat falls
  back to its offline answers; the contact form does not need that key.
- Before deploying, decide whether to keep `http://localhost:3000` in `ALLOWED_ORIGINS`
  (`handler.js`); both routes share that list. The dev server here runs on 3001, so add
  `http://localhost:3001` too if you want to test the live form from `npm run dev`.

## 3. Check the Worker by hand

```powershell
Invoke-RestMethod -Method Post -Uri "https://andliu-chat.<your-subdomain>.workers.dev/contact" -Headers @{ Origin = "https://andliu.dev" } -ContentType "application/json" -Body '{"name":"Test","email":"zeus.andrewliu@gmail.com","message":"Testing the contact form.","botcheck":""}'
```

It prints `ok : True` and the email arrives within a minute. A 4th try inside a minute answers
429 (the `CONTACT_LIMIT` binding: 3 per IP per 60 seconds). The unit tests, from the project root:

```powershell
node --test worker/chat.test.mjs worker/contact.test.mjs
```

## 4. Turn the form on in the site

The Pages build reads a repository variable (`.github/workflows/deploy.yml`):

```powershell
gh variable set NEXT_PUBLIC_CHAT_URL --repo andliu7/andliu_portfolio --body "https://andliu-chat.<your-subdomain>.workers.dev"
gh workflow run deploy.yml --repo andliu7/andliu_portfolio
```

No `gh` installed? Do the same in the browser: github.com/andliu7/andliu_portfolio, Settings,
Secrets and variables, Actions, the Variables tab, New repository variable, name
`NEXT_PUBLIC_CHAT_URL`, value the Worker URL. Then Actions, "Deploy portfolio to GitHub Pages",
Run workflow (or just push any commit to `main`).

For a local build instead, put `NEXT_PUBLIC_CHAT_URL=https://andliu-chat.<your-subdomain>.workers.dev`
in `andliu-portfolio\.env.local` and run `npm run build`. Setting this variable also turns on the
live chat. To turn both off, delete the variable and rebuild.

## 5. Later: send from your own domain

1. Resend dashboard, Domains, Add Domain: `andliu.dev` (or a subdomain such as `mail.andliu.dev`).
2. Add the DNS records it lists (SPF, DKIM, and the MX for bounces) at your DNS host and wait for
   Resend to show **Verified**.
3. In `worker\wrangler.toml`, set `CONTACT_FROM = "Andrew Liu <hello@andliu.dev>"` (any address on
   the verified domain), then `npx wrangler deploy --config wrangler.toml`.

Replies go to the visitor either way: every email has `reply_to` set to the address they typed.

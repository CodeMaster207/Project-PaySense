# PaySense

A desktop web app that turns goals into daily money plans with AI, and imports real transactions and subscriptions from the **PayPal sandbox**. Built for the PayPal AI hackathon.

## Features
- **Email sign-in / sign-up** (Payload auth, isolated `app-session` cookie).
- **Expenditures** (home): daily / monthly / yearly / today views, incomes and expenditures per day, calendar, and a Personal AI chat that knows your data.
- **Goals**: write a goal (Markdown description), the AI drafts a plan; review the summary, calendar and per-day items, edit, "Break it down further", Confirm or Cancel.
- **Plans**: filter by date range, edit saved plans on a calendar, AI "Further refine" (weekly checkpoints) and "Suggest goals".
- **Subscriptions**: active/cancelled tables, tags and notes, spend summary by category.
- **PayPal Integration**: connect, filter incomes/expenses/subscriptions, date range, print, resync.

## Tools
- PayPal developer platform, sandbox: OAuth2 client credentials + Transaction Search (Reporting) API, called server-side only.
- AI: any OpenAI-compatible chat-completions API (default `gpt-4o-mini`). Without a key, a built-in planner keeps the demo working.
- Next.js 16, Payload CMS (data + auth), Tailwind CSS v4, Google Material SVG icons.

## Run locally
```sh
pnpm install
pnpm dev
```
Environment variables (server-only):

| Variable | Purpose |
| --- | --- |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | Sandbox REST app credentials from developer.paypal.com. Enable "Transaction Search" on the app. Unset = demo transactions. |
| `PAYPAL_ACCESS_TOKEN` | Optional pre-issued sandbox access token (about 9 hours). Use it on hosts that block outbound POST requests, which the OAuth token call needs. |
| `APP_OPENAI_API_KEY` | Enables LLM plans and chat. Optional: `APP_OPENAI_MODEL`, `APP_OPENAI_BASE_URL`. |

Payload needs its database settings supplied by your host (Figma Make provides them).

## Notes
PayPal passwords are never collected; the app authenticates with your developer app credentials. Sandbox only, no real money.

License: MIT

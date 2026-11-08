# PaySense

A web app that connects to the **PayPal sandbox** and uses **AI** to make sense of your money: it sorts imported PayPal payments, finds the PayPal transaction behind each subscription, spots unusual spending, and turns savings goals into daily plans. Built for the PayPal AI Hackathon.

## What it does

| Page | What you can do |
| --- | --- |
| **Expenditures** (home) | Pick a day on the calendar, log expenses, see incomes and goal funding for that day, import from PayPal, and chat with the Personal AI. |
| **Dashboard** | Day, month and year views with a pie chart, a running account balance and deficit warnings. |
| **Incomes** | Add a **job** (salary), a **contract** (fixed-term self-employed work) or one-off **revenue**. **Request payment** sends a real PayPal invoice to another PayPal account and tracks it as pending or paid. |
| **Goals / Plans** | Describe a savings goal and the AI drafts a daily plan. Refine it, skip days, and let the AI suggest goals. |
| **Subscriptions** | Add subscriptions, link each one to its PayPal transaction (the AI suggests the match), and cancel it in PayPal when PayPal supplied a subscription ID. |
| **PayPal Integration** | Connect your sandbox account, sync the last 90 days, filter by type and date, and see each transaction ID. Amounts in other currencies are converted to RM and the original is kept. |
| **AI Insights** | One click analysis of your recent transactions, plus the page where you connect your own AI account. |

## AI features

PaySense uses AI for decisions about your data, not only for writing text. Each feature falls back to simple built-in rules when no AI account is connected, so the app still works.

| Feature | Where | Kind of AI task |
| --- | --- | --- |
| **Payment classification** | PayPal sync and "Import from PayPal" | Decides whether money out is a recurring subscription or a one-off expense, and files subscriptions under Streaming, Software, Shopping, Utilities or Other. Answers are limited to fixed options and checked before use. |
| **Subscription to transaction matching** | Subscriptions, "PayPal link" card | Compares a subscription you added by hand with your unlinked PayPal transactions and picks the most likely match, or none. You confirm before anything is linked. |
| **Spending insights** | AI Insights | Reads recent transactions and returns structured findings: unusual payments, saving ideas, subscriptions worth reviewing and a 30 day forecast. Each finding cites real amounts. |
| **Goal planning** | Goals | Turns a goal (what, how much, by when) into a daily amount and dated checkpoints. Output is validated: dates stay inside the goal period and amounts must be positive. |
| **Plan refinement and goal suggestions** | Plans | Breaks a plan into weekly steps and proposes realistic goals from your finances. |
| **Which goal to fix first** | Dashboard "AI planner" button | Picks the one savings goal whose change would help your budget most, with a reason. |
| **Personal AI chat** | Home | Answers questions using a snapshot of your own data: balance, biggest expenses, subscriptions and goals. |

The AI never adds, edits or deletes your records on its own, and never cancels a subscription. Each page has a "How is AI used here?" note that explains this in the app.

## Run it locally

You need **Node.js 24.22 or newer** and **pnpm**.

```sh
git clone https://github.com/CodeMaster207/Project-PaySense.git
cd Project-PaySense
pnpm install
```

If pnpm reports ignored build scripts (pnpm 12), run `pnpm approve-builds --all` and install again.

Create your settings file and fill in the PayPal values (see the next section):

```sh
cp .env.example .env.local
```

Then start the app:

```sh
pnpm dev
```

Open http://localhost:3000, choose **Sign up**, and create an account. The database is a local SQLite file (`payload.db`) that is created on first run. The CMS admin panel is at http://localhost:3000/admin.

## PayPal sandbox setup

1. Go to developer.paypal.com and open **Testing Tools, Sandbox Accounts**. Use a **Business** account for the app. Create a Personal account to act as a customer.
2. Open **Apps & Credentials**, switch to **Sandbox**, create an app under that Business account, and under **Features** tick **Transaction Search** and **Invoicing**. Save.
3. Copy the app's Client ID and Secret into `.env.local` as `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`, then restart `pnpm dev`.
4. Make a few test payments: log in at sandbox.paypal.com as the Personal account and send money to the Business account, and send some back from the Business account.
5. In PaySense open **PayPal Integration**, click **Connect PayPal sandbox**, then **Resync**.

Notes:
- PayPal can take up to a few hours before a new sandbox payment appears in Transaction Search. The page explains this.
- The app reads the account's currency from PayPal and converts imported amounts to RM, keeping the original amount visible.
- To try **Request payment**, send a request to your Personal sandbox account's email, then log in to sandbox.paypal.com as that account and open **Invoices** to see it. Sandbox emails are not delivered.

## Connecting AI

Open the **AI Insights** page. Under **Your AI account** you can:

- paste an **API key** for **OpenAI**, **Claude** (Anthropic) or **Gemini** (Google). The key is tested once, stored encrypted on the server and never shown again; or
- for **Gemini**, use **Sign in with Google** (needs the Google settings below).

A ChatGPT, Claude or Gemini chat subscription does not include API access. OpenAI and Claude do not offer a sign-in for other apps, so they need an API key. Usage is billed by the provider you choose.

Without any AI account, the app uses its built-in rules and still runs end to end.

## Settings (`.env.local`)

| Variable | Needed | Purpose |
| --- | --- | --- |
| `PAYLOAD_SECRET` | Yes | Signs sessions and encrypts stored AI keys. Use a long random string. |
| `DATABASE_URI` | Yes | SQLite file, `file:./payload.db`. |
| `NEXT_PUBLIC_SITE_URL` | Yes | Base URL, `http://localhost:3000` locally. |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | For PayPal | Sandbox app credentials. |
| `PAYPAL_ACCESS_TOKEN` | No | A pre-issued sandbox token, for hosts that block the token request. |
| `APP_OPENAI_API_KEY` | No | A server-wide OpenAI key used when a user has not connected their own. Optional `APP_OPENAI_MODEL`, `APP_OPENAI_BASE_URL`. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | No | Enables Gemini sign-in. Add `http://localhost:3000/ai/google/callback` as an authorised redirect URI and enable the Gemini API. While your Google consent screen is in testing mode, add each user as a test user. |
| `GOOGLE_AI_SCOPES` | No | Overrides the Google scopes requested for Gemini sign-in. |
| `PAYPAL_INVOICE_CURRENCY` | No | Fallback invoice currency if PayPal does not report the account's currency. |

## Built with

Next.js 16 (App Router), Payload CMS (data and sign-in), SQLite, Tailwind CSS v4, the PayPal REST APIs (OAuth, Transaction Search, Reporting balances, Invoicing, Subscriptions), and the OpenAI, Anthropic and Gemini APIs.

## Security and privacy

- PayPal passwords are never collected. The server authenticates with your sandbox app credentials and they never reach the browser.
- AI keys and Google refresh tokens are encrypted at rest and cannot be read through the API.
- `.env.local` and `payload.db` are git-ignored. Sandbox only, no real money.

License: MIT

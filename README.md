# PaySense

**A money copilot for gig workers and online sellers, built on PayPal.** PaySense connects to your PayPal account, shows you what you actually earned and spent, helps you get paid, and uses AI to make sense of it all. Built for the PayPal AI Hackathon. It runs against the PayPal sandbox only, so no real money moves.

## Who it is for

- **Gig workers and freelancers.** You are paid by several clients, on irregular dates, sometimes in other currencies, and you chase invoices by hand.
- **Online retailers and small sellers.** Customer payments arrive in PayPal, and the same account pays suppliers and software subscriptions.

## The problem

For both groups, money from many clients or customers lands in one long PayPal list. It is hard to see what you really earned, whether more is going out than coming in, which subscriptions are quietly draining the account, and who still owes you. Most budgeting tools are not PayPal-aware, or need hours of manual tagging.

## How PaySense helps

| You want to... | PaySense does it by... |
| --- | --- |
| See every payment across clients and customers | Syncing PayPal into a table you can sort, filter per column, search and export to CSV for your accountant, with each PayPal transaction ID. |
| Know what PayPal fees cost you and who you depend on | Showing PayPal's fee on every payment, your income after fees, and income by client, with a warning when one client is half or more of your income. |
| Know if money is going out faster than it comes in | Sorting payments with AI (subscription or one-off, and category), a live balance, and AI Insights that flags unusual spending and forecasts the next 30 days. |
| Get paid | **Request payment** sends a real PayPal invoice and tracks it as pending or paid. |
| Pay suppliers or contractors | **Send via PayPal ID** on the home page pays them through PayPal and records the expense. |
| Earn in other currencies | Converting imported payments to RM while keeping the original amount, and sending invoices in your PayPal account's own currency. |
| Plan around irregular income | Recording jobs, contracts and revenue, and building savings goals whose daily funding follows what you actually earn. |
| Keep software costs under control | Tracking subscriptions, linking each to its PayPal payment, and cancelling it in PayPal from the app. |

## PayPal features used

| PayPal feature | Used for |
| --- | --- |
| OAuth (client credentials) | Server-side sign-in to your sandbox app. Credentials never reach the browser. |
| Transaction Search | Importing the last 90 days of transactions. |
| Reporting balances | Reading the connected account's ID and currency. |
| Invoicing | **Request payment**: create, send and check invoices. |
| Payouts | **Send via PayPal ID**: pay a PayPal ID or email. |
| Subscriptions | Cancelling a subscription in PayPal when you cancel it in the app. |

## What it does

| Page | What you can do |
| --- | --- |
| **Expenditures** (home) | Pick a day on the calendar, log expenses, see incomes and goal funding for that day, import from PayPal, and chat with the Personal AI. |
| **Dashboard** | Day, month and year views with a pie chart, a running account balance and deficit warnings. |
| **Incomes** | Add a **job** (salary), a **contract** (fixed-term self-employed work) or one-off **revenue**. **Request payment** sends a real PayPal invoice to another PayPal account and tracks it as pending or paid. |
| **Goals / Plans** | Describe a savings goal and the AI drafts a daily plan. Refine it, skip days, and let the AI suggest goals. |
| **Subscriptions** | Add subscriptions, link each one to its PayPal transaction (the AI suggests the match), and cancel it in PayPal when PayPal supplied a subscription ID. |
| **PayPal Integration** | Connect your sandbox account, sync the last 90 days, and see each transaction ID in an **AG Grid** table you can sort, filter per column, search, page through and export to CSV. Amounts in other currencies are converted to RM and the original is kept. |
| **AI Insights** | One click analysis of your recent transactions, plus the page where you connect your own AI account. |

## AI features

PaySense uses AI for decisions about your data, not only for writing text. Each feature falls back to simple built-in rules when no AI account is connected, so the app still works.

| Feature | Where | Kind of AI task |
| --- | --- | --- |
| **Payment classification** | PayPal sync and "Import from PayPal" | Decides whether money out is a recurring subscription or a one-off expense, and files subscriptions under Streaming, Software, Shopping, Utilities or Other. Answers are limited to fixed options and checked before use. |
| **Subscription to transaction matching** | Subscriptions, "PayPal link" card | Compares a subscription you added by hand with your unlinked PayPal transactions and picks the most likely match, or none. You confirm before anything is linked. |
| **Invoice assistant** | Incomes, Request payment | Turns a sentence such as "invoice Acme RM500 for logo design, due in 14 days" into a drafted PayPal invoice: client, amount, description and due date. The app checks the draft against what you typed, so the AI cannot invent an email or change the amount. You review the form and press Send, so nothing is sent without you. |
| **Spending insights** | AI Insights | Reads recent transactions and returns structured findings: unusual payments, saving ideas, subscriptions worth reviewing, PayPal fees, how dependent your income is on one client, and a 30 day forecast. The totals and client shares are calculated exactly by the app and handed to the AI. Each finding cites real amounts. |
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

## Deploy to Render

PaySense includes a `render.yaml` Blueprint that creates a web service and a Postgres database on [Render](https://render.com).

1. Push this repository to GitHub.
2. In Render choose **New, Blueprint** and select the repository. Render reads `render.yaml` and creates `paysense` (the web app) and `paysense-db` (Postgres).
3. When asked, enter `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` from your sandbox app. `APP_OPENAI_API_KEY`, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are optional.
4. Render builds and starts the app. Open the `onrender.com` address it gives you, sign up, and create the first admin at `/admin`.

How it works:
- **Database:** the app picks its database from `DATABASE_URI`. A `postgres://` address (which Render fills in from `paysense-db`) uses Postgres. A `file:` address, the local default, uses a SQLite file, so you can run it locally without installing Postgres.
- **Tables:** in production Payload does not create tables itself. The app applies the files in `src/migrations` when it starts, so the database sets itself up on the first deploy.
- **Site address:** the app uses Render's `RENDER_EXTERNAL_URL` as its public address, so no extra setting is needed. For Gemini sign-in, add `https://<your-app>.onrender.com/ai/google/callback` as an authorised redirect URI in Google Cloud.

If you change a collection (add or rename a field), create a new migration and commit it before deploying:

```sh
DATABASE_URI=postgres://user:pass@localhost:5432/paysense pnpm payload migrate:create describe_the_change
```

This only needs a Postgres-style address to choose the right database type. It does not connect to a database. Local SQLite development needs no migrations.

Good to know:
- Free Render web services go to sleep when idle and take a short while to wake up. Free Render databases are time-limited, so check Render's current free-plan terms before relying on one for judging.
- Files uploaded through the admin panel are stored on the server's disk and are lost on redeploy. PaySense itself does not use uploads.

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
| `DATABASE_URI` | Yes | `file:./payload.db` for local SQLite, or a `postgres://` URL for Postgres. Render sets this for you. |
| `NEXT_PUBLIC_SITE_URL` | Yes | Base URL, `http://localhost:3000` locally. |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | For PayPal | Sandbox app credentials. |
| `PAYPAL_ACCESS_TOKEN` | No | A pre-issued sandbox token, for hosts that block the token request. |
| `APP_OPENAI_API_KEY` | No | A server-wide OpenAI key used when a user has not connected their own. Optional `APP_OPENAI_MODEL`, `APP_OPENAI_BASE_URL`. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | No | Enables Gemini sign-in. Add `http://localhost:3000/ai/google/callback` as an authorised redirect URI and enable the Gemini API. While your Google consent screen is in testing mode, add each user as a test user. |
| `GOOGLE_AI_SCOPES` | No | Overrides the Google scopes requested for Gemini sign-in. |
| `PAYPAL_INVOICE_CURRENCY` | No | Fallback invoice currency if PayPal does not report the account's currency. |

## Built with

Next.js 16 (App Router), Payload CMS (data and sign-in), SQLite locally and Postgres in production, hosted on **Render**, Tailwind CSS v4, **AG Grid Community** (the PayPal transactions and subscriptions tables), the PayPal REST APIs (OAuth, Transaction Search, Reporting balances, Invoicing, Subscriptions), and the OpenAI, Anthropic and Gemini APIs.

## How AG Grid is integrated

PaySense uses the free **AG Grid Community** edition (`ag-grid-community` and `ag-grid-react`, MIT licensed) for its two data-heavy tables: the PayPal transactions on **PayPal Integration** and the lists on **Subscriptions**.

### Where it lives

| File | Role |
| --- | --- |
| `src/components/grid/gridSetup.ts` | Registers the AG Grid features the app uses and defines the shared theme. |
| `src/components/grid/PayPalGrid.tsx` | The PayPal transactions grid: columns, cell renderers and grid options. |
| `src/components/grid/SubscriptionsGrid.tsx` | The grid used for the active and cancelled subscription lists. |
| `src/components/PayPalClient.tsx` | The page around the PayPal grid: builds the rows, the Type and date filters, search, CSV export and print. |
| `src/components/SubscriptionsClient.tsx` | The Subscriptions page: handles row selection and shows the selected subscription's details. |
| `src/app/(frontend)/styles.css` | One style rule that highlights the selected subscription row. |

### How the data reaches the grid

1. A server page loads your records from the database (PayPal-imported entries, subscriptions and planned goal funding).
2. A client component turns them into plain rows. For PayPal, three sources are merged into one list: imported PayPal transactions, subscriptions, and goal funds.
3. The grid receives the rows as `rowData`. AG Grid's client-side row model holds them in the browser, which suits the few hundred records a sandbox account produces.

### Setup (`gridSetup.ts`)

- **Only the features in use are registered** with `ModuleRegistry`: client-side row model, pagination, CSV export, quick filter, text, number and date filters, and cell and row styling. Registering everything would make the page heavier.
- **Theme:** the grid starts from AG Grid's Quartz theme and overrides its colours, header weight, borders, row hover and font to match the app's banana-yellow look and Nunito font.

### What each grid does

**PayPal transactions (`PayPalGrid.tsx`)**
- **Columns:** Date, Business (with a type badge), Transaction ID in monospace, and Amount.
- **Sorting and filtering:** every column sorts. Business and Transaction ID have text filters, Amount has a number filter, and Date has a date filter. The date column stores ISO strings, so a custom comparator converts them to dates for the filter.
- **Custom cells:** React cell renderers draw the badge and the green or red amount. The amount cell also shows the original currency (for example `USD 5,000.00`) under the converted RM figure.
- **Search:** the search box above the table feeds the grid's quick filter, which matches across all columns.
- **Paging:** 10 rows per page, with a choice of 10, 25 or 50.
- **Stable rows:** each row has a fixed ID, so the grid keeps its sort, filter and scroll position when data refreshes after a sync.

**Around the PayPal grid (`PayPalClient.tsx`)**
- The **Type** buttons (All, Incomes, Expenses, Goal funds) and the **date range** pick which rows are passed to the grid. The grid's own column filters then narrow them further.
- **Export CSV** calls the grid's `exportDataAsCsv`, which saves what is currently shown (after filtering and sorting) as a file.
- **Print Record** temporarily switches the grid to its print layout. Without this, pagination would hide rows from the printout.
- The grid is **keyed by the display currency**, so it redraws when you change currency and the RM amounts stay correct.

**Subscriptions (`SubscriptionsGrid.tsx`)**
- Two grids, active and cancelled, with sortable columns for service, category, renew or termination date, and status.
- Clicking a row tells the page which subscription is selected, which opens its details and the PayPal link card. The selected row gets a highlight class.

### Limits to know about

- Only **Community** features are used. Enterprise features such as row grouping and expandable detail rows are not, so no licence is needed.
- Rows are filtered and sorted in the browser rather than on the server. That is fine at this size and would need AG Grid's server-side row model for very large histories.

## Security and privacy

- PayPal passwords are never collected. The server authenticates with your sandbox app credentials and they never reach the browser.
- AI keys and Google refresh tokens are encrypted at rest and cannot be read through the API.
- `.env.local` and `payload.db` are git-ignored. Sandbox only, no real money.

License: MIT

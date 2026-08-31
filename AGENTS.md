# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project overview

This is a private HubSpot e-commerce project for Rainy Day Merchandise.

- Frontend: HubSpot CMS React theme in `hubspot-theme/src/theme/rainy-day-merch/`
- Backend: Vercel serverless API functions in `api/`
- Integrations: Square catalog/payments, HubSpot CRM, Resend email, Vercel hosting
- Primary docs: `README.md`, `CHECKOUT_FLOW.md`, `CATEGORY_BANNER_GUIDE.md`, `MARKETER_HANDOFF_GUIDE.md`

## Branch and environment model

- `mom` is production.
- `dev` is development and preview.
- Production uses the main HubSpot portal, Square production, and `rainydaymerchandise.com`.
- Development uses the HubSpot test portal, Square sandbox, and Vercel preview deployments.

Do not assume production credentials, portals, or deploy targets are safe to use. Ask before running production-impacting commands such as `vercel --prod`, `hs project upload` against the main portal, or anything that writes to Square/HubSpot production data.

## Repository layout

- `api/`: Vercel serverless functions. Files export request handlers and use Node.js-style JavaScript.
- `hubspot-theme/src/theme/rainy-day-merch/components/shared/`: reusable React components.
- `hubspot-theme/src/theme/rainy-day-merch/components/islands/`: interactive React islands used by HubSpot templates.
- `hubspot-theme/src/theme/rainy-day-merch/templates/`: HubL templates.
- `hubspot-theme/src/theme/rainy-day-merch/utils/`: client-side utilities.
- `hubspot-theme/src/theme/rainy-day-merch/styles/`: global and Tailwind styles.
- `env.example`: environment variable reference. Real `.env` files must not be committed.

## Install and run commands

Root API project:

```bash
npm install
npm run dev
npm run keep-alive
```

HubSpot theme:

```bash
cd hubspot-theme/src/theme/rainy-day-merch
npm install
npm run start
npm run deploy
```

HubSpot project upload from the project folder:

```bash
cd hubspot-theme
hs project upload
hs project open
```

Prefer preview/test portal commands when validating HubSpot changes. The root `README.md` documents the intended `--portal=test-account` workflow.

## Validation

There is no dedicated test script in the current `package.json` files. Before handing off code changes:

- Run the most relevant available command for the touched area when possible.
- For API changes, run or recommend `npm run dev` / `vercel dev` and exercise the changed endpoint.
- For theme changes, run or recommend the HubSpot dev server or project upload against a test portal.
- If validation cannot be run because credentials, network, HubSpot CLI auth, or Vercel auth are unavailable, state that clearly.

## Coding conventions

- Use plain JavaScript and React JSX matching the existing files.
- Keep component changes localized; shared UI belongs in `components/shared/`.
- Keep browser-only behavior inside island components or client utilities.
- Preserve existing Tailwind utility usage and CSS class naming.
- Prefer small, explicit helper functions over broad rewrites.
- Do not introduce TypeScript, a new formatter, a new package manager, or a new framework unless the task explicitly requires it.
- Avoid changing generated/exported marketer handoff artifacts unless the task is about those outputs.

## API and integration safety

- Never commit secrets, tokens, `.env`, or credentials.
- Treat Square, HubSpot, Resend, and Vercel calls as external side effects.
- Keep payment processing server-side. Client code should only handle Square payment tokens and non-sensitive checkout state.
- Maintain the Square environment split:
  - `SQUARE_ENVIRONMENT=production` uses production Square credentials.
  - Non-production should use sandbox credentials.
- Be careful with customer/order data in logs. Avoid adding logs that expose PII, tokens, payment data, or full request bodies.

## Deployment safety

Ask before:

- Deploying to production.
- Uploading to the main HubSpot portal.
- Running migrations or scripts that mutate HubSpot, Square, Resend, or production Vercel state.
- Changing branch strategy, deployment configuration, DNS/domain settings, or environment variable names.

Normal local edits, non-production preview validation, and read-only inspection are in scope without asking.

## Documentation expectations

When changing behavior that affects checkout, categories, authentication, marketer workflows, or environment setup, update the relevant markdown docs in the same change.

If you notice docs that reference missing files or outdated paths, call it out in the handoff rather than silently relying on them.


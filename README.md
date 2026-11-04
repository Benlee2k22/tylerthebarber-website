# Tyler the Barber

A fresh React + Vite barber website with a public booking flow and an owner dashboard for appointments, walk-ins, calendar blocks, prices, outgoings, notes, and weekly takings/client counts.

## Run locally

1. Install Node.js 20 or later.
2. Run `npm install` and `npm run dev`.
3. Set `VITE_API_BASE_URL=https://api.vantaweb.co.uk` in `.env.local` to connect to the VPS API. The public marketing site works without it.

## Netlify

Connect this repository to Netlify. The included `netlify.toml` uses `npm run build` and publishes `dist`, with a SPA rewrite so direct links work. Set `VITE_API_BASE_URL=https://api.vantaweb.co.uk` in the Netlify build environment. The VPS API must allow `https://tylerthebarber.uk` and `https://www.tylerthebarber.uk` through CORS.

## VPS API and database

1. The API changes are in the Vanta Core repository under `apps/api/src/barber.ts` and `db/migrations/010_barber.sql`.
2. Apply migration `010_barber.sql` to the existing `vanta_core` PostgreSQL database as `vanta_app`.
3. Deploy the API changes and restart `vanta-core-api` on the VPS. Existing Vanta Core owner accounts can sign in; no second login system is created.
4. Set `VITE_API_BASE_URL=https://api.vantaweb.co.uk` in Netlify and redeploy this site.

The browser receives only the public API URL and a short-lived owner JWT. PostgreSQL credentials and the JWT signing secret remain on the VPS. SMS reminders need Twilio credentials and a scheduled reminder worker on the VPS; those must be configured before text reminders can be sent.

## Owner tools

Visit `/#owner` and sign in with the existing Vanta Core owner account. Mark appointments complete to include them in weekly income/client totals. Walk-ins can be added from the owner dashboard and count toward the selected week. Expenses and notes are private to authenticated owners.

# Tyler the Barber

A fresh React + Vite barber website with a public booking flow and an owner dashboard for appointments, walk-ins, calendar blocks, prices, outgoings, notes, and weekly takings/client counts.

## Run locally

1. Install Node.js 20 or later.
2. Run `npm install` and `npm run dev`.
3. Add Supabase values to `.env.local` to enable booking and owner tools. The public marketing site works without them.

## Netlify

Connect this repository to Netlify. The included `netlify.toml` uses `npm run build` and publishes `dist`, with a SPA rewrite so direct links work. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Netlify environment variables, then deploy.

## Supabase setup

1. Create a Supabase project and run `supabase/migrations/20261104180000_fresh_barber_schema.sql` in the SQL editor.
2. Copy the project URL and anon key to `.env.local` and Netlify's build environment.
3. Create the owner's user in Supabase Authentication, then run the owner promotion SQL shown at the bottom of the migration.
4. To send SMS reminders, deploy `supabase/functions/send-sms-reminders` and set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER` as Supabase function secrets. Schedule it hourly with Supabase Cron. Customers only receive reminders after opting in.

The Supabase anon key is intended for the browser and is protected by row-level security. Never put a service-role key or Twilio credentials in Vite/Netlify public variables.

## Owner tools

Visit `/#owner` and sign in. Mark appointments complete to include them in weekly income/client totals. Walk-ins can be added from the owner dashboard and count toward the selected week. Expenses and notes are private to authenticated owners.

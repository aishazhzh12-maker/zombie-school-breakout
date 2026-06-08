# Project Deployment Rules

This project is a TanStack Start app built by Vite/Nitro for Vercel. Keep deployment changes minimal and verify the repository folder, Git remote, and current branch before editing.

## Env Safety

- Never commit real `.env` files or secret handoff files.
- Keep `.env`, `.env.*`, `VERCEL_ENV_IMPORT.local.env`, and `VERCEL_ENV_VALUES.local.md` ignored by Git.
- Keep `.env.example` committed with variable names only, no real values.
- Public browser variables use `VITE_*` and are visible to users.
- Secret backend variables must never use `VITE_*`.

## Vercel Settings

- Root Directory: project root (`zombie-school-breakout-git` when deploying this repo directly).
- Framework Preset: Other.
- Install Command: `npm install`.
- Build Command: `npm run build`.
- Output Directory: leave blank. Nitro/Vercel should produce `.vercel/output`.
- Package manager: use npm explicitly on Vercel even though `bun.lock` exists, because the deployment is configured for npm scripts.

## Supabase

- `SUPABASE_URL`: base project URL, for example `https://PROJECT_REF.supabase.co`; do not append `/rest/v1`.
- `SUPABASE_PUBLISHABLE_KEY`: Supabase anon/public key for server-side SSR use.
- `VITE_SUPABASE_URL`: same base project URL exposed to the browser.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: same anon/public key exposed to the browser.
- `VITE_SUPABASE_PROJECT_ID`: Supabase project ref, the part before `.supabase.co`.
- `SUPABASE_SERVICE_ROLE_KEY`: backend/server-only secret key. Do not require or add it unless a real server admin operation must bypass RLS.

Migrations are SQL files that create or update database tables. Apply files in `supabase/migrations` to the target Supabase project before deploying features that query those tables. The project ref is the `PROJECT_REF` in `https://PROJECT_REF.supabase.co`.

## Gemini

- `GEMINI_API_KEY` is backend/server-only and must never be exposed through `VITE_*`.
- Default student model: `gemini-2.5-flash-lite`, unless the user explicitly requests another model.
- Store model choice in `GEMINI_MODEL` when Gemini is used.

## Service Role Safety

- Prefer anon/public keys when RLS policies allow the needed public SELECT/INSERT behavior.
- Use `SUPABASE_SERVICE_ROLE_KEY` only in server-only files for trusted admin actions, AI-generated data writes that must bypass RLS, migrations, or maintenance tasks.
- Never put service-role keys in frontend code, `.env.example`, public docs, screenshots, or Vercel variables prefixed with `VITE_`.

## Before Deploy

- Confirm current folder, Git remote, branch, and no duplicate Git clone mismatch.
- Confirm `.env` is ignored and not tracked.
- Confirm `.env.example` is committed.
- Confirm Vercel env vars are set for Production, Preview, and Development.
- Run `npm run build` and verify `.vercel/output` is created.
- Apply Supabase migrations if the app reads or writes Supabase tables.
- Commit and push deployment config changes only after secrets are protected.

# DATUM Digital Cards (Supabase version)

People create an account, pick a User ID, and get a public card at `index.html?u=USERID`.
Only the logged-in owner can edit their card. This is enforced by the database (Row Level Security in `schema.sql`),
not just by the page.

## Setup (free plan, about 10 minutes)

1. **Create the project.** Go to https://supabase.com, sign in, click **New project**, pick a name, set a database password
   (save it somewhere) and a region near you (e.g. Southeast Asia / Singapore). Wait about a minute.
2. **Create the tables.** Left menu **SQL Editor > New query**. Open `schema.sql`, paste ALL of it, click **Run**.
   You should see "Success. No rows returned".
3. **Connect the website.** Left menu **Project Settings (gear) > API**. Copy:
   - **Project URL** -> `url` in `supabase-config.js`
   - **anon / publishable key** -> `anonKey` in `supabase-config.js`
   Do NOT use the `service_role` key.
4. **Sign-in settings.** **Authentication > Providers > Email**.
   - For testing: turn **Confirm email** OFF, so people can use their account immediately after signing up.
   - For real use: leave it ON. New users must click the link in their email, then log in and pick their User ID.
5. **Allow your website address.** **Authentication > URL Configuration**: set **Site URL** to your hosted address
   (for GitHub Pages: `https://yourname.github.io/yourrepo/`). Add the same address under **Redirect URLs**.
   This is needed for confirmation and password-reset emails to open your site.
6. **Host it.** Upload this whole folder to GitHub Pages (or any https static host).
   The pages use ES modules, so opening the files directly from your phone storage will not work.

## Your own card

Sign up with `argiebendanillo987@gmail.com` (the `ownerEmail` in `supabase-config.js`) and choose User ID `rj`.
Your card is pre-filled with your details. Everyone else starts blank. Sign up first so nobody takes `rj`.

## Check that it is secure

- Log in as user A, then try to open user B's card in the dashboard: you can only ever edit your own card.
- In **Table Editor**, both `cards` and `photos` should show **RLS enabled**.

## Notes

- Free plan limits are generous for this (500 MB database, 50,000 monthly active users).
  Photos are stored as small compressed images in the `photos` table (max 800px, 12 per user).
- Free projects pause after about a week of no activity; open the Supabase dashboard and click Restore if that happens.
- User IDs are first come, first served and cannot be changed after they are claimed.
- The built-in email sender is limited to a few emails per hour. For many users, add your own SMTP under Authentication > SMTP.

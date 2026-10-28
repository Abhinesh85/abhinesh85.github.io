# Design studio: setup and operations notes

## What it is

A customer-facing studio for name tiles. Customers pick names, a layout (crossword, rows, columns, staircase, a preset shape, or an uploaded simple picture), colors, font and hang tab, then save a design (code `D-XXXXXX`) and send it to the shop. Sending stores the design and a PNG preview in Supabase and fires a Telegram alert. After sending, the customer can add a **Custom design** item to the cart with the code in the personalization line.

It is **off by default** and hidden from the store until switched on in admin.

## Where the code lives

| Piece | Location |
| --- | --- |
| Customer studio | `design.html` |
| Admin review sheet and on/off switch | `admin.html` (menu → **Custom designs**; switch "Design studio on the store", also in Site settings) |
| Telegram alert function | `supabase/functions/design-notify/index.ts` |
| Database, RLS and storage setup | `custom-designs-setup.sql` |

## One-time setup

1. **Database.** Run `custom-designs-setup.sql` in Supabase → SQL Editor. It is safe to re-run. It creates `custom_designs`, its RLS policies, a private `design-previews` storage bucket and the storage policies.
2. **Table grants.** RLS only filters rows; the API roles also need table privileges, which newer Supabase projects don't grant automatically. Without them admin shows "permission denied for table custom_designs". The grants are:
   ```sql
   grant insert on public.custom_designs to anon;
   grant select, insert, update, delete on public.custom_designs to authenticated;
   grant all on public.custom_designs to service_role;
   ```
   Open PR #2 adds these lines to `custom-designs-setup.sql`. Until it is merged, the file on the default branch does not contain them, so run the three lines above by hand (or merge #2 and re-run the file).
3. **Telegram alert function.**
   ```
   supabase functions deploy design-notify --no-verify-jwt
   ```
   Secrets: `TELEGRAM_BOT_TOKEN` (the same bot used for order alerts). `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided by Supabase.
   - **Chat ID:** as written on this branch, the function reads the secret `TELEGRAM_CHAT_ID`. Order alerts get the chat ID from the `app_kv` table, key `tg_chat_id`. Another session may be changing `design-notify` to do the same; if so, no `TELEGRAM_CHAT_ID` secret is needed. Check `index.ts` to see which version is deployed.
4. **Turn it on.** Admin → menu → switch "Design studio on the store".
5. **Create the cart item.** Admin → Custom designs → create the **Custom design** item. Without it, "Add to cart" has nothing to attach to.

## Day to day

- New designs trigger a Telegram message (preview photo, summary, quantity, needed-by date, customer contact, notes). Each design alerts once (`notified` flag).
- Admin → Custom designs: review, set status (new, reviewing, quoted, approved, in_production, done, cancelled), add owner notes. "Open in studio" gives Color PNG, Cut SVG and `job.json`.
- Customers can only add a design and upload its pictures. Only the owner email with an authenticator code (aal2) can read or manage rows and pictures.

## How to test

1. Turn the studio on in admin and open `design.html` on the store.
2. Build a design, save it, then send it with a test name and email.
3. Confirm: a row appears in Admin → Custom designs, the preview loads, a Telegram alert arrives, and "Add to cart" adds a Custom design line with the code.
4. Turn the switch off and confirm the studio shows a closed notice.

## Known caveats

- The Custom design listing shows up in the normal shop grid.
- Tumbler sizes in the studio are guesses and need checking.
- The white-ink layer and the zip job pack are not built.
- The cut file has not been verified on a real cutter.
- The admin sheet and switch were only syntax-checked in testing, since they need sign-in.

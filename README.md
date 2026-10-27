# abhinesh85.github.io
PrAjo Custom Studio online store

## Design studio (`design.html`)
Customers design name tiles, ornaments, plaques, tumbler wraps and tags, save them on their device, and send them to the shop.
- `custom-designs-setup.sql`: run once in Supabase (table `custom_designs`, private bucket `design-previews`, row-level rules).
- `supabase/functions/design-notify`: Telegram alert for each new design. Deploy with `--no-verify-jwt`; needs `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.
- `admin.html` → menu → **Custom designs**: review, set status, add notes, open the design back in the studio.

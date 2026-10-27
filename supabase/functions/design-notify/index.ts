// Sends a Telegram alert when a customer submits a design from the store's Design studio.
// The page calls this right after it saves the design. The function looks the design up by code itself
// (so a caller can't make it send arbitrary text) and alerts only once per design.
//
// Deploy:  supabase functions deploy design-notify --no-verify-jwt
// Secrets: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID (the same bot you already use for order alerts).
//          SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const { code } = await req.json().catch(() => ({}));
  if (typeof code !== "string" || !/^D-[A-Z0-9]{6,8}$/.test(code)) return json({ error: "Bad code" }, 400);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: row } = await sb.from("custom_designs").select("*").eq("code", code).eq("notified", false).maybeSingle();
  if (!row) return json({ ok: true });   // unknown code, or already alerted

  const token = Deno.env.get("TELEGRAM_BOT_TOKEN"), chat = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!token || !chat) return json({ error: "Telegram isn't configured" }, 500);

  const caption = [
    `🎨 <b>New custom design ${esc(row.code)}</b>`,
    esc(row.summary),
    `Qty ${row.qty}${row.needed_by ? ` · needed by ${esc(row.needed_by)}` : ""}`,
    `${esc(row.customer_name)} · ${esc(row.customer_email)}${row.customer_phone ? " · " + esc(row.customer_phone) : ""}`,
    row.notes ? `📝 ${esc(String(row.notes).slice(0, 400))}` : "",
    `Open: https://prajocustomstudio.com/admin.html`,
  ].filter(Boolean).join("\n");

  let sent = false;
  if (row.preview_path) {
    const { data: file } = await sb.storage.from("design-previews").download(row.preview_path);
    if (file) {
      const form = new FormData();
      form.append("chat_id", chat);
      form.append("caption", caption);
      form.append("parse_mode", "HTML");
      form.append("photo", file, "design.png");
      sent = (await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: "POST", body: form })).ok;
    }
  }
  if (!sent) {
    sent = (await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: caption, parse_mode: "HTML" }),
    })).ok;
  }
  if (!sent) return json({ error: "Telegram didn't accept the message" }, 502);

  await sb.from("custom_designs").update({ notified: true }).eq("id", row.id);
  return json({ ok: true });
});

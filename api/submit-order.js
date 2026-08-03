const { createClient } = require("@supabase/supabase-js");

function buildNotificationHtml({ bakeryName, customer, item, size, flavor, quantity, due, phone, email, allergyNote, notes }) {
  const esc = (v) => String(v).replace(/</g, "&lt;");
  const rows = [
    ["Item", item || "—"],
    ["Size", size || "—"],
    ["Flavor", flavor || "—"],
    ["Quantity", quantity || "—"],
    ["Date needed", due || "—"],
    ["Customer", customer],
    ["Phone", phone || "—"],
    ["Email", email || "—"],
    ["Allergy/dietary note", allergyNote || "—"],
    ["Notes", notes || "—"],
  ].map(([label, val]) => `
    <tr>
      <td style="padding:8px 12px;font-size:13px;color:#7a6a58;font-family:'Arial',sans-serif;border-bottom:1px solid #e8dfd0;">${label}</td>
      <td style="padding:8px 12px;font-size:13px;color:#152937;font-family:'Arial',sans-serif;border-bottom:1px solid #e8dfd0;">${esc(val)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf5ee;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf5ee;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#152937 0%,#b85c38 60%,#c8935a 100%);padding:32px;text-align:center;">
            <div style="font-size:44px;margin-bottom:8px;">📥</div>
            <h1 style="margin:0;color:#fff;font-size:24px;font-family:'Georgia',serif;">New Order Request</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;font-family:'Arial',sans-serif;">via ${esc(bakeryName)}'s order link</p>
          </td>
        </tr>
        <tr>
          <td style="background:#fffcf7;padding:28px 32px;border:1px solid #e8dfd0;border-top:none;border-radius:0 0 16px 16px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
              ${rows}
            </table>
            <p style="margin:0;font-size:14px;color:#7a6a58;line-height:1.7;font-family:'Arial',sans-serif;">
              Log in to BakeFlo to accept or decline this request.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  let body = "";
  await new Promise((resolve, reject) => {
    req.on("data", (c) => (body += c));
    req.on("end", resolve);
    req.on("error", reject);
  });

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const {
    slug, item, size, flavor, quantity, due,
    customer, phone, email, allergyNote, notes,
  } = payload || {};

  const cleanSlug = (slug || "").toString().trim().toLowerCase();
  if (!cleanSlug) return res.status(400).json({ error: "Missing order form" });
  if (!customer || !String(customer).trim()) return res.status(400).json({ error: "Name is required" });
  if (!due) return res.status(400).json({ error: "Date needed is required" });
  if (!(phone && String(phone).trim()) && !(email && String(email).trim())) {
    return res.status(400).json({ error: "Please provide a phone or email" });
  }

  const admin = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("id, bakery_name, order_lead_days")
    .eq("slug", cleanSlug)
    .single();

  if (profileErr || !profile) return res.status(404).json({ error: "Order form not found" });

  const leadDays = profile.order_lead_days ?? 3;
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + leadDays);
  const minDateStr = minDate.toISOString().split("T")[0];
  if (String(due) < minDateStr) {
    return res.status(400).json({ error: `Please choose a date at least ${leadDays} day${leadDays === 1 ? "" : "s"} from today.` });
  }

  const { data: order, error: insertErr } = await admin.from("orders").insert([{
    user_id: profile.id,
    customer: String(customer).trim(),
    item: item || "",
    size: size || null,
    flavor: flavor || null,
    quantity: parseInt(quantity) || null,
    due,
    status: "Pending",
    source: "link",
    total: 0,
    notes: notes || "",
    allergy_note: allergyNote || null,
    phone: phone || "",
    email: email || null,
  }]).select().single();

  if (insertErr) {
    console.error("submit-order insert error:", insertErr.message);
    return res.status(500).json({ error: "Could not submit request. Please try again." });
  }

  try {
    const { data: bakerUser } = await admin.auth.admin.getUserById(profile.id);
    const bakerEmail = bakerUser && bakerUser.user && bakerUser.user.email;
    const apiKey = process.env.RESEND_API_KEY;
    if (bakerEmail && apiKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "BakeFlo <hello@bakeflo.io>",
          to: bakerEmail,
          subject: `New order request from ${order.customer}`,
          html: buildNotificationHtml({
            bakeryName: profile.bakery_name || "Your bakery",
            customer: order.customer, item: order.item, size: order.size, flavor: order.flavor,
            quantity: order.quantity, due: order.due, phone: order.phone, email: order.email,
            allergyNote: order.allergy_note, notes: order.notes,
          }),
        }),
      });
    }
  } catch (e) {
    console.error("submit-order notification email error:", e.message);
  }

  return res.status(200).json({ ok: true, bakeryName: profile.bakery_name || "Your bakery" });
};

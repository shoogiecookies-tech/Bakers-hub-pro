const { createClient } = require("@supabase/supabase-js");

function esc(v) {
  return String(v == null ? "" : v).replace(/</g, "&lt;");
}

function wrapEmail({ emoji, heading, subheading, bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf5ee;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf5ee;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#152937 0%,#b85c38 60%,#c8935a 100%);padding:32px;text-align:center;">
            <div style="font-size:44px;margin-bottom:8px;">${emoji}</div>
            <h1 style="margin:0;color:#fff;font-size:24px;font-family:'Georgia',serif;">${esc(heading)}</h1>
            ${subheading ? `<p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;font-family:'Arial',sans-serif;">${esc(subheading)}</p>` : ""}
          </td>
        </tr>
        <tr>
          <td style="background:#fffcf7;padding:28px 32px;border:1px solid #e8dfd0;border-top:none;border-radius:0 0 16px 16px;">
            ${bodyHtml}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildDetailRows(order) {
  return [
    ["Item", order.item || "—"],
    ["Size", order.size || "—"],
    ["Flavor", order.flavor || "—"],
    ["Quantity", order.quantity || "—"],
    ["Date", order.due || "—"],
  ].map(([label, val]) => `
    <tr>
      <td style="padding:8px 12px;font-size:13px;color:#7a6a58;font-family:'Arial',sans-serif;border-bottom:1px solid #e8dfd0;">${label}</td>
      <td style="padding:8px 12px;font-size:13px;color:#152937;font-family:'Arial',sans-serif;border-bottom:1px solid #e8dfd0;">${esc(val)}</td>
    </tr>`).join("");
}

function buildAcceptHtml(bakeryName, order) {
  const body = `
    <p style="margin:0 0 16px;font-size:15px;color:#152937;line-height:1.7;font-family:'Arial',sans-serif;">Hi ${esc(order.customer)},</p>
    <p style="margin:0 0 20px;font-size:15px;color:#152937;line-height:1.7;font-family:'Arial',sans-serif;">Good news — <strong>${esc(bakeryName)}</strong> has confirmed your order request for <strong>${esc(order.due)}</strong>. Here's what was confirmed:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">${buildDetailRows(order)}</table>
    <p style="margin:0;font-size:14px;color:#7a6a58;line-height:1.7;font-family:'Arial',sans-serif;">${esc(bakeryName)} will be in touch with any next steps.</p>
  `;
  return wrapEmail({ emoji: "🎉", heading: "Your order is confirmed!", subheading: `via ${bakeryName}`, bodyHtml: body });
}

function buildDeclineHtml(bakeryName, order, reason) {
  const body = `
    <p style="margin:0 0 16px;font-size:15px;color:#152937;line-height:1.7;font-family:'Arial',sans-serif;">Hi ${esc(order.customer)},</p>
    <p style="margin:0 0 20px;font-size:15px;color:#152937;line-height:1.7;font-family:'Arial',sans-serif;">Unfortunately <strong>${esc(bakeryName)}</strong> isn't able to take your order request for <strong>${esc(order.due)}</strong>.</p>
    ${reason ? `<div style="background:#faf5ee;border-radius:10px;padding:14px 16px;margin-bottom:20px;"><div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#7a6a58;font-family:'Arial',sans-serif;margin-bottom:4px;">Note from ${esc(bakeryName)}</div><div style="font-size:14px;color:#152937;font-family:'Arial',sans-serif;line-height:1.6;">${esc(reason)}</div></div>` : ""}
    <p style="margin:0;font-size:14px;color:#7a6a58;line-height:1.7;font-family:'Arial',sans-serif;">Feel free to reach out or submit a new request for a different date.</p>
  `;
  return wrapEmail({ emoji: "📋", heading: "Update on your order request", subheading: `via ${bakeryName}`, bodyHtml: body });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ error: "Missing auth token" });

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

  const { orderId, reason } = payload || {};
  if (!orderId) return res.status(400).json({ error: "orderId required" });

  const admin = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: { user: caller }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !caller) return res.status(401).json({ error: "Invalid token" });

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("user_id", caller.id)
    .single();

  if (orderErr || !order) return res.status(404).json({ error: "Order not found" });

  if (order.decision_notified_at) {
    return res.status(200).json({ sent: false, reason: "already notified" });
  }

  if (order.status !== "In Progress" && order.status !== "Declined") {
    return res.status(400).json({ error: "Order is not in a decided state" });
  }

  if (!order.email) {
    // Nothing to send to — phone-only contact. Not an error, just nothing to do.
    return res.status(200).json({ sent: false, reason: "no email on file" });
  }

  const { data: profile } = await admin.from("profiles").select("bakery_name").eq("id", caller.id).single();
  const bakeryName = (profile && profile.bakery_name) || "Your bakery";

  const isAccepted = order.status === "In Progress";
  const subject = isAccepted
    ? `Your order with ${bakeryName} is confirmed!`
    : `Update on your order request with ${bakeryName}`;
  const html = isAccepted
    ? buildAcceptHtml(bakeryName, order)
    : buildDeclineHtml(bakeryName, order, reason);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("notify-order-decision: RESEND_API_KEY not set");
    return res.status(500).json({ error: "Email service not configured" });
  }

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "BakeFlo <hello@bakeflo.io>",
      to: order.email,
      subject,
      html,
    }),
  });

  if (!emailRes.ok) {
    const err = await emailRes.json().catch(() => ({}));
    console.error("notify-order-decision email error:", err);
    return res.status(500).json({ error: "Failed to send email" });
  }

  await admin.from("orders").update({ decision_notified_at: new Date().toISOString() }).eq("id", orderId);

  return res.status(200).json({ sent: true });
};

const GUIDE_URL =
  "https://drive.google.com/file/d/1DYqWp_448JEVRwi6NC_sI8fbRsQGgZwI/view?usp=sharing";

function buildHtml(email) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf5ee;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf5ee;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#152937 0%,#b85c38 60%,#c8935a 100%);padding:36px 32px;text-align:center;">
            <div style="font-size:48px;margin-bottom:10px;">🧁</div>
            <h1 style="margin:0;color:#fff;font-size:26px;font-family:'Georgia',serif;letter-spacing:-0.5px;">Welcome to BakeFlo!</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;font-family:'Arial',sans-serif;">Your home bakery business is about to level up 🍪</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#fffcf7;padding:36px 32px;border:1px solid #e8dfd0;border-top:none;border-radius:0 0 16px 16px;">
            <p style="margin:0 0 16px;font-size:16px;color:#152937;line-height:1.7;font-family:'Arial',sans-serif;">Hi there! 👋</p>
            <p style="margin:0 0 16px;font-size:16px;color:#152937;line-height:1.7;font-family:'Arial',sans-serif;">
              You're all set — your BakeFlo account is ready and waiting. We're so glad to have you in our community of home bakers turning their passion into a thriving business.
            </p>
            <p style="margin:0 0 24px;font-size:16px;color:#152937;line-height:1.7;font-family:'Arial',sans-serif;">
              To help you hit the ground running, we put together a <strong>Quick Start Guide</strong> with everything you need: setting up your bakery profile, adding your first recipe, pricing your products, and taking your first order.
            </p>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr><td align="center">
                <a href="${GUIDE_URL}"
                   style="display:inline-block;background:#b85c38;color:#fff;padding:14px 32px;border-radius:25px;text-decoration:none;font-size:16px;font-weight:bold;font-family:'Arial',sans-serif;letter-spacing:0.2px;">
                  📖 Open the Quick Start Guide
                </a>
              </td></tr>
            </table>

            <p style="margin:0 0 8px;font-size:14px;color:#7a6a58;line-height:1.7;font-family:'Arial',sans-serif;">
              You'll also find the guide pinned to your BakeFlo dashboard any time you need it.
            </p>
            <p style="margin:0 0 24px;font-size:14px;color:#7a6a58;line-height:1.7;font-family:'Arial',sans-serif;">
              Questions? Reach us at <a href="mailto:hello@bakeflo.io" style="color:#b85c38;">hello@bakeflo.io</a> — we're happy to help.
            </p>

            <p style="margin:0 0 4px;font-size:15px;color:#152937;font-family:'Arial',sans-serif;">Happy baking! 🎂</p>
            <p style="margin:0;font-size:15px;color:#152937;font-weight:bold;font-family:'Arial',sans-serif;">The BakeFlo Team</p>
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

  let email;
  try {
    ({ email } = JSON.parse(body));
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Valid email required" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY not set");
    return res.status(500).json({ error: "Email service not configured" });
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const [emailRes, audienceRes] = await Promise.all([
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: "BakeFlo <hello@bakeflo.io>",
        to: email,
        subject: "Welcome to BakeFlo! 🍪 Here's how to get started.",
        html: buildHtml(email),
      }),
    }),
    process.env.RESEND_AUDIENCE_ID
      ? fetch(`https://api.resend.com/audiences/${process.env.RESEND_AUDIENCE_ID}/contacts`, {
          method: "POST",
          headers,
          body: JSON.stringify({ email, unsubscribed: false }),
        })
      : Promise.resolve(null),
  ]);

  if (!emailRes.ok) {
    const err = await emailRes.json().catch(() => ({}));
    console.error("Resend email error:", err);
    return res.status(500).json({ error: "Failed to send email" });
  }

  if (audienceRes && !audienceRes.ok) {
    const err = await audienceRes.json().catch(() => ({}));
    console.error("Resend audience error (non-fatal):", err);
  }

  return res.status(200).json({ sent: true });
};

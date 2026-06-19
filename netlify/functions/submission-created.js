// Triggered automatically by Netlify on any form submission.
// Handles "worksheet-leads" form only:
//   1. Adds contact to the "Worksheet Leads" Resend audience (signup date queryable via
//      Resend's built-in "Created At" field — no custom fields needed)
//   2. Sends Email 1 immediately from worksheet@bakeflo.io
// Emails 2 & 3 are sent manually by the founder using Resend Broadcasts, filtered by
// the contact's "Created At" date in the Resend Audiences dashboard.
//
// Required env vars (set in Netlify site settings):
//   RESEND_API_KEY               — same key used by the app's Vercel functions
//   RESEND_WORKSHEET_AUDIENCE_ID — ID of the separate "Worksheet Leads" audience

const WORKSHEET_URL = "https://www.bakeflo.io/worksheet.pdf";
const APP_URL = "https://www.bakeflo.io";
const FROM = "Debbie at BakeFlo <worksheet@bakeflo.io>";

function emailShell(body) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf7f2;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:540px;">
        <tr><td style="padding-bottom:28px;border-bottom:1px solid #e8dfd0;">
          <span style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#c4724a;font-weight:500;">BakeFlo</span>
        </td></tr>
        <tr><td style="padding:36px 0 28px;">${body}</td></tr>
        <tr><td style="padding-top:28px;border-top:1px solid #e8dfd0;">
          <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#a09080;line-height:1.7;">
            You downloaded the free BakeFlo Pricing Worksheet. Questions? <a href="mailto:hello@bakeflo.io" style="color:#a09080;">hello@bakeflo.io</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(text, url) {
  return `<table cellpadding="0" cellspacing="0" style="margin:28px 0;">
    <tr><td>
      <a href="${url}" style="display:inline-block;background:#1d2d44;color:white;padding:13px 28px;text-decoration:none;font-family:Arial,sans-serif;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;font-weight:500;">${text}</a>
    </td></tr>
  </table>`;
}

function p(text) {
  return `<p style="margin:0 0 18px;font-size:15px;color:#2a2420;line-height:1.85;font-family:Arial,sans-serif;">${text}</p>`;
}

function buildEmail1() {
  return emailShell(`
    ${p("Hey — here's your worksheet.")}
    ${ctaButton("Download: The Baker's Pricing Worksheet →", WORKSHEET_URL)}
    ${p("Walk through one recipe, top to bottom — ingredients, your time, packaging, overhead — and it spits out a price you can actually stand behind. No more rounding down. No more guessing.")}
    ${p("One thing to watch for while you fill it out: most bakers find their ingredient costs eat way more of the price than they thought. That's normal. It's also exactly why &ldquo;just add a little markup&rdquo; never works.")}
    ${p("Keep this on hand for every new order. You'll be glad you did.")}
    <p style="margin:28px 0 4px;font-size:15px;color:#2a2420;font-family:Arial,sans-serif;">— Debbie</p>
    <p style="margin:0 0 24px;font-size:13px;color:#6b5f55;font-family:Arial,sans-serif;">Founder, BakeFlo</p>
    <p style="margin:0;font-size:13px;color:#6b5f55;line-height:1.75;font-family:Arial,sans-serif;border-top:1px solid #e8dfd0;padding-top:24px;">
      P.S. — Every time you take on a new recipe or a price changes, you're doing this math again from scratch. BakeFlo does it automatically. <a href="${APP_URL}" style="color:#c4724a;text-decoration:none;">See how &rarr;</a>
    </p>
  `);
}

exports.handler = async function (event) {
  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_WORKSHEET_AUDIENCE_ID;

  if (!apiKey) {
    console.error("RESEND_API_KEY not set");
    return { statusCode: 200 };
  }

  let payload;
  try {
    payload = JSON.parse(event.body).payload;
  } catch (e) {
    console.error("Failed to parse event body:", e);
    return { statusCode: 200 };
  }

  if (payload.form_name !== "worksheet-leads") return { statusCode: 200 };

  const email = payload.data && payload.data.email;
  if (!email) {
    console.error("No email in submission");
    return { statusCode: 200 };
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  // Add to the "Worksheet Leads" audience.
  // Resend records "Created At" automatically — use that timestamp in the Resend
  // dashboard to identify who's due for the Day 3 and Day 8 manual follow-ups.
  if (audienceId) {
    const audienceRes = await fetch(
      `https://api.resend.com/audiences/${audienceId}/contacts`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ email, unsubscribed: false }),
      }
    ).catch((e) => { console.error("Audience add network error:", e); return null; });

    if (audienceRes && !audienceRes.ok) {
      const err = await audienceRes.json().catch(() => ({}));
      console.error("Audience add API error (non-fatal):", err);
    } else if (audienceRes) {
      console.log("Contact added to Worksheet Leads audience");
    }
  } else {
    console.warn("RESEND_WORKSHEET_AUDIENCE_ID not set — skipping audience add");
  }

  // Send Email 1 immediately
  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers,
    body: JSON.stringify({
      from: FROM,
      to: email,
      subject: "Your Baker's Pricing Worksheet is here",
      headers: { "X-Entity-Ref-ID": `worksheet-${Date.now()}` },
      html: buildEmail1(),
    }),
  });

  const emailResult = await emailRes.json().catch(() => ({}));

  if (!emailRes.ok) {
    console.error("Email 1 send failed:", emailResult);
  } else {
    console.log("Email 1 sent:", emailResult.id);
  }

  return { statusCode: 200 };
};

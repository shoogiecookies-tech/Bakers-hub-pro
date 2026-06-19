// Triggered automatically by Netlify on any form submission.
// Handles "worksheet-leads" form: adds contact to a separate Resend audience,
// sends Email 1 immediately, schedules Email 2 (+3 days) and Email 3 (+8 days).
// Requires env vars: RESEND_API_KEY, RESEND_WORKSHEET_AUDIENCE_ID

const WORKSHEET_URL = "https://www.bakeflo.io/worksheet.pdf";
const APP_URL = "https://www.bakeflo.io";
const FROM = "Debbie at BakeFlo <worksheet@bakeflo.io>";

function scheduleDate(daysFromNow) {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString();
}

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
            You signed up for the free BakeFlo Pricing Worksheet. Questions? <a href="mailto:hello@bakeflo.io" style="color:#a09080;">hello@bakeflo.io</a>
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

function sig(name, role) {
  return `<p style="margin:28px 0 4px;font-size:15px;color:#2a2420;font-family:Arial,sans-serif;">— ${name}</p>
  ${role ? `<p style="margin:0;font-size:13px;color:#6b5f55;font-family:Arial,sans-serif;">${role}</p>` : ""}`;
}

function buildEmail1() {
  return emailShell(`
    ${p("Hey — here's your worksheet.")}
    ${ctaButton("Download: The Baker's Pricing Worksheet →", WORKSHEET_URL)}
    ${p("Walk through one recipe, top to bottom — ingredients, your time, packaging, overhead — and it spits out a price you can actually stand behind. No more rounding down. No more guessing.")}
    ${p("One thing to watch for while you fill it out: most bakers find their ingredient costs eat way more of the price than they thought. That's normal. It's also exactly why \"just add a little markup\" never works.")}
    ${p("Keep this on hand for every new order. You'll be glad you did.")}
    ${sig("Debbie Correa", "Founder, BakeFlo")}
    <p style="margin:24px 0 0;font-size:13px;color:#6b5f55;line-height:1.75;font-family:Arial,sans-serif;border-top:1px solid #e8dfd0;padding-top:24px;">
      P.S. — Every time you take on a new recipe or a price changes, you're doing this math again from scratch. BakeFlo does it automatically. <a href="${APP_URL}" style="color:#c4724a;text-decoration:none;">See how →</a>
    </p>
  `);
}

function buildEmail2() {
  return emailShell(`
    ${p("Quick one today.")}
    ${p("You've got the worksheet now, so you know your numbers. But knowing the number isn't the hard part — saying it is.")}
    ${p("Here's the truth: raising your prices rarely loses you customers. Undercharging does — it just takes longer, because it burns you out first.")}
    ${p("If you've been putting off a price increase because you don't know how to bring it up, here's the simplest version:")}
    <p style="margin:0 0 18px;font-size:15px;color:#2a2420;line-height:1.85;font-family:Georgia,serif;font-style:italic;padding:20px 24px;background:#f5f0e8;border-left:3px solid #c4724a;">
      "Starting [date], my prices are going up to reflect the quality and time that goes into every order. Thank you for supporting my small business."
    </p>
    ${p("That's it. You don't owe an apology. You don't need to justify it line by line. Bakers who explain too much invite negotiation — bakers who state it plainly get respected.")}
    ${p("You already did the hard part by filling out the worksheet. The number is real. Charge it.")}
    ${sig("Debbie Correa")}
  `);
}

function buildEmail3() {
  return emailShell(`
    ${p("Quick heads up.")}
    ${p("BakeFlo's founding member price is $97 — one time, lifetime access. Once founding pricing closes, new accounts move to a subscription.")}
    ${p("If you've been using the worksheet and thinking \"I don't want to do this by hand every time\" — that's the whole reason BakeFlo exists. It holds your recipes, reprices automatically when ingredient costs change, tracks your real profit per order, and builds your invoices for you.")}
    ${p("You already know your numbers. Let the app remember them so you don't have to.")}
    ${ctaButton("Lock in founding pricing — $97 once →", `${APP_URL}#pricing`)}
    ${sig("Debbie Correa", "Founder, BakeFlo")}
    <p style="margin:24px 0 0;font-size:12px;color:#a09080;font-family:Arial,sans-serif;font-style:italic;">From Recipe to Revenue.</p>
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

  // Only handle the worksheet form
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

  // Add to separate worksheet audience (non-blocking)
  if (audienceId) {
    fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email, unsubscribed: false }),
    }).catch((e) => console.error("Audience add failed:", e));
  }

  // Send all 3 emails — Email 1 immediate, 2 & 3 scheduled (requires Resend Pro)
  const sends = [
    {
      subject: "Your Baker's Pricing Worksheet is here",
      html: buildEmail1(),
    },
    {
      subject: "The math is the easy part",
      html: buildEmail2(),
      scheduled_at: scheduleDate(3),
    },
    {
      subject: "Founding price ends soon",
      html: buildEmail3(),
      scheduled_at: scheduleDate(8),
    },
  ];

  const results = await Promise.allSettled(
    sends.map((send) =>
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers,
        body: JSON.stringify({ from: FROM, to: email, ...send }),
      }).then((r) => r.json())
    )
  );

  results.forEach((r, i) => {
    if (r.status === "rejected") console.error(`Email ${i + 1} failed:`, r.reason);
    else if (r.value.statusCode >= 400) console.error(`Email ${i + 1} API error:`, r.value);
    else console.log(`Email ${i + 1} sent/scheduled:`, r.value.id);
  });

  return { statusCode: 200 };
};

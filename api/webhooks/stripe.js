const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function removeFromPaidUsers(customerId) {
  const { error } = await supabase
    .from("paid_users")
    .delete()
    .eq("stripe_customer_id", customerId);
  if (error) console.error("paid_users delete error:", error);
  return error;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end("Method Not Allowed");
  }

  const sig = req.headers["stripe-signature"];
  const rawBody = await getRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const email = session.customer_details?.email || session.customer_email;
    const customerId = session.customer;

    if (email) {
      const { error } = await supabase.from("paid_users").upsert(
        {
          email,
          stripe_customer_id: customerId,
          purchased_at: new Date().toISOString(),
        },
        { onConflict: "email" }
      );
      if (error) {
        console.error("Supabase upsert error:", error);
        return res.status(500).json({ error: "Database error" });
      }
      console.log("paid_users: added", email);
    }
  }

  // Subscription cancelled or deleted — revoke access immediately.
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const customerId = subscription.customer;
    console.log("Subscription deleted for customer:", customerId);
    const err = await removeFromPaidUsers(customerId);
    if (err) return res.status(500).json({ error: "Database error" });
    console.log("paid_users: removed customer", customerId);
  }

  // Payment failed — remove after 3 consecutive failed attempts.
  // Stripe retries automatically; by attempt 3 the subscription will typically cancel anyway.
  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object;
    const customerId = invoice.customer;
    const attemptCount = invoice.attempt_count || 0;
    console.log(`Payment failed for customer ${customerId} (attempt ${attemptCount})`);

    if (attemptCount >= 3) {
      console.log("3+ failed payments — revoking access for customer:", customerId);
      const err = await removeFromPaidUsers(customerId);
      if (err) return res.status(500).json({ error: "Database error" });
    }
  }

  return res.status(200).json({ received: true });
};

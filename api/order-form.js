const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end("Method Not Allowed");

  const slug = (req.query.slug || "").toString().trim().toLowerCase();
  if (!slug) return res.status(400).json({ error: "Missing slug" });

  const admin = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: profile, error } = await admin
    .from("profiles")
    .select("id, bakery_name, order_lead_days, order_form_items, order_form_sizes, order_form_flavors, is_pro, max_orders_per_day, blackout_dates")
    .eq("slug", slug)
    .single();

  if (error || !profile) return res.status(404).json({ error: "Order form not found" });

  const isPro = !!profile.is_pro;
  let fullyBookedDates = [];

  if (isPro && profile.max_orders_per_day) {
    // Capacity is per-ORDER regardless of item count (known limitation: a heavy
    // multi-item order still only consumes one slot — revisit if this undercounts
    // real production load).
    const { data: acceptedOrders, error: countErr } = await admin
      .from("orders")
      .select("due")
      .eq("user_id", profile.id)
      .in("status", ["In Progress", "Complete", "Invoiced", "Delivered"])
      .not("due", "is", null);

    if (countErr) console.error("order-form capacity query error:", countErr.message);

    const counts = {};
    (acceptedOrders || []).forEach(o => { counts[o.due] = (counts[o.due] || 0) + 1; });
    fullyBookedDates = Object.entries(counts)
      .filter(([, count]) => count >= profile.max_orders_per_day)
      .map(([date]) => date);
  }

  return res.status(200).json({
    bakeryName: profile.bakery_name || "This bakery",
    leadDays: profile.order_lead_days ?? 3,
    items: (profile.order_form_items || []).map(i => (typeof i === "string" ? i : i.name)).filter(Boolean),
    sizes: profile.order_form_sizes || [],
    flavors: profile.order_form_flavors || [],
    blackoutDates: isPro ? (profile.blackout_dates || []) : [],
    fullyBookedDates: isPro ? fullyBookedDates : [],
  });
};

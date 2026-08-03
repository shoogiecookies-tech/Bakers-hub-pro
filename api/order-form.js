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
    .select("bakery_name, order_lead_days, order_form_items, order_form_sizes, order_form_flavors")
    .eq("slug", slug)
    .single();

  if (error || !profile) return res.status(404).json({ error: "Order form not found" });

  return res.status(200).json({
    bakeryName: profile.bakery_name || "This bakery",
    leadDays: profile.order_lead_days ?? 3,
    items: profile.order_form_items || [],
    sizes: profile.order_form_sizes || [],
    flavors: profile.order_form_flavors || [],
  });
};

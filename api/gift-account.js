const { createClient } = require("@supabase/supabase-js");
const { seedForUser } = require("./seed-starter");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  let body = "";
  await new Promise((resolve, reject) => {
    req.on("data", (c) => (body += c));
    req.on("end", resolve);
    req.on("error", reject);
  });

  let email, password, notes, created_by;
  try {
    ({ email, password, notes, created_by } = JSON.parse(body));
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  if (!email || !password) {
    return res.status(400).json({ error: "email and password required" });
  }

  const supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Create user server-side — email pre-confirmed, no confirmation email sent
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { gifted: true },
  });

  if (error) {
    console.error("gift-account createUser error:", error);
    return res.status(400).json({ error: error.message });
  }

  const userId = data.user?.id;

  // Record in gifted_users table
  await supabase.from("gifted_users").insert([{ email, notes: notes || null, created_by: created_by || null }]);

  // Seed starter pantry + recipes immediately using service role (bypasses RLS)
  try {
    await seedForUser(userId, supabase);
  } catch (e) {
    console.error("gift-account seed error (non-fatal):", e.message);
  }

  return res.status(200).json({ ok: true, userId });
};

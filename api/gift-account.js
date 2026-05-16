const { createClient } = require("@supabase/supabase-js");

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

  // Create user server-side with email pre-confirmed — no verification email needed
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    console.error("gift-account createUser error:", error);
    return res.status(400).json({ error: error.message });
  }

  // Record in gifted_users table
  await supabase.from("gifted_users").insert([{ email, notes: notes || null, created_by: created_by || null }]);

  return res.status(200).json({ ok: true, userId: data.user?.id });
};

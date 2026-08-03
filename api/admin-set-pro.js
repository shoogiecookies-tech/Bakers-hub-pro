const { createClient } = require("@supabase/supabase-js");

const ADMIN_EMAIL = "shoogiecookies@gmail.com";

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

  const { email, isPro } = payload || {};
  if (!email || typeof isPro !== "boolean") {
    return res.status(400).json({ error: "email and isPro (boolean) required" });
  }

  const admin = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: { user: caller }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !caller || caller.email !== ADMIN_EMAIL) {
    return res.status(403).json({ error: "Not authorized" });
  }

  const targetEmail = String(email).trim().toLowerCase();
  let targetUser = null;
  let page = 1;
  const perPage = 1000;
  while (!targetUser) {
    const { data: pageData, error: listErr } = await admin.auth.admin.listUsers({ page, perPage });
    if (listErr) {
      console.error("admin-set-pro listUsers error:", listErr.message);
      return res.status(500).json({ error: "Could not look up account" });
    }
    targetUser = (pageData.users || []).find(u => (u.email || "").toLowerCase() === targetEmail);
    if (targetUser || !pageData.users || pageData.users.length < perPage) break;
    page += 1;
  }

  if (!targetUser) return res.status(404).json({ error: "No account found with that email" });

  const { error: upsertErr } = await admin
    .from("profiles")
    .upsert({ id: targetUser.id, is_pro: isPro });

  if (upsertErr) {
    console.error("admin-set-pro upsert error:", upsertErr.message);
    return res.status(500).json({ error: "Could not update account" });
  }

  return res.status(200).json({ ok: true, email: targetEmail, isPro });
};

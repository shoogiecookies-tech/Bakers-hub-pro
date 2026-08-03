const { createClient } = require("@supabase/supabase-js");

function slugify(v) {
  return (v || "")
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
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

  const candidate = slugify(payload && payload.slug);
  if (!candidate) return res.status(400).json({ error: "Invalid link" });

  const admin = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: "Invalid token" });

  const { data: existing, error: lookupErr } = await admin
    .from("profiles")
    .select("id")
    .eq("slug", candidate)
    .neq("id", user.id)
    .limit(1);

  if (lookupErr) {
    console.error("claim-slug lookup error:", lookupErr.message);
    return res.status(500).json({ error: "Could not check that link" });
  }

  return res.status(200).json({ available: !(existing && existing.length > 0), slug: candidate });
};

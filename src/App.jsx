import { useState, useRef, useCallback, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

// ─── COLORS & STYLES ──────────────────────────────────────────────────────────
const C = {
  bg: "#fdf8f3", card: "#ffffff", accent: "#b5541a", dark: "#7c3a1e",
  light: "#fdf0e4", border: "#f0e6d8", text: "#2c1a0e", muted: "#9a7a65", mid: "#6b4226",
};
const s = {
  card: { background: C.card, borderRadius: 16, padding: 16, boxShadow: "0 2px 16px rgba(124,58,30,0.07)", border: `1px solid ${C.border}`, marginBottom: 12 },
  input: { width: "100%", padding: "9px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, outline: "none", background: C.bg, color: C.text, boxSizing: "border-box", fontFamily: "Georgia, serif" },
  btn: { padding: "9px 18px", borderRadius: 22, border: "none", background: `linear-gradient(135deg, ${C.dark}, ${C.accent})`, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: "700", letterSpacing: 0.3, fontFamily: "Georgia, serif" },
  btnSec: { padding: "9px 18px", borderRadius: 22, border: `1.5px solid #d4a07a`, background: "#fff", color: C.accent, cursor: "pointer", fontSize: 13, fontWeight: "600", fontFamily: "Georgia, serif" },
  label: { fontSize: 11, color: C.muted, letterSpacing: 0.8, textTransform: "uppercase", display: "block", marginBottom: 4 },
  tag: (color) => ({ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: color + "22", color, fontWeight: "700", letterSpacing: 0.5, display: "inline-block" }),
};

const TABS = ["Dashboard", "Pantry", "Recipes", "Pricing", "Orders", "Schedule", "Social", "Settings"];
const STATUS_COLORS = { Pending: "#f59e0b", "In Progress": "#3b82f6", Complete: "#10b981", Delivered: "#8b5cf6" };
const STATUS_LIST = ["Pending", "In Progress", "Complete", "Delivered"];
const CATEGORIES = ["Cookies", "Cakes", "Bread", "Pastries", "Cupcakes", "Other"];
const PLATFORMS = ["Instagram", "Facebook", "TikTok", "Pinterest"];
const POST_TYPES = ["Product Photo", "Behind the Scenes", "Recipe Tip", "Testimonial", "Promo/Sale", "Seasonal"];
const PANTRY_CATS = ["Flour & Grains", "Dairy", "Eggs & Fats", "Sweeteners", "Leavening", "Flavoring", "Chocolate", "Fruits & Nuts", "Packaging", "Other"];
const UNITS = ["cups", "tbsp", "tsp", "oz", "lbs", "g", "kg", "ml", "l", "pcs", "dozen", "bag", "box"];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function calcIngCost(ing, pantry) {
  const item = pantry.find(p => p.id === ing.pantryId);
  return item ? item.costPer * ing.amount : null;
}
function calcRecipeCost(recipe, pantry) {
  return recipe.ingredients.reduce((sum, ing) => sum + (calcIngCost(ing, pantry) || 0), 0);
}
function generateTasksFromOrder(order) {
  if (!order.item || !order.due) return [];
  const due = new Date(order.due + "T12:00:00");
  const add = (daysBefore, task) => {
    const d = new Date(due);
    d.setDate(d.getDate() - daysBefore);
    return { date: d.toISOString().split("T")[0], task, done: false, auto: true, order_id: order.id };
  };
  return [
    add(3, `Gather ingredients for "${order.item}" — ${order.customer}`),
    add(2, `Prep batter/dough for "${order.item}" — ${order.customer}`),
    add(1, `Bake "${order.item}" — ${order.customer}`),
    add(1, `Decorate & finish "${order.item}" — ${order.customer}`),
    add(0, `Package & deliver "${order.item}" to ${order.customer}`),
  ];
}

// ─── AI HELPERS ───────────────────────────────────────────────────────────────
function getApiKey() {
  return process.env.REACT_APP_ANTHROPIC_KEY || localStorage.getItem("baker_api_key") || "";
}
async function callAI(messages, maxTokens = 1000) {
  const key = getApiKey();
  if (!key) throw new Error("NO_KEY");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: maxTokens, messages })
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text || "";
}
async function aiCaption(platform, type) {
  return callAI([{ role: "user", content: `You are a social media expert for a home bakery. Write an engaging ${platform} caption for a ${type} post. Warm, authentic, under 150 words, 1-2 emojis, a call to action, and 3-5 hashtags. Return ONLY the caption text.` }]);
}
async function aiScheduleSuggestions(orders) {
  const list = orders.filter(o => o.status !== "Delivered").map(o => `- ${o.item} for ${o.customer}, due ${o.due}`).join("\n");
  if (!list) return [];
  const text = await callAI([{ role: "user", content: `Home bakery open orders:\n${list}\n\nSuggest 3 extra prep or business tasks (NOT standard bake/deliver tasks). Return ONLY a JSON array: [{"task":"...","daysFromNow":1},...]. No markdown.` }], 800);
  try { return JSON.parse(text); } catch { return []; }
}
async function aiOrderConfirmation(order, bakeryName) {
  return callAI([{ role: "user", content: `You are a warm, professional home baker writing a customer order confirmation email.\nBakery: ${bakeryName}\nCustomer: ${order.customer}\nItem: ${order.item}\nDue: ${order.due}\nTotal: $${order.total}\nNotes: ${order.notes || "none"}\nWrite a friendly confirmation email. Return ONLY the email body, no subject line.` }]);
}

// ─── PHOTO UPLOAD ─────────────────────────────────────────────────────────────
function PhotoUpload({ value, onChange, small }) {
  const ref = useRef();
  return (
    <div onClick={() => ref.current.click()} style={{
      width: small ? 60 : "100%", height: small ? 60 : 150,
      borderRadius: small ? 10 : 12, border: `2px dashed ${C.border}`,
      background: value ? "transparent" : C.light, cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden", flexShrink: 0,
    }}>
      {value
        ? <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <div style={{ textAlign: "center", color: C.muted, fontSize: small ? 20 : 28 }}>📷{!small && <div style={{ fontSize: 12, marginTop: 4 }}>Add Photo</div>}</div>
      }
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => onChange(ev.target.result); r.readAsDataURL(f); }} />
    </div>
  );
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [mode,     setMode]     = useState("login"); // login | signup | reset
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [msg,      setMsg]      = useState("");
  const [error,    setError]    = useState("");

  const handle = async () => {
    setLoading(true); setError(""); setMsg("");
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onLogin();
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Account created! Check your email to confirm, then log in.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        setMsg("Password reset email sent! Check your inbox.");
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${C.dark} 0%, ${C.accent} 60%, #d4722a 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "Georgia, serif" }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: 32, width: "100%", maxWidth: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🧁</div>
          <div style={{ fontSize: 22, fontWeight: "bold", color: C.dark }}>BakeFlo</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Your home bakery business manager</div>
        </div>

        {msg   && <div style={{ background: "#d1fae5", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#065f46", marginBottom: 14 }}>{msg}</div>}
        {error && <div style={{ background: "#fee2e2", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#991b1b", marginBottom: 14 }}>{error}</div>}

        <div style={{ marginBottom: 12 }}>
          <label style={s.label}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={s.input} />
        </div>

        {mode !== "reset" && (
          <div style={{ marginBottom: 20 }}>
            <label style={s.label}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={s.input}
              onKeyDown={e => e.key === "Enter" && handle()} />
          </div>
        )}

        <button onClick={handle} disabled={loading} style={{ ...s.btn, width: "100%", padding: 14, fontSize: 15 }}>
          {loading ? "Please wait..." : mode === "login" ? "Log In" : mode === "signup" ? "Create Account" : "Send Reset Email"}
        </button>

        <div style={{ marginTop: 20, textAlign: "center", fontSize: 13 }}>
          {mode === "login" && <>
            <span style={{ color: C.muted }}>New here? </span>
            <button onClick={() => { setMode("signup"); setError(""); setMsg(""); }} style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontWeight: "700", fontFamily: "Georgia, serif" }}>Create account</button>
            <div style={{ marginTop: 8 }}>
              <button onClick={() => { setMode("reset"); setError(""); setMsg(""); }} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 12, fontFamily: "Georgia, serif" }}>Forgot password?</button>
            </div>
          </>}
          {mode === "signup" && <>
            <span style={{ color: C.muted }}>Already have an account? </span>
            <button onClick={() => { setMode("login"); setError(""); setMsg(""); }} style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontWeight: "700", fontFamily: "Georgia, serif" }}>Log in</button>
          </>}
          {mode === "reset" && (
            <button onClick={() => { setMode("login"); setError(""); setMsg(""); }} style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontFamily: "Georgia, serif" }}>Back to login</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function BakersHubPro() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${C.dark}, ${C.accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#fff", fontSize: 18 }}>
      🧁 Loading...
    </div>
  );

  if (!session) return <LoginScreen onLogin={() => {}} />;

  return <AppInner session={session} />;
}

// ─── APP INNER (authenticated) ────────────────────────────────────────────────
function AppInner({ session }) {
  const uid = session.user.id;
  const [tab, setTab] = useState("Dashboard");

  // Data
  const [pantry,   setPantry]   = useState([]);
  const [recipes,  setRecipes]  = useState([]);
  const [orders,   setOrders]   = useState([]);
  const [social,   setSocial]   = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [dbLoading, setDbLoading] = useState(true);

  // Settings
  const [bakeryName,  setBakeryName]  = useState("My Home Bakery");
  const [bakeryLogo,  setBakeryLogo]  = useState(null);
  const [apiKey,      setApiKey]      = useState(() => localStorage.getItem("baker_api_key") || "");
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Pantry UI
  const [showNewPantry, setShowNewPantry] = useState(false);
  const [editingPantry, setEditingPantry] = useState(null);
  const [pantryFilter,  setPantryFilter]  = useState("All");
  const [newPantry,     setNewPantry]     = useState({ name: "", category: "Flour & Grains", storeCost: "", yields: "", unit: "cups", storeUnit: "" });

  // Recipes UI
  const [selRecipe,   setSelRecipe]   = useState(null);
  const [scale,       setScale]       = useState(1);
  const [showNewRec,  setShowNewRec]  = useState(false);
  const [newRec,      setNewRec]      = useState({ name: "", category: "Cookies", servings: 12, ingredients: [], notes: "", photo: null });
  const [recIngInput, setRecIngInput] = useState({ pantryId: "", amount: "", unit: "cups" });

  // Pricing
  const [pricingRecId, setPricingRecId] = useState("");
  const [pricingSvgs,  setPricingSvgs]  = useState(12);
  const [extraCosts,   setExtraCosts]   = useState([]);
  const [extraCostIn,  setExtraCostIn]  = useState({ name: "", cost: "" });
  const [laborHrs,     setLaborHrs]     = useState(1);
  const [laborRate,    setLaborRate]    = useState(20);
  const [overhead,     setOverhead]     = useState(10);
  const [markup,       setMarkup]       = useState(30);
  const [sellQty,      setSellQty]      = useState(1);
  const [priceResult,  setPriceResult]  = useState(null);

  // Orders UI
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [newOrder,     setNewOrder]     = useState({ customer: "", item: "", due: "", status: "Pending", total: "", notes: "", phone: "" });
  const [editingOrder, setEditingOrder] = useState(null); // order being edited
  const [editOrder,    setEditOrder]    = useState(null); // edit form state
  const [emailModal,   setEmailModal]   = useState(null);
  const [emailBody,    setEmailBody]    = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailCopied,  setEmailCopied]  = useState(false);

  // Schedule UI
  const [showNewTask,   setShowNewTask]   = useState(false);
  const [newTask,       setNewTask]       = useState({ date: "", task: "" });
  const [aiTaskLoading, setAiTaskLoading] = useState(false);

  // Social UI
  const [showNewPost,    setShowNewPost]    = useState(false);
  const [newPost,        setNewPost]        = useState({ platform: "Instagram", type: "Product Photo", caption: "", date: "", status: "Draft", photo: null });
  const [captionLoading, setCaptionLoading] = useState(false);
  const [expandedPost,   setExpandedPost]   = useState(null);

  // ── Load all data from Supabase ──────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setDbLoading(true);
      const [
        { data: pantryData },
        { data: recipesData },
        { data: ordersData },
        { data: scheduleData },
        { data: socialData },
        { data: profileData },
      ] = await Promise.all([
        supabase.from("pantry").select("*").eq("user_id", uid).order("name"),
        supabase.from("recipes").select("*").eq("user_id", uid).order("name"),
        supabase.from("orders").select("*").eq("user_id", uid).order("due"),
        supabase.from("schedule").select("*").eq("user_id", uid).order("date"),
        supabase.from("social_posts").select("*").eq("user_id", uid).order("date"),
        supabase.from("profiles").select("*").eq("id", uid).single(),
      ]);

      // Map snake_case DB fields to camelCase for the app
      setPantry((pantryData || []).map(p => ({ ...p, costPer: p.cost_per, storeUnit: p.store_unit, storeCost: p.store_cost })));
      setRecipes((recipesData || []).map(r => ({ ...r, ingredients: r.ingredients || [] })));
      setOrders(ordersData || []);
      setSchedule((scheduleData || []).map(t => ({ ...t, orderId: t.order_id, aiSuggested: t.ai_suggested })));
      setSocial((socialData || []).map(p => ({ ...p, type: p.type })));
      if (profileData) {
        setBakeryName(profileData.bakery_name || "My Home Bakery");
        setBakeryLogo(profileData.bakery_logo || null);
      }
      setDbLoading(false);
    };
    load();
  }, [uid]);

  // ── Save settings ────────────────────────────────────────────────────────────
  const saveSettings = async () => {
    await supabase.from("profiles").upsert({ id: uid, bakery_name: bakeryName, bakery_logo: bakeryLogo });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  const saveApiKey = (key) => {
    localStorage.setItem("baker_api_key", key);
    setApiKey(key);
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 2000);
  };

  // ── Pantry ────────────────────────────────────────────────────────────────
  const addPantryItem = async () => {
    if (!newPantry.name || !newPantry.storeCost || !newPantry.yields) return;
    const costPer = parseFloat(newPantry.storeCost) / parseFloat(newPantry.yields);
    const { data } = await supabase.from("pantry").insert([{
      user_id: uid, name: newPantry.name, category: newPantry.category,
      cost_per: costPer, unit: newPantry.unit, store_unit: newPantry.storeUnit,
      store_cost: parseFloat(newPantry.storeCost), yields: parseFloat(newPantry.yields)
    }]).select().single();
    if (data) setPantry(p => [...p, { ...data, costPer: data.cost_per, storeUnit: data.store_unit, storeCost: data.store_cost }]);
    setNewPantry({ name: "", category: "Flour & Grains", storeCost: "", yields: "", unit: "cups", storeUnit: "" });
    setShowNewPantry(false);
  };

  const updatePantryPrice = async (id, sc, sy) => {
    const costPer = parseFloat(sc) / parseFloat(sy);
    await supabase.from("pantry").update({ store_cost: parseFloat(sc), yields: parseFloat(sy), cost_per: costPer }).eq("id", id);
    setPantry(p => p.map(x => x.id === id ? { ...x, storeCost: parseFloat(sc), yields: parseFloat(sy), costPer } : x));
    setEditingPantry(null);
  };

  // ── Recipes ──────────────────────────────────────────────────────────────
  const addRecipe = async () => {
    if (!newRec.name) return;
    const { data } = await supabase.from("recipes").insert([{
      user_id: uid, name: newRec.name, category: newRec.category,
      servings: newRec.servings, notes: newRec.notes, photo: newRec.photo,
      ingredients: newRec.ingredients
    }]).select().single();
    if (data) setRecipes(r => [...r, { ...data, ingredients: data.ingredients || [] }]);
    setNewRec({ name: "", category: "Cookies", servings: 12, ingredients: [], notes: "", photo: null });
    setShowNewRec(false);
  };

  const addRecipeIng = () => {
    const pid = parseInt(recIngInput.pantryId);
    const item = pantry.find(p => p.id === pid);
    if (!item) return;
    setNewRec(r => ({ ...r, ingredients: [...r.ingredients, { pantryId: pid, name: item.name, amount: parseFloat(recIngInput.amount) || 1, unit: recIngInput.unit || item.unit }] }));
    setRecIngInput({ pantryId: "", amount: "", unit: "cups" });
  };

  // ── Pricing ──────────────────────────────────────────────────────────────
  const calcPrice = () => {
    let ingCost = 0;
    if (pricingRecId) {
      const rec = recipes.find(r => r.id === parseInt(pricingRecId));
      if (rec) ingCost = calcRecipeCost(rec, pantry) * (pricingSvgs / rec.servings);
    }
    ingCost += extraCosts.reduce((s, x) => s + parseFloat(x.cost || 0), 0);
    const labor  = laborHrs * laborRate;
    const sub    = ingCost + labor;
    const withOH = sub * (1 + overhead / 100);
    const final  = withOH * (1 + markup / 100);
    setPriceResult({ ingCost, labor, sub, withOH, final, perUnit: final / sellQty });
  };

  // ── Orders ────────────────────────────────────────────────────────────────
  const addOrder = async () => {
    if (!newOrder.customer) return;
    const { data } = await supabase.from("orders").insert([{
      user_id: uid, customer: newOrder.customer, item: newOrder.item,
      due: newOrder.due || null, status: newOrder.status,
      total: parseFloat(newOrder.total) || 0, notes: newOrder.notes, phone: newOrder.phone
    }]).select().single();
    if (data) {
      const updatedOrders = [...orders, data];
      setOrders(updatedOrders);
      // Auto-generate tasks
      const tasks = generateTasksFromOrder(data);
      for (const t of tasks) {
        const { data: taskData } = await supabase.from("schedule").insert([{ user_id: uid, ...t, order_id: data.id }]).select().single();
        if (taskData) setSchedule(prev => [...prev, { ...taskData, auto: true, aiSuggested: false }]);
      }
    }
    setNewOrder({ customer: "", item: "", due: "", status: "Pending", total: "", notes: "", phone: "" });
    setShowNewOrder(false);
  };

  const updateOrderStatus = async (id, status) => {
    await supabase.from("orders").update({ status }).eq("id", id);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  };

  const saveEditOrder = async () => {
    if (!editOrder) return;
    const updates = {
      customer: editOrder.customer, item: editOrder.item,
      due: editOrder.due || null, status: editOrder.status,
      total: parseFloat(editOrder.total) || 0, notes: editOrder.notes, phone: editOrder.phone
    };
    await supabase.from("orders").update(updates).eq("id", editingOrder);
    setOrders(prev => prev.map(o => o.id === editingOrder ? { ...o, ...updates } : o));
    setEditingOrder(null); setEditOrder(null);
  };

  // ── Email ─────────────────────────────────────────────────────────────────
  const genEmail = async (order) => {
    setEmailModal(order); setEmailBody(""); setEmailCopied(false); setEmailLoading(true);
    try {
      const body = await aiOrderConfirmation(order, bakeryName);
      setEmailBody(body);
    } catch (e) {
      setEmailBody(e.message === "NO_KEY" ? "⚠️ No API key set. Go to Settings to add your Anthropic API key." : "Error generating email. Please try again.");
    }
    setEmailLoading(false);
  };
  const copyEmail = () => {
    navigator.clipboard.writeText(emailBody).then(() => { setEmailCopied(true); setTimeout(() => setEmailCopied(false), 2000); });
  };

  // ── Schedule ──────────────────────────────────────────────────────────────
  const toggleTask = async (id) => {
    const task = schedule.find(t => t.id === id);
    if (!task) return;
    await supabase.from("schedule").update({ done: !task.done }).eq("id", id);
    setSchedule(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const addTask = async () => {
    if (!newTask.task) return;
    const { data } = await supabase.from("schedule").insert([{ user_id: uid, date: newTask.date || null, task: newTask.task, done: false, auto: false }]).select().single();
    if (data) setSchedule(prev => [...prev, { ...data, aiSuggested: false }]);
    setNewTask({ date: "", task: "" }); setShowNewTask(false);
  };

  const getAiTasks = async () => {
    setAiTaskLoading(true);
    try {
      const suggestions = await aiScheduleSuggestions(orders);
      const today = new Date();
      for (const s of suggestions) {
        const d = new Date(today);
        d.setDate(d.getDate() + (s.daysFromNow || 0));
        const { data } = await supabase.from("schedule").insert([{ user_id: uid, date: d.toISOString().split("T")[0], task: s.task, done: false, auto: false, ai_suggested: true }]).select().single();
        if (data) setSchedule(prev => [...prev, { ...data, aiSuggested: true }]);
      }
    } catch (e) {
      alert(e.message === "NO_KEY" ? "No API key set. Go to Settings to add your Anthropic API key." : "Error getting suggestions.");
    }
    setAiTaskLoading(false);
  };

  // ── Social ────────────────────────────────────────────────────────────────
  const addPost = async () => {
    if (!newPost.platform) return;
    const { data } = await supabase.from("social_posts").insert([{
      user_id: uid, platform: newPost.platform, type: newPost.type,
      caption: newPost.caption, date: newPost.date || null, status: newPost.status, photo: newPost.photo
    }]).select().single();
    if (data) setSocial(prev => [...prev, data]);
    setNewPost({ platform: "Instagram", type: "Product Photo", caption: "", date: "", status: "Draft", photo: null });
    setShowNewPost(false);
  };

  const updatePostStatus = async (id, status) => {
    await supabase.from("social_posts").update({ status }).eq("id", id);
    setSocial(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  };

  const genCaption = async () => {
    setCaptionLoading(true);
    try {
      const cap = await aiCaption(newPost.platform, newPost.type);
      setNewPost(p => ({ ...p, caption: cap }));
    } catch (e) {
      setNewPost(p => ({ ...p, caption: e.message === "NO_KEY" ? "⚠️ Go to Settings to add your Anthropic API key." : "Error. Please try again." }));
    }
    setCaptionLoading(false);
  };

  // ── Dashboard metrics ─────────────────────────────────────────────────────
  const deliveredRev   = orders.filter(o => o.status === "Delivered").reduce((s, o) => s + (o.total || 0), 0);
  const pendingRev     = orders.filter(o => o.status !== "Delivered").reduce((s, o) => s + (o.total || 0), 0);
  const openOrders     = orders.filter(o => o.status !== "Delivered").length;
  const todayStr       = new Date().toISOString().split("T")[0];
  const todayTasks     = schedule.filter(t => !t.done && t.date === todayStr);
  const scheduledPosts = social.filter(p => p.status === "Scheduled").length;
  const groupedSched   = schedule.reduce((acc, t) => { const d = t.date || "Undated"; if (!acc[d]) acc[d] = []; acc[d].push(t); return acc; }, {});

  if (dbLoading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: C.muted, fontSize: 16 }}>
      🧁 Loading your bakery...
    </div>
  );

  return (
    <div style={{ fontFamily: "Georgia, serif", minHeight: "100vh", background: C.bg, color: C.text }}>

      {/* HEADER */}
      <div style={{ background: `linear-gradient(135deg, ${C.dark} 0%, ${C.accent} 60%, #d4722a 100%)`, padding: "22px 20px 0", color: "#fff", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -20, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {bakeryLogo
            ? <img src={bakeryLogo} alt="logo" style={{ width: 48, height: 48, borderRadius: 12, objectFit: "cover", border: "2px solid rgba(255,255,255,0.3)" }} />
            : <div style={{ fontSize: 36 }}>🧁</div>
          }
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, letterSpacing: 4, opacity: 0.7, textTransform: "uppercase" }}>Home Bakery Business</div>
            <div style={{ fontSize: 22, fontWeight: "bold", marginTop: 1 }}>{bakeryName}</div>
          </div>
          <button onClick={() => supabase.auth.signOut()} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 20, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" }}>Sign Out</button>
        </div>
        <div style={{ display: "flex", overflowX: "auto", marginTop: 16, gap: 2 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "10px 13px", border: "none", cursor: "pointer", fontSize: 12,
              fontWeight: tab === t ? "700" : "400", borderRadius: "10px 10px 0 0", whiteSpace: "nowrap",
              background: tab === t ? "rgba(255,255,255,0.2)" : "transparent", color: "#fff",
              borderBottom: tab === t ? "3px solid #fff" : "3px solid transparent",
              opacity: tab === t ? 1 : 0.72, fontFamily: "Georgia, serif",
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "18px 16px", maxWidth: 720, margin: "0 auto" }}>

        {/* ══════════ DASHBOARD ══════════ */}
        {tab === "Dashboard" && (
          <div>
            <div style={{ fontSize: 18, fontWeight: "bold", marginBottom: 14 }}>Good morning! ☀️</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[
                { label: "Delivered Revenue", value: `$${deliveredRev.toFixed(2)}`, icon: "💰", color: "#10b981" },
                { label: "Pending Revenue",   value: `$${pendingRev.toFixed(2)}`,   icon: "⏳", color: "#f59e0b" },
                { label: "Open Orders",       value: openOrders,                    icon: "📦", color: "#3b82f6" },
                { label: "Scheduled Posts",   value: scheduledPosts,                icon: "📱", color: "#8b5cf6" },
              ].map(k => (
                <div key={k.label} style={{ ...s.card, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 24 }}>{k.icon}</div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: "bold", color: k.color }}>{k.value}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{k.label}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ ...s.card, background: `linear-gradient(135deg, ${C.dark}, ${C.accent})`, color: "#fff" }}>
              <div style={{ fontWeight: "bold", marginBottom: 10 }}>📊 P&L Snapshot</div>
              {[["Delivered Revenue", `$${deliveredRev.toFixed(2)}`], ["Pipeline (pending)", `$${pendingRev.toFixed(2)}`]].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.15)", fontSize: 13 }}>
                  <span style={{ opacity: 0.8 }}>{l}</span><span>{v}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontWeight: "bold", fontSize: 16 }}>
                <span>Total Pipeline</span>
                <span style={{ background: "rgba(255,255,255,0.2)", padding: "2px 14px", borderRadius: 20 }}>${(deliveredRev + pendingRev).toFixed(2)}</span>
              </div>
            </div>
            <div style={s.card}>
              <div style={{ fontWeight: "bold", marginBottom: 10, color: C.dark }}>📅 Today's Tasks ({todayTasks.length})</div>
              {todayTasks.length === 0
                ? <div style={{ color: C.muted, fontSize: 13 }}>No tasks today — enjoy! 🎉</div>
                : todayTasks.map(t => (
                  <div key={t.id} onClick={() => toggleTask(t.id)} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "5px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${t.done ? "#10b981" : C.accent}`, background: t.done ? "#10b981" : "transparent", flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 13 }}>{t.task}</span>
                  </div>
                ))}
            </div>
            <div style={s.card}>
              <div style={{ fontWeight: "bold", marginBottom: 10, color: C.dark }}>🚨 Upcoming Orders</div>
              {orders.filter(o => o.status !== "Delivered").slice(0, 4).map(o => (
                <div key={o.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                  <div><span style={{ fontWeight: "600" }}>{o.customer}</span><span style={{ color: C.muted }}> · {o.item}</span></div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ color: C.muted }}>{o.due}</span>
                    <span style={s.tag(STATUS_COLORS[o.status])}>{o.status}</span>
                  </div>
                </div>
              ))}
              {orders.filter(o => o.status !== "Delivered").length === 0 && <div style={{ color: C.muted, fontSize: 13 }}>No open orders 🎉</div>}
            </div>
          </div>
        )}

        {/* ══════════ PANTRY ══════════ */}
        {tab === "Pantry" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 18, fontWeight: "bold" }}>🫙 Ingredient Pantry</div>
              <button onClick={() => setShowNewPantry(true)} style={s.btn}>+ Add Item</button>
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>Master cost list — update prices here and everything recalculates automatically.</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              {["All", ...PANTRY_CATS].map(cat => (
                <button key={cat} onClick={() => setPantryFilter(cat)} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: "600", cursor: "pointer", border: `1px solid ${C.accent}`, background: pantryFilter === cat ? C.accent : "#fff", color: pantryFilter === cat ? "#fff" : C.accent, fontFamily: "Georgia, serif" }}>{cat}</button>
              ))}
            </div>
            {showNewPantry && (
              <div style={s.card}>
                <div style={{ fontWeight: "bold", color: C.accent, marginBottom: 12 }}>New Pantry Item</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input placeholder="Ingredient name" value={newPantry.name} onChange={e => setNewPantry(p => ({ ...p, name: e.target.value }))} style={{ ...s.input, flex: 2 }} />
                  <select value={newPantry.category} onChange={e => setNewPantry(p => ({ ...p, category: e.target.value }))} style={{ ...s.input, flex: 1 }}>{PANTRY_CATS.map(c => <option key={c}>{c}</option>)}</select>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <div style={{ flex: 1 }}><label style={s.label}>Store unit</label><input placeholder="5lb bag" value={newPantry.storeUnit} onChange={e => setNewPantry(p => ({ ...p, storeUnit: e.target.value }))} style={s.input} /></div>
                  <div style={{ width: 100 }}><label style={s.label}>Store cost $</label><input type="number" step="0.01" value={newPantry.storeCost} onChange={e => setNewPantry(p => ({ ...p, storeCost: e.target.value }))} style={s.input} /></div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <div style={{ flex: 1 }}><label style={s.label}>Recipe unit</label><select value={newPantry.unit} onChange={e => setNewPantry(p => ({ ...p, unit: e.target.value }))} style={s.input}>{UNITS.map(u => <option key={u}>{u}</option>)}</select></div>
                  <div style={{ flex: 1 }}><label style={s.label}>Yields ({newPantry.unit}s)</label><input type="number" step="0.1" value={newPantry.yields} onChange={e => setNewPantry(p => ({ ...p, yields: e.target.value }))} style={s.input} /></div>
                </div>
                {newPantry.storeCost && newPantry.yields && <div style={{ background: C.light, borderRadius: 8, padding: "8px 12px", marginTop: 10, fontSize: 13, color: C.mid }}>💡 Cost per {newPantry.unit}: <strong>${(parseFloat(newPantry.storeCost) / parseFloat(newPantry.yields)).toFixed(3)}</strong></div>}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={addPantryItem} style={s.btn}>Save Item</button>
                  <button onClick={() => setShowNewPantry(false)} style={s.btnSec}>Cancel</button>
                </div>
              </div>
            )}
            {PANTRY_CATS.filter(cat => pantryFilter === "All" || pantryFilter === cat).map(cat => {
              const items = pantry.filter(p => p.category === cat);
              if (!items.length) return null;
              return (
                <div key={cat}>
                  <div style={{ fontSize: 11, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: C.accent, margin: "14px 0 6px" }}>{cat}</div>
                  {items.map(item => (
                    <div key={item.id} style={s.card}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div><div style={{ fontWeight: "600", fontSize: 14 }}>{item.name}</div><div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{item.storeUnit} · ${item.storeCost?.toFixed(2)} → {item.yields} {item.unit}s</div></div>
                        <div style={{ textAlign: "right" }}><div style={{ fontWeight: "bold", fontSize: 16, color: C.dark }}>${item.costPer?.toFixed(3)}</div><div style={{ fontSize: 11, color: C.muted }}>per {item.unit}</div></div>
                      </div>
                      {editingPantry === item.id ? (
                        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                          <div style={{ flex: 1 }}><label style={s.label}>New store cost $</label><input type="number" step="0.01" defaultValue={item.storeCost} id={`sc-${item.id}`} style={s.input} /></div>
                          <div style={{ flex: 1 }}><label style={s.label}>Yields</label><input type="number" step="0.1" defaultValue={item.yields} id={`sy-${item.id}`} style={s.input} /></div>
                          <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 4 }}>
                            <button onClick={() => updatePantryPrice(item.id, document.getElementById(`sc-${item.id}`).value, document.getElementById(`sy-${item.id}`).value)} style={{ ...s.btn, padding: "7px 12px", fontSize: 12 }}>✓</button>
                            <button onClick={() => setEditingPantry(null)} style={{ ...s.btnSec, padding: "6px 12px", fontSize: 12 }}>✕</button>
                          </div>
                        </div>
                      ) : <button onClick={() => setEditingPantry(item.id)} style={{ ...s.btnSec, marginTop: 8, padding: "5px 12px", fontSize: 12 }}>✏️ Update Price</button>}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════ RECIPES ══════════ */}
        {tab === "Recipes" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 18, fontWeight: "bold" }}>Recipes</div>
              <button onClick={() => setShowNewRec(true)} style={s.btn}>+ Add Recipe</button>
            </div>
            {showNewRec && (
              <div style={s.card}>
                <div style={{ fontWeight: "bold", color: C.accent, marginBottom: 12 }}>New Recipe</div>
                <PhotoUpload value={newRec.photo} onChange={v => setNewRec(r => ({ ...r, photo: v }))} />
                <input placeholder="Recipe name" value={newRec.name} onChange={e => setNewRec(r => ({ ...r, name: e.target.value }))} style={{ ...s.input, marginTop: 10 }} />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <select value={newRec.category} onChange={e => setNewRec(r => ({ ...r, category: e.target.value }))} style={{ ...s.input, flex: 1 }}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
                  <input type="number" placeholder="Servings" value={newRec.servings} onChange={e => setNewRec(r => ({ ...r, servings: +e.target.value }))} style={{ ...s.input, width: 100 }} />
                </div>
                <div style={{ fontWeight: "600", fontSize: 12, color: C.mid, marginTop: 10, marginBottom: 6 }}>ADD FROM PANTRY</div>
                {newRec.ingredients.map((ing, i) => <div key={i} style={{ fontSize: 12, color: C.mid, padding: "2px 0" }}>• {ing.amount} {ing.unit} {ing.name}</div>)}
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <select value={recIngInput.pantryId} onChange={e => { const item = pantry.find(p => p.id === parseInt(e.target.value)); setRecIngInput(x => ({ ...x, pantryId: e.target.value, unit: item?.unit || "cups" })); }} style={{ ...s.input, flex: 2 }}>
                    <option value="">— Select ingredient —</option>
                    {pantry.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input type="number" step="0.25" placeholder="Amt" value={recIngInput.amount} onChange={e => setRecIngInput(x => ({ ...x, amount: e.target.value }))} style={{ ...s.input, width: 65 }} />
                  <select value={recIngInput.unit} onChange={e => setRecIngInput(x => ({ ...x, unit: e.target.value }))} style={{ ...s.input, width: 80 }}>{UNITS.map(u => <option key={u}>{u}</option>)}</select>
                  <button onClick={addRecipeIng} style={{ ...s.btn, padding: "8px 12px" }}>+</button>
                </div>
                <textarea placeholder="Notes / instructions" value={newRec.notes} onChange={e => setNewRec(r => ({ ...r, notes: e.target.value }))} style={{ ...s.input, marginTop: 8, height: 70, resize: "vertical" }} />
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={addRecipe} style={s.btn}>Save Recipe</button>
                  <button onClick={() => setShowNewRec(false)} style={s.btnSec}>Cancel</button>
                </div>
              </div>
            )}
            {recipes.map(r => {
              const totalCost = calcRecipeCost(r, pantry);
              return (
                <div key={r.id} style={s.card}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <PhotoUpload value={r.photo} onChange={async v => { await supabase.from("recipes").update({ photo: v }).eq("id", r.id); setRecipes(prev => prev.map(x => x.id === r.id ? { ...x, photo: v } : x)); }} small />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "bold", fontSize: 15 }}>{r.name}</div>
                      <div style={{ fontSize: 12, color: C.accent, marginTop: 2 }}>{r.category} · {r.servings} servings</div>
                      <div style={{ fontSize: 12, color: C.mid, marginTop: 3 }}>Cost: <strong style={{ color: C.dark }}>${totalCost.toFixed(2)}</strong> · <span style={{ color: C.muted }}>${(totalCost / r.servings).toFixed(3)}/serving</span></div>
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button onClick={() => { setSelRecipe(selRecipe?.id === r.id ? null : r); setScale(1); }} style={{ ...s.btnSec, padding: "5px 12px", fontSize: 12 }}>{selRecipe?.id === r.id ? "Close" : "View / Scale"}</button>
                        <button onClick={() => { setPricingRecId(String(r.id)); setPricingSvgs(r.servings); setSellQty(r.servings); setTab("Pricing"); }} style={{ ...s.btn, padding: "5px 12px", fontSize: 12 }}>→ Price It</button>
                      </div>
                    </div>
                  </div>
                  {selRecipe?.id === r.id && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: C.mid }}>Scale:</span>
                        {[0.5, 1, 1.5, 2, 3].map(f => <button key={f} onClick={() => setScale(f)} style={{ padding: "4px 12px", borderRadius: 20, border: `1px solid #d4a07a`, background: scale === f ? C.accent : "#fff", color: scale === f ? "#fff" : C.accent, cursor: "pointer", fontSize: 12, fontWeight: "600", fontFamily: "Georgia, serif" }}>{f}×</button>)}
                      </div>
                      <div style={{ background: C.light, borderRadius: 10, padding: 12 }}>
                        <div style={{ fontWeight: "600", fontSize: 12, marginBottom: 6, color: C.dark }}>INGREDIENTS — {Math.round(r.servings * scale)} servings · ${(totalCost * scale).toFixed(2)}</div>
                        {r.ingredients.map((ing, i) => {
                          const uc = calcIngCost(ing, pantry);
                          return <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid #f0dece`, fontSize: 13 }}>
                            <span>{ing.name}</span>
                            <div><span style={{ fontWeight: "600", color: C.dark }}>{Math.round(ing.amount * scale * 100) / 100} {ing.unit}</span>{uc !== null && <span style={{ color: C.muted, fontSize: 11, marginLeft: 6 }}>(${(uc * scale).toFixed(2)})</span>}</div>
                          </div>;
                        })}
                      </div>
                      {r.notes && <div style={{ marginTop: 10, fontSize: 13, color: C.mid, fontStyle: "italic", lineHeight: 1.7 }}>{r.notes}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════ PRICING ══════════ */}
        {tab === "Pricing" && (
          <div>
            <div style={{ fontSize: 18, fontWeight: "bold", marginBottom: 14 }}>Pricing Calculator</div>
            <div style={s.card}>
              <div style={{ fontWeight: "600", color: C.accent, fontSize: 13, marginBottom: 8 }}>STEP 1 — Link a Recipe (optional)</div>
              <select value={pricingRecId} onChange={e => { setPricingRecId(e.target.value); if (e.target.value) { const r = recipes.find(r => r.id === parseInt(e.target.value)); if (r) { setPricingSvgs(r.servings); setSellQty(r.servings); } } }} style={s.input}>
                <option value="">— No recipe, enter costs manually —</option>
                {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              {pricingRecId && (() => {
                const r = recipes.find(r => r.id === parseInt(pricingRecId));
                if (!r) return null;
                const batchCost = calcRecipeCost(r, pantry);
                const sf = pricingSvgs / r.servings;
                return (
                  <div style={{ background: C.light, borderRadius: 10, padding: 12, marginTop: 10 }}>
                    <div style={{ marginBottom: 8 }}><label style={s.label}>Quantity / servings selling</label><input type="number" value={pricingSvgs} onChange={e => { setPricingSvgs(+e.target.value); setSellQty(+e.target.value); }} style={{ ...s.input, width: 120 }} /></div>
                    <div style={{ fontSize: 13 }}>
                      {r.ingredients.map((ing, i) => { const c = calcIngCost(ing, pantry); return <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: 12, color: C.muted }}><span>{ing.amount * sf} {ing.unit} {ing.name}</span><span>{c !== null ? `$${(c * sf).toFixed(2)}` : "—"}</span></div>; })}
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontWeight: "bold", color: C.dark, marginTop: 4, borderTop: `1px solid ${C.border}` }}><span>Scaled ingredient cost</span><span>${(batchCost * sf).toFixed(2)}</span></div>
                    </div>
                  </div>
                );
              })()}
              <div style={{ fontWeight: "600", color: C.accent, fontSize: 13, margin: "14px 0 4px" }}>STEP 2 — Extra Costs</div>
              {extraCosts.map((ec, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0", color: C.mid }}><span>{ec.name}</span><span>${parseFloat(ec.cost).toFixed(2)}</span></div>)}
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                <input placeholder="Item (e.g. cake box)" value={extraCostIn.name} onChange={e => setExtraCostIn(x => ({ ...x, name: e.target.value }))} style={{ ...s.input, flex: 2 }} />
                <input type="number" step="0.01" placeholder="$" value={extraCostIn.cost} onChange={e => setExtraCostIn(x => ({ ...x, cost: e.target.value }))} style={{ ...s.input, width: 70 }} />
                <button onClick={() => { if (extraCostIn.name) { setExtraCosts(p => [...p, { ...extraCostIn }]); setExtraCostIn({ name: "", cost: "" }); } }} style={{ ...s.btn, padding: "8px 12px" }}>+</button>
              </div>
              <div style={{ fontWeight: "600", color: C.accent, fontSize: 13, margin: "14px 0 8px" }}>STEP 3 — Labor & Margins</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[["Labor hrs", laborHrs, setLaborHrs, 0.5], ["$/hr", laborRate, setLaborRate, 1], ["Overhead %", overhead, setOverhead, 1], ["Markup %", markup, setMarkup, 1], ["Qty to sell", sellQty, setSellQty, 1]].map(([label, val, setter, step]) => (
                  <div key={label}><label style={s.label}>{label}</label><input type="number" step={step} value={val} onChange={e => setter(+e.target.value)} style={s.input} /></div>
                ))}
              </div>
              <button onClick={calcPrice} style={{ ...s.btn, width: "100%", marginTop: 14, padding: 12, fontSize: 14 }}>Calculate Price →</button>
            </div>
            {priceResult && (
              <div style={{ ...s.card, background: `linear-gradient(135deg, ${C.dark}, ${C.accent})`, color: "#fff" }}>
                <div style={{ fontWeight: "bold", fontSize: 15, marginBottom: 12 }}>💰 Pricing Breakdown</div>
                {[["Ingredient Cost", `$${priceResult.ingCost.toFixed(2)}`], ["Labor Cost", `$${priceResult.labor.toFixed(2)}`], ["Subtotal", `$${priceResult.sub.toFixed(2)}`], [`+ ${overhead}% Overhead`, `$${priceResult.withOH.toFixed(2)}`], [`+ ${markup}% Markup`, `$${priceResult.final.toFixed(2)}`]].map(([label, val]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.15)", fontSize: 13 }}><span style={{ opacity: 0.85 }}>{label}</span><span>{val}</span></div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontWeight: "bold", fontSize: 18 }}>
                  <span>Price Per Unit</span><span style={{ background: "rgba(255,255,255,0.2)", padding: "4px 14px", borderRadius: 20 }}>${priceResult.perUnit.toFixed(2)}</span>
                </div>
                <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4, textAlign: "right" }}>Total for {sellQty}: ${priceResult.final.toFixed(2)}</div>
              </div>
            )}
          </div>
        )}

        {/* ══════════ ORDERS ══════════ */}
        {tab === "Orders" && (
          <div>
            {emailModal && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(44,26,14,0.55)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                <div style={{ background: C.card, borderRadius: "20px 20px 0 0", padding: 20, width: "100%", maxWidth: 720, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 -8px 40px rgba(0,0,0,0.2)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div><div style={{ fontWeight: "bold", fontSize: 16, color: C.dark }}>✉️ Order Confirmation</div><div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>For {emailModal.customer} · {emailModal.item}</div></div>
                    <button onClick={() => setEmailModal(null)} style={{ background: C.light, border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: 16, color: C.mid }}>✕</button>
                  </div>
                  {emailLoading
                    ? <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: C.muted }}><div style={{ fontSize: 32 }}>✨</div><div style={{ fontSize: 14 }}>Writing your confirmation email...</div></div>
                    : <>
                      <div style={{ marginBottom: 8 }}><label style={s.label}>Subject line</label><div style={{ ...s.input, fontSize: 13, color: C.mid, background: C.light }}>Order Confirmed! {emailModal.item} — {emailModal.due}</div></div>
                      <label style={s.label}>Email body</label>
                      <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} style={{ ...s.input, flex: 1, resize: "none", fontSize: 13, lineHeight: 1.7, minHeight: 220 }} />
                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <button onClick={copyEmail} style={{ ...s.btn, flex: 1 }}>{emailCopied ? "✓ Copied!" : "📋 Copy Email"}</button>
                        <button onClick={() => genEmail(emailModal)} style={{ ...s.btnSec, fontSize: 12 }}>↺ Regenerate</button>
                        <button onClick={() => setEmailModal(null)} style={{ ...s.btnSec, fontSize: 12 }}>Close</button>
                      </div>
                    </>
                  }
                </div>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 18, fontWeight: "bold" }}>Orders</div>
              <button onClick={() => setShowNewOrder(true)} style={s.btn}>+ New Order</button>
            </div>
            {showNewOrder && (
              <div style={s.card}>
                <div style={{ fontWeight: "bold", color: C.accent, marginBottom: 12 }}>New Order</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input placeholder="Customer name" value={newOrder.customer} onChange={e => setNewOrder(o => ({ ...o, customer: e.target.value }))} style={{ ...s.input, flex: 1 }} />
                  <input placeholder="Phone" value={newOrder.phone} onChange={e => setNewOrder(o => ({ ...o, phone: e.target.value }))} style={{ ...s.input, width: 110 }} />
                </div>
                <input placeholder="Item(s) ordered" value={newOrder.item} onChange={e => setNewOrder(o => ({ ...o, item: e.target.value }))} style={{ ...s.input, marginTop: 8 }} />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <input type="date" value={newOrder.due} onChange={e => setNewOrder(o => ({ ...o, due: e.target.value }))} style={{ ...s.input, flex: 1 }} />
                  <input type="number" placeholder="Total $" value={newOrder.total} onChange={e => setNewOrder(o => ({ ...o, total: e.target.value }))} style={{ ...s.input, width: 90 }} />
                  <select value={newOrder.status} onChange={e => setNewOrder(o => ({ ...o, status: e.target.value }))} style={{ ...s.input, width: 130 }}>{STATUS_LIST.map(st => <option key={st}>{st}</option>)}</select>
                </div>
                <textarea placeholder="Customer notes..." value={newOrder.notes} onChange={e => setNewOrder(o => ({ ...o, notes: e.target.value }))} style={{ ...s.input, marginTop: 8, height: 60, resize: "vertical" }} />
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={addOrder} style={s.btn}>Save & Auto-Schedule</button>
                  <button onClick={() => setShowNewOrder(false)} style={s.btnSec}>Cancel</button>
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>✨ Tasks will be auto-added to your schedule</div>
              </div>
            )}
            {orders.map(o => (
              <div key={o.id} style={{ ...s.card, borderLeft: `4px solid ${STATUS_COLORS[o.status] || "#ccc"}` }}>
                {editingOrder === o.id ? (
                  <div>
                    <div style={{ fontWeight: "bold", color: C.accent, marginBottom: 12 }}>✏️ Edit Order</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input placeholder="Customer name" value={editOrder.customer} onChange={e => setEditOrder(x => ({ ...x, customer: e.target.value }))} style={{ ...s.input, flex: 1 }} />
                      <input placeholder="Phone" value={editOrder.phone} onChange={e => setEditOrder(x => ({ ...x, phone: e.target.value }))} style={{ ...s.input, width: 110 }} />
                    </div>
                    <input placeholder="Item(s)" value={editOrder.item} onChange={e => setEditOrder(x => ({ ...x, item: e.target.value }))} style={{ ...s.input, marginTop: 8 }} />
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <input type="date" value={editOrder.due} onChange={e => setEditOrder(x => ({ ...x, due: e.target.value }))} style={{ ...s.input, flex: 1 }} />
                      <input type="number" placeholder="Total $" value={editOrder.total} onChange={e => setEditOrder(x => ({ ...x, total: e.target.value }))} style={{ ...s.input, width: 90 }} />
                      <select value={editOrder.status} onChange={e => setEditOrder(x => ({ ...x, status: e.target.value }))} style={{ ...s.input, width: 130 }}>{STATUS_LIST.map(st => <option key={st}>{st}</option>)}</select>
                    </div>
                    <textarea placeholder="Notes..." value={editOrder.notes} onChange={e => setEditOrder(x => ({ ...x, notes: e.target.value }))} style={{ ...s.input, marginTop: 8, height: 60, resize: "vertical" }} />
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button onClick={saveEditOrder} style={s.btn}>Save Changes</button>
                      <button onClick={() => { setEditingOrder(null); setEditOrder(null); }} style={s.btnSec}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div><div style={{ fontWeight: "bold", fontSize: 15 }}>{o.customer}</div><div style={{ fontSize: 13, color: C.mid, marginTop: 2 }}>{o.item}</div><div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Due: {o.due}{o.phone && ` · ${o.phone}`}</div></div>
                      <div style={{ textAlign: "right" }}><div style={{ fontWeight: "bold", fontSize: 18, color: C.dark }}>${o.total}</div><span style={s.tag(STATUS_COLORS[o.status])}>{o.status}</span></div>
                    </div>
                    {o.notes && <div style={{ background: C.light, borderRadius: 8, padding: "8px 10px", marginTop: 10, fontSize: 13, color: C.mid, fontStyle: "italic" }}>📝 {o.notes}</div>}
                    <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                      {STATUS_LIST.map(st => <button key={st} onClick={() => updateOrderStatus(o.id, st)} style={{ padding: "4px 10px", borderRadius: 20, border: `1px solid ${STATUS_COLORS[st]}`, background: o.status === st ? STATUS_COLORS[st] : "#fff", color: o.status === st ? "#fff" : STATUS_COLORS[st], cursor: "pointer", fontSize: 11, fontWeight: "600", fontFamily: "Georgia, serif" }}>{st}</button>)}
                      <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                        <button onClick={() => { setEditingOrder(o.id); setEditOrder({ customer: o.customer, item: o.item, due: o.due || "", status: o.status, total: o.total, notes: o.notes || "", phone: o.phone || "" }); }} style={{ ...s.btnSec, padding: "4px 10px", fontSize: 11 }}>✏️ Edit</button>
                        <button onClick={() => genEmail(o)} style={{ ...s.btnSec, padding: "4px 12px", fontSize: 11 }}>✉️ Email</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
            {orders.length === 0 && <div style={{ ...s.card, textAlign: "center", color: C.muted, fontSize: 14 }}>No orders yet — add your first one! 🎂</div>}
          </div>
        )}

        {/* ══════════ SCHEDULE ══════════ */}
        {tab === "Schedule" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 18, fontWeight: "bold" }}>Schedule</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={getAiTasks} disabled={aiTaskLoading} style={{ ...s.btnSec, fontSize: 12, padding: "7px 12px" }}>{aiTaskLoading ? "⏳..." : "✨ AI Suggest"}</button>
                <button onClick={() => setShowNewTask(true)} style={s.btn}>+ Task</button>
              </div>
            </div>
            <div style={{ ...s.card, background: C.light, marginBottom: 14 }}>
              <div style={{ height: 8, background: "#e8d5c0", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 10, background: `linear-gradient(90deg, ${C.dark}, ${C.accent})`, width: `${schedule.length ? (schedule.filter(t => t.done).length / schedule.length) * 100 : 0}%`, transition: "width 0.4s" }} />
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{schedule.filter(t => t.done).length} of {schedule.length} tasks complete</div>
            </div>
            {showNewTask && (
              <div style={s.card}>
                <div style={{ fontWeight: "bold", color: C.accent, marginBottom: 12 }}>New Task</div>
                <label style={s.label}>Date</label>
                <input type="date" value={newTask.date} onChange={e => setNewTask(t => ({ ...t, date: e.target.value }))} style={s.input} />
                <label style={{ ...s.label, marginTop: 10 }}>Task Description</label>
                <input placeholder="What needs to be done?" value={newTask.task} onChange={e => setNewTask(t => ({ ...t, task: e.target.value }))} style={s.input} />
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={addTask} style={s.btn}>Add Task</button>
                  <button onClick={() => setShowNewTask(false)} style={s.btnSec}>Cancel</button>
                </div>
              </div>
            )}
            {Object.entries(groupedSched).sort(([a], [b]) => a.localeCompare(b)).map(([date, tasks]) => (
              <div key={date} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: C.accent, marginBottom: 6 }}>
                  {date === "Undated" ? "Undated" : new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </div>
                {tasks.map(t => (
                  <div key={t.id} onClick={() => toggleTask(t.id)} style={{ ...s.card, display: "flex", alignItems: "center", gap: 10, cursor: "pointer", opacity: t.done ? 0.45 : 1, padding: "11px 14px", marginBottom: 6 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${t.done ? "#10b981" : C.accent}`, background: t.done ? "#10b981" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11 }}>{t.done ? "✓" : ""}</div>
                    <span style={{ fontSize: 13, flex: 1, textDecoration: t.done ? "line-through" : "none" }}>{t.task}</span>
                    {t.auto && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: "#3b82f611", color: "#3b82f6", fontWeight: "700" }}>auto</span>}
                    {t.aiSuggested && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: "#8b5cf611", color: "#8b5cf6", fontWeight: "700" }}>AI</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ══════════ SOCIAL ══════════ */}
        {tab === "Social" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 18, fontWeight: "bold" }}>Social Media Planner</div>
              <button onClick={() => setShowNewPost(true)} style={s.btn}>+ New Post</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto" }}>
              {PLATFORMS.map(p => { const count = social.filter(post => post.platform === p).length; return (
                <div key={p} style={{ ...s.card, padding: "10px 14px", flexShrink: 0, textAlign: "center", minWidth: 80, marginBottom: 0 }}>
                  <div style={{ fontSize: 18 }}>{p === "Instagram" ? "📸" : p === "Facebook" ? "👥" : p === "TikTok" ? "🎵" : "📌"}</div>
                  <div style={{ fontWeight: "bold", fontSize: 16, color: C.accent }}>{count}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{p}</div>
                </div>
              ); })}
            </div>
            {showNewPost && (
              <div style={s.card}>
                <div style={{ fontWeight: "bold", color: C.accent, marginBottom: 12 }}>New Post</div>
                <PhotoUpload value={newPost.photo} onChange={v => setNewPost(p => ({ ...p, photo: v }))} />
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <select value={newPost.platform} onChange={e => setNewPost(p => ({ ...p, platform: e.target.value }))} style={{ ...s.input, flex: 1 }}>{PLATFORMS.map(p => <option key={p}>{p}</option>)}</select>
                  <select value={newPost.type} onChange={e => setNewPost(p => ({ ...p, type: e.target.value }))} style={{ ...s.input, flex: 1 }}>{POST_TYPES.map(t => <option key={t}>{t}</option>)}</select>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <input type="date" value={newPost.date} onChange={e => setNewPost(p => ({ ...p, date: e.target.value }))} style={{ ...s.input, flex: 1 }} />
                  <select value={newPost.status} onChange={e => setNewPost(p => ({ ...p, status: e.target.value }))} style={{ ...s.input, flex: 1 }}>{["Draft", "Scheduled", "Posted"].map(st => <option key={st}>{st}</option>)}</select>
                </div>
                <textarea placeholder="Caption... or use AI ✨" value={newPost.caption} onChange={e => setNewPost(p => ({ ...p, caption: e.target.value }))} style={{ ...s.input, marginTop: 8, height: 90, resize: "vertical" }} />
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={genCaption} disabled={captionLoading} style={{ ...s.btnSec, fontSize: 12 }}>{captionLoading ? "✨ Writing..." : "✨ AI Caption"}</button>
                  <button onClick={addPost} style={s.btn}>Save Post</button>
                  <button onClick={() => setShowNewPost(false)} style={s.btnSec}>Cancel</button>
                </div>
              </div>
            )}
            {social.map(post => (
              <div key={post.id} style={s.card}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  {post.photo ? <img src={post.photo} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                    : <div style={{ width: 64, height: 64, borderRadius: 10, background: C.light, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>{post.platform === "Instagram" ? "📸" : post.platform === "Facebook" ? "👥" : post.platform === "TikTok" ? "🎵" : "📌"}</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: "700", color: C.accent }}>{post.platform}</span>
                      <span style={{ fontSize: 11, color: C.muted }}>· {post.type}{post.date && ` · ${post.date}`}</span>
                      <span style={s.tag(post.status === "Posted" ? "#10b981" : post.status === "Scheduled" ? "#3b82f6" : "#9a7a65")}>{post.status}</span>
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: expandedPost === post.id ? "unset" : 3, WebkitBoxOrient: "vertical" }}>{post.caption}</div>
                    {post.caption?.length > 100 && <button onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)} style={{ background: "none", border: "none", color: C.accent, fontSize: 12, cursor: "pointer", padding: 0, marginTop: 4, fontFamily: "Georgia, serif" }}>{expandedPost === post.id ? "Show less" : "Show more"}</button>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  {["Draft", "Scheduled", "Posted"].map(st => <button key={st} onClick={() => updatePostStatus(post.id, st)} style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: "600", cursor: "pointer", fontFamily: "Georgia, serif", border: `1px solid ${st === "Posted" ? "#10b981" : st === "Scheduled" ? "#3b82f6" : "#9a7a65"}`, background: post.status === st ? (st === "Posted" ? "#10b981" : st === "Scheduled" ? "#3b82f6" : "#9a7a65") : "#fff", color: post.status === st ? "#fff" : (st === "Posted" ? "#10b981" : st === "Scheduled" ? "#3b82f6" : "#9a7a65") }}>{st}</button>)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══════════ SETTINGS ══════════ */}
        {tab === "Settings" && (
          <div>
            <div style={{ fontSize: 18, fontWeight: "bold", marginBottom: 14 }}>⚙️ Settings</div>
            <div style={s.card}>
              <div style={{ fontWeight: "bold", color: C.accent, marginBottom: 12 }}>🏷 Bakery Branding</div>
              <label style={s.label}>Bakery Name</label>
              <input value={bakeryName} onChange={e => setBakeryName(e.target.value)} placeholder="My Home Bakery" style={s.input} />
              <div style={{ marginTop: 12 }}>
                <label style={s.label}>Bakery Logo</label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {bakeryLogo
                    ? <img src={bakeryLogo} alt="logo" style={{ width: 72, height: 72, borderRadius: 14, objectFit: "cover", border: `2px solid ${C.border}` }} />
                    : <div style={{ width: 72, height: 72, borderRadius: 14, background: C.light, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, border: `2px dashed ${C.border}` }}>🧁</div>
                  }
                  <div>
                    <PhotoUpload value={null} onChange={v => setBakeryLogo(v)} small />
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Tap to upload your logo</div>
                    {bakeryLogo && <button onClick={() => setBakeryLogo(null)} style={{ ...s.btnSec, padding: "4px 10px", fontSize: 11, marginTop: 6 }}>Remove</button>}
                  </div>
                </div>
              </div>
              <button onClick={saveSettings} style={{ ...s.btn, marginTop: 14 }}>{settingsSaved ? "✓ Saved!" : "Save Branding"}</button>
            </div>
            <div style={s.card}>
              <div style={{ fontWeight: "bold", color: C.accent, marginBottom: 8 }}>🤖 AI Features</div>
              <div style={{ background: C.light, borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 13, color: C.mid, lineHeight: 1.6 }}>
                <strong style={{ color: C.dark }}>Get your free Anthropic API key:</strong><br />
                1. Go to <strong>console.anthropic.com</strong><br />
                2. Sign up → API Keys → Create Key<br />
                3. Paste it below
              </div>
              <label style={s.label}>Your API Key</label>
              <input type="password" placeholder="sk-ant-..." value={apiKey} onChange={e => setApiKey(e.target.value)} style={s.input} />
              <button onClick={() => saveApiKey(apiKey)} style={{ ...s.btn, marginTop: 10 }}>{apiKeySaved ? "✓ Saved!" : "Save API Key"}</button>
              {apiKey && <div style={{ fontSize: 12, color: "#10b981", marginTop: 8 }}>✓ AI features enabled!</div>}
            </div>
            <div style={s.card}>
              <div style={{ fontWeight: "bold", color: C.accent, marginBottom: 8 }}>👤 Account</div>
              <div style={{ fontSize: 13, color: C.mid, marginBottom: 12 }}>Signed in as <strong>{session.user.email}</strong></div>
              <button onClick={() => supabase.auth.signOut()} style={s.btnSec}>Sign Out</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

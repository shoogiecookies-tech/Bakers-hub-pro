import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import ThemeSwitcher from "./ThemeSwitcher";
import { Store, DollarSign, Palette, ShieldAlert, CreditCard, ShoppingBag, Search, Edit3, FileText, Printer, Mail, Trash2, Calendar, Plus, Check, Filter, Info, Sparkles, Archive, Camera, Heart, Bookmark, Send, Music, Eye, MessageSquare, BookOpen, Scale, Calculator, Coins, AlertCircle, TrendingUp, Settings, Shield, Gift, Users, Database, Download, AlertTriangle, BarChart3, Crown, Clock, ListX } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

// ─── COLORS & STYLES ──────────────────────────────────────────────────────────
const C = {
  bg: "#d4cab8", card: "#f5f0e8", accent: "#BC3B52", dark: "#1e2d4a",
  caramel: "#b87d3a", light: "#f5ede0", border: "#c8b89a", text: "#1e2d4a", muted: "#5c4f3d", mid: "#3d2e1e",
};
const s = {
  card: { background: C.card, borderRadius: 16, padding: 16, boxShadow: "0 2px 16px rgba(124,58,30,0.07)", border: `1px solid ${C.border}`, marginBottom: 12 },
  input: { width: "100%", padding: "9px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, outline: "none", background: C.bg, color: C.text, boxSizing: "border-box", fontFamily: "'Inter', sans-serif" },
  btn: { padding: "9px 18px", borderRadius: 22, border: "none", background: "#BC3B52", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: "700", letterSpacing: 0.3, fontFamily: "'Inter', sans-serif" },
  btnSec: { padding: "9px 18px", borderRadius: 22, border: `1.5px solid #E0AEB8`, background: "#fff", color: C.accent, cursor: "pointer", fontSize: 13, fontWeight: "600", fontFamily: "'Inter', sans-serif" },
  label: { fontSize: 12, color: C.muted, letterSpacing: 0.8, textTransform: "uppercase", display: "block", marginBottom: 4 },
  tag: (color) => ({ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: color + "22", color, fontWeight: "700", letterSpacing: 0.5, display: "inline-block" }),
};

// Tailwind classes (Phase-1 theme tokens) for the Phase-2-ported Bakery Profile section only.
// Rest of the app still uses the inline C/s style objects above until it's ported tab-by-tab.
const tw = {
  card: "p-6 rounded-card bg-card border border-border shadow-card",
  section: "text-[11px] font-label font-bold uppercase text-foreground/50 tracking-wider",
  eyebrow: "block text-[10px] font-label font-bold uppercase text-foreground/50 mb-1.5",
  input: "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground outline-none font-body",
  btn: "px-5 py-2 bg-accent text-white font-bold rounded-lg text-xs font-body cursor-pointer hover:opacity-90 transition-opacity",
  btnSec: "px-4 py-1.5 rounded-full text-xs font-bold font-body cursor-pointer border transition-colors",
};

const TABS = ["Dashboard", "Pantry", "Recipes", "Pricing", "Orders", "Schedule", "Social", "Bakery Profile", "Settings", "Admin"];
const STATUS_COLORS = { Pending: "#b87d3a", "In Progress": "#BC3B52", Complete: "#5a7a5c", Invoiced: "#7a6a58", Delivered: "#5c4f3d", Declined: "#8a8a8a" };
const STATUS_LIST = ["Pending", "In Progress", "Complete", "Invoiced", "Delivered"];

// Payment tracking (deposits/balance) is a SEPARATE system from fulfillment status above —
// never merge these into STATUS_LIST/STATUS_COLORS.
const PAYMENT_STATUS_COLORS = { "Unpaid": "#8a8a8a", "Deposit Paid": "#b87d3a", "Paid in Full": "#5a7a5c" };
const PAYMENT_METHODS = ["Venmo", "PayPal", "Zelle", "Cash", "Other"];
const ORDER_TYPES = ["Real", "Test", "Comped", "Donation"];
const ACTIVE_STATUSES = ["In Progress", "Complete", "Invoiced"];
const ORDER_STATUS_FILTERS = ["Pending", "Active", "Completed", "Declined", "All"];
function matchesOrderStatusFilter(status, filter) {
  if (filter === "All") return true;
  if (filter === "Pending") return status === "Pending";
  if (filter === "Active") return ACTIVE_STATUSES.includes(status);
  if (filter === "Completed") return status === "Delivered";
  if (filter === "Declined") return status === "Declined";
  return false;
}
const CATEGORIES = ["Cookies", "Cakes & Cupcakes", "Bars", "Breads", "Pastries", "Candy & Confections", "Other"];
const CATEGORY_REMAP = { Cakes: "Cakes & Cupcakes", Cupcakes: "Cakes & Cupcakes", Bread: "Breads" };
const normalizeRecipeCategory = (cat) => CATEGORY_REMAP[cat] || cat;
const PLATFORMS = ["Instagram", "Facebook", "TikTok", "Pinterest"];
const POST_TYPES = ["Product Photo", "Behind the Scenes", "Recipe Tip", "Testimonial", "Promo/Sale", "Seasonal"];
const PANTRY_CATS = ["Flour & Grains", "Dairy", "Eggs & Fats", "Sweeteners", "Leavening", "Flavoring", "Chocolate", "Fruits & Nuts", "Packaging", "Other"];
const UNITS = ["cups", "tbsp", "tsp", "oz", "lbs", "g", "kg", "ml", "l", "pcs", "dozen", "bag", "box"];
const ALLERGENS = ["Milk", "Eggs", "Fish", "Crustacean Shellfish", "Tree Nuts", "Peanuts", "Wheat", "Soybeans", "Sesame"];
// ─── COMPLIANCE LABEL ENGINE ─────────────────────────────────────────────────
// Ported from the public bakeflo.io/texas-label-generator so the paid app is a
// superset of the free tool. mode 'sheet' tiles across a Letter page at exact
// Avery die coordinates; mode 'single' emits one label sized to the stock.
const LABEL_SIZES = [
  { value: "5163",    group: "Avery sheet labels (tiled PDF)",              label: 'Avery 5163 / 8163 / 5263 — 2" × 4" (10 per sheet)', mode: "sheet",  w: 4,    h: 2,    cols: 2, rows: 5, left: 0.15625, top: 0.5, hpitch: 4.1875, vpitch: 2.0,  round: false, desc: "PDF tiles your label onto a full Avery 5163 / 8163 sheet — 10 per page. PNG is a single 300 DPI sticker." },
  { value: "5164",    group: "Avery sheet labels (tiled PDF)",              label: 'Avery 5164 / 8164 — 3⅓" × 4" (6 per sheet)',        mode: "sheet",  w: 4,    h: 3.33, cols: 2, rows: 3, left: 0.15625, top: 0.5, hpitch: 4.1875, vpitch: 3.33, round: false, desc: "PDF tiles your label onto a full Avery 5164 / 8164 sheet — 6 per page. PNG is a single 300 DPI sticker." },
  { value: "th4x2",   group: "Thermal / roll / cut-your-own (single label)", label: 'Thermal roll — 4" × 2" (Rollo / Zebra)',            mode: "single", w: 4,    h: 2,    round: false, desc: "One 4″×2″ label sized for your thermal roll (Rollo / Zebra)." },
  { value: "th3x2",   group: "Thermal / roll / cut-your-own (single label)", label: 'Thermal roll — 3" × 2"',                            mode: "single", w: 3,    h: 2,    round: false, desc: "One 3″×2″ label sized for your thermal roll." },
  { value: "th2x2",   group: "Thermal / roll / cut-your-own (single label)", label: 'Thermal roll — 2" × 2"',                            mode: "single", w: 2,    h: 2,    round: false, desc: "One 2″×2″ label sized for your thermal roll." },
  { value: "th225",   group: "Thermal / roll / cut-your-own (single label)", label: 'Thermal roll — 2.25" × 1.25"',                      mode: "single", w: 2.25, h: 1.25, round: false, desc: "One 2.25″×1.25″ label for your thermal roll. Tight — text auto-shrinks." },
  { value: "round2",  group: "Thermal / roll / cut-your-own (single label)", label: 'Round sticker — 2" (Cricut / cut-your-own)',        mode: "single", w: 2,    h: 2,    round: true,  desc: "One 2″ round sticker. Best for Cricut print-then-cut or cut-your-own." },
  { value: "round25", group: "Thermal / roll / cut-your-own (single label)", label: 'Round sticker — 2.5" (Cricut / cut-your-own)',      mode: "single", w: 2.5,  h: 2.5,  round: true,  desc: "One 2.5″ round sticker. Best for Cricut print-then-cut or cut-your-own." },
  { value: "box",     group: "Thermal / roll / cut-your-own (single label)", label: '4" × 6" Detailed Box Label',                        mode: "single", w: 4,    h: 6,    round: false, desc: "Fits pastry box lids and larger packaging with full compliance details." },
];
const LABEL_SIZE_GROUPS = [...new Set(LABEL_SIZES.map(s => s.group))];
const LABEL_DPI = 300;
const LABEL_NONINSPECTION = "THIS PRODUCT WAS PRODUCED IN A PRIVATE RESIDENCE THAT IS NOT SUBJECT TO GOVERNMENTAL LICENSING OR INSPECTION.";
const LABEL_REFRIGERATE = "KEEP REFRIGERATED AT 41°F OR BELOW.";
const LABEL_SAFE_HANDLING = "SAFE HANDLING INSTRUCTIONS: To prevent illness from bacteria, keep this food refrigerated or frozen until the food is prepared for consumption.";

function labelWrapLines(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) { out.push(""); continue; }
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = w; }
      else line = test;
    }
    if (line) out.push(line);
  }
  return out;
}

function labelDrawSpaced(ctx, text, cx, y, sp) {
  const widths = [...text].map(ch => ctx.measureText(ch).width + sp);
  const tot = widths.reduce((a, b) => a + b, 0) - sp;
  let x = cx - tot / 2;
  const prevAlign = ctx.textAlign; ctx.textAlign = "left";
  for (let i = 0; i < text.length; i++) { ctx.fillText(text[i], x, y); x += widths[i]; }
  ctx.textAlign = prevAlign;
}

// Draw one label onto ctx sized W x H pixels. `d` is the gathered label data.
function drawComplianceLabel(ctx, W, H, d, spec) {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#ffffff";
  if (spec.round) {
    const r = Math.min(W, H) / 2 - 1;
    ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2); ctx.fill();
    // Dashed cut line — Cricut print-then-cut reads this, and it makes the
    // round stock unmistakable on screen without relying on CSS clipping.
    ctx.save();
    ctx.lineWidth = Math.max(2, W * 0.008);
    ctx.strokeStyle = "#22303C";
    ctx.setLineDash([W * 0.02, W * 0.014]);
    ctx.beginPath(); ctx.arc(W / 2, H / 2, r - ctx.lineWidth, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2); ctx.clip();
  } else {
    ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = Math.max(1.5, W * 0.004); ctx.strokeStyle = "#E2DCD0";
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
  }
  const cx = W / 2;
  const padX = spec.round ? W * 0.15 : W * 0.06;
  const padY = spec.round ? H * 0.15 : H * 0.075;
  const contentW = W - padX * 2;
  const lh = m => m * 1.2;
  const setFont = (weight, size) => { ctx.font = `${weight} ${size}px -apple-system,'Segoe UI',Roboto,Arial,sans-serif`; };

  const parts = [];
  if (d.quickIdOnly) {
    parts.push({ t: d.quickIdText || "", weight: d.quickIdBold ? "800" : "500", c: "#22303C", rel: 1.00, mt: 0.00, ls: 0 });
  } else {
    parts.push({ t: d.food, weight: "800", c: "#22303C", rel: 1.00, mt: 0.00, ls: 0 });
    parts.push({ t: d.op,   weight: "700", c: "#BC5A34", rel: 0.60, mt: 0.14, ls: 0 });
    if (d.desc) parts.push({ t: d.desc, weight: "500", c: "#6B7280", rel: 0.46, mt: 0.05, ls: 0 });
    parts.push({ t: d.idline, weight: "500", c: "#3A4A57", rel: 0.50, mt: 0.05, ls: 0 });
    if (d.allergens && d.allergens.length) {
      parts.push({ t: "ALLERGENS: " + d.allergens.join(", ").toUpperCase(), weight: "700", c: "#22303C", rel: 0.50, mt: 0.16, ls: 0.3 });
    }
    if (d.ingredients) parts.push({ t: "INGREDIENTS: " + d.ingredients, weight: "500", c: "#4A5A66", rel: 0.40, mt: 0.08, ls: 0 });
    if (d.tcs) {
      parts.push({ t: d.madeon || "MADE ON: ______", weight: "700", c: "#9E4626", rel: 0.50, mt: 0.12, ls: 0 });
      parts.push({ t: LABEL_REFRIGERATE, weight: "700", c: "#9E4626", rel: 0.50, mt: 0.06, ls: 0.2 });
      parts.push({ t: LABEL_SAFE_HANDLING, weight: "600", c: "#4A5A66", rel: 0.40, mt: 0.08, ls: 0 });
    } else if (d.madeon) {
      parts.push({ t: d.madeon, weight: "500", c: "#6B7280", rel: 0.46, mt: 0.06, ls: 0 });
    }
    if (d.pcf) parts.push({ t: "BATCH #: " + (d.batch || "______"), weight: "700", c: "#22303C", rel: 0.46, mt: 0.10, ls: 0 });
    parts.push({ t: LABEL_NONINSPECTION, weight: "600", c: "#4A5A66", rel: 0.42, mt: 0.18, ls: 0.2 });
  }

  // Auto-fit: shrink the base size until the whole block fits vertically.
  const availH = H - padY * 2;
  let base = Math.min(W, H) * (spec.round ? 0.13 : 0.16);
  const minBase = Math.min(W, H) * 0.035;
  let layout = [], total = 0;
  for (let i = 0; i < 60; i++) {
    total = 0; layout = [];
    for (const p of parts) {
      const size = base * p.rel;
      setFont(p.weight, size);
      const lines = labelWrapLines(ctx, p.t, contentW);
      const blockH = lines.length * lh(size);
      total += base * p.mt + blockH;
      layout.push({ p, size, lines });
    }
    if (total <= availH || base <= minBase) break;
    base *= 0.94;
  }

  let y = padY + Math.max(0, (availH - total) / 2);
  for (const L of layout) {
    y += base * L.p.mt;
    setFont(L.p.weight, L.size);
    ctx.fillStyle = L.p.c; ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (const ln of L.lines) {
      if (L.p.ls) labelDrawSpaced(ctx, ln, cx, y, L.p.ls * (L.size / 16));
      else ctx.fillText(ln, cx, y);
      y += lh(L.size);
    }
  }
  ctx.restore();
}

// Offscreen 300 DPI bitmap of the current label, for PNG/PDF export.
function labelBitmap(d, spec) {
  const pxW = Math.round(spec.w * LABEL_DPI), pxH = Math.round(spec.h * LABEL_DPI);
  const c = document.createElement("canvas"); c.width = pxW; c.height = pxH;
  drawComplianceLabel(c.getContext("2d"), pxW, pxH, d, spec);
  return c;
}

// Live 300 DPI preview of the current label.
function LabelCanvas({ data, spec }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const pxW = Math.round(spec.w * LABEL_DPI), pxH = Math.round(spec.h * LABEL_DPI);
    cv.width = pxW; cv.height = pxH;
    drawComplianceLabel(cv.getContext("2d"), pxW, pxH, data, spec);
  });
  const cssW = Math.min(420, spec.w * 120);
  const cssH = cssW * (spec.h / spec.w);
  return (
    <div
      style={{
        width: cssW,
        height: cssH,
        borderRadius: spec.round ? "50%" : 8,
        overflow: "hidden",
        background: "#fff",
        boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
        flex: "0 0 auto",
      }}
    >
      <canvas ref={ref} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}

// ─── PASSWORD TOGGLE ─────────────────────────────────────────────────────────
function EyeIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>; }
function EyeOffIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>; }
function PwField({ value, onChange, placeholder, show, onToggle, onKeyDown }) {
  return (
    <div className="relative">
      <input type={show ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder || "••••••••"} className={`${tw.input} pr-10`} onKeyDown={onKeyDown} />
      <button type="button" onClick={onToggle} tabIndex={-1} className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-foreground/40 hover:text-foreground/70 p-0.5 flex items-center transition-colors">
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
// SVG presentation attributes (fill="...", stroke="...") don't reliably resolve
// CSS var() the way actual `style` properties do — resolve to a literal value instead.
function cssVar(name, fallback) {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}
function formatPhone(v) {
  const d = v.replace(/\D/g, "").slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0,3)}) ${d.slice(3)}`;
  return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
}
function slugify(v) {
  return (v || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
function mapOrderWithItems(o) {
  return {
    ...o,
    items: (o.order_items || []).map(li => ({ id: li.id, item: li.item, size: li.size, flavor: li.flavor, quantity: li.quantity, price: li.price })),
  };
}
function groupPaymentsByOrder(payments) {
  const map = {};
  for (const p of payments || []) {
    (map[p.order_id] = map[p.order_id] || []).push(p);
  }
  return map;
}
function orderItemsSummary(order) {
  return (order.items || []).map(li => li.item).filter(Boolean).join(", ");
}
function orderMatchesSearchQuery(order, q) {
  if (!q) return true;
  const query = q.toLowerCase();
  return order.customer?.toLowerCase().includes(query) || (order.items || []).some(li => li.item?.toLowerCase().includes(query));
}
function formatPlacedDate(createdAt) {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function daysWaiting(createdAt) {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return null;
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((today - start) / 86400000);
}
const WEIGHT_G = { g: 1, kg: 1000, oz: 28.3495, lbs: 453.592 };
const VOLUME_CUP = { cups: 1, tbsp: 1/16, tsp: 1/48, ml: 1/236.588, l: 1000/236.588 };
const COUNT_PCS = { pcs: 1, dozen: 12 };
const UNIT_SYNONYMS = {
  cup: "cups",
  tablespoon: "tbsp", tablespoons: "tbsp",
  teaspoon: "tsp", teaspoons: "tsp",
  ounce: "oz", ounces: "oz",
  lb: "lbs", pound: "lbs", pounds: "lbs",
  gram: "g", grams: "g",
  kilogram: "kg", kilograms: "kg",
  milliliter: "ml", milliliters: "ml",
  liter: "l", liters: "l", litre: "l",
  pc: "pcs", piece: "pcs", pieces: "pcs",
  doz: "dozen",
  bags: "bag",
  boxes: "box",
};
function normalizeUnit(u) {
  if (!u) return u;
  const n = String(u).trim().toLowerCase();
  return UNIT_SYNONYMS[n] || n;
}
function unitFamily(u) {
  u = normalizeUnit(u);
  if (WEIGHT_G[u] != null) return "weight";
  if (VOLUME_CUP[u] != null) return "volume";
  if (COUNT_PCS[u] != null) return "count";
  return null;
}
function unitToBase(amount, unit) {
  unit = normalizeUnit(unit);
  if (WEIGHT_G[unit] != null) return amount * WEIGHT_G[unit];   // grams
  if (VOLUME_CUP[unit] != null) return amount * VOLUME_CUP[unit]; // cups
  if (COUNT_PCS[unit] != null) return amount * COUNT_PCS[unit];  // pcs
  return null;
}
const SEED_DENSITY = [
  { match: ["bread flour"], g: 120 },
  { match: ["cake flour"], g: 114 },
  { match: ["powdered sugar", "confectioner"], g: 120 },
  { match: ["brown sugar"], g: 220 },
  { match: ["granulated sugar", "white sugar"], g: 200 },
  { match: ["cocoa"], g: 85 },
  { match: ["sourdough starter", "starter"], g: 240 },
  { match: ["butter"], g: 227 },
  { match: ["water"], g: 237 },
  { match: ["milk"], g: 240 },
  { match: ["oil"], g: 218 },
  { match: ["honey"], g: 340 },
  { match: ["chocolate chip", "choc chip"], g: 170 },
  { match: ["sugar"], g: 200 },
  { match: ["flour"], g: 120 },
];
function suggestDensity(name) {
  if (!name) return null;
  const n = name.trim().toLowerCase();
  for (const s of SEED_DENSITY) if (s.match.some(m => n.includes(m))) return s.g;
  return null;
}
function calcIngCost(ing, pantry) {
  const item = pantry.find(p => Number(p.id) === Number(ing.pantryId))
    || pantry.find(p => p.name && ing.name && p.name.trim().toLowerCase() === ing.name.trim().toLowerCase());
  if (!item) return null;
  const costPer = item.costPer;
  const pantryUnit = item.unit;
  const recipeUnit = ing.unit || item.unit;
  const density = item.gramsPerCup ?? item.grams_per_cup ?? null;
  const rf = unitFamily(recipeUnit), pf = unitFamily(pantryUnit);
  if (!rf || !pf) return null;
  const baseR = unitToBase(ing.amount, recipeUnit);
  const baseP = unitToBase(1, pantryUnit);
  if (baseR == null || baseP == null || baseP === 0) return null;
  if (rf === pf) return costPer * (baseR / baseP);
  // crossing families: count can't cross to weight/volume
  if ((rf === "count") !== (pf === "count")) return null;
  // one weight, one volume -> needs density
  const resolvedDensity = density ?? suggestDensity(item.name);
  if (!resolvedDensity) return null;
  const toG = (base, fam) => fam === "weight" ? base : base * resolvedDensity; // weight base already grams; volume base is cups
  const rG = toG(baseR, rf), pG = toG(baseP, pf);
  if (pG === 0) return null;
  return costPer * (rG / pG);
}
function calcRecipeCost(recipe, pantry) {
  return recipe.ingredients.reduce((sum, ing) => sum + (calcIngCost(ing, pantry) || 0), 0);
}
function ingDisplayName(ing, pantry) {
  return ing.name || pantry.find(p => Number(p.id) === Number(ing.pantryId))?.name || "";
}
function orderDayLabel(due) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(due); d.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 1) return "tomorrow's";
  const day = d.getDay();
  if (day === 0 || day === 6) return "this weekend's";
  if (diff >= 2 && diff <= 6) return `${["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][day]}'s`;
  return "upcoming";
}

function generateTasksFromOrder(order) {
  const items = order.items || [];
  if (items.length === 0 || !order.due) return [];
  const due = new Date(order.due + "T12:00:00");
  const day = orderDayLabel(order.due);
  const add = (daysBefore, task) => {
    const d = new Date(due);
    d.setDate(d.getDate() - daysBefore);
    return { date: d.toISOString().split("T")[0], task, done: false, auto: true, order_id: order.id };
  };
  // 5 tasks per line item. Single-item orders keep the original task text
  // unchanged; multi-item orders get a "(item)" suffix on the generic tasks
  // so each item's block is distinguishable in the Schedule.
  const suffix = items.length > 1 ? (name) => ` (${name})` : () => "";
  return items.flatMap(li => [
    add(5, `Prep ingredients for ${day} order — ${order.customer}${suffix(li.item)}`),
    add(3, `Prep dough for ${day} bake — ${order.customer}${suffix(li.item)}`),
    add(3, `Bake "${li.item}" — ${order.customer}`),
    add(2, `Final decorate and prep — ${order.customer}${suffix(li.item)}`),
    add(0, `Package & deliver "${li.item}" to ${order.customer}`),
  ]);
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
    body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: maxTokens, messages })
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text || "";
}
async function aiCaption(platform, type) {
  return callAI([{ role: "user", content: `You are a social media expert for a home bakery. Write an engaging ${platform} caption for a ${type} post. Warm, authentic, under 150 words, 1-2 emojis, a call to action, and 3-5 hashtags. Return ONLY the caption text.` }]);
}
async function aiScheduleSuggestions(orders) {
  const list = orders.filter(o => o.status !== "Delivered" && o.status !== "Declined").map(o => `- ${orderItemsSummary(o)} for ${o.customer}, due ${o.due}`).join("\n");
  if (!list) return [];
  const text = await callAI([{ role: "user", content: `Home bakery open orders:\n${list}\n\nSuggest 3 extra prep or business tasks (NOT standard bake/deliver tasks). Return ONLY a JSON array: [{"task":"...","daysFromNow":1},...]. No markdown.` }], 800);
  try { return JSON.parse(text); } catch { return []; }
}
async function aiOrderConfirmation(order, bakeryName) {
  const itemsList = (order.items || []).map(li => `- ${li.item}${li.quantity && li.quantity !== 1 ? ` (x${li.quantity})` : ""}${li.size ? `, ${li.size}` : ""}${li.flavor ? `, ${li.flavor}` : ""}`).join("\n");
  return callAI([{ role: "user", content: `You are a warm, professional home baker writing a customer order confirmation email.\nBakery: ${bakeryName}\nCustomer: ${order.customer}\nItems:\n${itemsList}\nDue: ${order.due}\nTotal: $${order.total}\nNotes: ${order.notes || "none"}\nWrite a friendly confirmation email. Return ONLY the email body, no subject line.` }]);
}

// ─── PHOTO UPLOAD ─────────────────────────────────────────────────────────────
function PhotoUpload({ value, onChange, small }) {
  const ref = useRef();
  return (
    <div onClick={() => ref.current.click()} style={{
      width: small ? 60 : "100%", height: small ? 60 : 150,
      borderRadius: small ? 10 : 14, border: `1.5px dashed rgba(200,184,154,0.55)`,
      background: value ? "transparent" : (small ? C.light : "#f9f5ef"), cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden", flexShrink: 0,
    }}>
      {value
        ? <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <div style={{ textAlign: "center", color: C.muted, opacity: 0.7 }}>
            <div style={{ fontSize: small ? 18 : 26 }}>📷</div>
            {!small && <div style={{ fontSize: 11, marginTop: 6, letterSpacing: 0.4 }}>Add Photo</div>}
          </div>
      }
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => onChange(ev.target.result); r.readAsDataURL(f); }} />
    </div>
  );
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [mode,           setMode]           = useState("login"); // login | signup | reset
  const [email,          setEmail]          = useState("");
  const [password,       setPassword]       = useState("");
  const [loading,        setLoading]        = useState(false);
  const [msg,            setMsg]            = useState("");
  const [error,          setError]          = useState("");
  const [gateError,      setGateError]      = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [showPw,         setShowPw]         = useState(false);
  const [isDarkTheme] = useState(() => (localStorage.getItem("bakeflo_theme") || "cozy") === "dark");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      setCheckoutSuccess(true);
      setMode("signup");
    }
  }, []);

  const clearAlerts = () => { setError(""); setMsg(""); setGateError(false); };

  const handle = async () => {
    setLoading(true); clearAlerts();
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onLogin();
      } else if (mode === "signup") {
        const normalizedEmail = email.trim().toLowerCase();
        const { data: rows, error: lookupError } = await supabase
          .from("paid_users")
          .select("id")
          .eq("email", normalizedEmail)
          .limit(1);
        const paidUser = !lookupError && rows && rows.length > 0 ? rows[0] : null;
        if (!paidUser) {
          setGateError(true);
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({ email: normalizedEmail, password });
        if (error) throw error;
        fetch("/api/send-welcome", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail }),
        }).catch(() => {});
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
    <div className="min-h-screen flex flex-col items-center justify-center p-5 font-body bg-background">
      {mode !== "login" && (
        <div className="text-center mb-6">
          <span className="text-foreground/60 text-[15px]">Returning member?</span>
          {" "}
          <button onClick={() => { setMode("login"); clearAlerts(); }} className="bg-transparent border-none text-accent cursor-pointer text-[15px] font-bold underline underline-offset-4 p-0">
            Log in here →
          </button>
        </div>
      )}
      <div className={`${tw.card} w-full max-w-[380px] !p-8 !rounded-3xl !shadow-2xl`}>
        <div className="text-center mb-7">
          <img src={isDarkTheme ? "/brand/BakeFlo_Icon_Cream.svg" : "/brand/BakeFlo_Icon_Navy.svg"} alt="BakeFlo" className="h-12 mb-2 inline-block" />
          <div className="text-2xl font-bold text-foreground font-display">BakeFlo</div>
          <div className="text-sm text-foreground/50 mt-1">Your home bakery business manager</div>
          {mode === "login" && <div className="text-sm text-foreground mt-2.5 font-medium">Welcome back! Log in to your account.</div>}
        </div>

        {checkoutSuccess && (
          <div className="bg-info/10 border border-info/25 rounded-lg px-3.5 py-2.5 text-sm text-info mb-3.5">
            <strong>Important:</strong> When creating your account, use this email address. Sign up at bakeflo.co
          </div>
        )}
        {msg      && <div className="bg-success/10 border border-success/25 rounded-lg px-3.5 py-2.5 text-sm text-success mb-3.5">{msg}</div>}
        {error    && <div className="bg-danger/10 border border-danger/25 rounded-lg px-3.5 py-2.5 text-sm text-danger mb-3.5">{error}</div>}
        {gateError && (
          <div className="bg-danger/10 border border-danger/25 rounded-lg px-3.5 py-2.5 text-sm text-danger mb-3.5">
            This email hasn't been used to purchase BakeFlo. Please{" "}
            <a href="https://buy.stripe.com/aFaaEWeHvaRT1aq7w04ko00" target="_blank" rel="noopener noreferrer" className="text-danger font-bold underline">purchase at bakeflo.io</a>
            , then sign up using the same email.
          </div>
        )}

        <div className="mb-3">
          <label className={tw.eyebrow}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className={tw.input} />
          {mode === "signup" && (
            <p className="text-xs text-foreground/50 mt-1 font-body">Use the email address you purchased with</p>
          )}
        </div>

        {mode !== "reset" && (
          <div className="mb-5">
            <label className={tw.eyebrow}>Password</label>
            <PwField value={password} onChange={e => setPassword(e.target.value)} show={showPw} onToggle={() => setShowPw(p => !p)} onKeyDown={e => e.key === "Enter" && handle()} />
          </div>
        )}

        <button onClick={handle} disabled={loading} className={`${tw.btn} w-full !py-3.5 text-sm`}>
          {loading ? "Please wait..." : mode === "login" ? "Log In" : mode === "signup" ? "Create Account" : "Send Reset Email"}
        </button>

        <div className="mt-5 text-center text-sm">
          {mode === "login" && <>
            <span className="text-foreground/50">New here? </span>
            <button onClick={() => { setMode("signup"); clearAlerts(); }} className="bg-transparent border-none text-accent cursor-pointer font-bold font-body">Create account</button>
            <div className="mt-2">
              <button onClick={() => { setMode("reset"); clearAlerts(); }} className="bg-transparent border-none text-foreground/50 cursor-pointer text-xs font-body">Forgot password?</button>
            </div>
          </>}
          {mode === "signup" && <>
            <span className="text-foreground/50">Already have an account? </span>
            <button onClick={() => { setMode("login"); clearAlerts(); }} className="bg-transparent border-none text-accent cursor-pointer font-bold font-body">Log in</button>
          </>}
          {mode === "reset" && (
            <button onClick={() => { setMode("login"); clearAlerts(); }} className="bg-transparent border-none text-accent cursor-pointer font-body">Back to login</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PUBLIC ORDER INTAKE FORM (no auth) ────────────────────────────────────────
function _localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function OrderDatePicker({ value, onChange, minDateStr, blackoutDates, fullyBookedDates }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const initial = minDateStr ? new Date(minDateStr + "T00:00:00") : today;
  const [viewYear,  setViewYear]  = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startWeekday = firstOfMonth.getDay();
  const monthLabel = firstOfMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const canGoPrev = viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth > today.getMonth());

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);

  const goPrev = () => { const d = new Date(viewYear, viewMonth - 1, 1); setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); };
  const goNext = () => { const d = new Date(viewYear, viewMonth + 1, 1); setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={goPrev} disabled={!canGoPrev} className="px-2.5 py-1 rounded-lg border border-border text-foreground/60 disabled:opacity-30 disabled:cursor-not-allowed">‹</button>
        <div className="text-sm font-bold text-foreground">{monthLabel}</div>
        <button type="button" onClick={goNext} className="px-2.5 py-1 rounded-lg border border-border text-foreground/60">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-foreground/40 uppercase mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const dateStr = _localDateStr(new Date(viewYear, viewMonth, day));
          const isPast = minDateStr ? dateStr < minDateStr : false;
          const isBlackout = blackoutDates.includes(dateStr);
          const isFull = fullyBookedDates.includes(dateStr);
          const disabled = isPast || isBlackout || isFull;
          const isSelected = value === dateStr;
          const title = isBlackout ? "Unavailable" : isFull ? "Fully booked" : isPast ? "Too soon" : undefined;
          return (
            <button
              type="button"
              key={i}
              title={title}
              disabled={disabled}
              onClick={() => onChange(dateStr)}
              className={`text-xs py-1.5 rounded-lg transition-colors ${
                isSelected ? "bg-accent text-white font-bold"
                : disabled ? "text-foreground/20 cursor-not-allowed line-through"
                : "text-foreground hover:bg-background border border-transparent hover:border-border"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-2 text-[10px] text-foreground/40">
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent inline-block" />Selected</span>
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-foreground/20 inline-block" />Unavailable</span>
      </div>
    </div>
  );
}

function PublicOrderForm({ slug }) {
  const [config,     setConfig]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [notFound,   setNotFound]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error,      setError]      = useState("");

  const [form, setForm] = useState({
    items: [{ item: "", size: "", quantity: 1, flavor: "" }], due: "",
    customer: "", phone: "", email: "", allergyNote: "", notes: "",
  });

  const addFormItemRow = () => setForm(f => ({ ...f, items: [...f.items, { item: "", size: "", quantity: 1, flavor: "" }] }));
  const removeFormItemRow = (idx) => setForm(f => ({ ...f, items: f.items.length <= 1 ? f.items : f.items.filter((_, i) => i !== idx) }));
  const updateFormItemRow = (idx, field, value) => setForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, [field]: value } : it) }));

  useEffect(() => {
    fetch(`/api/order-form?slug=${encodeURIComponent(slug)}`)
      .then(r => { if (!r.ok) throw new Error("not found"); return r.json(); })
      .then(data => setConfig(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const minDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + (config?.leadDays ?? 0));
    return d.toISOString().split("T")[0];
  };

  const canSubmit = form.items.some(it => it.item.trim()) && form.customer.trim() && (form.phone.trim() || form.email.trim()) && form.due;

  const handleSubmit = async () => {
    setError("");
    if (!canSubmit) { setError("Please add at least one item, and fill in your name, a date, and a phone or email."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/submit-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, ...form, items: form.items.filter(it => it.item.trim()) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not submit request. Please try again.");
      setSubmitted(true);
    } catch (e) {
      setError(e.message);
    }
    setSubmitting(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center font-body bg-background text-foreground">🧁 Loading...</div>
  );

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5 font-body bg-background text-center">
      <div className="text-5xl mb-3">🧁</div>
      <div className="text-lg font-bold text-foreground font-display">This order form isn't available.</div>
      <div className="text-sm text-foreground/50 mt-1">Double-check the link with your baker.</div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5 font-body bg-background text-center">
      <div className={`${tw.card} w-full max-w-[420px] !p-8 !rounded-3xl !shadow-2xl`}>
        <div className="text-5xl mb-3">🎉</div>
        <div className="text-xl font-bold text-foreground font-display mb-2">Request received!</div>
        <div className="text-sm text-foreground/60">{config.bakeryName} will reply by email to confirm or decline.</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center p-5 font-body bg-background">
      <div className={`${tw.card} w-full max-w-[480px] !p-8 !rounded-3xl !shadow-2xl mt-6 mb-10`}>
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🧁</div>
          <div className="text-xl font-bold text-foreground font-display">{config.bakeryName}</div>
          <div className="text-sm text-foreground/50 mt-1">Order Request Form</div>
        </div>

        {error && <div className="bg-danger/10 border border-danger/25 rounded-lg px-3.5 py-2.5 text-sm text-danger mb-3.5">{error}</div>}

        <div className="flex flex-col gap-3.5">
          <div>
            <label className={tw.eyebrow}>Items *</label>
            <div className="flex flex-col gap-2.5">
              {form.items.map((it, idx) => (
                <div key={idx} className="bg-background rounded-lg border border-border p-3 flex flex-col gap-2.5">
                  <div className="flex gap-2 items-center">
                    {config.items.length > 0 ? (
                      <select value={it.item} onChange={e => updateFormItemRow(idx, "item", e.target.value)} className={`${tw.input} !flex-1`}>
                        <option value="">— Select an item —</option>
                        {config.items.map(i => <option key={i} value={i}>{i}</option>)}
                      </select>
                    ) : (
                      <input value={it.item} onChange={e => updateFormItemRow(idx, "item", e.target.value)} placeholder="What would you like to order?" className={`${tw.input} !flex-1`} />
                    )}
                    {form.items.length > 1 && (
                      <button type="button" onClick={() => removeFormItemRow(idx)} className="text-foreground/30 hover:text-danger px-1 text-lg leading-none shrink-0">×</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {config.sizes.length > 0 ? (
                      <select value={it.size} onChange={e => updateFormItemRow(idx, "size", e.target.value)} className={tw.input}>
                        <option value="">— Size —</option>
                        {config.sizes.map(sz => <option key={sz} value={sz}>{sz}</option>)}
                      </select>
                    ) : (
                      <input value={it.size} onChange={e => updateFormItemRow(idx, "size", e.target.value)} placeholder="Size (optional)" className={tw.input} />
                    )}
                    <input type="number" min="1" value={it.quantity} onChange={e => updateFormItemRow(idx, "quantity", e.target.value)} placeholder="Qty" className={tw.input} />
                  </div>
                  {config.flavors.length > 0 ? (
                    <select value={it.flavor} onChange={e => updateFormItemRow(idx, "flavor", e.target.value)} className={tw.input}>
                      <option value="">— Flavor —</option>
                      {config.flavors.map(fl => <option key={fl} value={fl}>{fl}</option>)}
                    </select>
                  ) : (
                    <input value={it.flavor} onChange={e => updateFormItemRow(idx, "flavor", e.target.value)} placeholder="Flavor (optional)" className={tw.input} />
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addFormItemRow} className={`${tw.btnSec} bg-background text-accent border-accent mt-2`}>+ Add another item</button>
          </div>

          <div>
            <label className={tw.eyebrow}>Date Needed *</label>
            <div className="bg-background rounded-lg border border-border p-3">
              <OrderDatePicker
                value={form.due}
                onChange={date => setForm(f => ({ ...f, due: date }))}
                minDateStr={minDate()}
                blackoutDates={config.blackoutDates || []}
                fullyBookedDates={config.fullyBookedDates || []}
              />
            </div>
            {form.due && <div className="text-xs text-foreground/60 mt-1.5">Selected: {new Date(form.due + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>}
            {config.leadDays > 0 && <div className="text-xs text-foreground/40 mt-1">Orders need at least {config.leadDays} day{config.leadDays === 1 ? "" : "s"} notice.</div>}
          </div>

          <div>
            <label className={tw.eyebrow}>Your Name *</label>
            <input value={form.customer} onChange={e => setForm(f => ({ ...f, customer: e.target.value }))} className={tw.input} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={tw.eyebrow}>Phone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: formatPhone(e.target.value) }))} className={tw.input} />
            </div>
            <div>
              <label className={tw.eyebrow}>Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={tw.input} />
            </div>
          </div>
          <div className="text-xs text-foreground/40 -mt-2">Please provide a phone or email so {config.bakeryName} can reach you.</div>

          <div>
            <label className={tw.eyebrow}>Allergy / Dietary Note</label>
            <textarea value={form.allergyNote} onChange={e => setForm(f => ({ ...f, allergyNote: e.target.value }))} className={tw.input} rows={2} placeholder="Optional" />
          </div>

          <div>
            <label className={tw.eyebrow}>Notes / Special Requests</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={tw.input} rows={2} placeholder="Optional" />
          </div>

          <button onClick={handleSubmit} disabled={submitting || !canSubmit} className={`${tw.btn} w-full !py-3 !text-sm mt-1 disabled:opacity-50`}>
            {submitting ? "Sending..." : "Send Request"}
          </button>
          <div className="text-xs text-foreground/40 text-center">This is a request only — no payment is collected now.</div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function BakersHubPro() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(() => window.location.hash.includes("type=recovery"));
  const [orderSlug] = useState(() => {
    const m = window.location.pathname.match(/^\/order\/([^/]+)\/?$/);
    return m ? decodeURIComponent(m[1]) : null;
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (orderSlug) return <PublicOrderForm slug={orderSlug} />;

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif", color: "#fff", fontSize: 18 }}>
      🧁 Loading...
    </div>
  );

  if (!session) return <LoginScreen onLogin={() => {}} />;

  return <AppInner session={session} onSignOut={() => setSession(null)} initialTab={recoveryMode ? "Settings" : "Dashboard"} />;
}

// ─── APP INNER (authenticated) ────────────────────────────────────────────────
function AppInner({ session, onSignOut, initialTab = "Dashboard" }) {
  const uid = session.user.id;
  const [tab, setTab] = useState(initialTab);

  const handleSignOut = () => {
    onSignOut();
    supabase.auth.signOut();
  };

  const [guideVisible, setGuideVisible] = useState(() => !localStorage.getItem("qsg_dismissed"));
  const [reportsOpen,  setReportsOpen]  = useState(false);
  // Chart colors are resolved from CSS vars via getComputedStyle (see cssVar()) since
  // SVG fill/stroke attributes don't reliably pick up var() themselves. That resolved
  // value needs to be re-read whenever the theme changes, but flipping data-theme is a
  // plain DOM mutation outside React — it won't trigger a re-render on its own, so
  // without this, chart colors would go stale if the theme is switched while Reports is open.
  const [, forceThemeRerender] = useState(0);
  useEffect(() => {
    const observer = new MutationObserver(() => forceThemeRerender(t => t + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  // Data
  const [pantry,   setPantry]   = useState([]);
  const [recipes,  setRecipes]  = useState([]);
  const [orders,   setOrders]   = useState([]);
  const [paymentsByOrder, setPaymentsByOrder] = useState({}); // { [order_id]: Payment[] }
  const [social,   setSocial]   = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [newPendingCount, setNewPendingCount] = useState(0);
  const seenPendingLinkIds = useRef(new Set());

  // Settings / Bakery Profile
  const [bakeryName,         setBakeryName]         = useState("My Home Bakery");
  const [bakeryLogo,         setBakeryLogo]         = useState(null);
  const [invoiceHeaderColor, setInvoiceHeaderColor] = useState("#1e2d4a");
  const [invoiceAccentColor, setInvoiceAccentColor] = useState("#BC3B52");
  const [venmo,       setVenmo]       = useState("");
  const [paypal,      setPaypal]      = useState("");
  const [zelle,       setZelle]       = useState("");
  const [acceptsCash, setAcceptsCash] = useState(false);
  const [otherPay,    setOtherPay]    = useState("");
  const [defaultLaborRate, setDefaultLaborRate] = useState(20);
  const [defaultMarkup,    setDefaultMarkup]    = useState(40);
  const [defaultOverhead,  setDefaultOverhead]  = useState(10);
  const [currency,         setCurrency]         = useState("USD");
  const [bakerState,       setBakerState]       = useState("");
  const [cottageLawState,        setCottageLawState]        = useState("TX");
  const [physicalAddress,        setPhysicalAddress]        = useState("");
  const [dshsRegistrationNumber, setDshsRegistrationNumber] = useState("");
  const [websiteUrl,             setWebsiteUrl]             = useState("");
  const [useDshsReg,             setUseDshsReg]             = useState(false);
  const [apiKey,      setApiKey]      = useState(() => localStorage.getItem("baker_api_key") || "");
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Order intake link
  const [orderSlug,        setOrderSlug]        = useState("");
  const [orderLeadDays,    setOrderLeadDays]    = useState(3);
  const [orderFormItems,   setOrderFormItems]   = useState([]);
  const [orderFormSizes,   setOrderFormSizes]   = useState([]);
  const [orderFormFlavors, setOrderFormFlavors] = useState([]);
  const [slugInput,        setSlugInput]        = useState("");
  const [slugStatus,       setSlugStatus]       = useState(""); // "", "checking", "available", "taken", "error"
  const [menuOptionInput,  setMenuOptionInput]  = useState({ items: "", sizes: "", flavors: "" });
  const [menuItemPriceInput, setMenuItemPriceInput] = useState("");
  const [variantInput,     setVariantInput]     = useState({}); // { [itemName]: draft label text }
  const [linkCopied,       setLinkCopied]       = useState(false);
  const [isPro,            setIsPro]            = useState(false);
  const [maxOrdersPerDay,  setMaxOrdersPerDay]  = useState("");
  const [blackoutDates,    setBlackoutDates]    = useState([]);
  const [blackoutDateInput, setBlackoutDateInput] = useState("");

  // Pantry UI
  const [showNewPantry, setShowNewPantry] = useState(false);
  const [editingPantry, setEditingPantry] = useState(null);
  const [editPantryForm, setEditPantryForm] = useState({});
  const [pantryFilter,  setPantryFilter]  = useState("All");
  const [pantrySearch,  setPantrySearch]  = useState("");
  const [newPantry,     setNewPantry]     = useState({ name: "", category: "Flour & Grains", storeCost: "", yields: "", unit: "cups", storeUnit: "", gramsPerCup: "" });

  // Recipes UI
  const [recipeSearch, setRecipeSearch] = useState("");
  const [selRecipe,   setSelRecipe]   = useState(null);
  const [scale,       setScale]       = useState(1);
  const [showNewRec,  setShowNewRec]  = useState(false);
  const [newRec,      setNewRec]      = useState({ name: "", category: "Cookies", servings: 12, ingredients: [], notes: "", photo: null, allergens: [], ingredientsList: "" });
  const [recIngInput, setRecIngInput] = useState({ pantryId: "", amount: "", unit: "cups" });
  const [editRec,       setEditRec]       = useState(null);
  const [editIngInput,  setEditIngInput]  = useState({ pantryId: "", amount: "", unit: "cups" });

  // Pricing
  const [pricingRecId, setPricingRecId] = useState("");
  const [pricingSvgs,  setPricingSvgs]  = useState(12);
  const [extraCosts,   setExtraCosts]   = useState([]);
  const [extraCostIn,  setExtraCostIn]  = useState({ name: "", cost: "" });
  const [laborHrs,     setLaborHrs]     = useState(1);
  const [laborRate,    setLaborRate]    = useState(20);
  const [markup,       setMarkup]       = useState(40);
  const [overhead,     setOverhead]     = useState(10);
  const [sellQty,      setSellQty]      = useState(1);
  const [focusedPricingField, setFocusedPricingField] = useState(null);
  const [sellingPrice,    setSellingPrice]    = useState("");
  const [suggestedPrice,  setSuggestedPrice]  = useState(null);
  const [priceResult,     setPriceResult]     = useState(null);
  const [pricingSaveMsg,  setPricingSaveMsg]  = useState("");

  // Orders UI
  const [orderSearch,  setOrderSearch]  = useState("");
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState("Pending"); // Pending | Active | Declined | All — strictly single-select, no combined state
  const [newOrder,     setNewOrder]     = useState({ customer: "", items: [{ item: "", size: "", flavor: "", quantity: "1" }], due: "", status: "Pending", total: "", notes: "", allergyNote: "", phone: "", email: "", type: "Real" });
  const [editingOrder, setEditingOrder] = useState(null); // order being edited
  const [editOrder,    setEditOrder]    = useState(null); // edit form state
  const [emailModal,   setEmailModal]   = useState(null);
  const [emailBody,    setEmailBody]    = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailCopied,  setEmailCopied]  = useState(false);
  const [declineModalOrder,  setDeclineModalOrder]  = useState(null);
  const [declineReasonInput, setDeclineReasonInput] = useState("");
  const [decisionSending,    setDecisionSending]    = useState(false);
  const [acceptModalOrder,   setAcceptModalOrder]   = useState(null);
  const [acceptPrices,       setAcceptPrices]       = useState([]);
  const [invoicePrintOrder, setInvoicePrintOrder] = useState(null);
  const [pdfGenerating,     setPdfGenerating]     = useState(false);
  const [logPaymentOrder, setLogPaymentOrder] = useState(null); // order being logged against
  const [paymentAmount,   setPaymentAmount]   = useState("");
  const [paymentMethod,   setPaymentMethod]   = useState("");
  const [paymentDate,     setPaymentDate]     = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentNote,     setPaymentNote]     = useState("");
  const [paymentSaving,   setPaymentSaving]   = useState(false);
  const [labelPrintOrder,   setLabelPrintOrder]   = useState(null);
  const [labelRecipeId,     setLabelRecipeId]     = useState("");
  const [labelSize,         setLabelSize]         = useState(LABEL_SIZES[0].value);
  const [labelDescription,  setLabelDescription]  = useState("");
  const [labelIncludeIngredients, setLabelIncludeIngredients] = useState(false);
  const [labelQuickIdText, setLabelQuickIdText] = useState(null); // null = show auto default; string = baker-edited (may be empty)
  const [labelQuickIdMode, setLabelQuickIdMode] = useState(false); // round stickers only: quick-ID, no statutory content
  const [labelQuickIdBold, setLabelQuickIdBold] = useState(true);
  const [labelTcs,          setLabelTcs]          = useState(false);
  const [labelMadeOn,       setLabelMadeOn]       = useState("");
  const [labelPcf,          setLabelPcf]          = useState(false); // pickled / canned / fermented
  const [labelBatchNo,      setLabelBatchNo]      = useState("");



  // Schedule UI
  const [showNewTask,    setShowNewTask]    = useState(false);
  const [newTask,        setNewTask]        = useState({ date: "", task: "" });
  const [aiTaskLoading,  setAiTaskLoading]  = useState(false);
  const [aiTaskError,    setAiTaskError]    = useState("");
  const [expandedDates,  setExpandedDates]  = useState(new Set());
  const [editingAutoTaskId, setEditingAutoTaskId] = useState(null);
  const [scheduleFilter, setScheduleFilter] = useState("all");

  // Social UI
  const [showNewPost,    setShowNewPost]    = useState(false);
  const [newPost,        setNewPost]        = useState({ platform: "Instagram", type: "Product Photo", caption: "", date: "", status: "Draft", photo: null });
  const [editingPostId,  setEditingPostId]  = useState(null);
  const [captionLoading, setCaptionLoading] = useState(false);
  const [expandedPost,   setExpandedPost]   = useState(null);
  const [socialFilter,   setSocialFilter]   = useState("All");
  const [socialSearch,   setSocialSearch]   = useState("");
  const [socialModalTab, setSocialModalTab] = useState("copilot");

  // Admin UI
  const [giftEmail,    setGiftEmail]    = useState("");
  const [giftPassword, setGiftPassword] = useState("");
  const [giftNotes,    setGiftNotes]    = useState("");
  const [giftedUsers,  setGiftedUsers]  = useState([]);
  const [giftLoading,  setGiftLoading]  = useState(false);
  const [giftMsg,      setGiftMsg]      = useState("");
  const [proEmail,     setProEmail]     = useState("");
  const [proLoading,   setProLoading]   = useState(false);
  const [proMsg,       setProMsg]       = useState("");
  const [pwNew,        setPwNew]        = useState("");
  const [pwConfirm,    setPwConfirm]    = useState("");
  const [pwMsg,        setPwMsg]        = useState("");
  const [pwLoading,    setPwLoading]    = useState(false);
  const [showPwNew,    setShowPwNew]    = useState(false);
  const [showPwConf,   setShowPwConf]   = useState(false);
  const [showGiftPw,   setShowGiftPw]   = useState(false);
  const [seedMsg,      setSeedMsg]      = useState("");

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
        { data: paymentsData },
      ] = await Promise.all([
        supabase.from("pantry").select("*").eq("user_id", uid).order("name"),
        supabase.from("recipes").select("*").eq("user_id", uid).order("name"),
        supabase.from("orders").select("*, order_items(*)").eq("user_id", uid).order("due"),
        supabase.from("schedule").select("*").eq("user_id", uid).order("date"),
        supabase.from("social_posts").select("*").eq("user_id", uid).order("date"),
        supabase.from("profiles").select("*").eq("id", uid).single(),
        supabase.from("payments").select("*").eq("user_id", uid),
      ]);

      // Map snake_case DB fields to camelCase for the app
      const loadedPantry = (pantryData || []).map(p => ({ ...p, costPer: p.cost_per, storeUnit: p.store_unit, storeCost: p.store_cost, gramsPerCup: p.grams_per_cup }));
      const loadedRecipes = (recipesData || []).map(r => ({ ...r, category: normalizeRecipeCategory(r.category), ingredients: r.ingredients || [], allergens: r.allergens || [], ingredientsList: r.ingredients_list || "", laborMinutes: r.labor_minutes ?? null, sellPrice: r.sell_price ?? null }));

      if (loadedPantry.length === 0) {
        // Client-side SELECT returned 0 — call server endpoint (service role bypasses RLS)
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        let serverPantry = null;
        let serverRecipes = null;
        let seedError = null;
        try {
          const seedRes = await fetch("/api/seed-starter", {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
          });
          if (seedRes.ok) {
            const json = await seedRes.json();
            serverPantry = (json.pantry && json.pantry.length > 0) ? json.pantry : null;
            serverRecipes = json.recipes || null;
            if (!serverPantry) setSeedMsg("⚠️ Server returned empty pantry — please contact support.");
          } else {
            const errJson = await seedRes.json().catch(() => ({}));
            seedError = errJson.error || `HTTP ${seedRes.status}`;
          }
        } catch (e) {
          seedError = e.message;
        }
        if (seedError) {
          console.error("Seed failed:", seedError);
          setSeedMsg("⚠️ Could not load starter data: " + seedError);
        }
        if (serverPantry && serverPantry.length > 0) {
          setPantry(serverPantry.map(p => ({ ...p, costPer: p.cost_per, storeUnit: p.store_unit, storeCost: p.store_cost, gramsPerCup: p.grams_per_cup })));
          setRecipes((serverRecipes || []).map(r => ({ ...r, category: normalizeRecipeCategory(r.category), ingredients: r.ingredients || [], allergens: r.allergens || [], ingredientsList: r.ingredients_list || "", laborMinutes: r.labor_minutes ?? null, sellPrice: r.sell_price ?? null })));
        } else {
          const { data: freshPantry }  = await supabase.from("pantry").select("*").eq("user_id", uid).order("name");
          const { data: freshRecipes } = await supabase.from("recipes").select("*").eq("user_id", uid).order("name");
          setPantry((freshPantry || []).map(p => ({ ...p, costPer: p.cost_per, storeUnit: p.store_unit, storeCost: p.store_cost, gramsPerCup: p.grams_per_cup })));
          setRecipes((freshRecipes || []).map(r => ({ ...r, category: normalizeRecipeCategory(r.category), ingredients: r.ingredients || [], allergens: r.allergens || [], ingredientsList: r.ingredients_list || "", laborMinutes: r.labor_minutes ?? null, sellPrice: r.sell_price ?? null })));
        }
      } else {
        setPantry(loadedPantry);
        setRecipes(loadedRecipes);
      }
      setOrders((ordersData || []).map(mapOrderWithItems));
      setPaymentsByOrder(groupPaymentsByOrder(paymentsData));
      setSchedule((scheduleData || []).map(t => ({ ...t, orderId: t.order_id, aiSuggested: t.ai_suggested })));
      setSocial((socialData || []).map(p => ({ ...p, type: p.type })));
      if (profileData) {
        setBakeryName(profileData.bakery_name || "My Home Bakery");
        setBakeryLogo(profileData.bakery_logo || null);
        setInvoiceHeaderColor(profileData.invoice_header_color || "#1e2d4a");
        setInvoiceAccentColor(profileData.invoice_accent_color || "#BC3B52");
        setVenmo(profileData.venmo || "");
        setPaypal(profileData.paypal || "");
        setZelle(profileData.zelle || "");
        setAcceptsCash(!!profileData.accepts_cash);
        setOtherPay(profileData.other_payment || "");
        const dlr = parseFloat(profileData.default_labor_rate) || 20;
        const dm  = parseFloat(profileData.default_markup)     || 40;
        const doh = parseFloat(profileData.default_overhead)   || 10;
        setDefaultLaborRate(dlr); setLaborRate(dlr);
        setDefaultMarkup(dm);    setMarkup(dm);
        setDefaultOverhead(doh); setOverhead(doh);
        setCurrency(profileData.currency || "USD");
        setBakerState(profileData.state || "");
        setCottageLawState(profileData.cottage_law_state || "TX");
        setPhysicalAddress(profileData.physical_address || "");
        setDshsRegistrationNumber(profileData.dshs_registration_number || "");
        setWebsiteUrl(profileData.website_url || "");
        setUseDshsReg(!!profileData.dshs_registration_number);
        setOrderSlug(profileData.slug || "");
        setSlugInput(profileData.slug || "");
        setOrderLeadDays(profileData.order_lead_days ?? 3);
        setOrderFormItems((profileData.order_form_items || []).map(i => ({
          name: i.name,
          basePrice: i.basePrice ?? null,
          category: i.category || "",
          recipeId: i.recipeId ?? null,
          variants: Array.isArray(i.variants) ? i.variants.map(v => ({ label: v.label, recipeId: v.recipeId ?? null })) : [],
        })));
        setOrderFormSizes(profileData.order_form_sizes || []);
        setOrderFormFlavors(profileData.order_form_flavors || []);
        setIsPro(!!profileData.is_pro);
        setMaxOrdersPerDay(profileData.max_orders_per_day ?? "");
        setBlackoutDates(profileData.blackout_dates || []);
      }
      setDbLoading(false);
    };
    load();
  }, [uid]);

  // ── Orders polling — pick up new pending order-requests without a full reload ──
  const refreshOrders = useCallback(async () => {
    const [{ data, error }, { data: paymentsData }] = await Promise.all([
      supabase.from("orders").select("*, order_items(*)").eq("user_id", uid).order("due"),
      supabase.from("payments").select("*").eq("user_id", uid),
    ]);
    if (error) return;
    const mapped = (data || []).map(mapOrderWithItems);
    setOrders(mapped);
    setPaymentsByOrder(groupPaymentsByOrder(paymentsData));
    const pendingLinkIds = mapped.filter(o => o.status === "Pending" && o.source === "link").map(o => o.id);
    setNewPendingCount(pendingLinkIds.filter(id => !seenPendingLinkIds.current.has(id)).length);
  }, [uid]);

  useEffect(() => {
    const poll = () => { if (document.visibilityState === "visible") refreshOrders(); };
    const interval = setInterval(poll, 45000);
    document.addEventListener("visibilitychange", poll);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [refreshOrders]);

  useEffect(() => {
    if (tab === "Orders") {
      seenPendingLinkIds.current = new Set(orders.filter(o => o.status === "Pending" && o.source === "link").map(o => o.id));
      setNewPendingCount(0);
    }
  }, [tab, orders]);

  // ── Save bakery profile ───────────────────────────────────────────────────────
  const saveProfile = async () => {
    await supabase.from("profiles").upsert({ id: uid, bakery_name: bakeryName, bakery_logo: bakeryLogo, invoice_header_color: invoiceHeaderColor, invoice_accent_color: invoiceAccentColor, venmo, paypal, zelle, accepts_cash: acceptsCash, other_payment: otherPay, default_labor_rate: defaultLaborRate, default_markup: defaultMarkup, default_overhead: defaultOverhead, currency, state: bakerState, cottage_law_state: cottageLawState, physical_address: physicalAddress, dshs_registration_number: dshsRegistrationNumber, website_url: websiteUrl, order_lead_days: orderLeadDays, order_form_items: orderFormItems, order_form_sizes: orderFormSizes, order_form_flavors: orderFormFlavors, max_orders_per_day: maxOrdersPerDay === "" ? null : parseInt(maxOrdersPerDay), blackout_dates: blackoutDates });
    setLaborRate(defaultLaborRate); setMarkup(defaultMarkup); setOverhead(defaultOverhead);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  // ── Order intake link ─────────────────────────────────────────────────────────
  const saveSlug = async () => {
    const candidate = slugify(slugInput);
    if (!candidate) { setSlugStatus("error"); return; }
    if (candidate === orderSlug) { setSlugStatus("available"); return; }
    setSlugStatus("checking");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/claim-slug", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ slug: candidate }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.available) { setSlugStatus("taken"); return; }
      const { error } = await supabase.from("profiles").upsert({ id: uid, slug: candidate });
      if (error) { setSlugStatus("error"); return; }
      setOrderSlug(candidate);
      setSlugInput(candidate);
      setSlugStatus("available");
    } catch {
      setSlugStatus("error");
    }
  };

  const addMenuOption = (list, setList, value) => {
    const v = value.trim();
    if (!v || list.includes(v)) return;
    setList([...list, v]);
  };
  const removeMenuOption = (list, setList, value) => setList(list.filter(v => v !== value));

  const addMenuItem = (name, price) => {
    const n = name.trim();
    if (!n || orderFormItems.some(i => i.name.toLowerCase() === n.toLowerCase())) return;
    const basePrice = price !== "" && !isNaN(parseFloat(price)) ? parseFloat(price) : null;
    setOrderFormItems([...orderFormItems, { name: n, basePrice, category: "", recipeId: null, variants: [] }]);
  };
  const removeMenuItem = (name) => setOrderFormItems(orderFormItems.filter(i => i.name !== name));
  const updateMenuItem = (name, patch) => setOrderFormItems(prev => prev.map(i => i.name === name ? { ...i, ...patch } : i));
  const addMenuItemVariant = (name, label) => {
    const l = label.trim();
    if (!l) return;
    setOrderFormItems(prev => prev.map(i => i.name === name ? { ...i, variants: [...i.variants, { label: l, recipeId: null }] } : i));
  };
  const removeMenuItemVariant = (name, idx) => setOrderFormItems(prev => prev.map(i => i.name === name ? { ...i, variants: i.variants.filter((_, vi) => vi !== idx) } : i));
  const updateMenuItemVariant = (name, idx, patch) => setOrderFormItems(prev => prev.map(i => i.name === name ? { ...i, variants: i.variants.map((v, vi) => vi === idx ? { ...v, ...patch } : v) } : i));

  // Repeatable line-item rows, shared by the New Order and Edit Order forms.
  const addItemRow = (setOrder) => setOrder(o => ({ ...o, items: [...o.items, { item: "", size: "", flavor: "", quantity: "1", price: "" }] }));
  const removeItemRow = (setOrder, idx) => setOrder(o => ({ ...o, items: o.items.length <= 1 ? o.items : o.items.filter((_, i) => i !== idx) }));
  const updateItemRow = (setOrder, idx, field, value) => setOrder(o => ({ ...o, items: o.items.map((it, i) => i === idx ? { ...it, [field]: value } : it) }));

  const addBlackoutDate = () => {
    if (!blackoutDateInput || blackoutDates.includes(blackoutDateInput)) return;
    setBlackoutDates([...blackoutDates, blackoutDateInput].sort());
    setBlackoutDateInput("");
  };
  const removeBlackoutDate = (date) => setBlackoutDates(blackoutDates.filter(d => d !== date));

  const saveApiKey = (key) => {
    localStorage.setItem("baker_api_key", key);
    setApiKey(key);
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 2000);
  };


  // ── Admin ─────────────────────────────────────────────────────────────────
  const loadGiftedUsers = async () => {
    const { data } = await supabase.from("gifted_users").select("*").order("created_at", { ascending: false });
    setGiftedUsers(data || []);
  };

  const giftAccount = async () => {
    if (!giftEmail || !giftPassword) return;
    setGiftLoading(true);
    setGiftMsg("");
    try {
      const res = await fetch("/api/gift-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: giftEmail, password: giftPassword, notes: giftNotes, created_by: uid }),
      });
      const json = await res.json();
      if (!res.ok) { setGiftMsg("Error: " + (json.error || "Unknown error")); setGiftLoading(false); return; }
      setGiftMsg("Account created for " + giftEmail + " — they can log in immediately, no email confirmation needed.");
      setGiftEmail(""); setGiftPassword(""); setGiftNotes("");
      loadGiftedUsers();
    } catch (e) {
      setGiftMsg("Error: " + e.message);
    }
    setGiftLoading(false);
  };

  const setProAccess = async (isPro) => {
    if (!proEmail.trim()) return;
    setProLoading(true);
    setProMsg("");
    try {
      const { data: { session: adminSession } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin-set-pro", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminSession.access_token}` },
        body: JSON.stringify({ email: proEmail.trim(), isPro }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setProMsg("Error: " + (json.error || "Unknown error")); setProLoading(false); return; }
      setProMsg(`✓ ${proEmail.trim()} is now ${isPro ? "Pro" : "Free"}.`);
    } catch (e) {
      setProMsg("Error: " + e.message);
    }
    setProLoading(false);
  };

  const changePassword = async () => {
    setPwMsg("");
    if (!pwNew || pwNew.length < 6) { setPwMsg("Password must be at least 6 characters."); return; }
    if (pwNew !== pwConfirm) { setPwMsg("Passwords do not match."); return; }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwNew });
    if (error) { setPwMsg("Error: " + error.message); }
    else { setPwMsg("✓ Password updated successfully!"); setPwNew(""); setPwConfirm(""); }
    setPwLoading(false);
  };

  const revokeGiftedUser = async (id) => {
    await supabase.from("gifted_users").delete().eq("id", id);
    setGiftedUsers(u => u.filter(x => x.id !== id));
  };

  const exportCSV = (data, filename) => {
    if (!data.length) return;
    const keys = Object.keys(data[0]);
    const rows = [keys.join(","), ...data.map(row => keys.map(k => JSON.stringify(row[k] ?? "")).join(","))];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  };

  // ── Admin data loading ───────────────────────────────────────────────────────
  useEffect(() => {
    if (tab === "Admin" && session?.user?.email === "shoogiecookies@gmail.com") {
      loadGiftedUsers();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ── Pantry ────────────────────────────────────────────────────────────────
  const addPantryItem = async () => {
    if (!newPantry.name || !newPantry.storeCost || !newPantry.yields) return;
    const costPer = parseFloat(newPantry.storeCost) / parseFloat(newPantry.yields);
    const { data } = await supabase.from("pantry").insert([{
      user_id: uid, name: newPantry.name, category: newPantry.category,
      cost_per: costPer, unit: newPantry.unit, store_unit: newPantry.storeUnit,
      store_cost: parseFloat(newPantry.storeCost), yields: parseFloat(newPantry.yields),
      grams_per_cup: newPantry.gramsPerCup ? parseFloat(newPantry.gramsPerCup) : null
    }]).select().single();
    if (data) setPantry(p => [...p, { ...data, costPer: data.cost_per, storeUnit: data.store_unit, storeCost: data.store_cost, gramsPerCup: data.grams_per_cup }]);
    setNewPantry({ name: "", category: "Flour & Grains", storeCost: "", yields: "", unit: "cups", storeUnit: "", gramsPerCup: "" });
    setShowNewPantry(false);
  };

  const savePantryEdit = async () => {
    const { id, name, category, storeCost, yields, unit, storeUnit, gramsPerCup } = editPantryForm;
    const costPer = parseFloat(storeCost) / parseFloat(yields);
    await supabase.from("pantry").update({
      name, category, unit, store_unit: storeUnit,
      store_cost: parseFloat(storeCost), yields: parseFloat(yields), cost_per: costPer,
      grams_per_cup: gramsPerCup ? parseFloat(gramsPerCup) : null,
    }).eq("id", id);
    setPantry(p => p.map(x => Number(x.id) === Number(id)
      ? { ...x, name, category, unit, storeUnit, storeCost: parseFloat(storeCost), yields: parseFloat(yields), costPer, gramsPerCup: gramsPerCup ? parseFloat(gramsPerCup) : null }
      : x));
    setEditingPantry(null);
    setEditPantryForm({});
  };

  const deletePantryItem = async (id) => {
    await supabase.from("pantry").delete().eq("id", id);
    setPantry(p => p.filter(x => x.id !== id));
  };

  // ── Recipes ──────────────────────────────────────────────────────────────
  const addRecipe = async () => {
    if (!newRec.name) return;
    const { data } = await supabase.from("recipes").insert([{
      user_id: uid, name: newRec.name, category: newRec.category,
      servings: newRec.servings, notes: newRec.notes, photo: newRec.photo,
      ingredients: newRec.ingredients, allergens: newRec.allergens, ingredients_list: newRec.ingredientsList
    }]).select().single();
    if (data) setRecipes(r => [...r, { ...data, ingredients: data.ingredients || [], allergens: data.allergens || [], ingredientsList: data.ingredients_list || "", laborMinutes: data.labor_minutes ?? null, sellPrice: data.sell_price ?? null }]);
    setNewRec({ name: "", category: "Cookies", servings: 12, ingredients: [], notes: "", photo: null, allergens: [], ingredientsList: "" });
    setShowNewRec(false);
  };

  const addRecipeIng = () => {
    const pid = parseInt(recIngInput.pantryId);
    const item = pantry.find(p => Number(p.id) === Number(pid));
    if (!item) return;
    setNewRec(r => ({ ...r, ingredients: [...r.ingredients, { pantryId: pid, name: item.name, amount: parseFloat(recIngInput.amount) || 1, unit: recIngInput.unit || item.unit }] }));
    setRecIngInput({ pantryId: "", amount: "", unit: "cups" });
  };

  const addEditRecipeIng = () => {
    const pid = parseInt(editIngInput.pantryId);
    const item = pantry.find(p => Number(p.id) === Number(pid));
    if (!item) return;
    setEditRec(r => ({ ...r, ingredients: [...r.ingredients, { pantryId: pid, name: item.name, amount: parseFloat(editIngInput.amount) || 1, unit: editIngInput.unit || item.unit }] }));
    setEditIngInput({ pantryId: "", amount: "", unit: "cups" });
  };
  const saveRecipeEdit = async () => {
    if (!editRec?.name) return;
    await supabase.from("recipes").update({ name: editRec.name, category: editRec.category, servings: editRec.servings, notes: editRec.notes, ingredients: editRec.ingredients, allergens: editRec.allergens || [], ingredients_list: editRec.ingredientsList || "" }).eq("id", editRec.id);
    setRecipes(prev => prev.map(x => x.id === editRec.id ? { ...x, ...editRec } : x));
    setEditRec(null);
  };
  const deleteRecipe = async (id) => {
    await supabase.from("recipes").delete().eq("id", id);
    setRecipes(r => r.filter(x => x.id !== id));
  };

  // ── Pricing ──────────────────────────────────────────────────────────────
  const calcPriceInputs = () => {
    let ingCost = 0;
    if (pricingRecId) {
      const rec = recipes.find(r => r.id === parseInt(pricingRecId));
      if (rec) ingCost = calcRecipeCost(rec, pantry) * (pricingSvgs / rec.servings);
    }
    ingCost += extraCosts.reduce((s, x) => s + parseFloat(x.cost || 0), 0);
    const labor  = laborHrs * laborRate;
    const sub    = ingCost + labor;
    const withOH = sub + ingCost * (overhead / 100);
    return { ingCost, labor, sub, withOH };
  };
  const calcPrice = () => { const r = calcPriceInputs(); setSuggestedPrice(+(r.withOH / (1 - 0.40)).toFixed(2)); setPriceResult(r); };
  const suggestPrice = () => {
    const result = calcPriceInputs();
    const suggested = +(result.withOH * (1 + markup / 100)).toFixed(2);
    setSuggestedPrice(suggested > 0 ? suggested : null);
    setSellingPrice(suggested > 0 ? String(suggested) : "");
    setPriceResult(result);
  };
  const saveRecipePricing = async () => {
    const price = parseFloat(sellingPrice);
    if (!pricingRecId || !(price > 0)) return;
    const id = parseInt(pricingRecId);
    const laborMinutes = (parseFloat(laborHrs) || 0) * 60;
    await supabase.from("recipes").update({ labor_minutes: laborMinutes, sell_price: price }).eq("id", id);
    setRecipes(prev => prev.map(x => x.id === id ? { ...x, laborMinutes, sellPrice: price } : x));
    const rec = recipes.find(r => r.id === id);
    setPricingSaveMsg(`Saved to ${rec ? rec.name : "recipe"}`);
  };

  // ── Orders ────────────────────────────────────────────────────────────────
  const addOrder = async () => {
    if (!newOrder.customer) return;
    const validItems = newOrder.items.filter(it => it.item.trim());
    if (validItems.length === 0) { alert("Add at least one item."); return; }
    const { data: orderData, error: insertErr } = await supabase.from("orders").insert([{
      user_id: uid, customer: newOrder.customer,
      due: newOrder.due || null, status: newOrder.status,
      total: parseFloat(newOrder.total) || 0, notes: newOrder.notes, allergy_note: newOrder.allergyNote || null, phone: newOrder.phone, email: newOrder.email || null,
      type: newOrder.type || "Real"
    }]).select().single();
    if (insertErr) {
      alert("Order could not be saved: " + insertErr.message);
      return;
    }
    const { data: itemsData, error: itemsErr } = await supabase.from("order_items").insert(
      validItems.map(it => ({ order_id: orderData.id, user_id: uid, item: it.item.trim(), size: it.size || null, flavor: it.flavor || null, quantity: parseInt(it.quantity) || 1 }))
    ).select();
    if (itemsErr) alert("Order saved, but items could not be saved: " + itemsErr.message);
    const fullOrder = { ...orderData, items: (itemsData || []).map(li => ({ id: li.id, item: li.item, size: li.size, flavor: li.flavor, quantity: li.quantity, price: li.price })) };
    setOrders(prev => [...prev, fullOrder]);
    // Auto-generate tasks (5 per line item)
    const tasks = generateTasksFromOrder(fullOrder);
    for (const t of tasks) {
      const { data: taskData } = await supabase.from("schedule").insert([{ user_id: uid, ...t, order_id: fullOrder.id }]).select().single();
      if (taskData) setSchedule(prev => [...prev, { ...taskData, auto: true, aiSuggested: false }]);
    }
    setNewOrder({ customer: "", items: [{ item: "", size: "", flavor: "", quantity: "1" }], due: "", status: "Pending", total: "", notes: "", allergyNote: "", phone: "", email: "", type: "Real" });
    setShowNewOrder(false);
  };

  const updateOrderStatus = async (id, status) => {
    await supabase.from("orders").update({ status }).eq("id", id);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  };

  const deleteOrder = async (id) => {
    await supabase.from("schedule").delete().eq("order_id", id);
    await supabase.from("orders").delete().eq("id", id);
    setOrders(prev => prev.filter(o => o.id !== id));
    setSchedule(prev => prev.filter(t => t.order_id !== id));
  };

  const getPaymentSummary = (orderId, total) => {
    const list = paymentsByOrder[orderId] || [];
    const amountPaid = list.reduce((sum, p) => sum + (p.amount || 0), 0);
    const balanceDue = Math.max(0, (total || 0) - amountPaid);
    const status = amountPaid <= 0 ? "Unpaid" : balanceDue <= 0 ? "Paid in Full" : "Deposit Paid";
    return { amountPaid, balanceDue, status };
  };

  const logPayment = async () => {
    if (!logPaymentOrder) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) { alert("Enter a payment amount greater than $0."); return; }
    setPaymentSaving(true);
    const { data, error } = await supabase.from("payments").insert([{
      order_id: logPaymentOrder.id, user_id: uid, amount,
      method: paymentMethod || null, paid_at: paymentDate || new Date().toISOString().slice(0, 10),
      note: paymentNote.trim() || null,
    }]).select().single();
    setPaymentSaving(false);
    if (error) { alert("Payment could not be saved: " + error.message); return; }
    setPaymentsByOrder(prev => ({ ...prev, [logPaymentOrder.id]: [...(prev[logPaymentOrder.id] || []), data] }));
    setLogPaymentOrder(null);
    setPaymentAmount(""); setPaymentMethod(""); setPaymentNote("");
    setPaymentDate(new Date().toISOString().slice(0, 10));
  };

  const clearOrderTasks = async (orderId) => {
    if (!window.confirm("Clear all scheduled tasks for this order?")) return;
    await supabase.from("schedule").delete().eq("order_id", orderId);
    setSchedule(prev => prev.filter(t => t.order_id !== orderId));
  };

  const clearDateTasks = async (date) => {
    if (!window.confirm("Delete all tasks for this day?")) return;
    await supabase.from("schedule").delete().eq("date", date).eq("user_id", uid);
    setSchedule(prev => prev.filter(t => t.date !== date));
  };

  // Accept/Decline — for Pending, link-submitted orders only. Accept generates
  // production tasks (link orders don't get them at submission time) and moves
  // the order into the normal pipeline; Decline is a terminal state, record kept.
  const notifyDecision = async (orderId, reason) => {
    try {
      const { data: { session: notifySession } } = await supabase.auth.getSession();
      await fetch("/api/notify-order-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${notifySession.access_token}` },
        body: JSON.stringify({ orderId, reason: reason || null }),
      });
    } catch (e) {
      console.error("notify-order-decision request failed:", e.message);
    }
  };

  const openAcceptModal = (order) => {
    const prices = order.items.map(li => {
      if (li.price != null) return String(li.price);
      const match = orderFormItems.find(m => m.name.toLowerCase() === (li.item || "").trim().toLowerCase());
      return (match && match.basePrice != null) ? String(match.basePrice) : "";
    });
    setAcceptModalOrder(order);
    setAcceptPrices(prices);
  };

  const acceptOrder = async (order, prices) => {
    if (decisionSending) return;
    // Capacity is per-ORDER regardless of item count (known limitation: a heavy
    // multi-item order still only consumes one slot, undercounting real production
    // load — revisit with item-count-aware capacity if this becomes a real problem).
    const cap = parseInt(maxOrdersPerDay) || 0;
    if (isPro && cap > 0 && order.due) {
      const { count, error: countErr } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid)
        .eq("due", order.due)
        .in("status", ["In Progress", "Complete", "Invoiced", "Delivered"]);
      if (countErr) { alert("Could not check capacity: " + countErr.message); return; }
      if ((count || 0) >= cap) {
        alert(`This day is full — you've already accepted ${count} order${count === 1 ? "" : "s"} for ${order.due}. Decline this request or reschedule it before accepting.`);
        return;
      }
    }
    setDecisionSending(true);
    const priceValues = order.items.map((_, i) => { const p = parseFloat(prices[i]); return isNaN(p) ? null : p; });
    const total = priceValues.reduce((s, p) => s + (p || 0), 0);
    const { error } = await supabase.from("orders").update({ status: "In Progress", total }).eq("id", order.id);
    if (error) { alert("Order could not be accepted: " + error.message); setDecisionSending(false); return; }
    for (let i = 0; i < order.items.length; i++) {
      await supabase.from("order_items").update({ price: priceValues[i] }).eq("id", order.items[i].id);
    }
    const updatedItems = order.items.map((li, i) => ({ ...li, price: priceValues[i] }));
    const updatedOrder = { ...order, status: "In Progress", total, items: updatedItems };
    setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
    const tasks = generateTasksFromOrder(updatedOrder);
    for (const t of tasks) {
      const { data: taskData } = await supabase.from("schedule").insert([{ user_id: uid, ...t, order_id: order.id }]).select().single();
      if (taskData) setSchedule(prev => [...prev, { ...taskData, auto: true, aiSuggested: false }]);
    }
    await notifyDecision(order.id, null);
    setDecisionSending(false);
  };

  const declineOrder = async (id, reason) => {
    if (decisionSending) return;
    setDecisionSending(true);
    const { error } = await supabase.from("orders").update({ status: "Declined", decline_reason: reason || null }).eq("id", id);
    if (error) { alert("Order could not be declined: " + error.message); setDecisionSending(false); return; }
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: "Declined", decline_reason: reason || null } : o));
    await notifyDecision(id, reason);
    setDecisionSending(false);
  };

  const saveEditOrder = async () => {
    if (!editOrder) return;
    const validItems = editOrder.items.filter(it => it.item.trim());
    if (validItems.length === 0) { alert("Add at least one item."); return; }
    const updates = {
      customer: editOrder.customer,
      due: editOrder.due || null, status: editOrder.status,
      total: parseFloat(editOrder.total) || 0, notes: editOrder.notes, allergy_note: editOrder.allergyNote || null, phone: editOrder.phone, email: editOrder.email || null,
      type: editOrder.type || "Real"
    };
    const { error: updateErr } = await supabase.from("orders").update(updates).eq("id", editingOrder);
    if (updateErr) { alert("Order could not be updated: " + updateErr.message); return; }

    // Replace line items wholesale (same pattern as auto-task regeneration below).
    await supabase.from("order_items").delete().eq("order_id", editingOrder);
    const { data: itemsData, error: itemsErr } = await supabase.from("order_items").insert(
      validItems.map(it => ({ order_id: editingOrder, user_id: uid, item: it.item.trim(), size: it.size || null, flavor: it.flavor || null, quantity: parseInt(it.quantity) || 1, price: it.price !== "" && !isNaN(parseFloat(it.price)) ? parseFloat(it.price) : null }))
    ).select();
    if (itemsErr) alert("Order updated, but items could not be saved: " + itemsErr.message);
    const newItems = (itemsData || []).map(li => ({ id: li.id, item: li.item, size: li.size, flavor: li.flavor, quantity: li.quantity, price: li.price }));
    setOrders(prev => prev.map(o => o.id === editingOrder ? { ...o, ...updates, items: newItems } : o));

    // Link-submitted orders don't get production tasks until accepted (see acceptOrder);
    // skip regeneration here so an edit made while still Pending doesn't jump the gun.
    const isUnacceptedLinkOrder = editOrder.source === "link" && updates.status === "Pending";
    if (!isUnacceptedLinkOrder && updates.status !== "Declined") {
      // Delete auto-generated tasks for this order and regenerate from new details
      await supabase.from("schedule").delete().eq("order_id", editingOrder).eq("auto", true);
      setSchedule(prev => prev.filter(t => !(t.order_id === editingOrder && t.auto)));
      const updatedOrder = { ...updates, id: editingOrder, items: newItems };
      const newTasks = generateTasksFromOrder(updatedOrder);
      for (const t of newTasks) {
        const { data: taskData } = await supabase.from("schedule").insert([{ user_id: uid, ...t }]).select().single();
        if (taskData) setSchedule(prev => [...prev, { ...taskData, orderId: taskData.order_id, aiSuggested: false }]);
      }
    }

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

  // ── Invoice ──────────────────────────────────────────────────────────────
  const printInvoice = (order) => setInvoicePrintOrder(order);

  // ── Compliance Label Proofer ─────────────────────────────────────────────
  const printLabel = (order) => {
    const itemNames = (order.items || []).map(li => li.item).filter(Boolean);
    const matches = itemNames
      .map(name => recipes.find(r => r.name.trim().toLowerCase() === name.trim().toLowerCase()))
      .filter(Boolean);
    const firstMatch = matches[0] || null;
    setLabelRecipeId(firstMatch ? String(firstMatch.id) : "");
    setLabelSize("5163"); // Avery 5163 — same default as the free generator
    setLabelDescription("");
    setLabelIncludeIngredients(false);
    setLabelQuickIdText(null);
    setLabelQuickIdMode(false);
    setLabelQuickIdBold(true);
    setLabelTcs(false);
    setLabelMadeOn("");
    setLabelPcf(false);
    setLabelBatchNo("");
    setLabelPrintOrder(order);
  };

  const downloadInvoicePdf = async () => {
    const el = document.getElementById("bfinv-content");
    if (!el || !window.html2canvas || !window.jspdf) return;
    setPdfGenerating(true);
    try {
      const canvas = await window.html2canvas(el, {
        scale: 2, useCORS: true, backgroundColor: "#ffffff",
        ignoreElements: (node) => node.classList && node.classList.contains("np"),
      });
      const imgData = canvas.toDataURL("image/png");
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = 210;
      const imgH = (canvas.height * pageW) / canvas.width;
      if (imgH <= 297) {
        pdf.addImage(imgData, "PNG", 0, 0, pageW, imgH);
      } else {
        let yPos = 0;
        while (yPos < imgH) {
          if (yPos > 0) pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, -yPos, pageW, imgH);
          yPos += 297;
        }
      }
      const safeName = (invoicePrintOrder?.customer || "invoice").replace(/[^a-z0-9]/gi, "_");
      pdf.save("Invoice_" + safeName + ".pdf");
    } catch (e) {
      console.error("PDF generation failed:", e);
    }
    setPdfGenerating(false);
  };;



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

  const deleteTask = async (id) => {
    await supabase.from("schedule").delete().eq("id", id);
    setSchedule(prev => prev.filter(t => t.id !== id));
  };

  const rescheduleTask = async (id, newDate) => {
    await supabase.from("schedule").update({ date: newDate }).eq("id", id);
    setSchedule(prev => prev.map(t => t.id === id ? { ...t, date: newDate } : t));
    setEditingAutoTaskId(null);
  };

  const getAiTasks = async () => {
    setAiTaskLoading(true);
    setAiTaskError("");
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
      setAiTaskError(e.message === "NO_KEY" ? "Add your Anthropic API key in Settings to use AI features." : "Error getting suggestions. Please try again.");
    }
    setAiTaskLoading(false);
  };

  // ── Social ────────────────────────────────────────────────────────────────
  const closeSocialModal = () => {
    setShowNewPost(false);
    setEditingPostId(null);
  };

  const openPostForEdit = (post) => {
    setNewPost({ platform: post.platform, type: post.type, caption: post.caption || "", date: post.date || "", status: post.status, photo: post.photo });
    setEditingPostId(post.id);
    setShowNewPost(true);
  };

  const savePost = async () => {
    if (!newPost.platform) return;
    if (editingPostId) {
      const fields = { platform: newPost.platform, type: newPost.type, caption: newPost.caption, date: newPost.date || null, status: newPost.status, photo: newPost.photo };
      await supabase.from("social_posts").update(fields).eq("id", editingPostId);
      setSocial(prev => prev.map(p => p.id === editingPostId ? { ...p, ...fields } : p));
    } else {
      const { data } = await supabase.from("social_posts").insert([{
        user_id: uid, platform: newPost.platform, type: newPost.type,
        caption: newPost.caption, date: newPost.date || null, status: newPost.status, photo: newPost.photo
      }]).select().single();
      if (data) setSocial(prev => [...prev, data]);
    }
    setNewPost({ platform: "Instagram", type: "Product Photo", caption: "", date: "", status: "Draft", photo: null });
    closeSocialModal();
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
      setNewPost(p => ({ ...p, caption: e.message === "NO_KEY" ? "⚠️ Add your Anthropic API key in Settings to use AI features." : "Error. Please try again." }));
    }
    setCaptionLoading(false);
  };

  // ── Dashboard metrics ─────────────────────────────────────────────────────
  const deliveredRev   = orders.filter(o => o.status === "Delivered" && (o.type || "Real") === "Real").reduce((s, o) => s + (o.total || 0), 0);
  const pendingRev     = orders.filter(o => o.status !== "Delivered" && o.status !== "Declined" && (o.type || "Real") === "Real").reduce((s, o) => s + (o.total || 0), 0);
  const totalRevenue   = deliveredRev + pendingRev;
  const outstandingBalance = orders
    .filter(o => o.status !== "Delivered" && o.status !== "Declined" && (o.type || "Real") === "Real")
    .reduce((s, o) => s + getPaymentSummary(o.id, o.total).balanceDue, 0);
  const outstandingCount = orders
    .filter(o => o.status !== "Delivered" && o.status !== "Declined" && (o.type || "Real") === "Real")
    .filter(o => getPaymentSummary(o.id, o.total).balanceDue > 0).length;
  const openOrders     = orders.filter(o => o.status !== "Delivered" && o.status !== "Declined").length;
  const todayStr       = new Date().toISOString().split("T")[0];
  const todayTasks     = schedule.filter(t => !t.done && t.date === todayStr);
  const scheduledPosts = social.filter(p => p.status === "Scheduled").length;
  // Order-count per item (frequency) — how many orders included this item at least once.
  const itemOrderCountMap = {};
  orders.forEach(o => {
    if (o.status === "Declined") return;
    // Donation orders are excluded from revenue/best-sellers here. Intended future behavior
    // (blocked on order_items.recipe_id): Donation should contribute ingredient + labor COST
    // against $0 revenue, so comped-away cost is visible. Until recipe_id linkage lands,
    // Donation is simply excluded like Test/Comped.
    if ((o.type || "Real") !== "Real") return;
    const seenInOrder = new Set();
    (o.items || []).forEach(li => {
      if (li.item && !seenInOrder.has(li.item)) {
        seenInOrder.add(li.item);
        itemOrderCountMap[li.item] = (itemOrderCountMap[li.item] || 0) + 1;
      }
    });
  });
  const itemOrderCountEntries = Object.entries(itemOrderCountMap).sort((a, b) => b[1] - a[1]);
  // Real per-item revenue, now that line items can carry their own accepted price.
  const itemRevenueMap = {};
  orders.forEach(o => {
    if (o.status === "Declined") return;
    if ((o.type || "Real") !== "Real") return;
    (o.items || []).forEach(li => {
      if (li.item && li.price != null) itemRevenueMap[li.item] = (itemRevenueMap[li.item] || 0) + (parseFloat(li.price) || 0);
    });
  });
  const itemRevenueEntries = Object.entries(itemRevenueMap).sort((a, b) => b[1] - a[1]);
  const topRevenueItem    = itemRevenueEntries[0] || null;
  const topRevenueItemPct = totalRevenue > 0 && topRevenueItem ? Math.round(topRevenueItem[1] / totalRevenue * 100) : null;

  if (dbLoading) return (
    <div style={{ minHeight: "100vh", background: "var(--color-background)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif", color: "var(--color-foreground)", fontSize: 16 }}>
      🧁 Loading your bakery...
    </div>
  );

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", minHeight: "100vh", background: "var(--color-background)", color: "var(--color-foreground)" }}>
      <style>{`
        @media (max-width: 768px) { .watermark-logo { display: none !important; } }
        .bf-settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: start; }
        .bf-settings-grid > * { margin-bottom: 0 !important; }
        .bf-settings-full { grid-column: 1 / -1; }
        @media (max-width: 640px) { .bf-settings-grid { grid-template-columns: 1fr; } }
        .bf-social-layout { display: flex; gap: 16px; align-items: flex-start; }
        .bf-social-sidebar { flex: 0 0 33%; min-width: 200px; position: sticky; top: 20px; align-self: flex-start; }
        @media (max-width: 640px) { .bf-social-layout { flex-direction: column !important; } .bf-social-sidebar { position: static !important; width: 100% !important; flex: none !important; min-width: 0 !important; } }
        @media (max-width: 480px) {
          .bf-header { padding: 14px 14px 0 !important; }
          .bf-header-logo { height: 40px !important; }
          .bf-header-eyebrow { display: none !important; }
          .bf-header-name { font-size: 16px !important; }
          .bf-header-actions { display: none !important; }
        }
        .bf-card { transition: box-shadow 200ms ease, transform 200ms ease; }
        .bf-card:hover { box-shadow: 0 6px 28px rgba(124,58,30,0.13) !important; transform: translateY(-2px); }
        .bf-btn { transition: opacity 160ms ease, transform 160ms ease, box-shadow 160ms ease; }
        .bf-btn:hover { opacity: 0.88; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,0,0,0.12); }
        .bf-btn:active { transform: translateY(0); opacity: 1; }
        .bf-kpi { transition: box-shadow 220ms ease, transform 220ms ease; }
        .bf-kpi:hover { box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.18) !important; transform: translateY(-3px); }
        .bf-task-check { transition: background 0.2s ease, border-color 0.2s ease; cursor: pointer; }
        .bf-task-check:hover { background: rgba(188,59,82,0.12) !important; }
        .bf-task-text { transition: color 0.5s ease, opacity 0.5s ease; }
        .bf-task-text.done { opacity: 0.45; }
        .bf-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 5px; border-radius: 4px; background: var(--color-border); outline: none; cursor: pointer; display: block; }
        .bf-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 20px; height: 20px; border-radius: 50%; background: var(--color-accent); cursor: pointer; border: 2.5px solid var(--color-card); box-shadow: 0 1px 6px rgba(0,0,0,0.25); }
        .bf-slider::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; background: var(--color-accent); cursor: pointer; border: 2.5px solid var(--color-card); box-shadow: 0 1px 6px rgba(0,0,0,0.25); border: none; }
        .bf-slider::-webkit-slider-runnable-track { height: 5px; border-radius: 4px; background: var(--color-border); }
        .bf-slider::-moz-range-track { height: 5px; border-radius: 4px; background: var(--color-border); }
      `}</style>

      {/* HEADER */}
      <div className="bf-header" style={{ background: "#1e2d4a", padding: "26px 20px 0", color: "#fff", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -20, width: 160, height: 160, borderRadius: "50%", background: "rgba(188,59,82,0.08)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 10, left: -40, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.03)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {bakeryLogo
            ? <img src={bakeryLogo} alt="logo" className="bf-header-logo" style={{ height: 52, width: "auto", objectFit: "contain", mixBlendMode: "screen" }} />
            : <div className="bf-header-logo" style={{ fontSize: 36 }}>🧁</div>
          }
          <div style={{ flex: 1 }}>
            <div className="bf-header-eyebrow" style={{ fontSize: 10, letterSpacing: 4, opacity: 0.7, textTransform: "uppercase" }}>Home Bakery Business</div>
            <div className="bf-header-name" style={{ fontSize: 22, fontWeight: "bold", marginTop: 1, fontFamily: "'Playfair Display', serif" }}>{bakeryName}</div>
          </div>
          <div className="bf-header-actions" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <img src="/brand/BakeFlo_Icon_Cream.svg" alt="BakeFlo" style={{ width: 40, height: 40, borderRadius: 6, objectFit: "contain" }} />
            <a href="mailto:hello@bakeflo.io" style={{ color: "#fff", fontSize: 12, textDecoration: "none", background: "#BC3B52", border: "none", borderRadius: 20, padding: "6px 14px", fontFamily: "'Inter', sans-serif", fontWeight: "600" }}>Contact Us</a>
            <button onClick={handleSignOut} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 12, cursor: "pointer", fontFamily: "'Inter', sans-serif", padding: "6px 4px" }}>Sign Out</button>
          </div>
          <ThemeSwitcher />
        </div>
        <div style={{ display: "flex", overflowX: "auto", marginTop: 16, gap: 2 }}>
          {TABS.filter(t => t !== "Admin" || session.user.email === "shoogiecookies@gmail.com").map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "10px 13px", border: "none", cursor: "pointer", fontSize: 12,
              fontWeight: tab === t ? "700" : "400", borderRadius: "10px 10px 0 0", whiteSpace: "nowrap",
              background: "transparent", color: "#fff",
              borderBottom: tab === t ? "3px solid #BC3B52" : "3px solid transparent",
              opacity: tab === t ? 1 : 0.65, transition: "all 0.18s", fontFamily: "'Inter', sans-serif",
              position: "relative",
            }}>
              {t}
              {t === "Orders" && newPendingCount > 0 && (
                <span style={{ position: "absolute", top: 2, right: 2, background: "#A83248", color: "#fff", borderRadius: 20, fontSize: 9, fontWeight: 700, padding: "1px 5px", lineHeight: 1.4 }}>{newPendingCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "18px 16px", maxWidth: 720, margin: "0 auto" }}>

        {/* ══════════ DASHBOARD ══════════ */}
        {tab === "Dashboard" && (() => {
           const hour = new Date().getHours();
           const dow  = new Date().getDay();
           const timeGreet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
           const dayMessages = [
             "Let's set a sweet tone for the week 🍞",
             "Fresh week, fresh bakes! Let's do this 🧁",
             "Tuesday is a great day to prep ahead 🥄",
             "Midweek momentum — keep it rolling 🎂",
             "Almost to the weekend rush 🍰",
             "Weekend orders are almost here! 🎉",
             "Saturday hustle — your busiest day 🔥",
           ];
           return (
           <div>
             <div className="mb-4.5">
               <div className="text-[22px] font-display font-bold text-foreground tracking-tight">{timeGreet}, {bakeryName.split(" ")[0]}!</div>
               <div className="text-[13px] text-foreground/60 mt-0.5 leading-relaxed">{dayMessages[dow]}</div>
             </div>
             {guideVisible ? (
               <div className="bg-card rounded-r-xl border-l-4 border-accent px-3.5 py-3 mb-3.5 flex items-center gap-3">
                 <BookOpen className="h-5 w-5 text-accent shrink-0" />
                 <div className="flex-1 min-w-0">
                   <div className="text-[13px] font-bold text-foreground">Quick Start Guide</div>
                   <div className="text-[11px] text-foreground/60 mt-0.5">New to BakeFlo? Set up your bakery in minutes.</div>
                 </div>
                 <a href="https://www.bakeflo.io/quickstart.pdf" target="_blank" rel="noopener noreferrer" className="text-accent text-xs font-bold no-underline whitespace-nowrap shrink-0 cursor-pointer">Open Guide</a>
                 <button onClick={() => { localStorage.setItem("qsg_dismissed", "1"); setGuideVisible(false); }} className="text-foreground/60 w-6 h-6 rounded-full cursor-pointer text-[15px] leading-6 shrink-0 font-body hover:bg-foreground/10">×</button>
               </div>
             ) : (
               <a href="https://www.bakeflo.io/quickstart.pdf" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] text-accent no-underline font-semibold mb-3.5">
                 <BookOpen className="h-4 w-4" /> Quick Start Guide
               </a>
             )}
             <div className="grid grid-cols-2 gap-2.5 mb-3.5">
               {[
                 { label: "DELIVERED", sub: "revenue", value: `$${deliveredRev.toFixed(2)}`, Icon: DollarSign,  tone: "success" },
                 { label: "PENDING",   sub: "revenue", value: `$${pendingRev.toFixed(2)}`,   Icon: Clock,        tone: "success" },
                 { label: "OPEN",      sub: "orders",  value: openOrders,                    Icon: ShoppingBag,  tone: "foreground" },
                 { label: "SCHEDULED", sub: "posts",   value: scheduledPosts,                Icon: Send,         tone: "foreground" },
               ].map(k => (
                 <div key={k.label} className={`bf-kpi rounded-2xl pt-3.5 px-3.5 pb-3 bg-card border shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_4px_24px_rgba(0,0,0,0.12)] ${k.tone === "success" ? "border-success/10" : "border-foreground/10"}`}>
                   <div className="w-9 h-9 rounded-[10px] bg-background flex items-center justify-center mb-2.5">
                     <k.Icon className={`h-4.5 w-4.5 ${k.tone === "success" ? "text-success" : "text-foreground"}`} />
                   </div>
                   <div className={`text-[26px] font-bold leading-none ${k.tone === "success" ? "text-success" : "text-foreground"}`}>{k.value}</div>
                   <div className={`text-[10px] font-bold uppercase tracking-wider opacity-75 mt-1 ${k.tone === "success" ? "text-success" : "text-foreground"}`}>{k.label} <span className="opacity-60">{k.sub}</span></div>
                 </div>
               ))}
             </div>
             {outstandingBalance > 0 && (
               <div className="bf-kpi rounded-2xl pt-3.5 px-3.5 pb-3 bg-card border shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_4px_24px_rgba(0,0,0,0.12)] border-warning/20 mb-3.5 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="w-9 h-9 rounded-[10px] bg-background flex items-center justify-center">
                     <DollarSign className="h-4.5 w-4.5 text-warning" />
                   </div>
                   <div>
                     <div className="text-[22px] font-bold leading-none text-warning">${outstandingBalance.toFixed(2)}</div>
                     <div className="text-[10px] font-bold uppercase tracking-wider opacity-75 mt-1 text-warning">
                       Outstanding <span className="opacity-60">across {outstandingCount} order{outstandingCount === 1 ? "" : "s"}</span>
                     </div>
                   </div>
                 </div>
               </div>
             )}
             <div className={`${tw.card} !p-4.5 !mt-3.5 !border-2 !border-accent`}>
               <div className="flex items-center justify-between mb-3.5">
                 <div className="flex items-center gap-2">
                   <Calendar className="h-4.5 w-4.5 text-accent" />
                   <h3 className="font-body font-semibold text-foreground text-sm">Today's Tasks</h3>
                 </div>
                 {todayTasks.length > 0 && <span className="bg-accent text-white rounded-full px-2.5 py-0.5 text-[11px] font-bold">{todayTasks.length}</span>}
               </div>
               {todayTasks.length === 0
                 ? <div className="text-foreground/60 text-[13px] leading-relaxed">No tasks today — enjoy the day! 🎉</div>
                 : todayTasks.map(t => (
                   <div key={t.id} onClick={() => toggleTask(t.id)} className="flex gap-2.5 items-start py-2.5 border-b border-border cursor-pointer">
                     <div className={`bf-task-check w-5 h-5 rounded shrink-0 mt-0.5 flex items-center justify-center cursor-pointer border-[2.5px] border-accent ${t.done ? "bg-accent" : "bg-transparent"}`}>
                       {t.done && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                     </div>
                     <span className={`bf-task-text${t.done ? " done" : ""} text-[13px] leading-relaxed ${t.done ? "text-foreground/60 line-through" : "text-foreground"}`}>{t.task}</span>
                   </div>
                 ))
               }
             </div>
             {topRevenueItem && (
               <div className={`bf-card ${tw.card} !p-4.5 !mt-3.5 !bg-background !border-2 !border-foreground`}>
                 <div className="flex items-center gap-2 mb-3.5">
                   <BarChart3 className="h-4.5 w-4.5 text-foreground" />
                   <h3 className="font-body font-bold text-foreground text-sm">Business Health Insights</h3>
                 </div>
                 <div className="bg-card rounded-xl px-3.5 py-3 border border-border">
                   <div className="text-xs font-bold text-success tracking-wide uppercase mb-1">Top Revenue Item</div>
                   <div className="text-base font-extrabold text-success">{topRevenueItem[0]}</div>
                   <div className="text-xs text-success/80 mt-1 leading-relaxed">
                     {topRevenueItemPct !== null
                       ? `${topRevenueItem[0]} generated ${topRevenueItemPct}% of your total revenue — your top earner! 🎉`
                       : `Your top revenue generator — keep it on the menu!`}
                   </div>
                 </div>
               </div>
             )}
             <div className={`${tw.card} !p-4.5 !mt-3.5`}>
               <div className="flex items-center justify-between mb-3.5">
                 <div className="flex items-center gap-2">
                   <AlertCircle className="h-4.5 w-4.5 text-accent" />
                   <h3 className="font-body font-semibold text-foreground text-sm">Upcoming Orders</h3>
                 </div>
                 {orders.filter(o => o.status !== "Delivered" && o.status !== "Declined").length > 0 && (
                   <span className="bg-warning/15 text-warning rounded-full px-2.5 py-0.5 text-[11px] font-bold">{orders.filter(o => o.status !== "Delivered" && o.status !== "Declined").length}</span>
                 )}
               </div>
               {orders.filter(o => o.status !== "Delivered" && o.status !== "Declined").length === 0
                 ? <div className="text-foreground/60 text-[13px]">No open orders 🎉</div>
                 : orders.filter(o => o.status !== "Delivered" && o.status !== "Declined").slice(0, 5).map(o => {
                     const initials = (o.customer || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                     const sc = STATUS_COLORS[o.status] || C.accent;
                     return (
                       <div key={o.id} className="flex items-center gap-3 py-2.5 border-b border-border">
                         <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold tracking-wide shrink-0" style={{ background: sc + "22", color: sc }}>{initials}</div>
                         <div className="flex-1 min-w-0">
                           <div className="font-bold text-[13px] text-foreground whitespace-nowrap overflow-hidden text-ellipsis">{o.customer}</div>
                           <div className="text-xs text-foreground/60 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{orderItemsSummary(o)}</div>
                         </div>
                         <div className="text-right shrink-0">
                           {o.due && <div className="text-[11px] text-foreground/60 mb-0.5">{o.due}</div>}
                           <span style={s.tag(sc)}>{o.status}</span>
                         </div>
                       </div>
                     );
                   })
               }
             </div>

             {/* Reports (Phase 2 tokens — first use of recharts) */}
             <div className={`${tw.card} !mt-3.5`}>
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <BarChart3 className="h-4.5 w-4.5 text-accent" />
                   <h3 className="font-body font-semibold text-foreground text-sm">Reports</h3>
                 </div>
                 <button onClick={() => setReportsOpen(o => !o)} className={`${tw.btnSec} !px-3 !py-1.5 text-xs`}>
                   {reportsOpen ? "Hide Reports" : "View Reports"}
                 </button>
               </div>

               {reportsOpen && (() => {
                 const _ordersWithDates = orders.filter(o => o.created_at && o.status !== "Declined" && (o.type || "Real") === "Real");
                 let _trendData = [];
                 let _granularity = "day";
                 if (_ordersWithDates.length > 0) {
                   const _times = _ordersWithDates.map(o => new Date(o.created_at).getTime());
                   const _spanDays = (Math.max(..._times) - Math.min(..._times)) / 86400000;
                   _granularity = _spanDays > 30 ? "week" : "day";
                   // Bucket key must use the SAME (local) timezone basis as the display label —
                   // using toISOString() (UTC) for the key while the label is local-time can put
                   // an order in a different-looking bucket than its label implies near day
                   // boundaries. localDateKey() keeps both derived from local calendar day.
                   const _localDateKey = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
                   const _bucketMap = {};
                   _ordersWithDates.forEach(o => {
                     const d = new Date(o.created_at);
                     let key, label;
                     if (_granularity === "week") {
                       const dow = d.getDay();
                       const monday = new Date(d);
                       monday.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
                       monday.setHours(0, 0, 0, 0);
                       key = _localDateKey(monday);
                       label = "Wk of " + monday.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                     } else {
                       key = _localDateKey(d);
                       label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                     }
                     if (!_bucketMap[key]) _bucketMap[key] = { key, label, revenue: 0, orders: 0 };
                     _bucketMap[key].revenue += (o.total || 0);
                     _bucketMap[key].orders += 1;
                   });
                   _trendData = Object.values(_bucketMap).sort((a, b) => a.key.localeCompare(b.key));
                 }
                 const _distinctDates = _trendData.length;

                 const _bestSellers = itemOrderCountEntries.slice(0, 5).map(([name, orderCount]) => ({ name, orders: orderCount }));

                 // Most profitable recipes (profit per hour) — only recipes with saved pricing data.
                 const _normalizeRecName = (s) => (s || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "").replace(/s$/, "");
                 const _eligibleRecipes = recipes.filter(r => r.sellPrice != null && typeof r.laborMinutes === "number" && r.laborMinutes > 0);
                 const _profitRows = _eligibleRecipes.map(r => {
                   const laborHours = r.laborMinutes / 60;
                   const ingredientCost = calcRecipeCost(r, pantry);
                   const overheadAmt = ingredientCost * (defaultOverhead / 100);
                   const laborCost = laborHours * defaultLaborRate;
                   const profit = r.sellPrice - ingredientCost - overheadAmt - laborCost;
                   const profitPerHour = profit / laborHours;
                   return { id: r.id, name: r.name, profit, profitPerHour };
                 }).sort((a, b) => b.profitPerHour - a.profitPerHour);
                 const _profitVerdict = (() => {
                   if (itemOrderCountEntries.length === 0) return null;
                   const normTop = _normalizeRecName(itemOrderCountEntries[0][0]);
                   const matches = _profitRows.filter(row => _normalizeRecName(row.name) === normTop);
                   if (matches.length !== 1) return null;
                   const rank = _profitRows.findIndex(row => row.id === matches[0].id) + 1;
                   if (rank <= 1) return null;
                   return `Your most-ordered item, ${matches[0].name}, is your #${rank} most profitable by the hour.`;
                 })();

                 const _trendTooltip = ({ active, payload }) => {
                   if (!active || !payload || !payload.length) return null;
                   const p = payload[0].payload;
                   return (
                     <div className={`${tw.card} !p-3`}>
                       <div className="font-bold text-foreground text-xs mb-1">{p.label}</div>
                       <div className="text-xs text-foreground/70">Revenue: <span className="font-bold text-accent">${p.revenue.toFixed(2)}</span></div>
                       <div className="text-xs text-foreground/70">Orders: <span className="font-bold text-foreground">{p.orders}</span></div>
                     </div>
                   );
                 };
                 const _bestSellerTooltip = ({ active, payload }) => {
                   if (!active || !payload || !payload.length) return null;
                   const p = payload[0].payload;
                   return (
                     <div className={`${tw.card} !p-3`}>
                       <div className="font-bold text-foreground text-xs mb-1">{p.name}</div>
                       <div className="text-xs text-foreground/70">Orders: <span className="font-bold text-foreground">{p.orders}</span></div>
                     </div>
                   );
                 };

                 // Resolved once per render (re-runs on theme change via the MutationObserver
                 // above) — recharts renders these as raw SVG attributes, which don't reliably
                 // resolve var() the way real CSS `style` properties do, so we resolve here instead.
                 const _accentColor = cssVar("--color-accent", "#BC3B52");
                 const _borderColor = cssVar("--color-border", "#c8b89a");
                 const _fgColor     = cssVar("--color-foreground", "#1d2d44");

                 return (
                   <div className="mt-5 flex flex-col gap-6">
                     <div>
                       <h4 className={tw.section}>Revenue Trend {_trendData.length > 0 && (_granularity === "week" ? "(weekly)" : "(daily)")}</h4>
                       {_distinctDates >= 3 ? (
                         <div className="mt-2.5" style={{ height: 220, width: "100%" }}>
                           <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={_trendData}>
                               <CartesianGrid stroke={_borderColor} strokeDasharray="3 3" vertical={false} />
                               <XAxis dataKey="label" tick={{ fill: _fgColor, fontSize: 11, fillOpacity: 0.6 }} axisLine={{ stroke: _borderColor }} tickLine={false} />
                               <YAxis tick={{ fill: _fgColor, fontSize: 11, fillOpacity: 0.6 }} axisLine={false} tickLine={false} width={40} />
                               <Tooltip content={_trendTooltip} cursor={{ fill: _accentColor, fillOpacity: 0.08 }} />
                               <Bar dataKey="revenue" fill={_accentColor} radius={[4, 4, 0, 0]} />
                             </BarChart>
                           </ResponsiveContainer>
                         </div>
                       ) : (
                         <div className="mt-2.5 py-8 text-center text-sm text-foreground/50 font-body">Add a few more orders to see your sales trend.</div>
                       )}
                     </div>

                     <div>
                       <h4 className={tw.section}>Best Selling Recipes</h4>
                       {_bestSellers.length >= 3 ? (
                         <div className="mt-2.5" style={{ height: Math.max(140, _bestSellers.length * 44), width: "100%" }}>
                           <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={_bestSellers} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                               <XAxis type="number" hide />
                               <YAxis type="category" dataKey="name" width={130} tick={{ fill: _fgColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                               <Tooltip content={_bestSellerTooltip} cursor={{ fill: _accentColor, fillOpacity: 0.08 }} />
                               <Bar dataKey="orders" fill={_accentColor} radius={[0, 4, 4, 0]} barSize={18} />
                             </BarChart>
                           </ResponsiveContainer>
                         </div>
                       ) : (
                         <div className="mt-2.5 py-8 text-center text-sm text-foreground/50 font-body">Add more orders to see your best sellers.</div>
                       )}
                     </div>

                     <div>
                       <h4 className={tw.section}>Most Profitable Recipes (per hour)</h4>
                       <p className="text-xs text-foreground/40 mt-1 mb-0.5">Based on your numbers — your saved time and price, and your current profile rate and overhead.</p>
                       {_profitRows.length >= 3 ? (
                         <div className="mt-2">
                           {_profitVerdict && (
                             <div className="text-xs text-foreground/70 italic mb-2.5">{_profitVerdict}</div>
                           )}
                           {_profitRows.slice(0, 8).map(row => (
                             <div key={row.id} className="flex justify-between items-center py-2 border-b border-border last:border-b-0">
                               <span className="text-sm text-foreground truncate pr-2">{row.name}</span>
                               <span className="text-right shrink-0">
                                 <span className="font-bold text-accent text-sm">${row.profitPerHour.toFixed(2)}/hr</span>
                                 <span className="block text-[11px] text-foreground/40">${row.profit.toFixed(2)}/batch</span>
                               </span>
                             </div>
                           ))}
                         </div>
                       ) : (
                         <div className="mt-2.5 py-8 text-center text-sm text-foreground/50 font-body">Price a few recipes to see which ones actually pay. Open a recipe → Pricing → Save to recipe.</div>
                       )}
                     </div>
                   </div>
                 );
               })()}
             </div>
           </div>
           );
         })()}
        {/* ══════════ PANTRY ══════════ */}
        {tab === "Pantry" && (() => {
          const _pu = {};
          recipes.forEach(r => (r.ingredients||[]).forEach(ing => {
            const k = ing.pantryId ? String(ing.pantryId) : (ing.name||"").toLowerCase();
            _pu[k] = (_pu[k]||0) + 1;
          }));
          const _pwu = pantry.map(p => ({ ...p, _usage: Math.max(_pu[String(p.id)]||0, _pu[(p.name||"").toLowerCase()]||0) }));
          const _mostUsed = _pwu.length ? _pwu.reduce((a,b) => b._usage > a._usage ? b : a) : null;
          const _priciest = pantry.length ? pantry.reduce((a,b) => (b.costPer||0) > (a.costPer||0) ? b : a) : null;
          const _usedIds = new Set(recipes.flatMap(r => (r.ingredients||[]).map(i => String(i.pantryId)).filter(Boolean)));
          const _usedNames = new Set(recipes.flatMap(r => (r.ingredients||[]).map(i => (i.name||"").toLowerCase()).filter(Boolean)));
          const _unusedCount = pantry.filter(p => !_usedIds.has(String(p.id)) && !_usedNames.has((p.name||"").toLowerCase())).length;
          const _catCount = new Set(pantry.map(p => p.category).filter(Boolean)).size;
          const _oldest2 = [...pantry].filter(p => p.updated_at||p.created_at).sort((a,b) => new Date(a.updated_at||a.created_at) - new Date(b.updated_at||b.created_at)).slice(0,2);
          const _q = pantrySearch.trim().toLowerCase();
          const _filteredPantry = pantry.filter(p => (!_q || (p.name||"").toLowerCase().includes(_q)));
          const closePantryModal = () => { setShowNewPantry(false); setEditingPantry(null); setEditPantryForm({}); };
          return (
          <div className="flex flex-col gap-4">
            {seedMsg && <div className="bg-danger/15 border border-danger/30 text-danger rounded-lg px-3.5 py-2.5 text-xs font-bold">{seedMsg}</div>}

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-accent" />
                <h2 className="font-display font-bold text-foreground text-xl">Ingredient Pantry</h2>
              </div>
              <button onClick={() => setShowNewPantry(true)} className={`${tw.btn} flex items-center gap-1.5`}>
                <Plus className="h-3.5 w-3.5" /><span>Add Item</span>
              </button>
            </div>
            <div className="text-xs text-foreground/60 -mt-2">Master cost list — update prices here and everything recalculates automatically.</div>

            {/* Overview stats */}
            <div className={`${tw.card} flex items-center gap-4`}>
              <div className="p-3 rounded-xl bg-accent/10 text-accent"><Archive className="h-5 w-5" /></div>
              <div>
                <div className={tw.section}>Total Ingredients</div>
                <div className="text-xl font-display font-bold text-foreground mt-0.5">{pantry.length} tracked</div>
              </div>
            </div>

            {/* Search + category filter */}
            <div className={`${tw.card} flex flex-col gap-3`}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                <input placeholder="Search ingredients..." value={pantrySearch} onChange={e => setPantrySearch(e.target.value)} className={`${tw.input} pl-9`} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-[11px] font-label font-bold uppercase text-foreground/50 tracking-wider shrink-0">
                  <Filter className="h-3.5 w-3.5" /><span>Category</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {["All", ...PANTRY_CATS].map(cat => (
                    <button key={cat} onClick={() => setPantryFilter(cat)} className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors ${pantryFilter === cat ? "bg-accent text-white" : "bg-background text-foreground/60 hover:text-foreground"}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* ── Left: ingredient list ── */}
              <div className="md:col-span-2 flex flex-col gap-4">
                {(() => {
                  const _groups = PANTRY_CATS
                    .filter(cat => pantryFilter === "All" || pantryFilter === cat)
                    .map(cat => ({ cat, items: _filteredPantry.filter(p => p.category === cat) }))
                    .filter(g => g.items.length > 0);
                  if (_groups.length === 0) {
                    return (
                      <div className={`${tw.card} text-center py-12 text-foreground/40`}>
                        <Archive className="h-8 w-8 mx-auto mb-2 text-foreground/20" />
                        <p className="text-sm font-bold">{pantry.length === 0 ? "No ingredients yet — add your first one!" : "No ingredients found for this search/filter."}</p>
                      </div>
                    );
                  }
                  return _groups.map(({ cat, items }) => (
                    <div key={cat} className="flex flex-col gap-2">
                      <h3 className={tw.section}>{cat}</h3>
                      <div className="flex flex-col gap-2">
                        {items.map(item => (
                          <div key={item.id} className={`${tw.card} flex items-center justify-between gap-4`}>
                            <div className="min-w-0">
                              <div className="font-bold text-foreground text-sm truncate">{item.name}</div>
                              <div className="text-xs text-foreground/50 mt-0.5 truncate">{item.storeUnit} · ${item.storeCost?.toFixed(2)} → {item.yields} {item.unit}</div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <div className="font-mono font-bold text-foreground">${item.costPer?.toFixed(2)}</div>
                                <div className="text-[10px] text-foreground/40">per {item.unit}</div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => { setEditingPantry(item.id); setEditPantryForm({ id: item.id, name: item.name, category: item.category, storeCost: item.storeCost, yields: item.yields, unit: item.unit, storeUnit: item.storeUnit || "", gramsPerCup: (item.gramsPerCup ?? item.grams_per_cup ?? "") }); }} className="p-1.5 rounded-lg text-foreground/40 hover:text-accent hover:bg-background transition-colors">
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => deletePantryItem(item.id)} className="p-1.5 rounded-lg text-foreground/40 hover:text-danger hover:bg-background transition-colors">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {/* ── Right: sidebar ── */}
              <div className="flex flex-col gap-4">
                <div className={tw.card}>
                  <h3 className={`${tw.section} mb-3`}>Pantry Snapshot</h3>
                  <div className="flex flex-col gap-2.5">
                    {[
                      { label: "Total ingredients", value: pantry.length },
                      { label: "Categories", value: _catCount },
                      { label: "Most used", value: _mostUsed ? _mostUsed.name : "—" },
                      { label: "Priciest", value: _priciest ? _priciest.name : "—" },
                      { label: "Unused items", value: _unusedCount },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between items-baseline gap-3 text-xs">
                        <span className="text-foreground/50 shrink-0">{row.label}</span>
                        <span className="font-bold text-foreground text-right break-words">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {_mostUsed && _mostUsed._usage > 0 && (
                  <div className="bg-foreground text-background rounded-card p-5">
                    <h3 className="font-bold text-xs mb-2 opacity-90">💡 Ingredient Insight</h3>
                    <p className="text-xs leading-relaxed opacity-80">
                      <strong>{_mostUsed.name}</strong> appears in <strong>{_mostUsed._usage}</strong> of your recipes. A $1 price change here ripples into <strong>${(_mostUsed._usage).toFixed(2)}</strong> of recipe cost shifts.
                    </p>
                  </div>
                )}

                {_oldest2.length > 0 && (
                  <div className={`${tw.card} border-l-4 border-l-accent`}>
                    <h3 className={`${tw.section} mb-2`}>⏰ Price Check Reminder</h3>
                    <p className="text-xs text-foreground/60 leading-relaxed">
                      {_oldest2.length >= 2
                        ? <><strong className="text-foreground">{_oldest2[0].name}</strong>{" & "}<strong className="text-foreground">{_oldest2[1].name}</strong>{" haven't been updated in 60+ days. Costs may have shifted."}</>
                        : <><strong className="text-foreground">{_oldest2[0].name}</strong>{" hasn't been updated in 60+ days. Costs may have shifted."}</>
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Add/Edit ingredient modal ── */}
            {(showNewPantry || editingPantry) && (
              <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                <div className="bg-card border border-border rounded-card shadow-card w-full max-w-lg max-h-[85vh] overflow-y-auto">
                  <div className="flex items-center justify-between p-5 border-b border-border/60">
                    <h3 className="font-display font-bold text-foreground text-lg">{editingPantry ? "Edit Pantry Ingredient" : "Add Pantry Ingredient"}</h3>
                    <button onClick={closePantryModal} className="text-foreground/40 hover:text-foreground text-xl leading-none px-1">✕</button>
                  </div>
                  <div className="p-5 flex flex-col gap-3.5">
                    {editingPantry ? (
                      <>
                        <div>
                          <label className={tw.eyebrow}>Ingredient Name</label>
                          <input value={editPantryForm.name || ""} onChange={e => setEditPantryForm(f => ({ ...f, name: e.target.value }))} className={tw.input} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={tw.eyebrow}>Category</label>
                            <select value={editPantryForm.category || ""} onChange={e => setEditPantryForm(f => ({ ...f, category: e.target.value }))} className={tw.input}>{PANTRY_CATS.map(c => <option key={c}>{c}</option>)}</select>
                          </div>
                          <div>
                            <label className={tw.eyebrow}>Recipe Unit</label>
                            <select value={editPantryForm.unit || ""} onChange={e => setEditPantryForm(f => ({ ...f, unit: e.target.value }))} className={tw.input}>{UNITS.map(u => <option key={u}>{u}</option>)}</select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={tw.eyebrow}>Store Unit</label>
                            <input placeholder="e.g. 5 lb bag" value={editPantryForm.storeUnit || ""} onChange={e => setEditPantryForm(f => ({ ...f, storeUnit: e.target.value }))} className={tw.input} />
                          </div>
                          <div>
                            <label className={tw.eyebrow}>Store Cost ($)</label>
                            <input type="number" step="0.01" value={editPantryForm.storeCost || ""} onChange={e => setEditPantryForm(f => ({ ...f, storeCost: e.target.value }))} className={tw.input} />
                          </div>
                        </div>
                        <div>
                          <label className={tw.eyebrow}>Yields ({editPantryForm.unit})</label>
                          <input type="number" step="0.1" value={editPantryForm.yields || ""} onChange={e => setEditPantryForm(f => ({ ...f, yields: e.target.value }))} className={tw.input} />
                        </div>
                        <div>
                          <label className={tw.eyebrow}>Grams per cup (only for cups↔grams)</label>
                          <input type="number" step="1" placeholder={suggestDensity(editPantryForm.name) ? `e.g. ${suggestDensity(editPantryForm.name)}` : "leave blank if never measured both ways"} value={editPantryForm.gramsPerCup || ""} onChange={e => setEditPantryForm(f => ({ ...f, gramsPerCup: e.target.value }))} className={tw.input} />
                          {!editPantryForm.gramsPerCup && suggestDensity(editPantryForm.name) && (
                            <button type="button" onClick={() => setEditPantryForm(f => ({ ...f, gramsPerCup: String(suggestDensity(editPantryForm.name)) }))} className="mt-1 text-xs text-accent hover:underline">Use suggested {suggestDensity(editPantryForm.name)} g/cup</button>
                          )}
                        </div>
                        {editPantryForm.storeCost && editPantryForm.yields && (
                          <div className="bg-background rounded-lg px-3.5 py-2.5 text-xs text-foreground/70">
                            💡 Cost per {editPantryForm.unit}: <strong className="text-foreground">${(parseFloat(editPantryForm.storeCost) / parseFloat(editPantryForm.yields)).toFixed(2)}</strong>
                          </div>
                        )}
                        <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
                          <button onClick={closePantryModal} className={`${tw.btnSec} bg-background text-accent border-accent`}>Cancel</button>
                          <button onClick={savePantryEdit} className={tw.btn}>Update Ingredient</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className={tw.eyebrow}>Ingredient Name</label>
                          <input placeholder="e.g. Unbleached Bread Flour" value={newPantry.name} onChange={e => setNewPantry(p => ({ ...p, name: e.target.value }))} className={tw.input} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={tw.eyebrow}>Category</label>
                            <select value={newPantry.category} onChange={e => setNewPantry(p => ({ ...p, category: e.target.value }))} className={tw.input}>{PANTRY_CATS.map(c => <option key={c}>{c}</option>)}</select>
                          </div>
                          <div>
                            <label className={tw.eyebrow}>Recipe Unit</label>
                            <select value={newPantry.unit} onChange={e => setNewPantry(p => ({ ...p, unit: e.target.value }))} className={tw.input}>{UNITS.map(u => <option key={u}>{u}</option>)}</select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={tw.eyebrow}>Store Unit</label>
                            <input placeholder="e.g. 5lb bag" value={newPantry.storeUnit} onChange={e => setNewPantry(p => ({ ...p, storeUnit: e.target.value }))} className={tw.input} />
                          </div>
                          <div>
                            <label className={tw.eyebrow}>Store Cost ($)</label>
                            <input type="number" step="0.01" value={newPantry.storeCost} onChange={e => setNewPantry(p => ({ ...p, storeCost: e.target.value }))} className={tw.input} />
                          </div>
                        </div>
                        <div>
                          <label className={tw.eyebrow}>Yields ({newPantry.unit})</label>
                          <input type="number" step="0.1" value={newPantry.yields} onChange={e => setNewPantry(p => ({ ...p, yields: e.target.value }))} className={tw.input} />
                        </div>
                        <div>
                          <label className={tw.eyebrow}>Grams per cup (only for cups↔grams)</label>
                          <input type="number" step="1" placeholder={suggestDensity(newPantry.name) ? `e.g. ${suggestDensity(newPantry.name)}` : "leave blank if never measured both ways"} value={newPantry.gramsPerCup} onChange={e => setNewPantry(p => ({ ...p, gramsPerCup: e.target.value }))} className={tw.input} />
                          {!newPantry.gramsPerCup && suggestDensity(newPantry.name) && (
                            <button type="button" onClick={() => setNewPantry(p => ({ ...p, gramsPerCup: String(suggestDensity(newPantry.name)) }))} className="mt-1 text-xs text-accent hover:underline">Use suggested {suggestDensity(newPantry.name)} g/cup</button>
                          )}
                        </div>
                        {newPantry.storeCost && newPantry.yields && (
                          <div className="bg-background rounded-lg px-3.5 py-2.5 text-xs text-foreground/70">
                            💡 Cost per {newPantry.unit}: <strong className="text-foreground">${(parseFloat(newPantry.storeCost) / parseFloat(newPantry.yields)).toFixed(2)}</strong>
                          </div>
                        )}
                        <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
                          <button onClick={closePantryModal} className={`${tw.btnSec} bg-background text-accent border-accent`}>Cancel</button>
                          <button onClick={addPantryItem} className={tw.btn}>Save Item</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          );
        })()}

        {/* ══════════ RECIPES ══════════ */}
        {tab === "Recipes" && (() => {
          const _filteredRecipes = recipes.filter(r => r.name.toLowerCase().includes(recipeSearch.toLowerCase()));
          const _selRecipe = selRecipe ? (recipes.find(x => x.id === selRecipe.id) || selRecipe) : null;
          const _selCost = _selRecipe ? calcRecipeCost(_selRecipe, pantry) : 0;
          const closeRecipeModal = () => { setShowNewRec(false); setEditRec(null); };
          return (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-accent" />
                <h2 className="font-display font-bold text-foreground text-xl">Recipes ({recipes.length})</h2>
              </div>
              <button onClick={() => setShowNewRec(true)} className={`${tw.btn} flex items-center gap-1.5`}>
                <Plus className="h-3.5 w-3.5" /><span>Add Recipe</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* ── LEFT: Recipe Catalog ── */}
              <div className="lg:col-span-1 flex flex-col gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                  <input placeholder="Search recipes..." value={recipeSearch} onChange={e => setRecipeSearch(e.target.value)} className={`${tw.input} pl-9`} />
                </div>
                <div className="flex flex-col gap-2.5 max-h-[75vh] overflow-y-auto pr-0.5">
                  {_filteredRecipes.map(r => {
                    const totalCost = calcRecipeCost(r, pantry);
                    const isSel = selRecipe?.id === r.id;
                    return (
                      <div
                        key={r.id}
                        onClick={() => { setSelRecipe(r); setScale(1); }}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-colors ${isSel ? "bg-accent/5 border-accent/40" : "bg-card border-border hover:border-accent/30"}`}
                      >
                        <div className="flex gap-3 items-start">
                          {r.photo
                            ? <img src={r.photo} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
                            : <div className="w-11 h-11 rounded-lg bg-background flex items-center justify-center text-lg shrink-0">🧁</div>}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <h3 className={`text-sm font-bold leading-tight ${isSel ? "text-accent" : "text-foreground"}`}>{r.name}</h3>
                              <span className="font-mono text-xs font-bold text-foreground/70 shrink-0">${totalCost.toFixed(2)}</span>
                            </div>
                            <div className="text-[11px] text-foreground/50 mt-1">{r.category} · {r.servings} servings</div>
                            <div className="text-[11px] font-bold text-success mt-1">${(totalCost / r.servings).toFixed(3)} / piece</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {_filteredRecipes.length === 0 && (
                    <div className={`${tw.card} text-center py-12 text-foreground/40`}>
                      <BookOpen className="h-8 w-8 mx-auto mb-2 text-foreground/20" />
                      <p className="text-sm font-bold">{recipes.length === 0 ? "No recipes yet — add your first one!" : "No recipes found for this search."}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── RIGHT: Recipe Detail & Scaling ── */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                {_selRecipe ? (
                  <>
                    {/* Header card */}
                    <div className={`${tw.card} relative`}>
                      <div className="absolute right-5 top-5 flex gap-1.5">
                        <button onClick={() => { setPricingRecId(String(_selRecipe.id)); setPricingSvgs(_selRecipe.servings); setSellQty(_selRecipe.servings); setTab("Pricing"); }} className={`${tw.btnSec} bg-background text-accent border-accent`}>→ Price It</button>
                        <button onClick={() => { setEditRec({ ..._selRecipe }); setEditIngInput({ pantryId: "", amount: "", unit: "cups" }); }} className="p-2 rounded-lg text-foreground/40 hover:text-accent hover:bg-background transition-colors">
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button onClick={() => deleteRecipe(_selRecipe.id)} className="p-2 rounded-lg text-foreground/40 hover:text-danger hover:bg-background transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex gap-4 items-start pr-40">
                        <PhotoUpload value={_selRecipe.photo} onChange={async v => { await supabase.from("recipes").update({ photo: v }).eq("id", _selRecipe.id); setRecipes(prev => prev.map(x => x.id === _selRecipe.id ? { ...x, photo: v } : x)); }} />
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-accent block mb-1">{_selRecipe.category}</span>
                          <h1 className="text-2xl font-display font-black text-foreground tracking-tight">{_selRecipe.name}</h1>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-warning flex items-center gap-1 mb-2">
                          <ShieldAlert className="h-3.5 w-3.5" /><span>Major Allergens</span>
                        </div>
                        {(_selRecipe.allergens && _selRecipe.allergens.length > 0) ? (
                          <div className="flex flex-wrap gap-1.5">
                            {_selRecipe.allergens.map(a => (
                              <span key={a} className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-accent/10 text-accent">{a}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-foreground/40 italic">No major allergens declared</span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border/60">
                        <div className="bg-background rounded-lg px-3.5 py-2">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-foreground/40">Yield</div>
                          <div className="text-sm font-bold text-foreground">{_selRecipe.servings} servings</div>
                        </div>
                        <div className="bg-background rounded-lg px-3.5 py-2">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-foreground/40">Batch Cost</div>
                          <div className="text-sm font-bold text-foreground">${_selCost.toFixed(2)}</div>
                        </div>
                        <div className="bg-background rounded-lg px-3.5 py-2">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-foreground/40">Cost / Piece</div>
                          <div className="text-sm font-bold text-success">${(_selCost / _selRecipe.servings).toFixed(3)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Baking Scaling panel */}
                    <div className={tw.card}>
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-border/60 mb-4">
                        <div className="flex items-center gap-2">
                          <Scale className="h-4.5 w-4.5 text-accent" />
                          <h3 className="font-display font-bold text-foreground text-base">Baking Scaling Engine</h3>
                        </div>
                        <div className="flex gap-1 bg-background rounded-full p-1">
                          {[0.5, 1, 1.5, 2, 3].map(f => (
                            <button key={f} onClick={() => setScale(f)} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${scale === f ? "bg-accent text-white" : "text-foreground/60 hover:text-foreground"}`}>{f}×</button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-background rounded-xl p-3.5">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">Scaled Yield</div>
                          <div className="text-xl font-display font-extrabold text-foreground mt-1">{Math.round(_selRecipe.servings * scale)} <span className="text-xs font-normal text-foreground/40">servings</span></div>
                        </div>
                        <div className="bg-background rounded-xl p-3.5">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">Scaled Ingredient Cost</div>
                          <div className="text-xl font-display font-extrabold text-success mt-1">${(_selCost * scale).toFixed(2)}</div>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/50 mb-2">Scaled Ingredients — {Math.round(_selRecipe.servings * scale)} servings</h4>
                      <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-0.5">
                        {_selRecipe.ingredients.map((ing, i) => {
                          const uc = calcIngCost(ing, pantry);
                          return (
                            <div key={i} className="flex justify-between items-center py-2 border-b border-border/50 text-sm">
                              <span className="text-foreground/80">{ingDisplayName(ing, pantry)}</span>
                              <div className="text-right">
                                <span className="font-mono font-bold text-foreground">{Math.round(ing.amount * scale * 100) / 100} {ing.unit}</span>
                                {uc !== null && <span className="text-foreground/40 text-[11px] ml-1.5">(${(uc * scale).toFixed(2)})</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {_selRecipe.notes && (
                        <div className="mt-4 pt-4 border-t border-border/60">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/50 mb-1.5">Instructions</h4>
                          <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">{_selRecipe.notes}</p>
                        </div>
                      )}

                      {_selRecipe.ingredientsList && (
                        <div className="mt-4 pt-4 border-t border-border/60">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/50 mb-1.5">Ingredients List</h4>
                          <p className="text-xs text-foreground/50 italic leading-relaxed">{_selRecipe.ingredientsList}</p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className={`${tw.card} text-center py-16 text-foreground/40`}>
                    <BookOpen className="h-9 w-9 mx-auto mb-2 text-foreground/20" />
                    <p className="text-sm font-bold">Select a recipe from the catalog to view details.</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Add/Edit Recipe modal ── */}
            {(showNewRec || editRec) && (
              <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                <div className="bg-card border border-border rounded-card shadow-card w-full max-w-lg max-h-[88vh] overflow-y-auto">
                  <div className="flex items-center justify-between p-5 border-b border-border/60">
                    <h3 className="font-display font-bold text-foreground text-lg">{editRec ? "Edit Recipe" : "New Recipe"}</h3>
                    <button onClick={closeRecipeModal} className="text-foreground/40 hover:text-foreground text-xl leading-none px-1">✕</button>
                  </div>
                  <div className="p-5 flex flex-col gap-3.5">
                    {editRec ? (
                      <>
                        <div>
                          <label className={tw.eyebrow}>Recipe Name</label>
                          <input value={editRec.name} onChange={e => setEditRec(r => ({ ...r, name: e.target.value }))} className={tw.input} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={tw.eyebrow}>Category</label>
                            <select value={editRec.category} onChange={e => setEditRec(r => ({ ...r, category: e.target.value }))} className={tw.input}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
                          </div>
                          <div>
                            <label className={tw.eyebrow}>Servings</label>
                            <input type="number" value={editRec.servings} onChange={e => setEditRec(r => ({ ...r, servings: +e.target.value }))} className={tw.input} />
                          </div>
                        </div>
                        <div>
                          <label className={tw.eyebrow}>Ingredients</label>
                          <div className="bg-background rounded-lg p-3 flex flex-col gap-1">
                            {editRec.ingredients.length === 0 && <span className="text-xs text-foreground/40">No ingredients yet.</span>}
                            {editRec.ingredients.map((ing, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs text-foreground/70">
                                <span>• {ing.amount} {ing.unit} {ing.name}</span>
                                <button onClick={() => setEditRec(r => ({ ...r, ingredients: r.ingredients.filter((_, j) => j !== idx) }))} className="text-foreground/30 hover:text-danger px-1 text-base leading-none">×</button>
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <select value={editIngInput.pantryId} onChange={e => { const item = pantry.find(p => p.id === parseInt(e.target.value)); setEditIngInput(x => ({ ...x, pantryId: e.target.value, unit: item?.unit || "cups" })); }} className={`${tw.input} flex-1 min-w-[140px]`}>
                              <option value="">— Add ingredient —</option>
                              {pantry.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <input type="number" step="0.25" placeholder="Amt" value={editIngInput.amount} onChange={e => setEditIngInput(x => ({ ...x, amount: e.target.value }))} className={`${tw.input} w-16`} />
                            <select value={editIngInput.unit} onChange={e => setEditIngInput(x => ({ ...x, unit: e.target.value }))} className={`${tw.input} w-20`}>{UNITS.map(u => <option key={u}>{u}</option>)}</select>
                            <button onClick={addEditRecipeIng} className={`${tw.btn} !px-3`}>+</button>
                          </div>
                          <div className="text-[11px] text-foreground/40 mt-1">💡 Fractions as decimals: 1/4 = 0.25 · 1/3 = 0.33 · 1/2 = 0.5 · 2/3 = 0.67 · 3/4 = 0.75</div>
                        </div>
                        <div>
                          <label className={tw.eyebrow}>Instructions</label>
                          <textarea placeholder="Notes / instructions" value={editRec.notes || ""} onChange={e => setEditRec(r => ({ ...r, notes: e.target.value }))} className={`${tw.input} h-20 resize-y`} />
                        </div>
                        <div>
                          <label className={tw.eyebrow}>Major Allergens</label>
                          <div className="flex flex-wrap gap-1.5">
                            {ALLERGENS.map(a => {
                              const checked = (editRec.allergens || []).includes(a);
                              return (
                                <label key={a} className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full cursor-pointer transition-colors ${checked ? "bg-accent text-white" : "bg-background text-foreground/60 border border-border"}`}>
                                  <input type="checkbox" checked={checked} onChange={() => setEditRec(r => ({ ...r, allergens: checked ? (r.allergens || []).filter(x => x !== a) : [...(r.allergens || []), a] }))} className="hidden" />
                                  {a}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <label className={tw.eyebrow}>Ingredients List (optional — not required under Texas law)</label>
                          <textarea placeholder="e.g. Enriched flour, sugar, butter, eggs, vanilla extract..." value={editRec.ingredientsList || ""} onChange={e => setEditRec(r => ({ ...r, ingredientsList: e.target.value }))} className={`${tw.input} h-14 resize-y`} />
                        </div>
                        <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
                          <button onClick={closeRecipeModal} className={`${tw.btnSec} bg-background text-accent border-accent`}>Cancel</button>
                          <button onClick={saveRecipeEdit} className={tw.btn}>Save Changes</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className={tw.eyebrow}>Photo</label>
                          <PhotoUpload value={newRec.photo} onChange={v => setNewRec(r => ({ ...r, photo: v }))} />
                        </div>
                        <div>
                          <label className={tw.eyebrow}>Recipe Name</label>
                          <input placeholder="e.g. Lavender Shortbread" value={newRec.name} onChange={e => setNewRec(r => ({ ...r, name: e.target.value }))} className={tw.input} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={tw.eyebrow}>Category</label>
                            <select value={newRec.category} onChange={e => setNewRec(r => ({ ...r, category: e.target.value }))} className={tw.input}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
                          </div>
                          <div>
                            <label className={tw.eyebrow}>Servings</label>
                            <input type="number" value={newRec.servings} onChange={e => setNewRec(r => ({ ...r, servings: +e.target.value }))} className={tw.input} />
                          </div>
                        </div>
                        <div>
                          <label className={tw.eyebrow}>Ingredients ({newRec.ingredients.length})</label>
                          {newRec.ingredients.length > 0 && (
                            <div className="bg-background rounded-lg p-3 flex flex-col gap-1 mb-2">
                              {newRec.ingredients.map((ing, i) => <div key={i} className="text-xs text-foreground/70">• {ing.amount} {ing.unit} {ing.name}</div>)}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1.5">
                            <select value={recIngInput.pantryId} onChange={e => { const item = pantry.find(p => p.id === parseInt(e.target.value)); setRecIngInput(x => ({ ...x, pantryId: e.target.value, unit: item?.unit || "cups" })); }} className={`${tw.input} flex-1 min-w-[140px]`}>
                              <option value="">— Select ingredient —</option>
                              {pantry.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <input type="number" step="0.25" placeholder="Amt" value={recIngInput.amount} onChange={e => setRecIngInput(x => ({ ...x, amount: e.target.value }))} className={`${tw.input} w-16`} />
                            <select value={recIngInput.unit} onChange={e => setRecIngInput(x => ({ ...x, unit: e.target.value }))} className={`${tw.input} w-20`}>{UNITS.map(u => <option key={u}>{u}</option>)}</select>
                            <button onClick={addRecipeIng} className={`${tw.btn} !px-3`}>+</button>
                          </div>
                          <div className="text-[11px] text-foreground/40 mt-1">💡 Fractions as decimals: 1/4 = 0.25 · 1/3 = 0.33 · 1/2 = 0.5 · 2/3 = 0.67 · 3/4 = 0.75</div>
                        </div>
                        <div>
                          <label className={tw.eyebrow}>Instructions</label>
                          <textarea placeholder="Notes / instructions" value={newRec.notes} onChange={e => setNewRec(r => ({ ...r, notes: e.target.value }))} className={`${tw.input} h-20 resize-y`} />
                        </div>
                        <div>
                          <label className={tw.eyebrow}>Major Allergens</label>
                          <div className="flex flex-wrap gap-1.5">
                            {ALLERGENS.map(a => {
                              const checked = newRec.allergens.includes(a);
                              return (
                                <label key={a} className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full cursor-pointer transition-colors ${checked ? "bg-accent text-white" : "bg-background text-foreground/60 border border-border"}`}>
                                  <input type="checkbox" checked={checked} onChange={() => setNewRec(r => ({ ...r, allergens: checked ? r.allergens.filter(x => x !== a) : [...r.allergens, a] }))} className="hidden" />
                                  {a}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <label className={tw.eyebrow}>Ingredients List (optional — not required under Texas law)</label>
                          <textarea placeholder="e.g. Enriched flour, sugar, butter, eggs, vanilla extract..." value={newRec.ingredientsList} onChange={e => setNewRec(r => ({ ...r, ingredientsList: e.target.value }))} className={`${tw.input} h-14 resize-y`} />
                        </div>
                        <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
                          <button onClick={closeRecipeModal} className={`${tw.btnSec} bg-background text-accent border-accent`}>Cancel</button>
                          <button onClick={addRecipe} className={tw.btn}>Save Recipe</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          );
        })()}

        {/* ══════════ PRICING ══════════ */}
        {tab === "Pricing" && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="font-display font-bold text-foreground text-xl">Pricing Calculator</h2>
              <p className="text-xs text-foreground/60 mt-1 leading-relaxed">Enter your recipe costs and labor, then set your selling price or let BakeFlo suggest one.</p>
            </div>

            {/* Input parameters card */}
            <div className={tw.card}>
              <div className="flex items-center gap-2 border-b border-border/60 pb-3 mb-4">
                <Calculator className="h-5 w-5 text-accent" />
                <h3 className="font-display font-bold text-foreground text-base">Costing &amp; Markup Calculator</h3>
              </div>

              <div className={`${tw.section} mb-2`}>Step 1 — Link a Recipe (optional)</div>
              <select value={pricingRecId} onChange={e => { setPricingRecId(e.target.value); setPricingSaveMsg(""); if (e.target.value) { const r = recipes.find(r => r.id === parseInt(e.target.value)); if (r) { setPricingSvgs(r.servings); setSellQty(r.servings); if (r.laborMinutes != null) setLaborHrs(r.laborMinutes / 60); if (r.sellPrice != null) setSellingPrice(String(r.sellPrice)); } } }} className={tw.input}>
                <option value="">— No recipe, enter costs manually —</option>
                {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              {pricingRecId && (() => {
                const r = recipes.find(r => r.id === parseInt(pricingRecId));
                if (!r) return null;
                const batchCost = calcRecipeCost(r, pantry);
                const sf = pricingSvgs / r.servings;
                return (
                  <div className="bg-background rounded-lg p-3 mt-3">
                    <div className="mb-2">
                      <label className={tw.eyebrow}>Quantity / servings selling</label>
                      <input type="number" value={pricingSvgs} onChange={e => { setPricingSvgs(+e.target.value); setSellQty(+e.target.value); }} className={`${tw.input} w-32`} />
                    </div>
                    <div className="text-sm">
                      {r.ingredients.map((ing, i) => { const c = calcIngCost(ing, pantry); return <div key={i} className="flex justify-between py-0.5 text-xs text-foreground/50"><span>{+(ing.amount * sf).toFixed(2)} {ing.unit} {ingDisplayName(ing, pantry)}</span><span>{c !== null ? `$${(c * sf).toFixed(2)}` : "—"}</span></div>; })}
                      <div className="flex justify-between py-1.5 font-bold text-foreground mt-1 border-t border-border">
                        <span>Scaled ingredient cost</span><span>${(batchCost * sf).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className={`${tw.section} mt-5 mb-2 flex items-center gap-1.5`}><Coins className="h-3.5 w-3.5" /><span>Step 2 — Extra Costs</span></div>
              {extraCosts.map((ec, i) => <div key={i} className="flex justify-between text-sm py-0.5 text-foreground/70"><span>{ec.name}</span><span>${parseFloat(ec.cost).toFixed(2)}</span></div>)}
              <div className="flex gap-1.5 mt-1">
                <input placeholder="Item (e.g. cake box)" value={extraCostIn.name} onChange={e => setExtraCostIn(x => ({ ...x, name: e.target.value }))} className={`${tw.input} flex-[2]`} />
                <input type="number" step="0.01" placeholder="$" value={extraCostIn.cost} onChange={e => setExtraCostIn(x => ({ ...x, cost: e.target.value }))} className={`${tw.input} w-20`} />
                <button onClick={() => { if (extraCostIn.name) { setExtraCosts(p => [...p, { ...extraCostIn }]); setExtraCostIn({ name: "", cost: "" }); } }} className={`${tw.btn} !px-3`}>+</button>
              </div>

              <div className={`${tw.section} mt-5 mb-3`}>Step 3 — Labor &amp; Margins</div>
              {[
                { label: "LABOR HRS",   val: laborHrs,  set: setLaborHrs,  min: 0, max: 8,   step: 0.5, tooltip: "Decorating a detailed cookie? Add the extra time — your price adjusts automatically." },
                { label: "$ / HR",      val: laborRate, set: setLaborRate, min: 0, max: 50,  step: 1,   tooltip: "Not sure where to start? Try your state's minimum wage and adjust up from there." },
                { label: "MARKUP %",    val: markup,    set: setMarkup,    min: 0, max: 100, step: 1,   tooltip: "40% markup = 28.6% profit margin. Increase for more intricate or custom work." },
                { label: "OVERHEAD %",  val: overhead,  set: setOverhead,  min: 0, max: 30,  step: 1,   tooltip: "Covers utilities, packaging, and equipment wear. 10% is a common starting point." },
                { label: "RECIPE YIELD", val: sellQty,  set: setSellQty,   min: 1, max: 100, step: 1,   tooltip: "How many pieces does this recipe make? BakeFlo divides your total cost by this number to get your per-item price." },
              ].map(({ label, val, set, min, max, step, tooltip }) => (
                <div key={label} className="mb-4">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[11px] text-foreground/50 uppercase font-bold tracking-wider">{label}</span>
                    <input
                      type="number" value={val} step={step} min={min} max={max}
                      onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) set(Math.min(max, Math.max(min, v))); }}
                      onFocus={() => setFocusedPricingField(label)}
                      onBlur={() => setFocusedPricingField(null)}
                      className="w-[68px] px-2 py-1 rounded-lg border border-border text-sm font-bold text-accent text-center bg-card outline-none font-body box-border"
                    />
                  </div>
                  <input type="range" className="bf-slider" min={min} max={max} step={step} value={val} onChange={e => set(+e.target.value)} />
                  {focusedPricingField === label && (
                    <div className="text-[11px] text-foreground/50 italic mt-1.5 leading-snug">{tooltip}</div>
                  )}
                </div>
              ))}

              <div className="mt-3">
                <label className={tw.eyebrow}>Your Selling Price $</label>
                <input
                  type="number" step="0.01" placeholder="0.00"
                  value={sellingPrice}
                  onChange={e => { setSellingPrice(e.target.value); setPricingSaveMsg(""); }}
                  className={`${tw.input} text-base font-bold text-center`}
                />
              </div>
              <button onClick={suggestPrice} className={`${tw.btnSec} w-full mt-3 !py-2.5 !rounded-lg flex items-center justify-center gap-1.5`}>
                <Sparkles className="h-3.5 w-3.5" /><span>Suggest a Price — ingredients + labor + {markup}% markup</span>
              </button>
              <button onClick={calcPrice} className={`${tw.btn} w-full mt-2 !py-3 text-sm`}>Calculate Price → ingredients + labor + 40% margin</button>
            </div>

            {/* Output / results card */}
            {priceResult && (() => {
              const sp = parseFloat(sellingPrice) || 0;
              const overheadAmt = priceResult.withOH - priceResult.sub;
              const hardCosts = priceResult.ingCost + overheadAmt;
              const breakEven = priceResult.withOH;
              const pureProfit = sp - breakEven;
              const margin = sp > 0 ? (pureProfit / sp * 100) : 0;
              const targetMarginPrice40 = breakEven > 0 ? +(breakEven / 0.60).toFixed(2) : null;
              const targetMarginPrice50 = breakEven > 0 ? +(breakEven / 0.50).toFixed(2) : null;
              const bannerTone = margin < 20 ? "danger" : margin < 40 ? "warning" : "success";
              return (
                <div className={tw.card}>
                  <div className="flex items-center gap-2 border-b border-border/60 pb-3 mb-5">
                    <DollarSign className="h-5 w-5 text-accent" />
                    <h3 className="font-display font-black text-foreground text-lg">Your Complete Picture</h3>
                  </div>

                  {/* Cost breakdown — stacked rows */}
                  <div className="mb-5">
                    <div className={`${tw.section} mb-1`}>What it costs you</div>
                    <div className="flex justify-between items-center py-1.5 text-sm">
                      <span className="text-foreground/60">Ingredients</span>
                      <span className="font-mono font-bold text-foreground">${priceResult.ingCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 text-sm">
                      <span className="text-foreground/60">Overhead ({overhead}%)</span>
                      <span className="font-mono font-bold text-foreground">${overheadAmt.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 mt-1 border-t border-border text-sm font-bold">
                      <span className="text-foreground">Hard Costs</span>
                      <span className="font-mono text-foreground">${hardCosts.toFixed(2)}</span>
                    </div>

                    <div className={`${tw.section} mt-4 mb-1`}>Your time</div>
                    <div className="flex justify-between items-center py-1.5 text-sm">
                      <span className="text-foreground/60">{laborHrs} hr{laborHrs !== 1 ? "s" : ""} @ ${laborRate}/hr</span>
                      <span className="font-mono font-bold text-foreground">${priceResult.labor.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center py-2.5 mt-2 border-t-2 border-b-2 border-foreground text-base font-black">
                      <span className="text-foreground">Total to Break Even</span>
                      <span className="font-mono text-foreground">${breakEven.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Master pricing panel */}
                  <div className="p-5 md:p-6 rounded-2xl bg-foreground text-background space-y-5">
                    {suggestedPrice != null && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="uppercase font-bold tracking-wider text-background/50 text-[10px]">BakeFlo Suggests</span>
                        <span className="font-mono font-bold text-accent">${suggestedPrice.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center border-t border-background/15 pt-4">
                      <span className="uppercase font-bold tracking-wider text-background/60 text-xs">What You Charge</span>
                      <span className="text-2xl font-display font-black text-background">${sp.toFixed(2)}</span>
                    </div>

                    <div className="flex flex-wrap justify-between items-end gap-4 border-t border-background/15 pt-4">
                      <div>
                        <span className={`text-[10px] uppercase font-bold tracking-wider ${pureProfit >= 0 ? "text-success" : "text-danger"}`}>Pure Profit</span>
                        <div className={`text-3xl font-display font-black mt-1 ${pureProfit >= 0 ? "text-success" : "text-danger"}`}>${pureProfit.toFixed(2)}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-background/50 block">Profit Margin</span>
                        <span className="text-lg font-mono font-bold text-background">{margin.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Margin-coaching banner */}
                  <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold flex items-center gap-2 bg-${bannerTone}/15 text-${bannerTone}`}>
                    {margin < 20 ? <AlertCircle className="h-4 w-4 shrink-0" /> : <TrendingUp className="h-4 w-4 shrink-0" />}
                    <span>{margin < 20 ? "You may be underpricing" : margin < 40 ? "Decent margin — room to grow" : "Great margin — you're pricing well!"}</span>
                  </div>

                  {/* Contextual suggestion box */}
                  <div className="mt-3.5">
                    {margin < 20 && sp > 0 && targetMarginPrice40 && (
                      <div className="bg-warning/10 border border-warning/25 rounded-xl px-3.5 py-3">
                        <div className="text-[11px] font-bold text-warning uppercase tracking-wider mb-1.5">Pricing Suggestion</div>
                        <div className="text-sm text-foreground/70 leading-relaxed">
                          At your current price of <strong className="text-foreground">${sp.toFixed(2)}</strong>, you're only making {margin.toFixed(1)}% margin.
                          To reach a healthy <strong className="text-foreground">40% margin</strong>, consider charging <strong className="text-foreground">${targetMarginPrice40.toFixed(2)}</strong>.
                        </div>
                      </div>
                    )}
                    {margin >= 20 && margin < 40 && targetMarginPrice40 && sp < targetMarginPrice40 && (
                      <div className="bg-info/10 border border-info/25 rounded-xl px-3.5 py-3">
                        <div className="text-[11px] font-bold text-info uppercase tracking-wider mb-1.5">Room to Grow</div>
                        <div className="text-sm text-foreground/70 leading-relaxed">
                          You could raise your price to <strong className="text-foreground">${targetMarginPrice40.toFixed(2)}</strong> to hit a 40% margin.
                          {targetMarginPrice50 && ` At 50% margin that's $${targetMarginPrice50.toFixed(2)} — still competitive for home bakers.`}
                        </div>
                      </div>
                    )}
                    {margin >= 40 && (
                      <div className="bg-success/10 border border-success/25 rounded-xl px-3.5 py-3 text-sm text-foreground/70 leading-relaxed">
                        This item has strong margins — you're pricing confidently and profitably!
                        {margin >= 50 && " Your top earners like this one are the backbone of your bakery."}
                      </div>
                    )}
                  </div>

                  {pricingRecId && (
                    <div className="mt-3.5 flex items-center gap-3">
                      <button onClick={saveRecipePricing} disabled={!(sp > 0)} className={`${tw.btnSec} bg-background text-accent border-accent disabled:opacity-40 disabled:cursor-not-allowed`}>Save to recipe</button>
                      {pricingSaveMsg && <span className="text-xs text-success font-semibold">✓ {pricingSaveMsg}</span>}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ══════════ ORDERS ══════════ */}
        {tab === "Orders" && (
          <div className="flex flex-col gap-4">
            {emailModal && (
              <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center">
                <div className="bg-card rounded-t-2xl p-5 w-full max-w-[720px] max-h-[85vh] flex flex-col shadow-2xl">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <div className="font-display font-bold text-base text-foreground">✉️ Order Confirmation</div>
                      <div className="text-xs text-foreground/50 mt-0.5">For {emailModal.customer} · {orderItemsSummary(emailModal)}</div>
                    </div>
                    <button onClick={() => setEmailModal(null)} className="bg-background rounded-full w-8 h-8 shrink-0 text-foreground/60 hover:text-foreground">✕</button>
                  </div>
                  {emailLoading
                    ? <div className="flex-1 flex flex-col items-center justify-center gap-3 text-foreground/50">
                        <div className="text-3xl">✨</div>
                        <div className="text-sm">Writing your confirmation email...</div>
                      </div>
                    : <>
                      <div className="mb-2">
                        <label className={tw.eyebrow}>Subject line</label>
                        <div className={`${tw.input} text-foreground/70 bg-background`}>Order Confirmed! {orderItemsSummary(emailModal)} — {emailModal.due}</div>
                      </div>
                      <label className={tw.eyebrow}>Email body</label>
                      <textarea placeholder="Add your message to get started…" value={emailBody} onChange={e => setEmailBody(e.target.value)} className={`${tw.input} !flex-1 resize-none text-sm leading-relaxed min-h-[220px]`} />
                      <div className="flex gap-2 mt-3">
                        <button onClick={copyEmail} className={`${tw.btn} flex-1`}>{emailCopied ? "✓ Copied!" : "📋 Copy Email"}</button>
                        <button onClick={() => genEmail(emailModal)} className={`${tw.btnSec} bg-background text-accent border-accent`}>↺ Regenerate</button>
                        <button onClick={() => setEmailModal(null)} className={`${tw.btnSec} bg-background text-accent border-accent`}>Close</button>
                      </div>
                    </>
                  }
                </div>
              </div>
            )}

            {declineModalOrder && (
              <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center">
                <div className="bg-card rounded-t-2xl p-5 w-full max-w-[480px] shadow-2xl">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <div className="font-display font-bold text-base text-foreground">Decline Request</div>
                      <div className="text-xs text-foreground/50 mt-0.5">For {declineModalOrder.customer} · {declineModalOrder.due}</div>
                    </div>
                    <button onClick={() => setDeclineModalOrder(null)} className="bg-background rounded-full w-8 h-8 shrink-0 text-foreground/60 hover:text-foreground">✕</button>
                  </div>
                  <label className={tw.eyebrow}>Reason (optional)</label>
                  <textarea
                    value={declineReasonInput}
                    onChange={e => setDeclineReasonInput(e.target.value)}
                    placeholder="e.g. Fully booked that week — let them know if you'd like"
                    className={`${tw.input} resize-none text-sm min-h-[90px]`}
                  />
                  <div className="text-xs text-foreground/40 mt-1.5">If provided, this is included in the email letting {declineModalOrder.customer} know. Leave blank to decline without a reason.</div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={async () => { const o = declineModalOrder; const r = declineReasonInput; setDeclineModalOrder(null); await declineOrder(o.id, r.trim()); }}
                      disabled={decisionSending}
                      className="px-5 py-2 bg-danger text-white font-bold rounded-lg text-xs font-body cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 flex-1"
                    >
                      {decisionSending ? "Declining..." : "Confirm Decline"}
                    </button>
                    <button onClick={() => setDeclineModalOrder(null)} className={`${tw.btnSec} bg-background text-foreground border-border`}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {acceptModalOrder && (
              <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center">
                <div className="bg-card rounded-t-2xl p-5 w-full max-w-[520px] max-h-[85vh] flex flex-col shadow-2xl">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <div className="font-display font-bold text-base text-foreground">Accept Request</div>
                      <div className="text-xs text-foreground/50 mt-0.5">For {acceptModalOrder.customer} · {acceptModalOrder.due}</div>
                    </div>
                    <button onClick={() => setAcceptModalOrder(null)} className="bg-background rounded-full w-8 h-8 shrink-0 text-foreground/60 hover:text-foreground">✕</button>
                  </div>
                  <div className="text-xs text-foreground/50 mb-3">Set a price for each item — pre-filled from your menu where matched. This is a starting point; adjust as needed for add-ons or complexity.</div>
                  <div className="flex-1 overflow-y-auto flex flex-col gap-2">
                    {acceptModalOrder.items.map((li, idx) => (
                      <div key={li.id || idx} className="bg-background rounded-lg p-2.5 flex items-center gap-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-foreground truncate">{li.item}</div>
                          <div className="text-xs text-foreground/50">
                            {[li.quantity && li.quantity !== 1 && `Qty ${li.quantity}`, li.size, li.flavor].filter(Boolean).join(" · ") || "—"}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-foreground/40 text-sm">$</span>
                          <input
                            type="number" min="0" step="0.01"
                            value={acceptPrices[idx] ?? ""}
                            onChange={e => setAcceptPrices(prev => prev.map((p, i) => i === idx ? e.target.value : p))}
                            placeholder="0.00"
                            className={`${tw.input} !w-24`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center border-t border-border/60 mt-3 pt-3">
                    <span className="text-sm font-bold text-foreground">Order Total</span>
                    <span className="font-mono font-bold text-lg text-foreground">
                      ${acceptPrices.reduce((s, p) => s + (parseFloat(p) || 0), 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={async () => { const o = acceptModalOrder; const p = acceptPrices; setAcceptModalOrder(null); await acceptOrder(o, p); }}
                      disabled={decisionSending}
                      className={`${tw.btn} flex-1 disabled:opacity-50`}
                    >
                      {decisionSending ? "Accepting..." : "Confirm Accept"}
                    </button>
                    <button onClick={() => setAcceptModalOrder(null)} className={`${tw.btnSec} bg-background text-foreground border-border`}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {logPaymentOrder && (() => {
              const _availableMethods = [venmo && "Venmo", paypal && "PayPal", zelle && "Zelle", acceptsCash && "Cash", otherPay && "Other"].filter(Boolean);
              const _methodOptions = _availableMethods.length > 0 ? _availableMethods : PAYMENT_METHODS;
              return (
              <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center">
                <div className="bg-card rounded-t-2xl p-5 w-full max-w-[480px] shadow-2xl">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <div className="font-display font-bold text-base text-foreground">Log Payment</div>
                      <div className="text-xs text-foreground/50 mt-0.5">For {logPaymentOrder.customer} · {logPaymentOrder.due}</div>
                    </div>
                    <button onClick={() => setLogPaymentOrder(null)} className="bg-background rounded-full w-8 h-8 shrink-0 text-foreground/60 hover:text-foreground">✕</button>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <div>
                      <label className={tw.eyebrow}>Amount</label>
                      <input type="number" min="0" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="0.00" className={tw.input} />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className={tw.eyebrow}>Method</label>
                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={tw.input}>
                          <option value="">Select…</option>
                          {_methodOptions.map(m => <option key={m}>{m}</option>)}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className={tw.eyebrow}>Date</label>
                        <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className={tw.input} />
                      </div>
                    </div>
                    <div>
                      <label className={tw.eyebrow}>Note (optional)</label>
                      <input value={paymentNote} onChange={e => setPaymentNote(e.target.value)} placeholder="e.g. Deposit" className={tw.input} />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={logPayment} disabled={paymentSaving} className={`${tw.btn} flex-1 disabled:opacity-50`}>
                      {paymentSaving ? "Saving..." : "Save Payment"}
                    </button>
                    <button onClick={() => setLogPaymentOrder(null)} className={`${tw.btnSec} bg-background text-foreground border-border`}>Cancel</button>
                  </div>
                </div>
              </div>
              );
            })()}

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-accent" />
                <h2 className="font-display font-bold text-foreground text-xl">Orders</h2>
              </div>
              <button onClick={() => setShowNewOrder(true)} className={tw.btn}>+ New Order</button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
              <input
                placeholder="Search by customer or item..."
                value={orderSearch}
                onChange={e => setOrderSearch(e.target.value)}
                className={`${tw.input} pl-9`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-1 bg-background p-1 rounded-xl border border-border w-fit">
              {ORDER_STATUS_FILTERS.map(f => {
                const isSelected = orderStatusFilter === f;
                return (
                  <button
                    key={f}
                    onClick={() => setOrderStatusFilter(f)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                    style={isSelected ? { background: "var(--color-accent)", color: "#fff" } : { color: "var(--color-foreground)", opacity: 0.5 }}
                  >
                    {f}
                  </button>
                );
              })}
            </div>

            {showNewOrder && (
              <div className={`${tw.card} flex flex-col gap-3`}>
                <h3 className={tw.section}>New Order</h3>
                <div className="flex gap-2">
                  <input placeholder="Customer name" value={newOrder.customer} onChange={e => setNewOrder(o => ({ ...o, customer: e.target.value }))} className={`${tw.input} !flex-1`} />
                  <input placeholder="Phone" value={newOrder.phone} onChange={e => setNewOrder(o => ({ ...o, phone: formatPhone(e.target.value) }))} className={`${tw.input} !w-28`} />
                </div>
                <input placeholder="Customer email (for invoicing)" value={newOrder.email} onChange={e => setNewOrder(o => ({ ...o, email: e.target.value }))} className={tw.input} />
                <div className="flex flex-col gap-2">
                  {newOrder.items.map((it, idx) => (
                    <div key={idx} className="bg-background rounded-lg p-2.5 flex flex-col gap-2">
                      <div className="flex gap-2 items-center">
                        <input placeholder={`Item ${idx + 1}`} value={it.item} onChange={e => updateItemRow(setNewOrder, idx, "item", e.target.value)} className={`${tw.input} !flex-1`} />
                        {newOrder.items.length > 1 && (
                          <button type="button" onClick={() => removeItemRow(setNewOrder, idx)} className="text-foreground/30 hover:text-danger px-1 text-lg leading-none shrink-0">×</button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input placeholder="Size (optional)" value={it.size} onChange={e => updateItemRow(setNewOrder, idx, "size", e.target.value)} className={`${tw.input} !flex-1`} />
                        <input placeholder="Flavor (optional)" value={it.flavor} onChange={e => updateItemRow(setNewOrder, idx, "flavor", e.target.value)} className={`${tw.input} !flex-1`} />
                        <input type="number" min="1" placeholder="Qty" value={it.quantity} onChange={e => updateItemRow(setNewOrder, idx, "quantity", e.target.value)} className={`${tw.input} !w-20`} />
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => addItemRow(setNewOrder)} className={`${tw.btnSec} bg-background text-accent border-accent self-start`}>+ Add another item</button>
                </div>
                <div className="flex gap-2">
                  <input type="date" value={newOrder.due} onChange={e => setNewOrder(o => ({ ...o, due: e.target.value }))} className={`${tw.input} !flex-1`} />
                  <input type="number" placeholder="Total $" value={newOrder.total} onChange={e => setNewOrder(o => ({ ...o, total: e.target.value }))} className={`${tw.input} !w-24`} />
                  <select value={newOrder.status} onChange={e => setNewOrder(o => ({ ...o, status: e.target.value }))} className={`${tw.input} !w-36`}>{STATUS_LIST.map(st => <option key={st}>{st}</option>)}</select>
                </div>
                <div>
                  <label className={tw.eyebrow}>Order type</label>
                  <select value={newOrder.type} onChange={e => setNewOrder(o => ({ ...o, type: e.target.value }))} className={`${tw.input} !w-36`}>{ORDER_TYPES.map(t => <option key={t}>{t}</option>)}</select>
                </div>
                <textarea placeholder="Allergy / dietary note (optional)" value={newOrder.allergyNote} onChange={e => setNewOrder(o => ({ ...o, allergyNote: e.target.value }))} className={`${tw.input} h-12 resize-y`} />
                <textarea placeholder="Customer notes..." value={newOrder.notes} onChange={e => setNewOrder(o => ({ ...o, notes: e.target.value }))} className={`${tw.input} h-16 resize-y`} />
                <div className="flex gap-2">
                  <button onClick={addOrder} className={tw.btn}>Save & Auto-Schedule</button>
                  <button onClick={() => setShowNewOrder(false)} className={`${tw.btnSec} bg-background text-accent border-accent`}>Cancel</button>
                </div>
                <div className="text-[11px] text-foreground/50">✨ Tasks will be auto-added to your schedule</div>
              </div>
            )}

            {orders.filter(o => matchesOrderStatusFilter(o.status, orderStatusFilter) && orderMatchesSearchQuery(o, orderSearch.trim())).sort((a, b) => {
                // Among Pending orders, oldest request first — everything else keeps due-date order.
                if (a.status === "Pending" && b.status === "Pending") return new Date(a.created_at || 0) - new Date(b.created_at || 0);
                return (a.due || "").localeCompare(b.due || "");
              }).map(o => {
                const _t = new Date(); _t.setHours(0,0,0,0);
                const _d = o.due ? new Date(o.due + "T00:00:00") : null;
                const _diff = _d ? Math.round((_d - _t) / 86400000) : null;
                const _ov  = _d && _diff < 0 && o.status !== "Delivered" && o.status !== "Declined";
                const _tod = _d && _diff === 0;
                const _tom = _d && _diff === 1;
                const _rp  = ["Complete","Invoiced"].includes(o.status);
                const _dl  = _ov ? "🔴 Overdue" : _tod ? "🟡 Due Today" : _tom ? "🟠 Due Tomorrow" : _rp ? "🟢 Ready for Pickup" : (o.due || "—");
                const _dc  = _ov ? "#A83248" : _tod ? "#d97706" : _tom ? "#ea7c0a" : _rp ? "#5a7a5c" : undefined;
                const _si  = STATUS_LIST.indexOf(o.status);
                const _pendingLink = o.status === "Pending" && o.source === "link";
                const _declined = o.status === "Declined";
                const _placedStr = formatPlacedDate(o.created_at);
                const _waitDays = o.status === "Pending" ? daysWaiting(o.created_at) : null;
                const _pay = getPaymentSummary(o.id, o.total);
                return (
              <div key={o.id} className={`${tw.card} flex flex-col gap-4`} style={{ borderLeft: `4px solid ${_ov ? "#A83248" : "var(--color-accent)"}` }}>
                {editingOrder === o.id ? (
                  <div className="flex flex-col gap-2">
                    <h3 className={tw.section}>✏️ Edit Order</h3>
                    <div className="flex gap-2">
                      <input placeholder="Customer name" value={editOrder.customer} onChange={e => setEditOrder(x => ({ ...x, customer: e.target.value }))} className={`${tw.input} !flex-1`} />
                      <input placeholder="Phone" value={editOrder.phone} onChange={e => setEditOrder(x => ({ ...x, phone: formatPhone(e.target.value) }))} className={`${tw.input} !w-28`} />
                    </div>
                    <input placeholder="Customer email (for invoicing)" value={editOrder.email || ""} onChange={e => setEditOrder(x => ({ ...x, email: e.target.value }))} className={tw.input} />
                    <div className="flex flex-col gap-2">
                      {editOrder.items.map((it, idx) => (
                        <div key={idx} className="bg-background rounded-lg p-2.5 flex flex-col gap-2">
                          <div className="flex gap-2 items-center">
                            <input placeholder={`Item ${idx + 1}`} value={it.item} onChange={e => updateItemRow(setEditOrder, idx, "item", e.target.value)} className={`${tw.input} !flex-1`} />
                            {editOrder.items.length > 1 && (
                              <button type="button" onClick={() => removeItemRow(setEditOrder, idx)} className="text-foreground/30 hover:text-danger px-1 text-lg leading-none shrink-0">×</button>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <input placeholder="Size (optional)" value={it.size} onChange={e => updateItemRow(setEditOrder, idx, "size", e.target.value)} className={`${tw.input} !flex-1`} />
                            <input placeholder="Flavor (optional)" value={it.flavor} onChange={e => updateItemRow(setEditOrder, idx, "flavor", e.target.value)} className={`${tw.input} !flex-1`} />
                            <input type="number" min="1" placeholder="Qty" value={it.quantity} onChange={e => updateItemRow(setEditOrder, idx, "quantity", e.target.value)} className={`${tw.input} !w-20`} />
                            <input type="number" min="0" step="0.01" placeholder="Price" value={it.price ?? ""} onChange={e => updateItemRow(setEditOrder, idx, "price", e.target.value)} className={`${tw.input} !w-24`} />
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={() => addItemRow(setEditOrder)} className={`${tw.btnSec} bg-background text-accent border-accent self-start`}>+ Add another item</button>
                    </div>
                    <div className="flex gap-2">
                      <input type="date" value={editOrder.due} onChange={e => setEditOrder(x => ({ ...x, due: e.target.value }))} className={`${tw.input} !flex-1`} />
                      <input type="number" placeholder="Total $" value={editOrder.total} onChange={e => setEditOrder(x => ({ ...x, total: e.target.value }))} className={`${tw.input} !w-24`} />
                      {editOrder.status === "Declined" || (editOrder.source === "link" && editOrder.status === "Pending")
                        ? <span className="text-xs font-bold px-2.5 py-2 rounded-lg self-center" style={{ background: STATUS_COLORS[editOrder.status] + "22", color: STATUS_COLORS[editOrder.status] }}>{editOrder.status === "Pending" ? "Awaiting Accept/Decline" : editOrder.status}</span>
                        : <select value={editOrder.status} onChange={e => setEditOrder(x => ({ ...x, status: e.target.value }))} className={`${tw.input} !w-36`}>{STATUS_LIST.map(st => <option key={st}>{st}</option>)}</select>}
                    </div>
                    <div>
                      <label className={tw.eyebrow}>Order type</label>
                      <select value={editOrder.type} onChange={e => setEditOrder(x => ({ ...x, type: e.target.value }))} className={`${tw.input} !w-36`}>{ORDER_TYPES.map(t => <option key={t}>{t}</option>)}</select>
                    </div>
                    <textarea placeholder="Allergy / dietary note (optional)" value={editOrder.allergyNote} onChange={e => setEditOrder(x => ({ ...x, allergyNote: e.target.value }))} className={`${tw.input} h-12 resize-y`} />
                    <textarea placeholder="Notes..." value={editOrder.notes} onChange={e => setEditOrder(x => ({ ...x, notes: e.target.value }))} className={`${tw.input} h-16 resize-y`} />
                    <div className="flex gap-2">
                      <button onClick={saveEditOrder} className={tw.btn}>Save Changes</button>
                      <button onClick={() => { setEditingOrder(null); setEditOrder(null); }} className={`${tw.btnSec} bg-background text-accent border-accent`}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between gap-3 border-b border-border/60 pb-3">
                      <div>
                        <h3 className="font-display font-bold text-foreground text-base flex items-center gap-1.5">
                          {o.customer}
                          {(o.type || "Real") !== "Real" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-foreground/10 text-foreground/60 uppercase tracking-wide">{o.type}</span>
                          )}
                        </h3>
                        <div className="text-xs text-foreground/60 mt-0.5">{orderItemsSummary(o)}</div>
                        {_placedStr && (
                          <div className="text-xs text-foreground/50 mt-0.5">
                            Placed {_placedStr}{_waitDays !== null && _waitDays >= 0 && ` · waiting ${_waitDays} day${_waitDays === 1 ? "" : "s"}`}
                          </div>
                        )}
                        <div className="text-xs mt-1" style={{ color: _dc || "var(--color-foreground)", opacity: _dc ? 1 : 0.5, fontWeight: (_ov||_tod||_tom) ? 600 : 400 }}>
                          {_dl}{o.phone && <span className="text-foreground/50 font-normal"> · {o.phone}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-lg text-foreground">${o.total}</div>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-block mt-1" style={{ background: STATUS_COLORS[o.status] + "22", color: STATUS_COLORS[o.status] }}>{o.status}</span>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-block mt-1 ml-1 border" style={{ background: "transparent", borderColor: PAYMENT_STATUS_COLORS[_pay.status], color: PAYMENT_STATUS_COLORS[_pay.status] }}>{_pay.status}</span>
                      </div>
                    </div>

                    {/* Progress timeline (not meaningful for a terminal Declined order) */}
                    {!_declined && (
                      <div className="relative py-2">
                        <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-0.5 bg-border" />
                        <div className="absolute left-2 h-0.5 bg-accent transition-all duration-300" style={{ top: "50%", transform: "translateY(-50%)", width: `calc(${(_si / (STATUS_LIST.length - 1)) * 100}% - 16px)` }} />
                        <div className="relative flex justify-between">
                          {STATUS_LIST.map((st, i) => (
                            <div key={st} className="flex flex-col items-center gap-1">
                              <div title={st} className={`h-3.5 w-3.5 rounded-full border-[3px] z-10 transition-all ${i === _si ? "bg-accent border-accent scale-125 ring-4 ring-accent/20" : i < _si ? "bg-accent border-accent" : "bg-card border-border"}`} />
                              <span className="text-[9px] font-bold text-foreground/40 uppercase tracking-wide hidden sm:block">{st}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {_pendingLink && <div className="bg-info/10 border border-info/25 rounded-lg px-3 py-2 text-xs text-info">📥 New request from your order link — accept to schedule it, or decline.</div>}
                    {(o.items || []).some(li => li.size || li.flavor || (li.quantity && li.quantity !== 1)) && (
                      <div className="text-xs text-foreground/60 -mt-1 flex flex-col gap-0.5">
                        {(o.items || []).map((li, idx) => {
                          const detail = [li.quantity && li.quantity !== 1 && `Qty ${li.quantity}`, li.size, li.flavor].filter(Boolean).join(" · ");
                          return detail ? <div key={li.id || idx}>{o.items.length > 1 ? `${li.item}: ` : ""}{detail}</div> : null;
                        })}
                      </div>
                    )}
                    {o.allergy_note && <div className="bg-warning/10 border border-warning/25 rounded-lg px-3 py-2 text-xs text-warning">⚠️ Allergy/dietary note: {o.allergy_note}</div>}
                    {o.notes && <div className="bg-background rounded-lg px-3 py-2 text-xs text-foreground/70 italic">📝 {o.notes}</div>}
                    {_declined && o.decline_reason && <div className="bg-background rounded-lg px-3 py-2 text-xs text-foreground/60"><span className="font-bold">Decline reason:</span> {o.decline_reason}</div>}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {_pendingLink ? (
                        <div className="flex gap-2">
                          <button onClick={() => openAcceptModal(o)} disabled={decisionSending} className={`${tw.btn} px-4 py-1.5 flex items-center gap-1.5 disabled:opacity-50`}>
                            <Check className="h-3.5 w-3.5" /><span>Accept</span>
                          </button>
                          <button onClick={() => { setDeclineModalOrder(o); setDeclineReasonInput(""); }} disabled={decisionSending} className="px-4 py-1.5 rounded-lg border border-danger/40 text-danger text-xs font-bold hover:bg-danger/10 transition-colors disabled:opacity-50">
                            Decline
                          </button>
                        </div>
                      ) : !_declined && (
                        <div className="flex flex-wrap items-center gap-1 bg-background p-1 rounded-xl border border-border">
                          {STATUS_LIST.map(st => (
                            <button key={st} onClick={() => updateOrderStatus(o.id, st)} className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors" style={o.status === st ? { background: "var(--color-accent)", color: "#fff" } : { color: "var(--color-foreground)", opacity: 0.5 }}>{st}</button>
                          ))}
                        </div>
                      )}
                      <div className="ml-auto flex items-center gap-1.5">
                        <button onClick={() => { setEditingOrder(o.id); setEditOrder({ customer: o.customer, items: (o.items && o.items.length > 0) ? o.items.map(li => ({ item: li.item || "", size: li.size || "", flavor: li.flavor || "", quantity: li.quantity || "1", price: li.price ?? "" })) : [{ item: "", size: "", flavor: "", quantity: "1", price: "" }], due: o.due || "", status: o.status, total: o.total, notes: o.notes || "", allergyNote: o.allergy_note || "", phone: o.phone || "", email: o.email || "", source: o.source, type: o.type || "Real" }); }} className="px-3 py-1.5 rounded-lg border border-border text-foreground/70 hover:text-foreground text-xs font-bold flex items-center gap-1.5 transition-colors">
                          <Edit3 className="h-3.5 w-3.5" /><span>Edit</span>
                        </button>
                        <button onClick={() => printInvoice(o)} className={`${tw.btn} px-3 py-1.5 flex items-center gap-1.5`}>
                          <FileText className="h-3.5 w-3.5" /><span>Invoice</span>
                        </button>
                        <button onClick={() => { setLogPaymentOrder(o); setPaymentAmount(_pay.balanceDue > 0 ? String(_pay.balanceDue) : ""); }} className="px-3 py-1.5 rounded-lg border border-border text-foreground/70 hover:text-foreground text-xs font-bold flex items-center gap-1.5 transition-colors">
                          <CreditCard className="h-3.5 w-3.5" /><span>Log Payment</span>
                        </button>
                        <button onClick={() => printLabel(o)} className={`${tw.btnSec} bg-background text-accent border-accent px-3 py-1.5 flex items-center gap-1.5`}>
                          <Printer className="h-3.5 w-3.5" /><span>Label</span>
                        </button>
                        <button onClick={() => genEmail(o)} className="px-3 py-1.5 rounded-lg border border-border text-foreground/50 hover:text-foreground text-xs font-bold flex items-center gap-1.5 transition-colors">
                          <Mail className="h-3.5 w-3.5" /><span>Email</span>
                        </button>
                        {schedule.some(t => t.order_id === o.id) && (
                          <button onClick={() => clearOrderTasks(o.id)} className="p-1.5 rounded-lg text-foreground/30 hover:text-danger transition-colors" title="Clear scheduled tasks for this order">
                            <ListX className="h-4 w-4" />
                          </button>
                        )}
                        {!_pendingLink && !_declined && (
                          <button onClick={() => deleteOrder(o.id)} className="p-1.5 rounded-lg text-foreground/30 hover:text-danger transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    {(paymentsByOrder[o.id] || []).length > 0 && (
                      <div className="flex flex-col gap-1 pt-1 -mt-1">
                        <div className={tw.section}>Payment History</div>
                        {(paymentsByOrder[o.id] || []).slice().sort((a, b) => (b.paid_at || "").localeCompare(a.paid_at || "")).map(p => (
                          <div key={p.id} className="flex justify-between text-xs text-foreground/60">
                            <span>{p.paid_at}{p.method && ` · ${p.method}`}{p.note && ` · ${p.note}`}</span>
                            <span className="font-mono font-bold text-foreground/80">${Number(p.amount).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
                );
              })}
            {orders.length === 0 && <div className={`${tw.card} text-center text-foreground/50 text-sm`}>No orders yet — add your first one! 🎂</div>}
            {orders.length > 0 && orders.filter(o => matchesOrderStatusFilter(o.status, orderStatusFilter) && orderMatchesSearchQuery(o, orderSearch.trim())).length === 0 && (
              <div className={`${tw.card} text-center text-foreground/50 text-sm`}>No orders match this filter.</div>
            )}
          </div>
        )}

        {/* ══════════ SCHEDULE ══════════ */}
        {tab === "Schedule" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-accent" />
                <h2 className="font-display font-bold text-foreground text-xl">Schedule</h2>
              </div>
              <button onClick={getAiTasks} disabled={aiTaskLoading} className={`${tw.btnSec} bg-background text-accent border-accent flex items-center gap-1.5`}>
                <Sparkles className="h-3.5 w-3.5" /><span>{aiTaskLoading ? "Thinking…" : "AI Suggest"}</span>
              </button>
            </div>

            {aiTaskError && <div className="bg-warning/15 border border-warning/30 text-warning rounded-lg px-3.5 py-2.5 text-xs font-bold">{aiTaskError}</div>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* ── Left: timeline list ── */}
              <div className="md:col-span-2 flex flex-col gap-4">

                {/* Progress */}
                <div className={tw.card}>
                  <div className="h-2 rounded-full bg-border/60 overflow-hidden">
                    <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${schedule.length ? (schedule.filter(t => t.done).length / schedule.length) * 100 : 0}%` }} />
                  </div>
                  <div className="text-xs text-foreground/60 mt-2">{schedule.filter(t => t.done).length} of {schedule.length} tasks complete</div>
                </div>

                {/* Filter chips */}
                <div className={`${tw.card} flex flex-col sm:flex-row sm:items-center gap-3`}>
                  <div className="flex items-center gap-1.5 text-[11px] font-label font-bold uppercase text-foreground/50 tracking-wider shrink-0">
                    <Filter className="h-3.5 w-3.5" /><span>Filter</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { key: "all", label: "All Tasks" },
                      { key: "manual", label: "Manual" },
                      { key: "auto", label: "Auto (Order)" },
                      { key: "ai", label: "AI Suggested" },
                    ].map(f => (
                      <button key={f.key} onClick={() => setScheduleFilter(f.key)} className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors ${scheduleFilter === f.key ? "bg-accent text-white" : "bg-background text-foreground/60 hover:text-foreground"}`}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {(() => {
                  const isOverdue = (t) => !t.done && t.date && t.date < todayStr;
                  const matchesFilter = (t) => scheduleFilter === "all"
                    || (scheduleFilter === "auto" && t.auto)
                    || (scheduleFilter === "ai" && t.aiSuggested)
                    || (scheduleFilter === "manual" && !t.auto && !t.aiSuggested);

                  const _ov = schedule.filter(t => isOverdue(t) && matchesFilter(t));
                  const _overdueIds = new Set(schedule.filter(isOverdue).map(t => t.id));
                  const _grouped = schedule
                    .filter(t => !_overdueIds.has(t.id) && matchesFilter(t))
                    .reduce((acc, t) => { const d = t.date || "Undated"; if (!acc[d]) acc[d] = []; acc[d].push(t); return acc; }, {});
                  const _dateEntries = Object.entries(_grouped).sort(([a], [b]) => a.localeCompare(b));
                  const _isEmpty = _ov.length === 0 && _dateEntries.length === 0;

                  const renderTaskCard = (t) => (
                    <div key={t.id} className={`rounded-xl border flex flex-col gap-2 px-3.5 py-3 transition-colors ${t.done ? "bg-background/60 border-border/60 opacity-60" : "bg-card border-border"}`}>
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleTask(t.id)} className={`h-5 w-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-colors ${t.done ? "bg-success border-success text-white" : "border-border hover:border-accent text-transparent"}`}>
                          <Check className="h-3 w-3 stroke-[3]" />
                        </button>
                        <span onClick={() => toggleTask(t.id)} className={`text-sm flex-1 cursor-pointer ${t.done ? "line-through text-foreground/40" : "text-foreground"}`}>{t.task}</span>
                        {t.auto && (
                          <button onClick={e => { e.stopPropagation(); setEditingAutoTaskId(editingAutoTaskId === t.id ? null : t.id); }} className="text-[9px] px-2 py-0.5 rounded bg-info/15 text-info border border-info/20 font-bold uppercase tracking-wide shrink-0">
                            Auto
                          </button>
                        )}
                        {t.aiSuggested && (
                          <span className="text-[9px] px-2 py-0.5 rounded bg-[#8b5cf6]/15 text-[#8b5cf6] border border-[#8b5cf6]/20 font-bold uppercase tracking-wide flex items-center gap-0.5 shrink-0">
                            <Sparkles className="h-2.5 w-2.5" />AI
                          </span>
                        )}
                        <button onClick={e => { e.stopPropagation(); deleteTask(t.id); }} className="text-foreground/30 hover:text-danger transition-colors shrink-0">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {t.auto && editingAutoTaskId === t.id && (
                        <input type="date" defaultValue={t.date || ""} onChange={e => { if (e.target.value) rescheduleTask(t.id, e.target.value); }} className={`${tw.input} !w-auto ml-8`} />
                      )}
                    </div>
                  );

                  return (
                    <div className="flex flex-col gap-5">
                      {_ov.length > 0 && (
                        <div className="flex flex-col gap-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-danger text-white font-display font-black text-xs flex items-center justify-center shrink-0">!</div>
                            <h3 className="font-display font-black text-danger text-sm uppercase tracking-tight">Overdue <span className="font-label text-[10px] text-foreground/40 font-normal normal-case">({_ov.length} task{_ov.length !== 1 ? "s" : ""})</span></h3>
                          </div>
                          <div className="pl-[42px] flex flex-col gap-2">
                            {_ov.map(renderTaskCard)}
                          </div>
                        </div>
                      )}

                      {_dateEntries.map(([date, tasks], _gi) => {
                        const _isToday  = date === todayStr;
                        const _isPast   = date !== "Undated" && date < todayStr;
                        const _incomplete = tasks.filter(t => !t.done);
                        const _allDone  = _incomplete.length === 0;
                        const _collapsed = _isPast && _allDone && !expandedDates.has(date);
                        const _toggle   = () => setExpandedDates(prev => { const n = new Set(prev); n.has(date) ? n.delete(date) : n.add(date); return n; });
                        const _label    = date === "Undated" ? "Undated"
                          : (_isToday ? "Today · " : "") + new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
                        return (
                          <div key={date} className="flex flex-col gap-2.5">
                            <div onClick={_isPast && _allDone ? _toggle : undefined} className={`flex items-center gap-2.5 ${_isPast && _allDone ? "cursor-pointer" : ""} ${_isToday ? "bg-accent/5 rounded-lg -mx-2.5 px-2.5 py-1.5" : ""}`}>
                              <div className={`h-8 w-8 rounded-full font-display font-black text-xs flex items-center justify-center shrink-0 ${_isToday ? "bg-accent text-white" : "bg-foreground/10 text-foreground/60"}`}>
                                {_isToday ? "T" : date === "Undated" ? "—" : new Date(date + "T12:00:00").getDate()}
                              </div>
                              <h3 className={`font-display font-black text-sm uppercase tracking-tight shrink-0 ${_isToday ? "text-accent" : "text-foreground/70"}`}>{_label}</h3>
                              <div className="flex-1 h-px bg-border" />
                              {_allDone
                                ? <span className="text-[11px] text-success font-bold shrink-0">✓ All done{_isPast ? (_collapsed ? " ▸" : " ▾") : ""}</span>
                                : <span className="text-[11px] text-foreground/50 font-bold shrink-0">{_incomplete.length} task{_incomplete.length !== 1 ? "s" : ""}</span>
                              }
                              {date !== "Undated" && (
                                <button onClick={e => { e.stopPropagation(); clearDateTasks(date); }} className="text-foreground/30 hover:text-danger transition-colors shrink-0" title="Delete all tasks for this day">
                                  <ListX className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                            {!_collapsed && (
                              <div className="pl-[42px] flex flex-col gap-2">
                                {tasks.map(renderTaskCard)}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {_isEmpty && (
                        <div className={`${tw.card} text-center py-12 text-foreground/40`}>
                          <Calendar className="h-8 w-8 mx-auto mb-2 text-foreground/20" />
                          <p className="text-sm font-bold">No scheduled tasks found{scheduleFilter !== "all" ? " for this filter" : ""}.</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* ── Right: event creator + tip ── */}
              <div className="flex flex-col gap-4">
                {showNewTask ? (
                  <div className={`${tw.card} flex flex-col gap-3.5`}>
                    <div className="flex items-center gap-1.5 border-b border-border/60 pb-3">
                      <Plus className="h-4 w-4 text-accent" />
                      <h3 className="font-display font-bold text-foreground text-sm">New Task</h3>
                    </div>
                    <div>
                      <label className={tw.eyebrow}>Date</label>
                      <input type="date" value={newTask.date} onChange={e => setNewTask(t => ({ ...t, date: e.target.value }))} className={tw.input} />
                    </div>
                    <div>
                      <label className={tw.eyebrow}>Task Description</label>
                      <input placeholder="What needs to be done?" value={newTask.task} onChange={e => setNewTask(t => ({ ...t, task: e.target.value }))} className={tw.input} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={addTask} className={`${tw.btn} flex-1 flex items-center justify-center gap-1.5`}><Plus className="h-3.5 w-3.5" /><span>Add Task</span></button>
                      <button onClick={() => setShowNewTask(false)} className={`${tw.btnSec} bg-background text-accent border-accent`}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowNewTask(true)} className={`${tw.card} flex items-center justify-center gap-1.5 text-accent font-bold text-sm hover:opacity-80 transition-opacity cursor-pointer`}>
                    <Plus className="h-4 w-4" /><span>Add Task</span>
                  </button>
                )}

                <div className="bg-background rounded-xl border border-border p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-info font-bold text-xs">
                    <Info className="h-3.5 w-3.5" /><span>Weekly Tip</span>
                  </div>
                  <p className="text-[11px] text-foreground/60 leading-relaxed">
                    Block out dough-chilling and icing prep a day or two before your busiest pickup days — it keeps oven and counter space from getting double-booked.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ══════════ SOCIAL ══════════ */}
        {tab === "Social" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-accent" />
                <h2 className="font-display font-bold text-foreground text-xl">Social Media Planner</h2>
              </div>
              <button onClick={() => { setNewPost({ platform: "Instagram", type: "Product Photo", caption: "", date: "", status: "Draft", photo: null }); setEditingPostId(null); setShowNewPost(true); }} className={`${tw.btn} flex items-center gap-1.5`}>
                <Plus className="h-3.5 w-3.5" /><span>New Post</span>
              </button>
            </div>

            <div className="bf-social-layout">

              {/* ── LEFT COLUMN ── */}
              <div style={{ flex: "1 1 65%", minWidth: 0 }} className="flex flex-col gap-4">
                <div className="flex gap-2.5 overflow-x-auto pb-1">
                  {PLATFORMS.map(p => { const count = social.filter(post => post.platform === p).length; return (
                    <div key={p} className={`${tw.card} !p-3 text-center shrink-0`} style={{ minWidth: 84 }}>
                      <div className="text-lg">{p === "Instagram" ? "📸" : p === "Facebook" ? "👥" : p === "TikTok" ? "🎵" : "📌"}</div>
                      <div className="font-bold text-lg text-accent">{count}</div>
                      <div className="text-[10px] text-foreground/50">{p}</div>
                    </div>
                  ); })}
                </div>

                {/* Search + status filter */}
                <div className={`${tw.card} flex flex-col sm:flex-row sm:items-center gap-3`}>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                    <input placeholder="Search captions..." value={socialSearch} onChange={e => setSocialSearch(e.target.value)} className={`${tw.input} pl-9`} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {["All", "Draft", "Scheduled", "Posted"].map(f => (
                      <button key={f} onClick={() => setSocialFilter(f)} className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors ${socialFilter === f ? "bg-accent text-white" : "bg-background text-foreground/60 hover:text-foreground"}`}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Post list */}
                {(() => {
                  const _q = socialSearch.trim().toLowerCase();
                  const _filtered = social.filter(post =>
                    (socialFilter === "All" || post.status === socialFilter) &&
                    (!_q || (post.caption || "").toLowerCase().includes(_q) || (post.type || "").toLowerCase().includes(_q))
                  );
                  if (_filtered.length === 0) {
                    return (
                      <div className={`${tw.card} text-center py-12 text-foreground/40`}>
                        <Camera className="h-8 w-8 mx-auto mb-2 text-foreground/20" />
                        <p className="text-sm font-bold">{social.length === 0 ? "No posts yet — create your first one!" : "No posts found for this search/filter."}</p>
                      </div>
                    );
                  }
                  return _filtered.map(post => (
                    <div key={post.id} onClick={() => openPostForEdit(post)} className={`${tw.card} cursor-pointer hover:border-accent/50 transition-colors`}>
                      <div className="flex gap-3 items-start">
                        {post.photo
                          ? <img src={post.photo} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                          : <div className="w-16 h-16 rounded-lg bg-background flex items-center justify-center text-2xl shrink-0">{post.platform === "Instagram" ? "📸" : post.platform === "Facebook" ? "👥" : post.platform === "TikTok" ? "🎵" : "📌"}</div>
                        }
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-accent">{post.platform}</span>
                            <span className="text-[11px] text-foreground/50">· {post.type}{post.date && ` · ${post.date}`}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${post.status === "Posted" ? "bg-success/15 text-success" : post.status === "Scheduled" ? "bg-info/15 text-info" : "bg-foreground/10 text-foreground/60"}`}>{post.status}</span>
                          </div>
                          <div className={`text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap ${expandedPost === post.id ? "" : "line-clamp-3"}`}>{post.caption}</div>
                          {post.caption?.length > 100 && (
                            <button onClick={e => { e.stopPropagation(); setExpandedPost(expandedPost === post.id ? null : post.id); }} className="text-accent text-xs font-bold mt-1 cursor-pointer">
                              {expandedPost === post.id ? "Show less" : "Show more"}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/60">
                        {["Draft", "Scheduled", "Posted"].map(st => (
                          <button key={st} onClick={e => { e.stopPropagation(); updatePostStatus(post.id, st); }} className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${post.status === st ? (st === "Posted" ? "bg-success text-white" : st === "Scheduled" ? "bg-info text-white" : "bg-foreground/70 text-background") : "bg-background text-foreground/50 hover:text-foreground"}`}>
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {/* ── RIGHT COLUMN — Post Ideas sidebar ── */}
              <div className="bf-social-sidebar">
                {(() => {
                  const _ucfirst = str => str.charAt(0).toUpperCase() + str.slice(1);
                  const _today = new Date(); _today.setHours(0,0,0,0);
                  const _in7 = new Date(_today); _in7.setDate(_in7.getDate() + 7);
                  const _ideas = [];

                  const _upcoming = orders
                    .filter(o => o.due && (o.items || []).length > 0 && o.customer && ["Pending","In Progress"].includes(o.status) && (() => { const d = new Date(o.due + "T00:00:00"); return d >= _today && d <= _in7; })())
                    .sort((a,b) => new Date(a.due) - new Date(b.due));
                  if (_upcoming.length > 0) {
                    const _o = _upcoming[0];
                    _ideas.push(`🗓️ ${_ucfirst(orderItemsSummary(_o))} going out to ${_o.customer} this week — share a sneak peek!`);
                  }

                  const _delivered = orders
                    .filter(o => o.status === "Delivered" && (o.items || []).length > 0 && o.customer && o.due)
                    .sort((a,b) => new Date(b.due) - new Date(a.due));
                  if (_delivered.length > 0) {
                    const _o = _delivered[0];
                    _ideas.push(`📦 Just delivered ${orderItemsSummary(_o)} to ${_o.customer}! Show off your work.`);
                  }

                  if (orders.length >= 2 && itemOrderCountEntries.length > 0) {
                    const _best = itemOrderCountEntries[0];
                    _ideas.push(`⭐ ${_ucfirst(_best[0])} are your most popular item — remind your followers they're available!`);
                  }

                  if (orders.some(o => o.status === "Pending")) {
                    _ideas.push(`📣 Orders are open! Share that you're accepting custom orders this week.`);
                  }

                  return (
                    <div className={`${tw.card} bg-background`}>
                      <div className="font-bold text-sm text-foreground mb-0.5">💡 Post Ideas</div>
                      <div className="text-[11px] text-foreground/50 mb-3.5">Based on your orders</div>
                      {_ideas.length === 0
                        ? <div className="text-xs text-foreground/50">Add orders to get post ideas.</div>
                        : <div className="flex flex-col gap-2.5">
                            {_ideas.map((caption, i) => (
                              <div key={i} className="bg-card rounded-lg border-l-4 border-l-accent p-3 flex flex-col gap-2.5">
                                <div className="text-xs text-foreground/80 leading-relaxed">{caption}</div>
                                <button onClick={() => { setNewPost(p => ({ ...p, caption })); setEditingPostId(null); setShowNewPost(true); }} className={`${tw.btn} !px-3 !py-1 text-[11px] self-start`}>+ Create Post</button>
                              </div>
                            ))}
                          </div>
                      }
                    </div>
                  );
                })()}
              </div>

            </div>

            {/* ── New Post modal ── */}
            {showNewPost && (
              <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                <div className="bg-card border border-border rounded-card shadow-card w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col md:flex-row md:divide-x md:divide-border">

                  {/* Left pane: form */}
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-center justify-between p-5 border-b border-border/60">
                      <h3 className="font-display font-bold text-foreground text-lg">{editingPostId ? "Edit Social Post" : "New Social Post"}</h3>
                      <button onClick={closeSocialModal} className="text-foreground/40 hover:text-foreground text-xl leading-none px-1 md:hidden">✕</button>
                    </div>
                    <div className="p-5 flex flex-col gap-3.5">
                      <div>
                        <label className={tw.eyebrow}>Photo</label>
                        <PhotoUpload value={newPost.photo} onChange={v => setNewPost(p => ({ ...p, photo: v }))} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={tw.eyebrow}>Platform</label>
                          <select value={newPost.platform} onChange={e => setNewPost(p => ({ ...p, platform: e.target.value }))} className={tw.input}>{PLATFORMS.map(p => <option key={p}>{p}</option>)}</select>
                        </div>
                        <div>
                          <label className={tw.eyebrow}>Post Type</label>
                          <select value={newPost.type} onChange={e => setNewPost(p => ({ ...p, type: e.target.value }))} className={tw.input}>{POST_TYPES.map(t => <option key={t}>{t}</option>)}</select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={tw.eyebrow}>Date</label>
                          <input type="date" value={newPost.date} onChange={e => setNewPost(p => ({ ...p, date: e.target.value }))} className={tw.input} />
                        </div>
                        <div>
                          <label className={tw.eyebrow}>Status</label>
                          <select value={newPost.status} onChange={e => setNewPost(p => ({ ...p, status: e.target.value }))} className={tw.input}>{["Draft", "Scheduled", "Posted"].map(st => <option key={st}>{st}</option>)}</select>
                        </div>
                      </div>
                      <div>
                        <label className={tw.eyebrow}>Caption</label>
                        <textarea placeholder="Caption... or use AI Caption →" value={newPost.caption} onChange={e => setNewPost(p => ({ ...p, caption: e.target.value }))} className={`${tw.input} h-24 resize-y`} />
                      </div>
                      <div className="flex justify-end gap-2 pt-3 border-t border-border/60 mt-auto">
                        <button onClick={closeSocialModal} className={`${tw.btnSec} bg-background text-accent border-accent`}>Cancel</button>
                        <button onClick={savePost} className={tw.btn}>{editingPostId ? "Update Post" : "Save Post"}</button>
                      </div>
                    </div>
                  </div>

                  {/* Right pane: AI Caption / Live Preview */}
                  <div className="flex-1 min-w-0 bg-background/50 p-5 flex flex-col">
                    <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-5 w-5 text-accent" />
                        <h3 className="font-display font-bold text-foreground text-base">Content Workspace</h3>
                      </div>
                      <button onClick={closeSocialModal} className="text-foreground/40 hover:text-foreground text-xl leading-none px-1 hidden md:block">✕</button>
                    </div>

                    <div className="flex bg-card p-1 rounded-xl mb-4 text-xs font-bold border border-border/60">
                      <button onClick={() => setSocialModalTab("copilot")} className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${socialModalTab === "copilot" ? "bg-background text-foreground shadow-card" : "text-foreground/40 hover:text-foreground/70"}`}>
                        <Sparkles className="h-3.5 w-3.5 text-accent" /><span>AI Caption</span>
                      </button>
                      <button onClick={() => setSocialModalTab("preview")} className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${socialModalTab === "preview" ? "bg-background text-foreground shadow-card" : "text-foreground/40 hover:text-foreground/70"}`}>
                        <Eye className="h-3.5 w-3.5 text-info" /><span>Live Preview</span>
                      </button>
                    </div>

                    {socialModalTab === "copilot" ? (
                      <div className="flex flex-col gap-3.5">
                        <div className="text-xs text-foreground/60 leading-relaxed">
                          Generates a caption for <strong className="text-foreground">{newPost.platform}</strong> · <strong className="text-foreground">{newPost.type}</strong> using your Anthropic API key, and writes it straight into the Caption field.
                        </div>
                        <button onClick={genCaption} disabled={captionLoading} className={`${tw.btn} flex items-center justify-center gap-1.5 disabled:opacity-50`}>
                          <Sparkles className="h-4 w-4" /><span>{captionLoading ? "Writing caption..." : "Generate Caption"}</span>
                        </button>
                        {newPost.caption && !captionLoading && (
                          <div className="bg-card border border-border rounded-lg p-3.5 text-xs text-foreground/70 leading-relaxed whitespace-pre-wrap">
                            {newPost.caption}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center py-1">
                        {/* Device Frame — fixed dark bezel like a real phone, not app-theme-aware */}
                        <div className="w-[260px] h-[350px] rounded-[36px] p-2.5 shadow-xl border-4 relative flex flex-col overflow-hidden select-none" style={{ background: "#0f1115", borderColor: "#27272a" }}>
                          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-16 h-3 rounded-full z-20 flex items-center justify-center" style={{ background: "#18181b" }}>
                            <div className="w-1 h-1 rounded-full mr-2" style={{ background: "#000" }} />
                            <div className="w-6 h-0.5 rounded-full" style={{ background: "#3f3f46" }} />
                          </div>
                          <div className="w-full h-full rounded-[28px] overflow-hidden flex flex-col relative text-[10px]" style={{ background: "#fff", color: "#0f172a" }}>

                            {newPost.platform === "Instagram" && (
                              <div className="flex-1 flex flex-col h-full">
                                <div className="flex items-center justify-between p-2 border-b mt-2 shrink-0" style={{ borderColor: "#f1f5f9" }}>
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-6 h-6 rounded-full p-0.5 flex items-center justify-center shrink-0" style={{ background: "linear-gradient(to top right, #f59e0b, #ec4899)" }}>
                                      <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[8px] font-black" style={{ color: "#BC3B52" }}>B</div>
                                    </div>
                                    <p className="font-bold text-[9px]">shoogiecookies</p>
                                  </div>
                                  <span className="font-bold text-xs" style={{ color: "#94a3b8" }}>•••</span>
                                </div>
                                <div className="aspect-video overflow-hidden relative shrink-0 flex items-center justify-center" style={{ background: "#f1f5f9" }}>
                                  {newPost.photo
                                    ? <img src={newPost.photo} alt="" className="w-full h-full object-cover" />
                                    : <div className="flex flex-col items-center gap-1" style={{ color: "#94a3b8" }}><span className="text-lg">📷</span><span className="text-[7px] font-bold">Upload a photo to preview</span></div>
                                  }
                                </div>
                                <div className="p-2 space-y-1.5 flex-1 overflow-y-auto text-left">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Heart className="h-4 w-4" style={{ color: "#f43f5e", fill: "#f43f5e" }} />
                                      <MessageSquare className="h-3.5 w-3.5" style={{ color: "#334155" }} />
                                      <Send className="h-3.5 w-3.5" style={{ color: "#334155" }} />
                                    </div>
                                    <Bookmark className="h-3.5 w-3.5" style={{ color: "#334155" }} />
                                  </div>
                                  <p className="text-[8px] leading-relaxed">
                                    <span className="font-bold mr-1">shoogiecookies</span>
                                    <span className="whitespace-pre-wrap">{newPost.caption || "No caption drafted yet — try AI Caption!"}</span>
                                  </p>
                                </div>
                              </div>
                            )}

                            {newPost.platform === "TikTok" && (
                              <div className="flex-1 flex flex-col relative h-full" style={{ background: "#000", color: "#fff" }}>
                                <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
                                  {newPost.photo
                                    ? <img src={newPost.photo} alt="" className="w-full h-full object-cover opacity-60" style={{ filter: "blur(2px)" }} />
                                    : <div className="flex flex-col items-center gap-1" style={{ color: "#71717a" }}><span className="text-lg">📷</span><span className="text-[7px] font-bold">Upload a photo to preview</span></div>
                                  }
                                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #000, transparent, rgba(0,0,0,0.4))" }} />
                                </div>
                                <div className="relative z-10 flex justify-center gap-3 py-2 border-b mt-2 text-[9px] font-bold" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                                  <span style={{ color: "rgba(255,255,255,0.6)" }}>Following</span>
                                  <span className="border-b-2 pb-0.5">For You</span>
                                </div>
                                <div className="absolute right-2 bottom-10 z-10 flex flex-col items-center gap-3">
                                  <div className="flex flex-col items-center">
                                    <Heart className="h-4.5 w-4.5" style={{ color: "#f43f5e", fill: "#f43f5e" }} />
                                    <span className="text-[7px] font-bold">—</span>
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <MessageSquare className="h-4.5 w-4.5" style={{ fill: "#fff", color: "#000" }} />
                                    <span className="text-[7px] font-bold">—</span>
                                  </div>
                                  <Music className="h-4 w-4" />
                                </div>
                                <div className="absolute left-2.5 bottom-2.5 right-10 z-10 space-y-1 text-left">
                                  <p className="font-bold text-[9px]">@shoogiecookies</p>
                                  <p className="text-[8px] leading-relaxed whitespace-pre-wrap line-clamp-3" style={{ color: "#e2e8f0" }}>{newPost.caption || "Tap AI Caption to draft your TikTok copy!"}</p>
                                </div>
                              </div>
                            )}

                            {newPost.platform === "Facebook" && (
                              <div className="flex-1 flex flex-col overflow-y-auto mt-2 h-full text-left" style={{ background: "#f8fafc" }}>
                                <div className="p-2.5 border-b flex items-center gap-2 shrink-0" style={{ background: "#fff", borderColor: "#f1f5f9" }}>
                                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white" style={{ background: "#2563eb" }}>B</div>
                                  <div>
                                    <p className="font-bold text-[9px]">Shoogie Bakery</p>
                                    <p className="text-[7px]" style={{ color: "#94a3b8" }}>Scheduled · Public 🌐</p>
                                  </div>
                                </div>
                                <div className="p-2.5 text-[8px] leading-relaxed whitespace-pre-wrap shrink-0" style={{ background: "#fff", color: "#334155" }}>
                                  {newPost.caption || "Drafting the sweet story... try AI Caption!"}
                                </div>
                                <div className="aspect-video overflow-hidden relative shrink-0 flex items-center justify-center" style={{ background: "#e2e8f0" }}>
                                  {newPost.photo
                                    ? <img src={newPost.photo} alt="" className="w-full h-full object-cover" />
                                    : <div className="flex flex-col items-center gap-1" style={{ color: "#94a3b8" }}><span className="text-lg">📷</span><span className="text-[7px] font-bold">Upload a photo to preview</span></div>
                                  }
                                </div>
                                <div className="p-2 border-t mt-auto flex justify-between items-center text-[8px] shrink-0" style={{ background: "#fff", borderColor: "#f1f5f9", color: "#64748b" }}>
                                  <span>👍 Like</span><span>💬 Comment</span><span>➡️ Share</span>
                                </div>
                              </div>
                            )}

                            {newPost.platform === "Pinterest" && (
                              <div className="flex-1 flex flex-col h-full text-left" style={{ background: "#fff" }}>
                                <div className="aspect-square overflow-hidden relative shrink-0 flex items-center justify-center" style={{ background: "#f1f5f9" }}>
                                  {newPost.photo
                                    ? <img src={newPost.photo} alt="" className="w-full h-full object-cover" />
                                    : <div className="flex flex-col items-center gap-1" style={{ color: "#94a3b8" }}><span className="text-lg">📷</span><span className="text-[7px] font-bold">Upload a photo to preview</span></div>
                                  }
                                  <span className="absolute top-2 right-2 text-[8px] font-bold text-white px-2 py-1 rounded-full" style={{ background: "#e60023" }}>Save</span>
                                </div>
                                <div className="p-2.5 space-y-1 shrink-0">
                                  <p className="font-bold text-[8.5px]" style={{ color: "#334155" }}>shoogiecookies</p>
                                  <p className="text-[8px] leading-relaxed whitespace-pre-wrap line-clamp-3" style={{ color: "#64748b" }}>{newPost.caption || "Tap AI Caption to draft your Pinterest copy!"}</p>
                                </div>
                              </div>
                            )}

                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════ BAKERY PROFILE ══════════ */}
        {tab === "Bakery Profile" && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Store className="h-5 w-5 text-accent" />
              <h2 className="font-display font-bold text-foreground text-xl">Bakery Profile</h2>
            </div>

            <div className={`${tw.card} flex flex-col gap-6 mb-4`}>

              {/* Business Identity */}
              <div className="flex flex-col gap-4">
                <h3 className={tw.section}>Business Identity</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={tw.eyebrow}>Bakery Name</label>
                    <input value={bakeryName} onChange={e => setBakeryName(e.target.value)} placeholder="My Home Bakery" className={tw.input} />
                  </div>
                  <div>
                    <label className={tw.eyebrow}>State</label>
                    <select value={bakerState} onChange={e => setBakerState(e.target.value)} className={tw.input}>
                      <option value="">— Select your state —</option>
                      {["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"].map(st => <option key={st}>{st}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Financial Costing Parameters */}
              <div className="flex flex-col gap-4 pt-4 border-t border-border/60">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-accent" />
                  <h3 className={tw.section}>Financial Costing Parameters</h3>
                </div>
                <div className="text-[11px] text-foreground/50">These defaults pre-fill the Pricing Calculator each time you open it.</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={tw.eyebrow}>Currency</label>
                    <select value={currency} onChange={e => setCurrency(e.target.value)} className={tw.input}>
                      {["USD","CAD","GBP","EUR","AUD","MXN"].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={tw.eyebrow}>Default Labor Rate ($/hr)</label>
                    <input type="number" min="0" max="200" step="1" value={defaultLaborRate} onChange={e => setDefaultLaborRate(parseFloat(e.target.value) || 0)} className={tw.input} />
                  </div>
                  <div>
                    <label className={tw.eyebrow}>Default Markup %</label>
                    <input type="number" min="0" max="200" step="1" value={defaultMarkup} onChange={e => setDefaultMarkup(parseFloat(e.target.value) || 0)} className={tw.input} />
                  </div>
                  <div>
                    <label className={tw.eyebrow}>Default Overhead %</label>
                    <input type="number" min="0" max="100" step="1" value={defaultOverhead} onChange={e => setDefaultOverhead(parseFloat(e.target.value) || 0)} className={tw.input} />
                  </div>
                </div>
                <button onClick={saveProfile} className={tw.btn}>{settingsSaved ? "✓ Saved!" : "Save Preferences"}</button>
              </div>

              {/* Brand Personalization */}
              <div className="flex flex-col gap-4 pt-4 border-t border-border/60">
                <div className="flex items-center gap-1.5">
                  <Palette className="h-4 w-4 text-accent" />
                  <h3 className={tw.section}>Brand Personalization</h3>
                </div>
                <div>
                  <label className={tw.eyebrow}>Bakery Logo</label>
                  <div className="flex items-center gap-3">
                    {bakeryLogo
                      ? <img src={bakeryLogo} alt="logo" className="w-[72px] h-[72px] rounded-2xl object-cover border-2 border-border" />
                      : <div className="w-[72px] h-[72px] rounded-2xl bg-background flex items-center justify-center text-2xl border-2 border-dashed border-border">🧁</div>
                    }
                    <div>
                      <PhotoUpload value={null} onChange={v => setBakeryLogo(v)} small />
                      <div className="text-[11px] text-foreground/50 mt-1">Tap to upload your logo</div>
                      <div className="text-[11px] text-foreground/40 mt-1 leading-snug">For best results, use a PNG with a transparent background.</div>
                      {bakeryLogo && <button onClick={() => setBakeryLogo(null)} className={`${tw.btnSec} border-border text-accent bg-background mt-1.5 px-2.5 py-1`}>Remove</button>}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: "Invoice Header Color", value: invoiceHeaderColor, set: setInvoiceHeaderColor, def: "#1e2d4a" },
                    { label: "Invoice Accent Color",  value: invoiceAccentColor, set: setInvoiceAccentColor, def: "#BC3B52" },
                  ].map(({ label, value, set, def }) => (
                    <div key={label}>
                      <label className={tw.eyebrow}>{label}</label>
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer shrink-0 relative">
                          <div className="w-9 h-9 rounded-lg border-2 border-border shadow-sm" style={{ background: value }} />
                          <input type="color" value={value} onChange={e => set(e.target.value)} className="absolute opacity-0 w-0 h-0 pointer-events-none" />
                        </label>
                        <input value={value} onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) set(e.target.value); }} maxLength={7} className={`${tw.input} !w-24 font-mono text-xs py-1.5`} />
                        <button onClick={() => set(def)} className={`${tw.btnSec} border-border text-accent bg-background shrink-0 px-2.5 py-1`}>Reset</button>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={saveProfile} className={tw.btn}>{settingsSaved ? "✓ Saved!" : "Save Branding"}</button>
              </div>

              {/* Payment Methods */}
              <div className="flex flex-col gap-4 pt-4 border-t border-border/60">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-accent" />
                  <h3 className={tw.section}>Payment Methods</h3>
                </div>
                <div className="text-[11px] text-foreground/50">Only filled-in methods appear on your invoices.</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: "Venmo",  val: venmo,   set: setVenmo,   ph: "@yourhandle" },
                    { label: "PayPal", val: paypal,  set: setPaypal,  ph: "email or @handle" },
                    { label: "Zelle",  val: zelle,   set: setZelle,   ph: "phone or email" },
                  ].map(({ label, val, set, ph }) => (
                    <div key={label}>
                      <label className={tw.eyebrow}>{label}</label>
                      <input value={val} onChange={e => set(e.target.value)} placeholder={ph} className={tw.input} />
                    </div>
                  ))}
                  <div>
                    <label className={tw.eyebrow}>Other</label>
                    <input value={otherPay} onChange={e => setOtherPay(e.target.value)} placeholder="e.g. Bank transfer: ..." className={tw.input} />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-[10px] font-label font-bold uppercase text-foreground/50">Accept Cash?</label>
                  <button onClick={() => setAcceptsCash(v => !v)} className={`${tw.btnSec} ${acceptsCash ? "bg-accent text-white border-accent" : "bg-background text-accent border-accent"}`}>
                    {acceptsCash ? "Yes" : "No"}
                  </button>
                </div>
                <button onClick={saveProfile} className={tw.btn}>{settingsSaved ? "✓ Saved!" : "Save Payment Methods"}</button>
              </div>

              {/* Cottage Food Law Compliance */}
              <div className="flex flex-col gap-4 pt-4 border-t border-border/60">
                <div className="flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-warning" />
                  <h3 className={tw.section}>Cottage Food Law Compliance</h3>
                </div>
                <div className="text-[11px] text-foreground/50">Tell BakeFlo which cottage food rules apply so your labels stay compliant.</div>

                <div className="p-4 rounded-xl bg-warning/5 border border-warning/20 flex flex-col gap-4">
                  <div className="flex gap-2 flex-wrap">
                    {[{ v: "TX", l: "Texas (TX)" }, { v: "Other", l: "Other US State" }, { v: "None", l: "No Cottage Regulations" }].map(opt => (
                      <button key={opt.v} onClick={() => setCottageLawState(opt.v)} className={`${tw.btnSec} rounded-full ${cottageLawState === opt.v ? "bg-warning text-white border-warning" : "bg-background text-warning border-warning"}`}>{opt.l}</button>
                    ))}
                  </div>

                  {cottageLawState === "TX" && (
                    <div className="p-3.5 rounded-lg bg-warning/10 border border-warning/20 text-[13px] text-foreground leading-relaxed">
                      <strong className="text-warning">Texas Cottage Food Law (SB 541) Compliant Mode:</strong>
                      <ul className="list-disc pl-4 mt-2 flex flex-col gap-2">
                        <li><strong>Labeling Rules:</strong> Labels require your business/production name, the product name, and an allergen declaration for any of the nine major allergens present. A full ingredient list is NOT required by Texas law. The exact statutory disclosure statement is added automatically to every label BakeFlo generates for you.</li>
                        <li><strong>Address or Registration Number:</strong> You must print either your home kitchen's physical address, or, if you've registered with Texas DSHS, your DSHS registration number in its place. Only one is required.</li>
                        <li><strong>Transaction Handover:</strong> Mail or common-carrier shipping is not permitted. At least one part of the purchase (ordering, payment, or delivery) must happen face-to-face.</li>
                      </ul>
                    </div>
                  )}

                  {cottageLawState === "Other" && (
                    <div className="p-3 rounded-lg bg-background text-foreground/70 text-[13px] leading-relaxed">
                      Cottage food laws vary significantly from state to state. Check with your state's Department of Health, Department of Agriculture, or local health department for labeling, registration, and sales requirements before selling homemade food products.
                    </div>
                  )}

                  {cottageLawState !== "None" && (
                    <>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <label className="text-[10px] font-label font-bold uppercase text-foreground/50">I have a DSHS registration number instead of listing my address</label>
                        <button onClick={() => setUseDshsReg(v => !v)} className={`${tw.btnSec} ${useDshsReg ? "bg-warning text-white border-warning" : "bg-background text-warning border-warning"}`}>{useDshsReg ? "Yes" : "No"}</button>
                      </div>

                      {useDshsReg ? (
                        <div>
                          <label className={tw.eyebrow}>DSHS Registration Number{cottageLawState === "TX" && <span className="text-warning"> *</span>}</label>
                          <input value={dshsRegistrationNumber} onChange={e => setDshsRegistrationNumber(e.target.value)} placeholder="e.g. DSHS-123456" className={tw.input} />
                        </div>
                      ) : (
                        <div>
                          <label className={tw.eyebrow}>Home Kitchen Physical Address{cottageLawState === "TX" && <span className="text-warning"> *</span>}</label>
                          <input value={physicalAddress} onChange={e => setPhysicalAddress(e.target.value)} placeholder="123 Main St, Your City, TX" className={tw.input} />
                        </div>
                      )}
                      {cottageLawState === "TX" && !(useDshsReg ? dshsRegistrationNumber : physicalAddress) && (
                        <div className="text-[11px] text-danger">⚠ Required under Texas Cottage Food Law</div>
                      )}

                      <div>
                        <label className={tw.eyebrow}>Business Website / Social Link</label>
                        <input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://instagram.com/yourbakery" className={tw.input} />
                      </div>

                      <button onClick={saveProfile} className={tw.btn}>{settingsSaved ? "✓ Saved!" : "Save Compliance Info"}</button>
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ══════════ SETTINGS ══════════ */}
        {tab === "Settings" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-accent" />
              <h2 className="font-display font-bold text-foreground text-xl">Settings</h2>
            </div>

            {/* Quick Start Guide */}
            <a href="https://www.bakeflo.io/quickstart.pdf" target="_blank" rel="noopener noreferrer" className={`${tw.card} flex items-center justify-between no-underline hover:border-accent/40 transition-colors`}>
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-accent shrink-0" />
                <div>
                  <div className="text-sm font-bold text-foreground">Quick Start Guide</div>
                  <div className="text-xs text-foreground/50 mt-0.5">New to BakeFlo? Get up and running in minutes.</div>
                </div>
              </div>
              <span className="text-lg text-foreground/30 shrink-0">›</span>
            </a>

            {/* AI Features */}
            <div className={tw.card}>
              <div className="flex items-center gap-2 border-b border-border/60 pb-3 mb-4">
                <Sparkles className="h-5 w-5 text-accent" />
                <h3 className="font-display font-bold text-foreground text-base">AI Features</h3>
              </div>
              <div className="bg-background rounded-lg p-3 text-sm text-foreground/70 leading-relaxed mb-3">
                <strong className="text-foreground">Get your free Anthropic API key:</strong><br />
                1. Go to <strong className="text-foreground">console.anthropic.com</strong><br />
                2. Sign up → API Keys → Create Key<br />
                3. Paste it below
              </div>
              <label className={tw.eyebrow}>Your API Key</label>
              <input type="password" placeholder="sk-ant-..." value={apiKey} onChange={e => setApiKey(e.target.value)} className={tw.input} />
              <button onClick={() => saveApiKey(apiKey)} className={`${tw.btn} mt-2.5`}>{apiKeySaved ? "✓ Saved!" : "Save API Key"}</button>
              {apiKey && <div className="text-xs text-success mt-2">✓ AI features enabled!</div>}
            </div>

            {/* Order Request Link */}
            <div className={tw.card}>
              <div className="flex items-center gap-2 border-b border-border/60 pb-3 mb-4">
                <ShoppingBag className="h-5 w-5 text-accent" />
                <h3 className="font-display font-bold text-foreground text-base">Order Request Link</h3>
              </div>
              <p className="text-sm text-foreground/60 mb-3">Share this link with customers so they can request orders directly — unlimited submissions, always free.</p>

              <label className={tw.eyebrow}>Your Link</label>
              <div className="flex gap-2">
                <input value={slugInput} onChange={e => { setSlugInput(e.target.value); setSlugStatus(""); }} placeholder="your-bakery-name" className={tw.input} />
                <button onClick={saveSlug} disabled={slugStatus === "checking"} className={`${tw.btnSec} bg-background text-accent border-accent shrink-0`}>{slugStatus === "checking" ? "Checking..." : "Save"}</button>
              </div>
              {slugStatus === "taken" && <div className="text-xs text-danger mt-1.5">That link is already taken — try something else.</div>}
              {slugStatus === "error" && <div className="text-xs text-danger mt-1.5">Couldn't save that link. Please try again.</div>}
              {slugStatus === "available" && <div className="text-xs text-success mt-1.5">✓ Saved!</div>}

              {orderSlug && (
                <div className="bg-background rounded-lg px-3 py-2.5 mt-3 flex items-center justify-between gap-2">
                  <span className="text-sm font-mono text-foreground/80 truncate">bakeflo.co/order/{orderSlug}</span>
                  <button onClick={() => { navigator.clipboard.writeText(`https://bakeflo.co/order/${orderSlug}`).then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); }); }} className={`${tw.btnSec} bg-card text-foreground border-border shrink-0`}>{linkCopied ? "✓ Copied" : "Copy"}</button>
                </div>
              )}

              <div className="border-t border-border my-4" />

              <label className={tw.eyebrow}>Minimum Lead Time (days)</label>
              <input type="number" min="0" value={orderLeadDays} onChange={e => setOrderLeadDays(parseInt(e.target.value) || 0)} className={`${tw.input} max-w-[120px]`} />
              <div className="text-xs text-foreground/40 mt-1.5">Customers can't request a date sooner than this many days out.</div>

              <div className="border-t border-border my-4" />

              <div className="text-sm font-bold text-foreground mb-1">Menu Options (optional)</div>
              <div className="text-xs text-foreground/50 mb-3">Define dropdown choices for item, size, and flavor — leave any of these blank and customers get a free-text field instead.</div>

              <div className="mb-3">
                <label className={tw.eyebrow}>Items</label>
                <datalist id="menu-item-categories">
                  {CATEGORIES.map(c => <option key={c} value={c} />)}
                </datalist>
                <div className="flex flex-col gap-2 mb-2">
                  {orderFormItems.map(item => (
                    <div key={item.name} className="bg-background rounded-lg p-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-foreground truncate">{item.name}{item.basePrice != null && ` — $${item.basePrice.toFixed(2)}`}</span>
                        <button onClick={() => removeMenuItem(item.name)} className="text-foreground/30 hover:text-danger leading-none shrink-0">×</button>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          value={item.category}
                          onChange={e => updateMenuItem(item.name, { category: e.target.value })}
                          placeholder="Category"
                          list="menu-item-categories"
                          className={`${tw.input} !bg-card text-xs !py-1.5`}
                        />
                        <select
                          value={item.recipeId ?? ""}
                          onChange={e => updateMenuItem(item.name, { recipeId: e.target.value ? parseInt(e.target.value) : null })}
                          className={`${tw.input} !bg-card text-xs !py-1.5`}
                        >
                          <option value="">— none —</option>
                          {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </div>
                      <div className="pl-2 border-l-2 border-border flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-foreground/40">Variants (flavors)</span>
                        {item.variants.map((v, vi) => (
                          <div key={vi} className="flex items-center gap-1.5">
                            <span className="text-xs text-foreground/70 flex-1 truncate">{v.label}</span>
                            <select
                              value={v.recipeId ?? ""}
                              onChange={e => updateMenuItemVariant(item.name, vi, { recipeId: e.target.value ? parseInt(e.target.value) : null })}
                              className={`${tw.input} !bg-card text-xs !py-1 !w-32`}
                            >
                              <option value="">— none —</option>
                              {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                            <button onClick={() => removeMenuItemVariant(item.name, vi)} className="text-foreground/30 hover:text-danger leading-none">×</button>
                          </div>
                        ))}
                        {item.variants.length === 0 && <span className="text-[11px] text-foreground/30">No variants yet.</span>}
                        <div className="flex gap-1.5">
                          <input
                            value={variantInput[item.name] || ""}
                            onChange={e => setVariantInput(vi => ({ ...vi, [item.name]: e.target.value }))}
                            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addMenuItemVariant(item.name, variantInput[item.name] || ""); setVariantInput(vi => ({ ...vi, [item.name]: "" })); } }}
                            placeholder="New variant (e.g. Chocolate)"
                            className={`${tw.input} !bg-card text-xs !py-1 flex-1`}
                          />
                          <button onClick={() => { addMenuItemVariant(item.name, variantInput[item.name] || ""); setVariantInput(vi => ({ ...vi, [item.name]: "" })); }} className={`${tw.btnSec} bg-card text-accent border-accent !px-2 !py-1 text-xs shrink-0`}>+</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {orderFormItems.length === 0 && <span className="text-xs text-foreground/30">None set — falls back to free text.</span>}
                </div>
                <div className="flex gap-1.5">
                  <input
                    value={menuOptionInput.items}
                    onChange={e => setMenuOptionInput(m => ({ ...m, items: e.target.value }))}
                    placeholder="New item"
                    className={`${tw.input} flex-1`}
                  />
                  <input
                    type="number" min="0" step="0.01"
                    value={menuItemPriceInput}
                    onChange={e => setMenuItemPriceInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addMenuItem(menuOptionInput.items, menuItemPriceInput); setMenuOptionInput(m => ({ ...m, items: "" })); setMenuItemPriceInput(""); } }}
                    placeholder="Price (optional)"
                    className={`${tw.input} !w-32`}
                  />
                  <button onClick={() => { addMenuItem(menuOptionInput.items, menuItemPriceInput); setMenuOptionInput(m => ({ ...m, items: "" })); setMenuItemPriceInput(""); }} className={`${tw.btnSec} bg-background text-accent border-accent shrink-0`}>Add</button>
                </div>
                <div className="text-xs text-foreground/40 mt-1.5">Price is a starting/minimum — you can always adjust it up when accepting a specific order.</div>
              </div>

              {[
                { label: "Sizes", list: orderFormSizes, setList: setOrderFormSizes, key: "sizes" },
              ].map(({ label, list, setList, key }) => (
                <div key={key} className="mb-3">
                  <label className={tw.eyebrow}>{label}</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {list.map(v => (
                      <span key={v} className="inline-flex items-center gap-1 text-xs bg-background border border-border rounded-full px-2.5 py-1 text-foreground/70">
                        {v}
                        <button onClick={() => removeMenuOption(list, setList, v)} className="text-foreground/30 hover:text-danger leading-none">×</button>
                      </span>
                    ))}
                    {list.length === 0 && <span className="text-xs text-foreground/30">None set — falls back to free text.</span>}
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      value={menuOptionInput[key]}
                      onChange={e => setMenuOptionInput(m => ({ ...m, [key]: e.target.value }))}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addMenuOption(list, setList, menuOptionInput[key]); setMenuOptionInput(m => ({ ...m, [key]: "" })); } }}
                      placeholder={`New ${label.toLowerCase().slice(0, -1)}`}
                      className={`${tw.input} flex-1`}
                    />
                    <button onClick={() => { addMenuOption(list, setList, menuOptionInput[key]); setMenuOptionInput(m => ({ ...m, [key]: "" })); }} className={`${tw.btnSec} bg-background text-accent border-accent shrink-0`}>Add</button>
                  </div>
                </div>
              ))}

              <div className="border-t border-border my-4" />

              <div className="flex items-center gap-2 mb-1">
                <Crown className="h-4 w-4 text-accent" />
                <div className="text-sm font-bold text-foreground">Capacity &amp; Blackout Dates</div>
              </div>
              {isPro ? (
                <>
                  <div className="text-xs text-foreground/50 mb-3">Limit how many accepted orders you'll take per day, and block off dates you're not baking.</div>

                  <label className={tw.eyebrow}>Max Orders Per Day</label>
                  <input type="number" min="1" value={maxOrdersPerDay} onChange={e => setMaxOrdersPerDay(e.target.value)} placeholder="No limit" className={`${tw.input} max-w-[120px]`} />
                  <div className="text-xs text-foreground/40 mt-1.5 mb-3">Counts accepted orders only — pending requests and declined orders don't count. Leave blank for no cap.</div>

                  <label className={tw.eyebrow}>Blackout Dates</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {blackoutDates.map(d => (
                      <span key={d} className="inline-flex items-center gap-1 text-xs bg-background border border-border rounded-full px-2.5 py-1 text-foreground/70">
                        {new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        <button onClick={() => removeBlackoutDate(d)} className="text-foreground/30 hover:text-danger leading-none">×</button>
                      </span>
                    ))}
                    {blackoutDates.length === 0 && <span className="text-xs text-foreground/30">None set.</span>}
                  </div>
                  <div className="flex gap-1.5">
                    <input type="date" value={blackoutDateInput} onChange={e => setBlackoutDateInput(e.target.value)} className={`${tw.input} flex-1`} />
                    <button onClick={addBlackoutDate} className={`${tw.btnSec} bg-background text-accent border-accent shrink-0`}>Add</button>
                  </div>
                </>
              ) : (
                <div className="text-xs text-foreground/50 bg-background rounded-lg px-3 py-2.5 leading-relaxed">🔒 Available on Pro — set a daily order cap and block off dates you're not baking. Contact us to upgrade.</div>
              )}

              <button onClick={saveProfile} className={`${tw.btn} mt-3`}>{settingsSaved ? "✓ Saved!" : "Save Order Link Settings"}</button>
            </div>

            {/* Account & Security */}
            <div className={tw.card}>
              <div className="flex items-center gap-2 border-b border-border/60 pb-3 mb-4">
                <Shield className="h-5 w-5 text-accent" />
                <h3 className="font-display font-bold text-foreground text-base">Account &amp; Security</h3>
              </div>
              <div className="text-sm text-foreground/70 mb-3">Signed in as <strong className="text-foreground">{session.user.email}</strong></div>
              <button onClick={handleSignOut} className={`${tw.btnSec} bg-background text-accent border-accent`}>Sign Out</button>
              <div className="border-t border-border my-4" />
              <div className="text-sm font-bold text-foreground mb-2.5">Change Password</div>
              <label className={tw.eyebrow}>New Password</label>
              <PwField value={pwNew} onChange={e => setPwNew(e.target.value)} placeholder="At least 6 characters" show={showPwNew} onToggle={() => setShowPwNew(p => !p)} />
              <label className={`${tw.eyebrow} mt-2.5`}>Confirm New Password</label>
              <PwField value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} placeholder="Repeat new password" show={showPwConf} onToggle={() => setShowPwConf(p => !p)} />
              {pwMsg && <div className={`text-sm mt-2 ${pwMsg.startsWith("✓") ? "text-success" : "text-danger"}`}>{pwMsg}</div>}
              <button onClick={changePassword} disabled={pwLoading} className={`${tw.btn} mt-3`} style={{ opacity: pwLoading ? 0.6 : 1 }}>{pwLoading ? "Saving..." : "Update Password"}</button>
            </div>

          </div>
        )}

        {tab === "Admin" && session.user.email === "shoogiecookies@gmail.com" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-accent" />
                <h2 className="font-display font-bold text-foreground text-xl">Admin Panel</h2>
              </div>

              {/* Gift an Account */}
              <div className={tw.card}>
                <div className="flex items-center gap-2 border-b border-border/60 pb-3 mb-4">
                  <Gift className="h-5 w-5 text-accent" />
                  <h3 className="font-display font-bold text-foreground text-base">Gift an Account</h3>
                </div>
                <label className={tw.eyebrow}>Email Address</label>
                <input value={giftEmail} onChange={e => setGiftEmail(e.target.value)} placeholder="customer@email.com" className={tw.input} />
                <label className={`${tw.eyebrow} mt-2.5`}>Temporary Password</label>
                <PwField value={giftPassword} onChange={e => setGiftPassword(e.target.value)} placeholder="They can change this after login" show={showGiftPw} onToggle={() => setShowGiftPw(p => !p)} />
                <label className={`${tw.eyebrow} mt-2.5`}>Notes (optional)</label>
                <input value={giftNotes} onChange={e => setGiftNotes(e.target.value)} placeholder="e.g. Gift for holiday promo" className={tw.input} />
                {giftMsg && <div className={`text-sm mt-2 ${giftMsg.startsWith("Error") ? "text-danger" : "text-success"}`}>{giftMsg}</div>}
                <div className="text-[11px] text-foreground/40 mt-2 mb-2.5 leading-relaxed">Account is created server-side with email pre-confirmed — the user can log in immediately with these credentials. Share the password with them directly; they can change it in Settings.</div>
                <button onClick={giftAccount} disabled={giftLoading} className={tw.btn} style={{ opacity: giftLoading ? 0.6 : 1 }}>{giftLoading ? "Creating..." : "Create Account"}</button>
              </div>

              {/* Gifted Accounts List */}
              <div className={tw.card}>
                <div className="flex items-center gap-2 border-b border-border/60 pb-3 mb-4">
                  <Users className="h-5 w-5 text-accent" />
                  <h3 className="font-display font-bold text-foreground text-base">Gifted Accounts</h3>
                </div>
                {giftedUsers.length === 0
                  ? <div className="text-sm text-foreground/40">No gifted accounts yet. Create one above.</div>
                  : giftedUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between py-2.5 border-b border-border/60 last:border-b-0">
                      <div>
                        <div className="font-bold text-sm text-foreground">{u.email}</div>
                        {u.notes && <div className="text-xs text-foreground/50 mt-0.5">{u.notes}</div>}
                        <div className="text-[11px] text-foreground/40 mt-0.5">{new Date(u.created_at).toLocaleDateString()}</div>
                      </div>
                      <button onClick={() => revokeGiftedUser(u.id)} className={`${tw.btnSec} !px-2.5 !py-1 text-xs bg-background text-danger border-danger`}>Remove</button>
                    </div>
                  ))
                }
                <div className="text-[11px] text-foreground/40 mt-3 leading-relaxed">Note: removing from this list does not delete the Supabase auth account. To fully revoke access, delete the user in your Supabase Auth dashboard.</div>
              </div>

              {/* Pro Access */}
              <div className={tw.card}>
                <div className="flex items-center gap-2 border-b border-border/60 pb-3 mb-4">
                  <Crown className="h-5 w-5 text-accent" />
                  <h3 className="font-display font-bold text-foreground text-base">Pro Access</h3>
                </div>
                <div className="text-xs text-foreground/50 mb-3 leading-relaxed">Manually grant or revoke Pro (order capacity limits + blackout dates) for an account. No self-serve upgrade flow yet — this is the only way to set it.</div>
                <label className={tw.eyebrow}>Account Email</label>
                <input value={proEmail} onChange={e => setProEmail(e.target.value)} placeholder="baker@email.com" className={tw.input} />
                {proMsg && <div className={`text-sm mt-2 ${proMsg.startsWith("Error") ? "text-danger" : "text-success"}`}>{proMsg}</div>}
                <div className="flex gap-2 mt-2.5">
                  <button onClick={() => setProAccess(true)} disabled={proLoading} className={tw.btn} style={{ opacity: proLoading ? 0.6 : 1 }}>{proLoading ? "Working..." : "Grant Pro"}</button>
                  <button onClick={() => setProAccess(false)} disabled={proLoading} className={`${tw.btnSec} bg-background text-danger border-danger`} style={{ opacity: proLoading ? 0.6 : 1 }}>Revoke Pro</button>
                </div>
              </div>

              {/* Data Overview */}
              <div className={tw.card}>
                <div className="flex items-center gap-2 border-b border-border/60 pb-3 mb-4">
                  <Database className="h-5 w-5 text-accent" />
                  <h3 className="font-display font-bold text-foreground text-base">Data Overview</h3>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { label: "Pantry Items", value: pantry.length, icon: "🧂" },
                    { label: "Recipes", value: recipes.length, icon: "📖" },
                    { label: "Orders", value: orders.length, icon: "📦" },
                    { label: "Social Posts", value: social.length, icon: "📱" },
                    { label: "Schedule Tasks", value: schedule.length, icon: "📅" },
                    { label: "Gifted Accounts", value: giftedUsers.length, icon: "🎁" },
                  ].map(item => (
                    <div key={item.label} className="bg-background rounded-lg py-3 px-3.5 text-center">
                      <div className="text-xl">{item.icon}</div>
                      <div className="text-xl font-display font-bold text-foreground mt-0.5">{item.value}</div>
                      <div className="text-[11px] text-foreground/50 mt-0.5">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Export */}
              <div className={tw.card}>
                <div className="flex items-center gap-2 border-b border-border/60 pb-3 mb-4">
                  <Download className="h-5 w-5 text-accent" />
                  <h3 className="font-display font-bold text-foreground text-base">Export Data</h3>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <button onClick={() => exportCSV(orders.map(({ items, order_items, item, size, flavor, quantity, ...rest }) => ({ ...rest, items_summary: orderItemsSummary({ items }) })), "orders.csv")} className={tw.btn}>Export Orders CSV</button>
                  <button onClick={() => exportCSV(pantry, "pantry.csv")} className={`${tw.btn} !bg-foreground !text-background`}>Export Pantry CSV</button>
                  <button onClick={() => exportCSV(recipes.map(r => ({ ...r, ingredients: JSON.stringify(r.ingredients) })), "recipes.csv")} className={`${tw.btn} !bg-foreground/50 !text-background`}>Export Recipes CSV</button>
                </div>
              </div>

              {/* Supabase Setup Reminder */}
              <div className="p-6 rounded-card bg-warning/10 border border-warning/30 shadow-card">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  <h3 className="font-display font-bold text-warning text-base">First-Time Setup</h3>
                </div>
                <div className="text-xs text-foreground/70 mb-2">To enable gifted accounts tracking, run this SQL in your Supabase dashboard → SQL Editor:</div>
                <pre className="bg-warning/15 rounded-md p-2.5 text-[11px] text-foreground/80 mt-2 overflow-x-auto whitespace-pre-wrap">{`CREATE TABLE IF NOT EXISTS gifted_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);
ALTER TABLE gifted_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_only" ON gifted_users
  USING (created_by = auth.uid());`}</pre>
              </div>
            </div>
          )}

      </div>



      {/* INVOICE PRINT OVERLAY */}
      {invoicePrintOrder && (() => {
        const ord = invoicePrintOrder;
        const num = String(ord.id || "").replace(/[^0-9]/g, "").slice(-4).padStart(4, "0");
        const invNum = "INV-" + num + "-" + new Date().getFullYear();
        const issued = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
        const due = ord.due
          ? new Date(ord.due + "T12:00:00").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
          : "Upon delivery";
        const total = parseFloat(ord.total || 0).toFixed(2);
        const _paySummary = getPaymentSummary(ord.id, ord.total);
        const _hasPaymentActivity = _paySummary.amountPaid > 0;
        const NAVY = invoiceHeaderColor; const RUST = invoiceAccentColor; const CREAM = "#F9FAFB"; const BORDER = "#e2e8f0";
        return (
          <div id="bfinv" style={{ position: "fixed", inset: 0, zIndex: 9999, background: "var(--color-background)", overflowY: "auto", fontFamily: "Georgia, serif", color: NAVY }}>
            <style>{`@media print { body > *:not(#bfinv){display:none!important} #bfinv{position:static!important;overflow:visible!important} .np{display:none!important} }`}</style>

            {/* Toolbar */}
            <div className="np bg-card border-b border-border" style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 24px", position: "sticky", top: 0, zIndex: 1 }}>
              <button onClick={() => setInvoicePrintOrder(null)} className="border border-border bg-background text-foreground text-sm rounded-lg px-4 py-2 font-body">✕ Close</button>
              {pdfGenerating
                ? <button disabled className="rounded-lg px-5 py-2 text-sm font-bold font-body bg-gray-400 text-white cursor-not-allowed">⏳ Generating...</button>
                : <button onClick={downloadInvoicePdf} className={tw.btn}>⬇️ Download PDF</button>}
            </div>

            {/* Invoice */}
            <div id="bfinv-content" style={{ maxWidth: 700, margin: "0 auto", background: "#fff", boxShadow: "0 4px 40px rgba(21,41,55,0.12)" }}>

              {/* Navy header */}
              <div style={{ background: NAVY, padding: "22px 36px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  {bakeryLogo
                    ? <img src={bakeryLogo} alt="" style={{ height: 60, width: "auto", objectFit: "contain", flexShrink: 0 }} />
                    : <div style={{ width: 56, height: 56, borderRadius: 10, background: RUST, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>🧁</div>
                  }
                  <div>
                    <div style={{ color: "#fff", fontSize: 18, fontWeight: "bold", letterSpacing: 0.4 }}>{bakeryName}</div>
                    <div style={{ color: RUST, fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", marginTop: 3 }}>Invoice</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 28, fontWeight: "bold", color: RUST, letterSpacing: -1 }}>INVOICE</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>{invNum}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Issued {issued}</div>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: "32px 36px" }}>

                {/* Bill To / From */}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 32, gap: 24, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#94a3b8", marginBottom: 8 }}>Bill To</div>
                    <div style={{ fontSize: 17, fontWeight: "bold", color: NAVY }}>{ord.customer}</div>
                    {ord.phone && <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>📞 {ord.phone}</div>}
                    {ord.email && <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>✉️ {ord.email}</div>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#94a3b8", marginBottom: 8 }}>From</div>
                    <div style={{ fontSize: 14, fontWeight: "bold", color: NAVY }}>{bakeryName}</div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4, fontStyle: "italic" }}>Powered by BakeFlo</div>
                  </div>
                </div>

                {/* Items table */}
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 0 }}>
                  <thead>
                    <tr style={{ background: NAVY }}>
                      <th style={{ padding: "11px 16px", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: CREAM, fontWeight: 600, textAlign: "left" }}>Description</th>
                      <th style={{ padding: "11px 16px", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: CREAM, fontWeight: 600, textAlign: "left" }}>Due Date</th>
                      <th style={{ padding: "11px 16px", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: CREAM, fontWeight: 600, textAlign: "right" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const _items = ord.items && ord.items.length > 0 ? ord.items : [{ item: "", size: "", flavor: "", quantity: null, price: null }];
                      const _anyPriced = _items.some(i => i.price != null);
                      return _items.map((li, idx) => {
                        const detail = [li.quantity && li.quantity !== 1 && `Qty ${li.quantity}`, li.size, li.flavor].filter(Boolean).join(" · ");
                        return (
                          <tr key={li.id || idx}>
                            <td style={{ padding: 16, borderBottom: "1px solid " + BORDER, fontSize: 14, verticalAlign: "top" }}>
                              <strong>{li.item}</strong>
                              {detail && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 3 }}>{detail}</div>}
                              {idx === 0 && ord.notes && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 5 }}>{ord.notes}</div>}
                            </td>
                            <td style={{ padding: 16, borderBottom: "1px solid " + BORDER, fontSize: 13, color: "#6b7280", verticalAlign: "top" }}>{idx === 0 ? due : ""}</td>
                            <td style={{ padding: 16, borderBottom: "1px solid " + BORDER, fontSize: 14, fontWeight: "bold", textAlign: "right", verticalAlign: "top" }}>
                              {li.price != null ? `$${Number(li.price).toFixed(2)}` : (idx === 0 && !_anyPriced ? `$${total}` : "")}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                  <tfoot>
                    {_hasPaymentActivity ? (
                      <>
                        <tr style={{ background: CREAM }}>
                          <td colSpan={2} style={{ padding: "10px 16px", borderTop: "2px solid " + RUST, fontSize: 13 }}>Total</td>
                          <td style={{ padding: "10px 16px", borderTop: "2px solid " + RUST, fontSize: 13, textAlign: "right" }}>${total}</td>
                        </tr>
                        <tr style={{ background: CREAM }}>
                          <td colSpan={2} style={{ padding: "6px 16px", fontSize: 13, color: "#5a7a5c" }}>Amount Paid</td>
                          <td style={{ padding: "6px 16px", fontSize: 13, textAlign: "right", color: "#5a7a5c" }}>−${_paySummary.amountPaid.toFixed(2)}</td>
                        </tr>
                        <tr style={{ background: CREAM }}>
                          <td colSpan={2} style={{ padding: "12px 16px 18px", fontSize: 16, fontWeight: "bold" }}><strong>Balance Due</strong></td>
                          <td style={{ padding: "12px 16px 18px", fontSize: 16, fontWeight: "bold", textAlign: "right" }}>${_paySummary.balanceDue.toFixed(2)}</td>
                        </tr>
                      </>
                    ) : (
                      <tr style={{ background: CREAM }}>
                        <td colSpan={2} style={{ padding: "18px 16px", borderTop: "2px solid " + RUST, fontSize: 16, fontWeight: "bold" }}><strong>Total Due</strong></td>
                        <td style={{ padding: "18px 16px", borderTop: "2px solid " + RUST, fontSize: 16, fontWeight: "bold", textAlign: "right" }}>${total}</td>
                      </tr>
                    )}
                  </tfoot>
                </table>

                {/* Status badges */}
                <div style={{ marginTop: 20, marginBottom: 36, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ display: "inline-block", background: "#fef0e8", color: RUST, padding: "5px 16px", borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>{ord.status}</span>
                  <span style={{ display: "inline-block", background: "transparent", border: "1.5px solid " + PAYMENT_STATUS_COLORS[_paySummary.status], color: PAYMENT_STATUS_COLORS[_paySummary.status], padding: "5px 16px", borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>{_paySummary.status}</span>
                </div>

                {/* How to Pay */}
                {(venmo || paypal || zelle || acceptsCash || otherPay) && (
                  <div style={{ borderTop: "1px solid " + BORDER, paddingTop: 18, marginBottom: 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: RUST, marginBottom: 12 }}>How to Pay</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 24px" }}>
                      {venmo  && <div style={{ fontSize: 13, color: NAVY }}><strong>Venmo</strong> &nbsp;{venmo}</div>}
                      {paypal && <div style={{ fontSize: 13, color: NAVY }}><strong>PayPal</strong> &nbsp;{paypal}</div>}
                      {zelle  && <div style={{ fontSize: 13, color: NAVY }}><strong>Zelle</strong> &nbsp;{zelle}</div>}
                      {acceptsCash && <div style={{ fontSize: 13, color: NAVY }}><strong>Cash</strong> &nbsp;accepted</div>}
                      {otherPay && <div style={{ fontSize: 13, color: NAVY }}>{otherPay}</div>}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div style={{ borderTop: "1px solid " + BORDER, paddingTop: 20, textAlign: "center", color: "#94a3b8", fontSize: 12, lineHeight: 2.2 }}>
                  Thank you for your order! 🧁<br />
                  <strong style={{ color: RUST }}>{bakeryName}</strong> &nbsp;·&nbsp; Powered by BakeFlo
                </div>
              </div>
            </div>

            {/* Bottom print button */}
            <div className="np flex justify-center" style={{ padding: "24px 0 40px" }}>
              {pdfGenerating
                ? <button disabled className="rounded-lg px-9 py-3 text-base font-bold font-body bg-gray-400 text-white cursor-not-allowed">⏳ Generating PDF...</button>
                : <button onClick={downloadInvoicePdf} className={`${tw.btn} px-9 py-3 text-base`}>⬇️ Download PDF</button>}
            </div>
          </div>
        );
      })()}

      {labelPrintOrder && (() => {
        const recipe = recipes.find(r => String(r.id) === String(labelRecipeId)) || null;
        const spec = LABEL_SIZES.find(sz => sz.value === labelSize) || LABEL_SIZES[0];
        const isRound = !!spec.round;
        const allowIngredients = spec.w >= 3 && spec.h >= 2;
        const registrationLine = dshsRegistrationNumber || physicalAddress || null;
        const quickIdDefault = recipe ? `${bakeryName} — ${recipe.name}` : "";
        const quickIdValue = labelQuickIdText !== null ? labelQuickIdText : quickIdDefault;
        const quickIdOnly = isRound && labelQuickIdMode;

        // Blockers that make a label non-distributable under SB 541.
        const blockers = [];
        if (!recipe) blockers.push("Select a recipe.");
        if (!registrationLine) blockers.push("Producer address or DSHS registration number is missing — add it in Settings.");
        if (labelTcs && !labelMadeOn.trim()) blockers.push('A "made on" date is required for refrigerated / TCS foods.');
        if (labelPcf && !labelBatchNo.trim()) blockers.push("A batch # is required for pickled, canned, or fermented foods.");
        const canExport = blockers.length === 0;

        const labelData = {
          food: recipe ? recipe.name : "Product Name",
          op: bakeryName || "Your Business Name",
          desc: labelDescription.trim(),
          idline: registrationLine || "⚠ ADDRESS OR DSHS ID MISSING",
          allergens: (recipe && recipe.allergens) || [],
          ingredients: (allowIngredients && labelIncludeIngredients && recipe && recipe.ingredientsList) ? recipe.ingredientsList : "",
          tcs: labelTcs,
          madeon: labelMadeOn.trim(),
          pcf: labelPcf,
          batch: labelBatchNo.trim(),
          quickIdOnly,
          quickIdText: quickIdValue,
          quickIdBold: labelQuickIdBold,
        };

        const downloadPng = () => {
          const c = labelBitmap(labelData, spec);
          const a = document.createElement("a");
          a.download = `bakeflo-label-${spec.w}x${spec.h}in-300dpi.png`;
          a.href = c.toDataURL("image/png");
          a.click();
        };

        const downloadPdf = () => {
          const { jsPDF } = window.jspdf || {};
          if (!jsPDF) return;
          const img = labelBitmap(labelData, spec).toDataURL("image/png");
          if (spec.mode === "sheet") {
            const doc = new jsPDF({ unit: "in", format: "letter", orientation: "portrait" });
            for (let r = 0; r < spec.rows; r++) {
              for (let col = 0; col < spec.cols; col++) {
                doc.addImage(img, "PNG", spec.left + col * spec.hpitch, spec.top + r * spec.vpitch, spec.w, spec.h);
              }
            }
            doc.save(`bakeflo-avery-${spec.value}-sheet.pdf`);
          } else {
            const doc = new jsPDF({ unit: "in", format: [spec.w, spec.h] });
            doc.addImage(img, "PNG", 0, 0, spec.w, spec.h);
            doc.save(`bakeflo-label-${spec.w}x${spec.h}in.pdf`);
          }
        };

        return (
          <div id="bflabel" style={{ position: "fixed", inset: 0, zIndex: 9999, background: "var(--color-background)", overflowY: "auto", fontFamily: "'Inter', sans-serif", color: C.dark }}>
            <style>{`@media print { body > *:not(#bflabel){display:none!important} #bflabel{position:static!important;overflow:visible!important} .np{display:none!important} }`}</style>

            {/* Toolbar */}
            <div className="np bg-card border-b border-border flex-wrap" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "14px 24px", position: "sticky", top: 0, zIndex: 1 }}>
              <div className="font-bold text-accent font-display">🏷 Compliance Label Proofer</div>
              <div className="flex gap-2.5">
                <button onClick={() => setLabelPrintOrder(null)} className="border border-border bg-background text-foreground text-sm rounded-lg px-4 py-2 font-body">✕ Close</button>
                <button onClick={downloadPng} disabled={!canExport} className={`${tw.btnSec} bg-background text-accent border-accent ${canExport ? "" : "opacity-40 cursor-not-allowed"}`}>⬇ PNG (300 DPI)</button>
                <button onClick={downloadPdf} disabled={!canExport} className={`${tw.btn} ${canExport ? "" : "opacity-40 cursor-not-allowed"}`}>
                  {spec.mode === "sheet" ? "⬇ PDF (Avery sheet)" : "⬇ PDF (single label)"}
                </button>
              </div>
            </div>

            {/* Controls */}
            <div className="np bg-card border-b border-border flex flex-col gap-3" style={{ padding: "16px 24px", maxWidth: 700, margin: "0 auto" }}>
              <div>
                <label className={tw.eyebrow}>Recipe</label>
                <select value={labelRecipeId} onChange={e => { setLabelRecipeId(e.target.value); setLabelQuickIdText(null); }} className={tw.input}>
                  <option value="">— Select a recipe —</option>
                  {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <div className="text-xs text-foreground/50 mt-1">Allergens, ingredients, and your producer info fill in automatically from this recipe and your Settings.</div>
              </div>

              <div>
                <label className={tw.eyebrow}>Your label product</label>
                <select value={labelSize} onChange={e => {
                  const next = e.target.value;
                  setLabelSize(next);
                  // Round stickers are too small for full statutory content — default them to quick-ID.
                  const nextSpec = LABEL_SIZES.find(sz => sz.value === next);
                  setLabelQuickIdMode(!!(nextSpec && nextSpec.round));
                }} className={tw.input}>
                  {LABEL_SIZE_GROUPS.map(g => (
                    <optgroup key={g} label={g}>
                      {LABEL_SIZES.filter(sz => sz.group === g).map(sz => <option key={sz.value} value={sz.value}>{sz.label}</option>)}
                    </optgroup>
                  ))}
                </select>
                <div className="text-xs text-foreground/50 mt-1">{spec.desc}</div>
                {labelTcs && (
                  <div className="text-xs text-warning bg-warning/10 border border-warning/25 rounded-lg px-2.5 py-2 mt-2">
                    TCS foods: the safe-handling statement must print at 12&nbsp;pt or larger. On smaller labels it may render below that — use the 3⅓&nbsp;×&nbsp;4&nbsp;in label, or include that statement on your receipt/invoice, which SB 541 allows.
                  </div>
                )}
              </div>

              {isRound && (
                <div>
                  <label className="flex items-center gap-2 text-sm text-foreground/70 cursor-pointer">
                    <input type="checkbox" checked={labelQuickIdMode} onChange={e => setLabelQuickIdMode(e.target.checked)} />
                    Quick-ID sticker only (no statutory content)
                  </label>
                  {labelQuickIdMode && (
                    <>
                      <div className="text-xs text-danger bg-danger/10 border border-danger/25 rounded-lg px-2.5 py-2 mt-2">
                        ⚠ Quick-ID label only — must be paired with a fully compliant label elsewhere on the packaging.
                      </div>
                      <label className={`${tw.eyebrow} mt-3 block`}>Quick-ID Label Text</label>
                      <textarea value={quickIdValue} onChange={e => setLabelQuickIdText(e.target.value)} placeholder="e.g. Business Name — Recipe Name" rows={3} className={`${tw.input} resize-y`} />
                      <div className="flex gap-5 mt-3 flex-wrap">
                        <div>
                          <label className={tw.eyebrow}>Bold</label>
                          <button type="button" onClick={() => setLabelQuickIdBold(b => !b)} className={`${tw.btnSec} ${labelQuickIdBold ? "bg-accent text-white border-accent" : "bg-background text-accent border-accent"}`}>{labelQuickIdBold ? "On" : "Off"}</button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {!quickIdOnly && (
                <div>
                  <label className={tw.eyebrow}>Label Description (optional)</label>
                  <input value={labelDescription} onChange={e => setLabelDescription(e.target.value)} placeholder="e.g. Best enjoyed same day" className={tw.input} />
                </div>
              )}

              {!quickIdOnly && allowIngredients && recipe && recipe.ingredientsList && (
                <label className="flex items-center gap-2 text-sm text-foreground/70 cursor-pointer">
                  <input type="checkbox" checked={labelIncludeIngredients} onChange={e => setLabelIncludeIngredients(e.target.checked)} />
                  Include ingredient list on label <span className="text-foreground/40">(not required in Texas)</span>
                </label>
              )}

              {!quickIdOnly && (
                <div>
                  <label className="flex items-center gap-2 text-sm text-foreground/70 cursor-pointer">
                    <input type="checkbox" checked={labelTcs} onChange={e => setLabelTcs(e.target.checked)} />
                    Refrigerated / TCS food (cheesecake, custard, cream-filled, etc.)
                  </label>
                  {labelTcs && (
                    <div className="mt-2">
                      <label className={tw.eyebrow}>Made on date <span className="text-danger">(required)</span></label>
                      <input value={labelMadeOn} onChange={e => setLabelMadeOn(e.target.value)} placeholder="Made 07/15/2026" className={tw.input} style={!labelMadeOn.trim() ? { borderColor: "#A83248" } : undefined} />
                      <div className="text-xs text-warning mt-1">SB 541 requires the date the food was made on the label.</div>
                    </div>
                  )}
                </div>
              )}

              {!quickIdOnly && (
                <div>
                  <label className="flex items-center gap-2 text-sm text-foreground/70 cursor-pointer">
                    <input type="checkbox" checked={labelPcf} onChange={e => setLabelPcf(e.target.checked)} />
                    Pickled, canned, or fermented food
                  </label>
                  {labelPcf && (
                    <div className="mt-2">
                      <label className={tw.eyebrow}>Batch # <span className="text-danger">(required)</span></label>
                      <input value={labelBatchNo} onChange={e => setLabelBatchNo(e.target.value)} placeholder="e.g. 20260824" className={tw.input} style={!labelBatchNo.trim() ? { borderColor: "#A83248" } : undefined} />
                      <div className="text-xs text-warning mt-1">Adds a batch # so a specific batch can be traced. Many bakers use the date.</div>
                    </div>
                  )}
                </div>
              )}

              {blockers.length > 0 && (
                <div className="text-xs text-danger bg-danger/10 border border-danger/25 rounded-lg px-2.5 py-2">
                  <div className="font-bold mb-1">⚠ Do not distribute this label yet:</div>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {blockers.map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {/* Preview */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 20px", gap: 12 }}>
              <LabelCanvas data={labelData} spec={spec} />
              <div className="np text-xs text-foreground/40">Preview renders at 300 DPI — what you download is what prints.</div>
            </div>
          </div>
        );
      })()}

      {/* WATERMARK */}
      <div className="watermark-logo" style={{ position: "fixed", bottom: 16, right: 16, zIndex: 51, pointerEvents: "none" }}>
        <img alt="" src="/brand/BakeFlo_Primary_Horizontal_Cream_Berry.svg" style={{ height: 84, width: "auto", objectFit: "contain" }} />
      </div>
    </div>
  );
}

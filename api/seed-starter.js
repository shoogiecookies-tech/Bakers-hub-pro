const { createClient } = require("@supabase/supabase-js");

const STARTER_ITEMS = [
  { name: "All-Purpose Flour",         category: "Flour & Grains", unit: "cup",  store_unit: "5 lb bag",        store_cost: 4.98, yields: 18   },
  { name: "Granulated Sugar",           category: "Sweeteners",     unit: "cup",  store_unit: "5 lb bag",        store_cost: 4.98, yields: 11.5 },
  { name: "Brown Sugar",                category: "Sweeteners",     unit: "cup",  store_unit: "2 lb bag",        store_cost: 3.49, yields: 4.5  },
  { name: "Powdered Sugar",             category: "Sweeteners",     unit: "cup",  store_unit: "2 lb bag",        store_cost: 3.49, yields: 8    },
  { name: "Unsalted Butter",            category: "Eggs & Fats",    unit: "tbsp", store_unit: "1 lb (4 sticks)", store_cost: 4.50, yields: 32   },
  { name: "Large Eggs",                 category: "Eggs & Fats",    unit: "pc",   store_unit: "dozen",           store_cost: 6.99, yields: 12   },
  { name: "Whole Milk",                 category: "Dairy",          unit: "cup",  store_unit: "half gallon",     store_cost: 3.99, yields: 8    },
  { name: "Heavy Cream",                category: "Dairy",          unit: "cup",  store_unit: "pint",            store_cost: 3.99, yields: 2    },
  { name: "Vanilla Extract",            category: "Flavoring",      unit: "tsp",  store_unit: "4 oz bottle",     store_cost: 8.99, yields: 24   },
  { name: "Baking Soda",                category: "Leavening",      unit: "tsp",  store_unit: "16 oz box",       store_cost: 1.49, yields: 96   },
  { name: "Baking Powder",              category: "Leavening",      unit: "tsp",  store_unit: "8 oz can",        store_cost: 2.99, yields: 48   },
  { name: "Meringue Powder",            category: "Leavening",      unit: "tbsp", store_unit: "4 oz can",        store_cost: 7.99, yields: 12   },
  { name: "Salt",                       category: "Flavoring",      unit: "tsp",  store_unit: "26 oz container", store_cost: 1.99, yields: 156  },
  { name: "Semi-Sweet Chocolate Chips", category: "Chocolate",      unit: "cup",  store_unit: "12 oz bag",       store_cost: 4.99, yields: 2    },
  { name: "Cocoa Powder",               category: "Chocolate",      unit: "cup",  store_unit: "8 oz can",        store_cost: 5.99, yields: 2.25 },
];

function buildRecipes(idOf) {
  return [
    {
      name: "Classic Chocolate Chip Cookies",
      category: "Cookies",
      servings: 24,
      notes: "Crispy edges, chewy centers — a crowd favorite.",
      ingredients: [
        { pantryId: idOf("All-Purpose Flour"),          amount: 2.25, unit: "cup"  },
        { pantryId: idOf("Baking Soda"),                amount: 1,    unit: "tsp"  },
        { pantryId: idOf("Salt"),                       amount: 1,    unit: "tsp"  },
        { pantryId: idOf("Unsalted Butter"),            amount: 16,   unit: "tbsp" },
        { pantryId: idOf("Granulated Sugar"),           amount: 0.75, unit: "cup"  },
        { pantryId: idOf("Brown Sugar"),                amount: 0.75, unit: "cup"  },
        { pantryId: idOf("Large Eggs"),                 amount: 2,    unit: "pc"   },
        { pantryId: idOf("Vanilla Extract"),            amount: 1,    unit: "tsp"  },
        { pantryId: idOf("Semi-Sweet Chocolate Chips"), amount: 2,    unit: "cup"  },
      ],
    },
    {
      name: "Classic Vanilla Birthday Cake",
      category: "Cakes",
      servings: 12,
      notes: "Fluffy two-layer vanilla cake with buttercream frosting.",
      ingredients: [
        { pantryId: idOf("All-Purpose Flour"),  amount: 3,    unit: "cup"  },
        { pantryId: idOf("Baking Powder"),      amount: 3,    unit: "tsp"  },
        { pantryId: idOf("Salt"),               amount: 0.5,  unit: "tsp"  },
        { pantryId: idOf("Unsalted Butter"),    amount: 16,   unit: "tbsp" },
        { pantryId: idOf("Granulated Sugar"),   amount: 2,    unit: "cup"  },
        { pantryId: idOf("Large Eggs"),         amount: 4,    unit: "pc"   },
        { pantryId: idOf("Vanilla Extract"),    amount: 2,    unit: "tsp"  },
        { pantryId: idOf("Whole Milk"),         amount: 1,    unit: "cup"  },
        { pantryId: idOf("Powdered Sugar"),     amount: 4,    unit: "cup"  },
        { pantryId: idOf("Heavy Cream"),        amount: 0.25, unit: "cup"  },
      ],
    },
    {
      name: "Fudgy Brownies",
      category: "Other",
      servings: 16,
      notes: "Dense, rich, and intensely chocolatey — baked in a 9×13 pan.",
      ingredients: [
        { pantryId: idOf("Unsalted Butter"),   amount: 16,   unit: "tbsp" },
        { pantryId: idOf("Granulated Sugar"),  amount: 2,    unit: "cup"  },
        { pantryId: idOf("Large Eggs"),        amount: 4,    unit: "pc"   },
        { pantryId: idOf("Vanilla Extract"),   amount: 2,    unit: "tsp"  },
        { pantryId: idOf("Cocoa Powder"),      amount: 0.75, unit: "cup"  },
        { pantryId: idOf("All-Purpose Flour"), amount: 1,    unit: "cup"  },
        { pantryId: idOf("Salt"),              amount: 0.5,  unit: "tsp"  },
        { pantryId: idOf("Baking Powder"),     amount: 0.5,  unit: "tsp"  },
      ],
    },
  ];
}

async function seedForUser(uid, supabase) {
  const { data: seededPantry, error: pantryErr } = await supabase.from("pantry").insert(
    STARTER_ITEMS.map(item => ({
      user_id:    uid,
      name:       item.name,
      category:   item.category,
      unit:       item.unit,
      store_unit: item.store_unit,
      store_cost: item.store_cost,
      cost_per:   +(item.store_cost / item.yields).toFixed(4),
    }))
  ).select();

  if (pantryErr || !seededPantry?.length) {
    throw new Error("Pantry insert failed: " + (pantryErr?.message || "no data returned"));
  }

  const idOf = name => seededPantry.find(p => p.name === name)?.id || null;
  const recipes = buildRecipes(idOf);

  const { error: recipeErr } = await supabase.from("recipes").insert(
    recipes.map(r => ({
      user_id:     uid,
      name:        r.name,
      category:    r.category,
      servings:    r.servings,
      notes:       r.notes,
      ingredients: r.ingredients,
    }))
  );

  if (recipeErr) throw new Error("Recipe insert failed: " + recipeErr.message);
  return seededPantry;
}

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ error: "Missing auth token" });

  const admin = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: "Invalid token" });

  const { data: existing } = await admin.from("pantry").select("id").eq("user_id", user.id).limit(1);

  if (!(existing && existing.length > 0)) {
    try {
      await seedForUser(user.id, admin);
    } catch (e) {
      console.error("seed-starter error:", e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  // Always return data via service role (bypasses RLS for the caller)
  const [{ data: pantryData, error: pantryErr }, { data: recipesData }] = await Promise.all([
    admin.from("pantry").select("*").eq("user_id", user.id).order("name"),
    admin.from("recipes").select("*").eq("user_id", user.id).order("name"),
  ]);
  if (pantryErr) {
    console.error("seed-starter pantry fetch error:", pantryErr.message);
    return res.status(500).json({ error: "Pantry fetch failed: " + pantryErr.message });
  }
  return res.status(200).json({ ok: true, skipped: !!(existing && existing.length > 0), pantry: pantryData || [], recipes: recipesData || [] });
}

module.exports = handler;
module.exports.seedForUser = seedForUser;

const { createClient } = require("@supabase/supabase-js");

const STARTER_ITEMS = [
  { name: "All-Purpose Flour",         unit: "cup",  store_unit: "5 lb bag",        store_cost: 4.98, yields: 18   },
  { name: "Granulated Sugar",           unit: "cup",  store_unit: "5 lb bag",        store_cost: 4.98, yields: 11.5 },
  { name: "Brown Sugar",                unit: "cup",  store_unit: "2 lb bag",        store_cost: 3.49, yields: 4.5  },
  { name: "Powdered Sugar",             unit: "cup",  store_unit: "2 lb bag",        store_cost: 3.49, yields: 8    },
  { name: "Unsalted Butter",            unit: "tbsp", store_unit: "1 lb (4 sticks)", store_cost: 4.50, yields: 32   },
  { name: "Large Eggs",                 unit: "pc",   store_unit: "dozen",           store_cost: 6.99, yields: 12   },
  { name: "Whole Milk",                 unit: "cup",  store_unit: "half gallon",     store_cost: 3.99, yields: 8    },
  { name: "Vanilla Extract",            unit: "tsp",  store_unit: "4 oz bottle",     store_cost: 8.99, yields: 24   },
  { name: "Baking Soda",                unit: "tsp",  store_unit: "16 oz box",       store_cost: 1.49, yields: 96   },
  { name: "Baking Powder",              unit: "tsp",  store_unit: "8 oz can",        store_cost: 2.99, yields: 48   },
  { name: "Salt",                       unit: "tsp",  store_unit: "26 oz container", store_cost: 1.99, yields: 156  },
  { name: "Semi-Sweet Chocolate Chips", unit: "cup",  store_unit: "12 oz bag",       store_cost: 4.99, yields: 2    },
  { name: "Cocoa Powder",               unit: "cup",  store_unit: "8 oz can",        store_cost: 5.99, yields: 2.25 },
  { name: "Heavy Cream",                unit: "cup",  store_unit: "pint",            store_cost: 3.99, yields: 2    },
  { name: "Meringue Powder",            unit: "tbsp", store_unit: "4 oz can",        store_cost: 7.99, yields: 12   },
];

function buildRecipes(idOf) {
  return [
    {
      name: "Classic Chocolate Chip Cookies",
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
      servings:    r.servings,
      notes:       r.notes,
      ingredients: r.ingredients,
    }))
  );

  if (recipeErr) throw new Error("Recipe insert failed: " + recipeErr.message);
  return seededPantry;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ error: "Missing auth token" });

  const admin = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Verify the caller's JWT
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: "Invalid token" });

  // Check pantry isn't already seeded (avoid double-insert on race)
  const { data: existing } = await admin.from("pantry").select("id").eq("user_id", user.id).limit(1);
  if (existing && existing.length > 0) {
    return res.status(200).json({ ok: true, skipped: true });
  }

  try {
    await seedForUser(user.id, admin);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("seed-starter error:", e.message);
    return res.status(500).json({ error: e.message });
  }
};

module.exports.seedForUser = seedForUser;

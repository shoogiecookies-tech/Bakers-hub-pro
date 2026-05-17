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
  if (pantryErr || !seededPantry?.length) throw new Error(pantryErr?.message || "pantry insert returned no data");

  const idOf = name => seededPantry.find(p => p.name === name)?.id || null;
  const { error: recipeErr } = await supabase.from("recipes").insert([
    {
      user_id: uid, name: "Classic Chocolate Chip Cookies", category: "Cookies", servings: 24,
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
      user_id: uid, name: "Classic Vanilla Birthday Cake", category: "Cakes", servings: 12,
      notes: "Fluffy two-layer vanilla cake with buttercream frosting.",
      ingredients: [
        { pantryId: idOf("All-Purpose Flour"), amount: 3,    unit: "cup"  },
        { pantryId: idOf("Baking Powder"),     amount: 3,    unit: "tsp"  },
        { pantryId: idOf("Salt"),              amount: 0.5,  unit: "tsp"  },
        { pantryId: idOf("Unsalted Butter"),   amount: 16,   unit: "tbsp" },
        { pantryId: idOf("Granulated Sugar"),  amount: 2,    unit: "cup"  },
        { pantryId: idOf("Large Eggs"),        amount: 4,    unit: "pc"   },
        { pantryId: idOf("Vanilla Extract"),   amount: 2,    unit: "tsp"  },
        { pantryId: idOf("Whole Milk"),        amount: 1,    unit: "cup"  },
        { pantryId: idOf("Powdered Sugar"),    amount: 4,    unit: "cup"  },
        { pantryId: idOf("Heavy Cream"),       amount: 0.25, unit: "cup"  },
      ],
    },
    {
      user_id: uid, name: "Fudgy Brownies", category: "Other", servings: 16,
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
  ]);
  if (recipeErr) throw new Error(recipeErr.message);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  try {
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

    if (!email || !password) return res.status(400).json({ error: "email and password required" });

    const supabase = createClient(
      process.env.REACT_APP_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { gifted: true },
    });

    if (error) {
      console.error("gift-account createUser error:", error);
      return res.status(400).json({ error: error.message });
    }

    const userId = data.user?.id;
    await supabase.from("gifted_users").insert([{ email, notes: notes || null, created_by: created_by || null }]);

    try {
      await seedForUser(userId, supabase);
    } catch (e) {
      console.error("gift-account seed error:", e.message);
    }

    return res.status(200).json({ ok: true, userId });
  } catch (e) {
    console.error("gift-account unhandled error:", e.message);
    return res.status(500).json({ error: e.message || "Internal server error" });
  }
};

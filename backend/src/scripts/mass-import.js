#!/usr/bin/env node
/**
 * Mass Product Import — 10,000 products from Open Food Facts
 * 
 * Fetches real US grocery products by category, maps them to Hy-Vee aisles,
 * and stores them with images in the product_locations table.
 * 
 * Usage: node --env-file=.env src/scripts/mass-import.js
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const OFF_API = 'https://world.openfoodfacts.org';

// Category → aisle mapping for Hy-Vee
const CATEGORIES = [
  // Aisle 1: Bread & Spreads
  { off: 'breads', aisle: '1', detail: 'Side A, Bread section', limit: 120 },
  { off: 'tortillas', aisle: '1', detail: 'Side A, Tortilla section', limit: 40 },
  { off: 'peanut-butters', aisle: '1', detail: 'Side B, Spreads', limit: 60 },
  { off: 'jams', aisle: '1', detail: 'Side B, Jam & Jelly', limit: 40 },
  { off: 'honeys', aisle: '1', detail: 'Side B, Honey', limit: 30 },

  // Aisle 2: Cereal & Breakfast
  { off: 'breakfast-cereals', aisle: '2', detail: 'Side A, Cereal', limit: 200 },
  { off: 'granolas', aisle: '2', detail: 'Side A, Granola', limit: 40 },
  { off: 'pancake-mixes', aisle: '2', detail: 'Side B, Pancake mix', limit: 30 },
  { off: 'syrups', aisle: '2', detail: 'Side B, Syrup', limit: 30 },
  { off: 'cereal-bars', aisle: '2', detail: 'Side B, Breakfast bars', limit: 60 },

  // Aisle 3: Spices & Baking
  { off: 'spices', aisle: '3', detail: 'Side A, Spice rack', limit: 150 },
  { off: 'flours', aisle: '3', detail: 'Side B, Flour', limit: 40 },
  { off: 'sugars', aisle: '3', detail: 'Side B, Sugar', limit: 40 },
  { off: 'baking-aids', aisle: '3', detail: 'Side B, Baking supplies', limit: 60 },
  { off: 'chocolate-chips', aisle: '3', detail: 'Side B, Chocolate chips', limit: 30 },

  // Aisle 4: Pasta & Grains
  { off: 'pastas', aisle: '4', detail: 'Side A, Pasta', limit: 150 },
  { off: 'pasta-sauces', aisle: '4', detail: 'Side A, Pasta sauce', limit: 100 },
  { off: 'rices', aisle: '4', detail: 'Side B, Rice & Grains', limit: 80 },
  { off: 'canned-beans', aisle: '4', detail: 'Side B, Beans', limit: 60 },

  // Aisle 5: Canned Goods & Soup
  { off: 'canned-vegetables', aisle: '5', detail: 'Side A, Canned vegetables', limit: 80 },
  { off: 'canned-fruits', aisle: '5', detail: 'Side A, Canned fruit', limit: 40 },
  { off: 'canned-tomatoes', aisle: '5', detail: 'Side A, Tomatoes', limit: 50 },
  { off: 'soups', aisle: '5', detail: 'Side B, Soup', limit: 150 },
  { off: 'broths', aisle: '5', detail: 'Side B, Broth', limit: 40 },
  { off: 'instant-noodles', aisle: '5', detail: 'Side B, Ramen', limit: 60 },

  // Aisle 6: Snacks
  { off: 'chips', aisle: '6', detail: 'Side A, Chips', limit: 200 },
  { off: 'crackers', aisle: '6', detail: 'Side A, Crackers', limit: 80 },
  { off: 'pretzels', aisle: '6', detail: 'Side A, Pretzels', limit: 40 },
  { off: 'popcorn', aisle: '6', detail: 'Side A, Popcorn', limit: 40 },
  { off: 'cookies', aisle: '6', detail: 'Side B, Cookies', limit: 150 },
  { off: 'candies', aisle: '6', detail: 'Side B, Candy', limit: 100 },
  { off: 'nuts', aisle: '6', detail: 'Side B, Nuts & Trail Mix', limit: 80 },

  // Aisle 7: International
  { off: 'salsas', aisle: '7', detail: 'Side A, Salsa', limit: 60 },
  { off: 'taco-sauces', aisle: '7', detail: 'Side A, Mexican', limit: 40 },
  { off: 'soy-sauces', aisle: '7', detail: 'Side B, Asian', limit: 40 },
  { off: 'hot-sauces', aisle: '7', detail: 'Side B, Hot sauce', limit: 60 },
  { off: 'coconut-milks', aisle: '7', detail: 'Side B, Coconut milk', limit: 30 },

  // Aisle 8: Condiments & Dressings
  { off: 'ketchups', aisle: '8', detail: 'Side A, Ketchup', limit: 30 },
  { off: 'mustards', aisle: '8', detail: 'Side A, Mustard', limit: 30 },
  { off: 'mayonnaises', aisle: '8', detail: 'Side A, Mayo', limit: 30 },
  { off: 'bbq-sauces', aisle: '8', detail: 'Side A, BBQ sauce', limit: 40 },
  { off: 'pickles', aisle: '8', detail: 'Side A, Pickles', limit: 40 },
  { off: 'salad-dressings', aisle: '8', detail: 'Side B, Salad dressing', limit: 100 },
  { off: 'olive-oils', aisle: '8', detail: 'Side B, Olive oil', limit: 40 },
  { off: 'vinegars', aisle: '8', detail: 'Side B, Vinegar', limit: 30 },

  // Aisle 9: Beverages
  { off: 'sodas', aisle: '9', detail: 'Side A, Soda', limit: 150 },
  { off: 'sparkling-waters', aisle: '9', detail: 'Side A, Sparkling water', limit: 60 },
  { off: 'fruit-juices', aisle: '9', detail: 'Side B, Juice', limit: 100 },
  { off: 'energy-drinks', aisle: '9', detail: 'Side B, Energy drinks', limit: 80 },
  { off: 'sports-drinks', aisle: '9', detail: 'Side B, Sports drinks', limit: 40 },
  { off: 'waters', aisle: '9', detail: 'Side B, Water', limit: 40 },

  // Aisle 10: Coffee & Tea
  { off: 'coffees', aisle: '10', detail: 'Side A, Coffee', limit: 150 },
  { off: 'ground-coffees', aisle: '10', detail: 'Side A, Ground coffee', limit: 60 },
  { off: 'teas', aisle: '10', detail: 'Side B, Tea', limit: 100 },
  { off: 'hot-chocolates', aisle: '10', detail: 'Side B, Hot cocoa', limit: 30 },

  // Aisle 11: Cleaning
  { off: 'laundry-detergents', aisle: '11', detail: 'Side A, Laundry', limit: 60 },
  { off: 'dishwashing', aisle: '11', detail: 'Side B, Dish soap', limit: 40 },

  // Aisle 12: Paper goods (limited in OFF)
  { off: 'paper-towels', aisle: '12', detail: 'Side A, Paper towels', limit: 20 },

  // Aisle 13: Health & Beauty
  { off: 'shampoos', aisle: '13', detail: 'Side A, Shampoo', limit: 80 },
  { off: 'body-washes', aisle: '13', detail: 'Side A, Body wash', limit: 40 },
  { off: 'toothpastes', aisle: '13', detail: 'Side B, Toothpaste', limit: 40 },
  { off: 'deodorants', aisle: '13', detail: 'Side B, Deodorant', limit: 40 },
  { off: 'sunscreens', aisle: '13', detail: 'Side B, Sunscreen', limit: 30 },

  // Aisle 14: Baby & Pet
  { off: 'baby-foods', aisle: '14', detail: 'Side A, Baby food', limit: 80 },
  { off: 'baby-formulas', aisle: '14', detail: 'Side A, Formula', limit: 30 },
  { off: 'pet-foods', aisle: '14', detail: 'Side B, Pet food', limit: 60 },
  { off: 'dog-foods', aisle: '14', detail: 'Side B, Dog food', limit: 60 },
  { off: 'cat-foods', aisle: '14', detail: 'Side B, Cat food', limit: 60 },

  // Perimeter — Dairy
  { off: 'milks', aisle: null, detail: 'Dairy wall, Milk', limit: 80 },
  { off: 'cheeses', aisle: null, detail: 'Dairy wall, Cheese', limit: 150 },
  { off: 'yogurts', aisle: null, detail: 'Dairy wall, Yogurt', limit: 100 },
  { off: 'butters', aisle: null, detail: 'Dairy wall, Butter', limit: 40 },
  { off: 'eggs', aisle: null, detail: 'Dairy wall, Eggs', limit: 20 },
  { off: 'cream-cheeses', aisle: null, detail: 'Dairy wall, Cream cheese', limit: 30 },

  // Perimeter — Frozen
  { off: 'frozen-pizzas', aisle: null, detail: 'Frozen, Pizza', limit: 100 },
  { off: 'ice-creams', aisle: null, detail: 'Frozen, Ice cream', limit: 150 },
  { off: 'frozen-meals', aisle: null, detail: 'Frozen, Meals', limit: 100 },
  { off: 'frozen-vegetables', aisle: null, detail: 'Frozen, Vegetables', limit: 60 },
  { off: 'frozen-desserts', aisle: null, detail: 'Frozen, Desserts', limit: 60 },

  // Perimeter — Meat
  { off: 'beef', aisle: null, detail: 'Meat counter, Beef', limit: 40 },
  { off: 'chicken', aisle: null, detail: 'Meat counter, Chicken', limit: 40 },
  { off: 'pork', aisle: null, detail: 'Meat counter, Pork', limit: 30 },
  { off: 'sausages', aisle: null, detail: 'Meat wall, Sausage', limit: 40 },
  { off: 'bacons', aisle: null, detail: 'Meat wall, Bacon', limit: 30 },
  { off: 'deli-meats', aisle: null, detail: 'Deli, Sliced meats', limit: 40 },

  // Extra high-volume categories
  { off: 'chocolates', aisle: '6', detail: 'Side B, Chocolate', limit: 100 },
  { off: 'snack-bars', aisle: '6', detail: 'Side B, Snack bars', limit: 80 },
  { off: 'tortilla-chips', aisle: '7', detail: 'Side A, Tortilla chips', limit: 60 },
  { off: 'plant-milks', aisle: null, detail: 'Dairy wall, Plant-based milk', limit: 60 },
  { off: 'frozen-fries', aisle: null, detail: 'Frozen, Fries', limit: 40 },
];

async function getStoreAndAisles() {
  const { data: stores } = await supabase.from('stores').select('id').limit(1);
  const store = stores?.[0];
  if (!store) throw new Error('No store found — run seed-hyvee.js first');
  const { data: aisles } = await supabase.from('aisles').select('id, aisle_number').eq('store_id', store.id);
  const map = {};
  aisles?.forEach(a => { map[String(a.aisle_number)] = a.id; });
  return { storeId: store.id, aisleMap: map };
}

async function fetchCategory(category, pageSize = 50, page = 1) {
  const url = `${OFF_API}/cgi/search.pl?action=process&tagtype_0=categories&tag_contains_0=contains&tag_0=${category}&countries=United+States&sort_by=popularity_key&page_size=${pageSize}&page=${page}&fields=product_name,brands,image_front_small_url,image_front_url,image_url,quantity&json=1`;
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'WhereIsIt-HyVee/2.0 (product-locator; mass-import)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return [];
    const data = await r.json();
    return (data.products || []).filter(p =>
      p.product_name &&
      p.product_name.length > 2 &&
      p.product_name.length < 100 &&
      (p.image_front_small_url || p.image_front_url || p.image_url)
    );
  } catch {
    return [];
  }
}

async function massImport() {
  console.log('\n🏪  Mass Product Import — 10,000 products with images\n');
  const { storeId, aisleMap } = await getStoreAndAisles();
  console.log(`  Store: ${storeId}`);
  console.log(`  Aisles mapped: ${Object.keys(aisleMap).length}`);
  console.log(`  Categories to process: ${CATEGORIES.length}\n`);

  let totalInserted = 0;
  let totalSkipped = 0;
  const seenNames = new Set();

  // First get existing product names to avoid duplicates
  const { data: existing } = await supabase
    .from('product_locations')
    .select('product_name')
    .eq('store_id', storeId);
  existing?.forEach(p => seenNames.add(p.product_name.toLowerCase()));
  console.log(`  Existing products: ${seenNames.size}\n`);

  for (let c = 0; c < CATEGORIES.length; c++) {
    const cat = CATEGORIES[c];
    const pagesNeeded = Math.ceil(cat.limit / 50);
    let catProducts = [];

    for (let page = 1; page <= pagesNeeded; page++) {
      const pageSize = Math.min(50, cat.limit - catProducts.length);
      const products = await fetchCategory(cat.off, pageSize, page);
      catProducts.push(...products);
      if (products.length < pageSize) break;
      // Rate limit: 200ms between API calls
      await new Promise(r => setTimeout(r, 200));
    }

    // Deduplicate and prepare rows
    const rows = [];
    for (const p of catProducts) {
      const name = p.product_name.trim();
      const key = name.toLowerCase();
      if (seenNames.has(key)) continue;
      seenNames.add(key);

      rows.push({
        store_id: storeId,
        aisle_id: cat.aisle ? aisleMap[cat.aisle] || null : null,
        product_name: name,
        brand: (p.brands || '').split(',')[0].trim() || null,
        location_detail: cat.detail,
        image_url: p.image_front_small_url || p.image_front_url || p.image_url,
        confidence: 0.75,
        source: 'openfoodfacts',
      });
    }

    // Insert in batches of 100
    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      const { error } = await supabase.from('product_locations').insert(batch);
      if (error) {
        // Try one-by-one for constraint violations
        for (const row of batch) {
          const { error: e2 } = await supabase.from('product_locations').insert(row);
          if (!e2) totalInserted++;
          else totalSkipped++;
        }
      } else {
        totalInserted += batch.length;
      }
    }

    const pct = Math.round(((c + 1) / CATEGORIES.length) * 100);
    process.stdout.write(`\r  [${pct}%] ${cat.off}: +${rows.length} (total: ${totalInserted})`);
    process.stdout.write('                    ');
  }

  console.log(`\n\n🏪  Import Complete!`);
  console.log(`  Inserted: ${totalInserted}`);
  console.log(`  Skipped:  ${totalSkipped}`);
  console.log(`  Total in DB: ~${seenNames.size}\n`);
}

massImport().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});

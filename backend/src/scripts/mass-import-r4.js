#!/usr/bin/env node
/**
 * Mass Product Import — Round 4
 * Over 100 major US grocery brands that Hy-Vee carries
 * 
 * Usage: node --env-file=.env src/scripts/mass-import-r4.js
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const OFF_API = 'https://world.openfoodfacts.org';

// Major US grocery brands that Hy-Vee carries
const BRANDS = [
  // Snacks
  { brand: "Lay's", aisle: '6', detail: 'Side A, Chips', pages: 6 },
  { brand: 'Doritos', aisle: '6', detail: 'Side A, Chips', pages: 4 },
  { brand: 'Cheetos', aisle: '6', detail: 'Side A, Chips', pages: 4 },
  { brand: 'Ruffles', aisle: '6', detail: 'Side A, Chips', pages: 3 },
  { brand: 'Pringles', aisle: '6', detail: 'Side A, Chips', pages: 3 },
  { brand: 'Tostitos', aisle: '6', detail: 'Side A, Chips', pages: 3 },
  { brand: 'Goldfish', aisle: '6', detail: 'Side A, Crackers', pages: 3 },
  { brand: 'Cheez-It', aisle: '6', detail: 'Side A, Crackers', pages: 3 },
  { brand: 'Ritz', aisle: '6', detail: 'Side A, Crackers', pages: 3 },
  { brand: 'Oreo', aisle: '6', detail: 'Side B, Cookies', pages: 5 },
  { brand: 'Chips Ahoy', aisle: '6', detail: 'Side B, Cookies', pages: 3 },
  { brand: 'Nutter Butter', aisle: '6', detail: 'Side B, Cookies', pages: 2 },
  { brand: 'Snickers', aisle: '6', detail: 'Side B, Candy', pages: 3 },
  { brand: "Reese's", aisle: '6', detail: 'Side B, Candy', pages: 4 },
  { brand: 'Hershey', aisle: '6', detail: 'Side B, Chocolate', pages: 5 },
  { brand: "M&M's", aisle: '6', detail: 'Side B, Candy', pages: 3 },
  { brand: 'Skittles', aisle: '6', detail: 'Side B, Candy', pages: 3 },
  { brand: 'Haribo', aisle: '6', detail: 'Side B, Gummy candy', pages: 3 },
  { brand: 'Kind', aisle: '6', detail: 'Side B, Snack bars', pages: 4 },
  { brand: 'Clif', aisle: '6', detail: 'Side B, Energy bars', pages: 4 },
  { brand: 'Nature Valley', aisle: '2', detail: 'Side B, Granola bars', pages: 3 },
  { brand: 'Pop-Tarts', aisle: '2', detail: 'Side B, Toaster pastries', pages: 3 },

  // Cereal
  { brand: 'Cheerios', aisle: '2', detail: 'Side A, Cereal', pages: 4 },
  { brand: "Kellogg's", aisle: '2', detail: 'Side A, Cereal', pages: 6 },
  { brand: 'General Mills', aisle: '2', detail: 'Side A, Cereal', pages: 5 },
  { brand: 'Post', aisle: '2', detail: 'Side A, Cereal', pages: 4 },
  { brand: 'Quaker', aisle: '2', detail: 'Side A, Oatmeal', pages: 4 },

  // Beverages
  { brand: 'Coca-Cola', aisle: '9', detail: 'Side A, Soda', pages: 6 },
  { brand: 'Pepsi', aisle: '9', detail: 'Side A, Soda', pages: 5 },
  { brand: 'Dr Pepper', aisle: '9', detail: 'Side A, Soda', pages: 3 },
  { brand: 'Mountain Dew', aisle: '9', detail: 'Side A, Soda', pages: 3 },
  { brand: 'Gatorade', aisle: '9', detail: 'Side B, Sports drinks', pages: 5 },
  { brand: 'Monster', aisle: '9', detail: 'Side B, Energy drinks', pages: 4 },
  { brand: 'Red Bull', aisle: '9', detail: 'Side B, Energy drinks', pages: 3 },
  { brand: 'LaCroix', aisle: '9', detail: 'Side A, Sparkling water', pages: 3 },
  { brand: 'Tropicana', aisle: '9', detail: 'Side B, Juice', pages: 4 },
  { brand: 'Minute Maid', aisle: '9', detail: 'Side B, Juice', pages: 3 },
  { brand: 'Simply', aisle: '9', detail: 'Side B, Juice', pages: 3 },
  { brand: 'Starbucks', aisle: '10', detail: 'Side A, Coffee', pages: 5 },
  { brand: 'Folgers', aisle: '10', detail: 'Side A, Coffee', pages: 4 },
  { brand: 'Dunkin', aisle: '10', detail: 'Side A, Coffee', pages: 3 },
  { brand: "Maxwell House", aisle: '10', detail: 'Side A, Coffee', pages: 3 },
  { brand: 'Celestial Seasonings', aisle: '10', detail: 'Side B, Tea', pages: 3 },
  { brand: 'Lipton', aisle: '10', detail: 'Side B, Tea', pages: 4 },

  // Condiments
  { brand: 'Heinz', aisle: '8', detail: 'Side A, Ketchup/Condiments', pages: 5 },
  { brand: "French's", aisle: '8', detail: 'Side A, Mustard', pages: 3 },
  { brand: 'Hellmanns', aisle: '8', detail: 'Side A, Mayo', pages: 3 },
  { brand: 'Hidden Valley', aisle: '8', detail: 'Side B, Ranch dressing', pages: 3 },
  { brand: 'Kraft', aisle: '8', detail: 'Side B, Dressing/Condiments', pages: 6 },
  { brand: "Sweet Baby Ray's", aisle: '8', detail: 'Side A, BBQ sauce', pages: 3 },

  // Pasta & Grains
  { brand: 'Barilla', aisle: '4', detail: 'Side A, Pasta', pages: 4 },
  { brand: "Rao's", aisle: '4', detail: 'Side A, Pasta sauce', pages: 3 },
  { brand: 'Prego', aisle: '4', detail: 'Side A, Pasta sauce', pages: 3 },
  { brand: 'Ragu', aisle: '4', detail: 'Side A, Pasta sauce', pages: 3 },
  { brand: 'Uncle Bens', aisle: '4', detail: 'Side B, Rice', pages: 3 },

  // Soup & Canned
  { brand: "Campbell's", aisle: '5', detail: 'Side B, Soup', pages: 6 },
  { brand: 'Progresso', aisle: '5', detail: 'Side B, Soup', pages: 4 },
  { brand: 'Del Monte', aisle: '5', detail: 'Side A, Canned goods', pages: 5 },
  { brand: 'Green Giant', aisle: '5', detail: 'Side A, Canned vegetables', pages: 4 },
  { brand: 'Bush', aisle: '5', detail: 'Side A, Beans', pages: 3 },
  { brand: 'Dole', aisle: '5', detail: 'Side A, Canned fruit', pages: 3 },

  // Bread
  { brand: "Sara Lee", aisle: '1', detail: 'Side A, Bread', pages: 3 },
  { brand: 'Wonder', aisle: '1', detail: 'Side A, Bread', pages: 2 },
  { brand: "Nature's Own", aisle: '1', detail: 'Side A, Bread', pages: 3 },
  { brand: 'Jif', aisle: '1', detail: 'Side B, Peanut butter', pages: 3 },
  { brand: 'Skippy', aisle: '1', detail: 'Side B, Peanut butter', pages: 3 },
  { brand: 'Smucker', aisle: '1', detail: 'Side B, Jam/Jelly', pages: 4 },

  // Baking
  { brand: 'Betty Crocker', aisle: '3', detail: 'Side B, Baking mix', pages: 5 },
  { brand: 'Pillsbury', aisle: '3', detail: 'Side B, Baking', pages: 5 },
  { brand: 'McCormick', aisle: '3', detail: 'Side A, Spices', pages: 6 },
  { brand: 'Gold Medal', aisle: '3', detail: 'Side B, Flour', pages: 2 },
  { brand: 'Duncan Hines', aisle: '3', detail: 'Side B, Cake mix', pages: 3 },
  { brand: 'Nestle Toll House', aisle: '3', detail: 'Side B, Chocolate chips', pages: 3 },

  // Dairy
  { brand: 'Chobani', aisle: null, detail: 'Dairy wall, Greek yogurt', pages: 5 },
  { brand: 'Yoplait', aisle: null, detail: 'Dairy wall, Yogurt', pages: 4 },
  { brand: 'Horizon', aisle: null, detail: 'Dairy wall, Organic milk', pages: 3 },
  { brand: 'Sargento', aisle: null, detail: 'Dairy wall, Shredded cheese', pages: 4 },
  { brand: 'Tillamook', aisle: null, detail: 'Dairy wall, Cheese', pages: 3 },
  { brand: 'Philadelphia', aisle: null, detail: 'Dairy wall, Cream cheese', pages: 3 },
  { brand: 'Land O Lakes', aisle: null, detail: 'Dairy wall, Butter', pages: 3 },
  { brand: 'Silk', aisle: null, detail: 'Dairy wall, Plant milk', pages: 4 },
  { brand: 'Oatly', aisle: null, detail: 'Dairy wall, Oat milk', pages: 3 },
  { brand: 'International Delight', aisle: null, detail: 'Dairy wall, Creamer', pages: 3 },
  { brand: 'Coffee Mate', aisle: null, detail: 'Dairy wall, Creamer', pages: 3 },

  // Frozen
  { brand: 'DiGiorno', aisle: null, detail: 'Frozen, Pizza', pages: 4 },
  { brand: "Totino's", aisle: null, detail: 'Frozen, Pizza rolls', pages: 3 },
  { brand: 'Red Baron', aisle: null, detail: 'Frozen, Pizza', pages: 3 },
  { brand: "Ben & Jerry's", aisle: null, detail: 'Frozen, Ice cream', pages: 6 },
  { brand: 'Häagen-Dazs', aisle: null, detail: 'Frozen, Ice cream', pages: 5 },
  { brand: 'Blue Bunny', aisle: null, detail: 'Frozen, Ice cream', pages: 3 },
  { brand: 'Lean Cuisine', aisle: null, detail: 'Frozen, Meals', pages: 5 },
  { brand: "Stouffer's", aisle: null, detail: 'Frozen, Meals', pages: 5 },
  { brand: 'Marie Callenders', aisle: null, detail: 'Frozen, Pies/Meals', pages: 3 },
  { brand: 'Hot Pockets', aisle: null, detail: 'Frozen, Hot Pockets', pages: 3 },
  { brand: 'Eggo', aisle: null, detail: 'Frozen, Waffles', pages: 3 },
  { brand: 'Birds Eye', aisle: null, detail: 'Frozen, Vegetables', pages: 4 },
  { brand: 'Tyson', aisle: null, detail: 'Frozen, Chicken', pages: 5 },
  { brand: 'Banquet', aisle: null, detail: 'Frozen, Meals', pages: 4 },

  // Meat
  { brand: 'Oscar Mayer', aisle: null, detail: 'Meat/Deli, Lunch meat', pages: 4 },
  { brand: 'Johnsonville', aisle: null, detail: 'Meat, Sausage', pages: 3 },
  { brand: 'Hillshire Farm', aisle: null, detail: 'Meat, Sausage/Deli', pages: 3 },
  { brand: 'Ball Park', aisle: null, detail: 'Meat, Hot dogs', pages: 3 },
  { brand: 'Hormel', aisle: null, detail: 'Meat/Deli, Various', pages: 5 },

  // Cleaning & Household
  { brand: 'Tide', aisle: '11', detail: 'Side A, Laundry detergent', pages: 4 },
  { brand: 'Gain', aisle: '11', detail: 'Side A, Laundry detergent', pages: 3 },
  { brand: 'Dawn', aisle: '11', detail: 'Side B, Dish soap', pages: 3 },
  { brand: 'Clorox', aisle: '11', detail: 'Side B, Bleach/Cleaners', pages: 4 },
  { brand: 'Lysol', aisle: '11', detail: 'Side B, Disinfectant', pages: 3 },
  { brand: 'Bounty', aisle: '12', detail: 'Side A, Paper towels', pages: 2 },
  { brand: 'Charmin', aisle: '12', detail: 'Side A, Toilet paper', pages: 2 },
  { brand: 'Ziploc', aisle: '12', detail: 'Side B, Storage bags', pages: 3 },

  // Health & Beauty
  { brand: 'Dove', aisle: '13', detail: 'Side A, Body wash/Soap', pages: 4 },
  { brand: 'Old Spice', aisle: '13', detail: 'Side B, Deodorant/Body wash', pages: 3 },
  { brand: 'Head & Shoulders', aisle: '13', detail: 'Side A, Shampoo', pages: 3 },
  { brand: 'Colgate', aisle: '13', detail: 'Side B, Toothpaste', pages: 4 },
  { brand: 'Crest', aisle: '13', detail: 'Side B, Toothpaste', pages: 3 },
  { brand: 'Listerine', aisle: '13', detail: 'Side B, Mouthwash', pages: 3 },
  { brand: 'Advil', aisle: '13', detail: 'Side B, Pain relief', pages: 2 },
  { brand: 'Tylenol', aisle: '13', detail: 'Side B, Pain relief', pages: 3 },
  { brand: 'Burt\'s Bees', aisle: '13', detail: 'Side B, Lip balm/Natural', pages: 3 },

  // Baby & Pet
  { brand: 'Gerber', aisle: '14', detail: 'Side A, Baby food', pages: 5 },
  { brand: 'Pampers', aisle: '14', detail: 'Side A, Diapers', pages: 3 },
  { brand: 'Huggies', aisle: '14', detail: 'Side A, Diapers', pages: 3 },
  { brand: 'Purina', aisle: '14', detail: 'Side B, Pet food', pages: 6 },
  { brand: 'Blue Buffalo', aisle: '14', detail: 'Side B, Dog food', pages: 4 },
  { brand: 'Iams', aisle: '14', detail: 'Side B, Pet food', pages: 3 },
  { brand: 'Meow Mix', aisle: '14', detail: 'Side B, Cat food', pages: 2 },
  { brand: 'Milk-Bone', aisle: '14', detail: 'Side B, Dog treats', pages: 2 },

  // International
  { brand: 'Old El Paso', aisle: '7', detail: 'Side A, Mexican', pages: 4 },
  { brand: 'Taco Bell', aisle: '7', detail: 'Side A, Mexican', pages: 3 },
  { brand: 'La Choy', aisle: '7', detail: 'Side B, Asian', pages: 2 },
  { brand: 'Kikkoman', aisle: '7', detail: 'Side B, Soy sauce', pages: 3 },
  { brand: 'Sriracha', aisle: '7', detail: 'Side B, Hot sauce', pages: 2 },
  { brand: 'Tabasco', aisle: '7', detail: 'Side B, Hot sauce', pages: 2 },
  { brand: "Frank's RedHot", aisle: '7', detail: 'Side B, Hot sauce', pages: 2 },

  // Produce section (packaged)
  { brand: 'Sabra', aisle: null, detail: 'Produce, Hummus', pages: 3 },
  { brand: 'Dole', aisle: null, detail: 'Produce, Salad kits', pages: 3 },
  { brand: 'Fresh Express', aisle: null, detail: 'Produce, Bagged salads', pages: 2 },
  { brand: 'Taylor Farms', aisle: null, detail: 'Produce, Salad kits', pages: 2 },
];

async function getStoreAndAisles() {
  const { data: stores } = await supabase.from('stores').select('id').limit(1);
  const store = stores?.[0];
  if (!store) throw new Error('No store found');
  const { data: aisles } = await supabase.from('aisles').select('id, aisle_number').eq('store_id', store.id);
  const map = {};
  aisles?.forEach(a => { map[String(a.aisle_number)] = a.id; });
  return { storeId: store.id, aisleMap: map };
}

async function searchByBrand(brand, page = 1) {
  const url = `${OFF_API}/cgi/search.pl?search_terms=${encodeURIComponent(brand)}&search_simple=1&action=process&countries=United+States&sort_by=popularity_key&page_size=50&page=${page}&fields=product_name,brands,image_front_small_url,image_front_url,image_url,quantity&json=1`;
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'WhereIsIt-HyVee/4.0 (grocery-locator)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return [];
    const data = await r.json();
    return (data.products || []).filter(p =>
      p.product_name && p.product_name.length > 2 && p.product_name.length < 100 &&
      (p.image_front_small_url || p.image_front_url || p.image_url)
    );
  } catch { return []; }
}

async function run() {
  console.log('\n🏪  Mass Import Round 4 — Brand-Focused (130+ brands)\n');
  const { storeId, aisleMap } = await getStoreAndAisles();
  const seenNames = new Set();

  const { data: existing } = await supabase
    .from('product_locations').select('product_name').eq('store_id', storeId);
  existing?.forEach(p => seenNames.add(p.product_name.toLowerCase()));
  console.log(`  Existing: ${seenNames.size} products`);
  console.log(`  Brands: ${BRANDS.length}\n`);

  let inserted = 0, skipped = 0;

  for (let c = 0; c < BRANDS.length; c++) {
    const b = BRANDS[c];
    let products = [];

    for (let pg = 1; pg <= b.pages; pg++) {
      const results = await searchByBrand(b.brand, pg);
      products.push(...results);
      if (results.length < 50) break;
      await new Promise(r => setTimeout(r, 150));
    }

    const rows = [];
    for (const p of products) {
      const name = p.product_name.trim();
      if (seenNames.has(name.toLowerCase())) continue;
      seenNames.add(name.toLowerCase());
      rows.push({
        store_id: storeId,
        aisle_id: b.aisle ? aisleMap[b.aisle] || null : null,
        product_name: name,
        brand: (p.brands || b.brand).split(',')[0].trim() || b.brand,
        location_detail: b.detail,
        image_url: p.image_front_small_url || p.image_front_url || p.image_url,
        confidence: 0.80,
        source: 'openfoodfacts',
      });
    }

    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      const { error } = await supabase.from('product_locations').insert(batch);
      if (error) {
        for (const row of batch) {
          const { error: e2 } = await supabase.from('product_locations').insert(row);
          if (!e2) inserted++; else skipped++;
        }
      } else { inserted += batch.length; }
    }

    const pct = Math.round(((c + 1) / BRANDS.length) * 100);
    process.stdout.write(`\r  [${pct}%] ${b.brand}: +${rows.length} (total: ${inserted})                `);
  }

  console.log(`\n\n🏪  Round 4 Complete!`);
  console.log(`  New: ${inserted} | Skipped: ${skipped}`);
  console.log(`  Est. total: ~${seenNames.size}\n`);
}

run().catch(err => { console.error('Import failed:', err); process.exit(1); });

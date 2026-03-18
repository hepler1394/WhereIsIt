#!/usr/bin/env node
/**
 * Mass Product Import — Round 3
 * Broader search terms to capture more popular US grocery products
 * 
 * Usage: node --env-file=.env src/scripts/mass-import-r3.js
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const OFF_API = 'https://world.openfoodfacts.org';

// Round 3: Use broader search-based terms to get wider product coverage
const SEARCHES = [
  // Aisle products
  { term: 'bread wheat white', aisle: '1', detail: 'Side A, Bread', pages: 6 },
  { term: 'peanut butter creamy crunchy', aisle: '1', detail: 'Side B, Peanut butter', pages: 4 },
  { term: 'cereal flakes honey', aisle: '2', detail: 'Side A, Cereal', pages: 8 },
  { term: 'oatmeal instant quick', aisle: '2', detail: 'Side A, Oatmeal', pages: 4 },
  { term: 'spice seasoning garlic onion', aisle: '3', detail: 'Side A, Spices', pages: 6 },
  { term: 'flour sugar baking soda', aisle: '3', detail: 'Side B, Baking', pages: 5 },
  { term: 'pasta noodle linguine fettuccine', aisle: '4', detail: 'Side A, Pasta', pages: 6 },
  { term: 'rice jasmine basmati wild', aisle: '4', detail: 'Side B, Rice', pages: 5 },
  { term: 'soup chicken noodle vegetable', aisle: '5', detail: 'Side B, Soup', pages: 8 },
  { term: 'canned beans vegetables corn', aisle: '5', detail: 'Side A, Canned goods', pages: 6 },
  { term: 'chips doritos lays ruffles', aisle: '6', detail: 'Side A, Chips', pages: 8 },
  { term: 'cookies oreo chips ahoy', aisle: '6', detail: 'Side B, Cookies', pages: 6 },
  { term: 'candy chocolate bar snickers', aisle: '6', detail: 'Side B, Candy', pages: 6 },
  { term: 'crackers goldfish cheez-it ritz', aisle: '6', detail: 'Side A, Crackers', pages: 5 },
  { term: 'salsa verde queso', aisle: '7', detail: 'Side A, Salsa', pages: 4 },
  { term: 'soy sauce teriyaki asian', aisle: '7', detail: 'Side B, Asian sauces', pages: 4 },
  { term: 'ketchup heinz mustard french', aisle: '8', detail: 'Side A, Condiments', pages: 5 },
  { term: 'salad dressing ranch caesar', aisle: '8', detail: 'Side B, Dressing', pages: 6 },
  { term: 'soda coca cola pepsi sprite', aisle: '9', detail: 'Side A, Soda', pages: 8 },
  { term: 'juice orange apple grape cranberry', aisle: '9', detail: 'Side B, Juice', pages: 8 },
  { term: 'water sparkling mineral spring', aisle: '9', detail: 'Side B, Water', pages: 5 },
  { term: 'energy drink monster red bull', aisle: '9', detail: 'Side B, Energy drinks', pages: 5 },
  { term: 'coffee ground whole bean dark', aisle: '10', detail: 'Side A, Coffee', pages: 8 },
  { term: 'tea green black herbal chamomile', aisle: '10', detail: 'Side B, Tea', pages: 8 },
  { term: 'detergent laundry tide gain', aisle: '11', detail: 'Side A, Laundry', pages: 4 },
  { term: 'dish soap dawn cascade palmolive', aisle: '11', detail: 'Side B, Dish soap', pages: 4 },
  { term: 'cleaner spray disinfectant clorox', aisle: '11', detail: 'Side B, Cleaners', pages: 4 },
  { term: 'paper towel toilet tissue napkin', aisle: '12', detail: 'Side A, Paper goods', pages: 4 },
  { term: 'trash bag ziploc foil wrap', aisle: '12', detail: 'Side B, Storage bags', pages: 4 },
  { term: 'shampoo conditioner hair care', aisle: '13', detail: 'Side A, Hair care', pages: 6 },
  { term: 'toothpaste mouthwash colgate crest', aisle: '13', detail: 'Side B, Dental', pages: 5 },
  { term: 'deodorant antiperspirant old spice', aisle: '13', detail: 'Side B, Deodorant', pages: 4 },
  { term: 'vitamin supplement omega fish oil', aisle: '13', detail: 'Side B, Vitamins', pages: 6 },
  { term: 'lotion body cream moisturizer', aisle: '13', detail: 'Side B, Lotion', pages: 4 },
  { term: 'baby food gerber puree pouch', aisle: '14', detail: 'Side A, Baby food', pages: 6 },
  { term: 'diaper wipes pampers huggies', aisle: '14', detail: 'Side A, Diapers', pages: 4 },
  { term: 'dog food purina blue buffalo', aisle: '14', detail: 'Side B, Dog food', pages: 6 },
  { term: 'cat food fancy feast friskies', aisle: '14', detail: 'Side B, Cat food', pages: 6 },
  // Perimeter
  { term: 'milk whole 2% skim organic', aisle: null, detail: 'Dairy wall, Milk', pages: 6 },
  { term: 'cheese cheddar mozzarella american', aisle: null, detail: 'Dairy wall, Cheese', pages: 8 },
  { term: 'yogurt greek vanilla strawberry', aisle: null, detail: 'Dairy wall, Yogurt', pages: 8 },
  { term: 'butter margarine spread', aisle: null, detail: 'Dairy wall, Butter', pages: 4 },
  { term: 'creamer coffee mate international', aisle: null, detail: 'Dairy wall, Creamer', pages: 5 },
  { term: 'frozen pizza digiorno totino red baron', aisle: null, detail: 'Frozen, Pizza', pages: 8 },
  { term: 'ice cream haagen dazs ben jerry', aisle: null, detail: 'Frozen, Ice cream', pages: 10 },
  { term: 'frozen dinner lean cuisine stouffer', aisle: null, detail: 'Frozen, Dinners', pages: 8 },
  { term: 'frozen vegetable broccoli corn peas', aisle: null, detail: 'Frozen, Vegetables', pages: 6 },
  { term: 'frozen chicken nuggets tenders', aisle: null, detail: 'Frozen, Chicken', pages: 5 },
  { term: 'bacon oscar mayer hormel', aisle: null, detail: 'Meat wall, Bacon', pages: 4 },
  { term: 'sausage johnsonville hillshire', aisle: null, detail: 'Meat wall, Sausage', pages: 4 },
  { term: 'hot dog hebrew national ball park', aisle: null, detail: 'Meat wall, Hot dogs', pages: 4 },
  { term: 'lunch meat deli turkey ham', aisle: null, detail: 'Deli, Lunch meat', pages: 6 },
  { term: 'hummus sabra classic roasted', aisle: null, detail: 'Produce, Hummus/Dips', pages: 4 },
  { term: 'salad kit caesar chopped', aisle: null, detail: 'Produce, Salad kits', pages: 5 },
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

async function searchProducts(term, page = 1) {
  const url = `${OFF_API}/cgi/search.pl?search_terms=${encodeURIComponent(term)}&search_simple=1&action=process&countries=United+States&sort_by=popularity_key&page_size=50&page=${page}&fields=product_name,brands,image_front_small_url,image_front_url,image_url,quantity&json=1`;
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'WhereIsIt-HyVee/3.0 (grocery-locator)' },
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
  console.log('\n🏪  Mass Import Round 3 — broader search terms\n');
  const { storeId, aisleMap } = await getStoreAndAisles();
  const seenNames = new Set();

  const { data: existing } = await supabase
    .from('product_locations').select('product_name').eq('store_id', storeId);
  existing?.forEach(p => seenNames.add(p.product_name.toLowerCase()));
  console.log(`  Existing: ${seenNames.size} products`);
  console.log(`  Search terms: ${SEARCHES.length}\n`);

  let inserted = 0, skipped = 0;

  for (let c = 0; c < SEARCHES.length; c++) {
    const s = SEARCHES[c];
    let products = [];

    for (let pg = 1; pg <= s.pages; pg++) {
      const results = await searchProducts(s.term, pg);
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
        aisle_id: s.aisle ? aisleMap[s.aisle] || null : null,
        product_name: name,
        brand: (p.brands || '').split(',')[0].trim() || null,
        location_detail: s.detail,
        image_url: p.image_front_small_url || p.image_front_url || p.image_url,
        confidence: 0.72,
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

    const pct = Math.round(((c + 1) / SEARCHES.length) * 100);
    process.stdout.write(`\r  [${pct}%] "${s.term.substring(0,30)}...": +${rows.length} (total: ${inserted})        `);
  }

  console.log(`\n\n🏪  Round 3 Complete!`);
  console.log(`  New: ${inserted} | Skipped: ${skipped}`);
  console.log(`  Est. total: ~${seenNames.size}\n`);
}

run().catch(err => { console.error('Import failed:', err); process.exit(1); });

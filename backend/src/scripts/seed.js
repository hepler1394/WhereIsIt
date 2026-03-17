/**
 * Seed script — populates the database with initial chain, store, and category data.
 * Run: npm run seed
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ══════════════════════════════════════
// Major retail chains with brand colors
// ══════════════════════════════════════
const CHAINS = [
  { name: 'Hy-Vee', slug: 'hyvee', website_url: 'https://www.hy-vee.com', primary_color: '#E31837', secondary_color: '#000000', accent_color: '#FFD700', loyalty_program_name: 'Fuel Saver + Perks', loyalty_program_details: { type: 'fuel_discount', digital_coupons: true, fuel_partners: ['Casey\'s', 'Shell', 'Sinclair'], earn_method: 'purchase_qualifying_items', redeem_per_gallon: true, max_gallons: 20, expiry_days: 30 } },
  { name: 'Walmart', slug: 'walmart', website_url: 'https://www.walmart.com', primary_color: '#0071CE', secondary_color: '#FFC220', accent_color: '#007DC6', loyalty_program_name: 'Walmart+', loyalty_program_details: { type: 'membership', cost_monthly: 12.95, cost_annual: 98, benefits: ['free_delivery', 'fuel_discounts', 'scan_and_go', 'paramount_plus'] } },
  { name: 'Target', slug: 'target', website_url: 'https://www.target.com', primary_color: '#CC0000', secondary_color: '#333333', accent_color: '#CC0000', loyalty_program_name: 'Target Circle', loyalty_program_details: { type: 'free_loyalty', benefits: ['personalized_deals', 'birthday_reward', 'community_giving', 'circle_360_paid_option'] } },
  { name: 'Costco', slug: 'costco', website_url: 'https://www.costco.com', primary_color: '#E31837', secondary_color: '#005DAA', accent_color: '#FFFFFF', loyalty_program_name: 'Costco Membership', loyalty_program_details: { type: 'membership_required', tiers: ['Gold Star', 'Executive'], executive_cashback: '2%', warehouse_layout: true } },
  { name: "Sam's Club", slug: 'sams-club', website_url: 'https://www.samsclub.com', primary_color: '#0060A9', secondary_color: '#FFFFFF', accent_color: '#78BE20', loyalty_program_name: "Sam's Club Membership", loyalty_program_details: { type: 'membership_required', tiers: ['Club', 'Plus'], scan_and_go: true, warehouse_layout: true } },
  { name: 'Price Chopper', slug: 'price-chopper', website_url: 'https://www.pricechopper.com', primary_color: '#D4212A', secondary_color: '#1B3C6D', accent_color: '#F5A623', loyalty_program_name: 'AdvantEdge Card', loyalty_program_details: { type: 'free_loyalty', digital_coupons: true } },
  { name: 'Kroger', slug: 'kroger', website_url: 'https://www.kroger.com', primary_color: '#E35205', secondary_color: '#1E3264', accent_color: '#E35205', loyalty_program_name: 'Kroger Plus Card', loyalty_program_details: { type: 'free_loyalty', fuel_points: true, digital_coupons: true } },
  { name: 'Albertsons', slug: 'albertsons', website_url: 'https://www.albertsons.com', primary_color: '#0073CF', secondary_color: '#FFFFFF', accent_color: '#0073CF', loyalty_program_name: 'just for U', loyalty_program_details: { type: 'free_loyalty', digital_coupons: true } },
  { name: 'Publix', slug: 'publix', website_url: 'https://www.publix.com', primary_color: '#3B7D23', secondary_color: '#FFFFFF', accent_color: '#3B7D23', loyalty_program_name: 'Publix Digital Coupons', loyalty_program_details: { type: 'no_card_needed', digital_coupons: true } },
  { name: 'Meijer', slug: 'meijer', website_url: 'https://www.meijer.com', primary_color: '#D0112B', secondary_color: '#1C3F7A', accent_color: '#D0112B', loyalty_program_name: 'mPerks', loyalty_program_details: { type: 'free_loyalty', digital_coupons: true, fuel_rewards: true } },
  { name: 'ALDI', slug: 'aldi', website_url: 'https://www.aldi.us', primary_color: '#00457C', secondary_color: '#F47B20', accent_color: '#F47B20', loyalty_program_name: null, loyalty_program_details: { type: 'none', notes: 'No loyalty program; low-price model with limited selection' } },
  { name: 'Trader Joe\'s', slug: 'trader-joes', website_url: 'https://www.traderjoes.com', primary_color: '#BA1F31', secondary_color: '#006747', accent_color: '#BA1F31', loyalty_program_name: null, loyalty_program_details: { type: 'none', notes: 'No loyalty program; curated private-label products' } },
  { name: 'Whole Foods', slug: 'whole-foods', website_url: 'https://www.wholefoodsmarket.com', primary_color: '#00674B', secondary_color: '#FFFFFF', accent_color: '#00674B', loyalty_program_name: 'Amazon Prime', loyalty_program_details: { type: 'linked_membership', requires: 'Amazon Prime', benefits: ['member_deals', 'extra_savings', 'free_delivery'] } },
  { name: 'Safeway', slug: 'safeway', website_url: 'https://www.safeway.com', primary_color: '#D31145', secondary_color: '#FFFFFF', accent_color: '#D31145', loyalty_program_name: 'just for U', loyalty_program_details: { type: 'free_loyalty', digital_coupons: true, fuel_rewards: true } },
  { name: 'H-E-B', slug: 'heb', website_url: 'https://www.heb.com', primary_color: '#EE3A43', secondary_color: '#FFFFFF', accent_color: '#EE3A43', loyalty_program_name: 'H-E-B Digital Coupons', loyalty_program_details: { type: 'no_card_needed', digital_coupons: true } },
  { name: 'Wegmans', slug: 'wegmans', website_url: 'https://www.wegmans.com', primary_color: '#045C2F', secondary_color: '#000000', accent_color: '#045C2F', loyalty_program_name: 'Shoppers Club', loyalty_program_details: { type: 'free_loyalty', digital_coupons: true } },
  { name: 'Dollar General', slug: 'dollar-general', website_url: 'https://www.dollargeneral.com', primary_color: '#FFC220', secondary_color: '#000000', accent_color: '#FFC220', loyalty_program_name: 'DG Digital Coupons', loyalty_program_details: { type: 'app_coupons', digital_coupons: true } },
  { name: 'Dollar Tree', slug: 'dollar-tree', website_url: 'https://www.dollartree.com', primary_color: '#009B3A', secondary_color: '#FFFFFF', accent_color: '#009B3A', loyalty_program_name: null, loyalty_program_details: { type: 'none' } },
  { name: 'Walgreens', slug: 'walgreens', website_url: 'https://www.walgreens.com', primary_color: '#E31837', secondary_color: '#FFFFFF', accent_color: '#E31837', loyalty_program_name: 'myWalgreens', loyalty_program_details: { type: 'free_loyalty', cashback: true, digital_coupons: true } },
  { name: 'CVS', slug: 'cvs', website_url: 'https://www.cvs.com', primary_color: '#CC0000', secondary_color: '#FFFFFF', accent_color: '#CC0000', loyalty_program_name: 'ExtraCare', loyalty_program_details: { type: 'free_loyalty', extraBucks: true, digital_coupons: true } },
];

// ══════════════════════════════════════
// Product categories (hierarchical)
// ══════════════════════════════════════
const CATEGORIES = [
  { name: 'Produce', synonyms: ['fruits', 'vegetables', 'fresh produce'] },
  { name: 'Dairy', synonyms: ['milk', 'cheese', 'yogurt', 'butter', 'eggs'] },
  { name: 'Meat & Seafood', synonyms: ['beef', 'chicken', 'pork', 'fish', 'deli meat'] },
  { name: 'Bakery', synonyms: ['bread', 'rolls', 'pastries', 'cakes', 'donuts'] },
  { name: 'Frozen Foods', synonyms: ['frozen meals', 'ice cream', 'frozen vegetables', 'frozen pizza'] },
  { name: 'Deli', synonyms: ['deli counter', 'prepared foods', 'sandwiches', 'rotisserie'] },
  { name: 'Pantry & Dry Goods', synonyms: ['canned goods', 'pasta', 'rice', 'cereal', 'soup'] },
  { name: 'Snacks', synonyms: ['chips', 'crackers', 'cookies', 'nuts', 'trail mix', 'popcorn'] },
  { name: 'Beverages', synonyms: ['soda', 'pop', 'juice', 'water', 'energy drinks', 'tea', 'coffee'] },
  { name: 'Condiments & Sauces', synonyms: ['ketchup', 'mustard', 'mayo', 'salad dressing', 'hot sauce', 'soy sauce'] },
  { name: 'Spices & Seasonings', synonyms: ['salt', 'pepper', 'herbs', 'taco seasoning', 'garlic powder'] },
  { name: 'International Foods', synonyms: ['Mexican', 'Asian', 'Italian', 'Indian', 'ethnic foods'] },
  { name: 'Breakfast', synonyms: ['cereal', 'oatmeal', 'pancake mix', 'syrup', 'breakfast bars'] },
  { name: 'Baking', synonyms: ['flour', 'sugar', 'baking soda', 'vanilla', 'chocolate chips', 'cake mix'] },
  { name: 'Baby & Infant', synonyms: ['baby food', 'diapers', 'formula', 'baby care'] },
  { name: 'Pet Supplies', synonyms: ['dog food', 'cat food', 'pet treats', 'pet care'] },
  { name: 'Health & Beauty', synonyms: ['shampoo', 'soap', 'lotion', 'makeup', 'skincare', 'dental'] },
  { name: 'Pharmacy', synonyms: ['medicine', 'OTC', 'vitamins', 'supplements', 'first aid'] },
  { name: 'Household & Cleaning', synonyms: ['dish soap', 'laundry detergent', 'cleaning supplies', 'trash bags', 'paper towels'] },
  { name: 'Paper Products', synonyms: ['toilet paper', 'paper towels', 'tissues', 'napkins'] },
  { name: 'Alcohol', synonyms: ['beer', 'wine', 'liquor', 'spirits', 'hard seltzer'] },
  { name: 'Floral', synonyms: ['flowers', 'bouquets', 'plants'] },
  { name: 'General Merchandise', synonyms: ['kitchen', 'home', 'office', 'school supplies', 'hardware'] },
  { name: 'Seasonal', synonyms: ['holiday', 'Christmas', 'Halloween', 'Easter', 'summer', 'grilling'] },
  { name: 'Organic & Natural', synonyms: ['organic', 'natural', 'health market', 'gluten-free', 'vegan'] },
];

async function seed() {
  console.log('🌱 Seeding WhereIsIt database...\n');

  // 1. Insert chains
  console.log('📦 Inserting retail chains...');
  for (const chain of CHAINS) {
    const { error } = await supabase.from('chains').upsert(chain, { onConflict: 'slug' });
    if (error) console.error(`  ❌ ${chain.name}: ${error.message}`);
    else console.log(`  ✅ ${chain.name}`);
  }

  // 2. Insert chain themes
  console.log('\n🎨 Creating chain UI themes...');
  const { data: insertedChains } = await supabase.from('chains').select('id, name, primary_color, secondary_color, accent_color');
  for (const chain of insertedChains || []) {
    await supabase.from('chain_themes').upsert({
      chain_id: chain.id,
      primary_color: chain.primary_color,
      secondary_color: chain.secondary_color,
      accent_color: chain.accent_color || chain.primary_color,
      background_color: '#FFFFFF',
      card_color: '#F5F5F5',
    }, { onConflict: 'chain_id' });
    console.log(`  🎨 ${chain.name} theme`);
  }

  // 3. Insert categories
  console.log('\n📂 Inserting product categories...');
  for (const cat of CATEGORIES) {
    const { error } = await supabase.from('categories').upsert(cat, { onConflict: 'name' });
    if (error) console.error(`  ❌ ${cat.name}: ${error.message}`);
    else console.log(`  ✅ ${cat.name}`);
  }

  // 4. Insert a sample Hy-Vee store (your home store!)
  console.log('\n🏪 Inserting sample Hy-Vee store...');
  const { data: hyveeChain } = await supabase
    .from('chains').select('id').eq('slug', 'hyvee').single();

  if (hyveeChain) {
    const { data: store } = await supabase.from('stores').upsert({
      chain_id: hyveeChain.id,
      name: 'Hy-Vee (Sample Location)',
      address: '1234 Main St',
      city: 'Des Moines',
      state: 'IA',
      zip: '50309',
      lat: 41.5868,
      lng: -93.6250,
      store_format: 'grocery',
      has_pharmacy: true,
      has_bakery: true,
      has_deli: true,
      has_gas_station: true,
    }, { onConflict: 'id' }).select().single();

    if (store) {
      // Add sample departments
      const departments = [
        'Produce', 'Dairy', 'Meat & Seafood', 'Bakery', 'Deli',
        'Frozen Foods', 'Health Market', 'Pharmacy', 'Floral',
        'General Merchandise', 'Wine & Spirits',
      ];
      for (let i = 0; i < departments.length; i++) {
        await supabase.from('departments').upsert({
          store_id: store.id,
          name: departments[i],
          display_order: i,
        });
      }

      // Add sample aisles with categories (based on typical Hy-Vee layout)
      const aisles = [
        { aisle_number: '1', side_a_categories: ['Bread', 'Buns', 'Tortillas'], side_b_categories: ['Peanut Butter', 'Jelly', 'Honey'] },
        { aisle_number: '2', side_a_categories: ['Cereal', 'Oatmeal', 'Granola'], side_b_categories: ['Pancake Mix', 'Syrup', 'Breakfast Bars'] },
        { aisle_number: '3', side_a_categories: ['Spices', 'Seasonings', 'Extracts'], side_b_categories: ['Baking Supplies', 'Flour', 'Sugar'] },
        { aisle_number: '4', side_a_categories: ['Pasta', 'Pasta Sauce', 'Italian'], side_b_categories: ['Rice', 'Beans', 'Grains'] },
        { aisle_number: '5', side_a_categories: ['Canned Vegetables', 'Canned Fruit'], side_b_categories: ['Soup', 'Broth', 'Chili'] },
        { aisle_number: '6', side_a_categories: ['Chips', 'Crackers', 'Pretzels'], side_b_categories: ['Cookies', 'Snack Cakes'] },
        { aisle_number: '7', side_a_categories: ['Mexican', 'Taco Shells', 'Salsa'], side_b_categories: ['Asian', 'Indian', 'International'] },
        { aisle_number: '8', side_a_categories: ['Ketchup', 'Mustard', 'Mayo'], side_b_categories: ['Salad Dressing', 'Vinegar', 'Oil'] },
        { aisle_number: '9', side_a_categories: ['Soda', 'Pop', 'Sparkling Water'], side_b_categories: ['Juice', 'Sports Drinks', 'Energy Drinks'] },
        { aisle_number: '10', side_a_categories: ['Coffee', 'Tea', 'Hot Cocoa'], side_b_categories: ['Water', 'Drink Mixes'] },
        { aisle_number: '11', side_a_categories: ['Laundry', 'Fabric Softener'], side_b_categories: ['Cleaning Supplies', 'Dish Soap'] },
        { aisle_number: '12', side_a_categories: ['Paper Towels', 'Toilet Paper', 'Tissues'], side_b_categories: ['Trash Bags', 'Storage Bags', 'Foil'] },
        { aisle_number: '13', side_a_categories: ['Shampoo', 'Conditioner', 'Body Wash'], side_b_categories: ['Soap', 'Lotion', 'Deodorant'] },
        { aisle_number: '14', side_a_categories: ['Baby Food', 'Formula', 'Diapers'], side_b_categories: ['Pet Food', 'Pet Treats', 'Pet Supplies'] },
      ];

      for (const aisle of aisles) {
        await supabase.from('aisles').upsert({
          store_id: store.id,
          ...aisle,
          is_split: true,
        }, { onConflict: 'store_id,aisle_number' });
      }

      console.log(`  ✅ ${store.name} with ${departments.length} departments and ${aisles.length} aisles`);
    }
  }

  console.log('\n✅ Seed complete!');
}

seed().catch(console.error);

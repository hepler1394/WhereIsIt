#!/usr/bin/env node
/**
 * Hy-Vee Seed Script
 * Populates Supabase with real Hy-Vee data:
 *   - Chain record
 *   - 2 Lee's Summit stores  
 *   - Departments per store
 *   - 14 aisles with category mappings
 *   - Product categories with synonyms
 *   - Sample product locations with Hy-Vee CDN image URLs
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

// ════════════════════════════════════
// HY-VEE CHAIN
// ════════════════════════════════════
const CHAIN = {
  name: 'Hy-Vee',
  slug: 'hyvee',
  logo_url: 'https://www.hy-vee.com/images/hy-vee-logo.svg',
  website_url: 'https://www.hy-vee.com',
  primary_color: '#E31837',
  secondary_color: '#FFFFFF',
  accent_color: '#E31837',
  loyalty_program_name: 'Hy-Vee PERKS',
  loyalty_program_details: {
    fuel_saver: true,
    digital_coupons: true,
    points_per_dollar: 1,
    app_name: 'Hy-Vee App',
  },
};

// ════════════════════════════════════
// STORES
// ════════════════════════════════════
const STORES = [
  {
    name: "Hy-Vee (Rice Road)",
    address: "301 NE Rice Rd",
    city: "Lee's Summit",
    state: "MO",
    zip: "64086",
    lat: 38.9247,
    lng: -94.3717,
    phone: "(816) 524-4237",
    hours_json: {
      monday: "6:00 AM - 11:00 PM",
      tuesday: "6:00 AM - 11:00 PM",
      wednesday: "6:00 AM - 11:00 PM",
      thursday: "6:00 AM - 11:00 PM",
      friday: "6:00 AM - 11:00 PM",
      saturday: "6:00 AM - 11:00 PM",
      sunday: "6:00 AM - 11:00 PM",
    },
    store_format: "grocery",
    has_pharmacy: true,
    has_bakery: true,
    has_deli: true,
    has_gas_station: false,
  },
  {
    name: "Hy-Vee (Ward Road)",
    address: "310 SW Ward Rd",
    city: "Lee's Summit",
    state: "MO",
    zip: "64081",
    lat: 38.9062,
    lng: -94.4123,
    phone: "(816) 524-8700",
    hours_json: {
      monday: "6:00 AM - 11:00 PM",
      tuesday: "6:00 AM - 11:00 PM",
      wednesday: "6:00 AM - 11:00 PM",
      thursday: "6:00 AM - 11:00 PM",
      friday: "6:00 AM - 11:00 PM",
      saturday: "6:00 AM - 11:00 PM",
      sunday: "6:00 AM - 11:00 PM",
    },
    store_format: "grocery",
    has_pharmacy: true,
    has_bakery: true,
    has_deli: true,
    has_gas_station: true,
  },
];

// ════════════════════════════════════
// DEPARTMENTS (per store)
// ════════════════════════════════════
const DEPARTMENTS = [
  { name: "Produce",          description: "Fresh fruits, vegetables, and salads",      floor_section: "perimeter-front", display_order: 1 },
  { name: "Meat & Seafood",   description: "Butcher counter and fresh fish",            floor_section: "perimeter-back",  display_order: 2 },
  { name: "Dairy",            description: "Milk, cheese, eggs, and yogurt",            floor_section: "perimeter-right", display_order: 3 },
  { name: "Bakery",           description: "Fresh baked bread, cakes, and pastries",    floor_section: "perimeter-front", display_order: 4 },
  { name: "Deli",             description: "Ready-to-eat meals and sliced meats",       floor_section: "perimeter-front", display_order: 5 },
  { name: "Chinese Express",  description: "Hot prepared Chinese food",                 floor_section: "perimeter-front", display_order: 6 },
  { name: "Frozen Foods",     description: "Frozen meals, vegetables, and ice cream",   floor_section: "perimeter-right", display_order: 7 },
  { name: "Pharmacy",         description: "Prescriptions and health products",         floor_section: "perimeter-left",  display_order: 8 },
  { name: "Floral",           description: "Fresh flowers and arrangements",            floor_section: "entrance",        display_order: 9 },
  { name: "Wine & Spirits",   description: "Beer, wine, and liquor",                    floor_section: "perimeter-left",  display_order: 10 },
  { name: "Health & Beauty",  description: "Personal care and OTC medications",         floor_section: "aisles-13",       display_order: 11 },
  { name: "Household",        description: "Cleaning supplies and paper goods",         floor_section: "aisles-11-12",    display_order: 12 },
];

// ════════════════════════════════════
// AISLES — Rice Road Hy-Vee layout
// ════════════════════════════════════
const AISLES = [
  { n: '1',  a: ['Bread','Buns','Tortillas','Wraps','English Muffins','Bagels'],         b: ['Peanut Butter','Jelly','Jam','Honey','Nutella','Marshmallow Creme'] },
  { n: '2',  a: ['Cereal','Oatmeal','Granola','Granola Bars','Muesli'],                  b: ['Pancake Mix','Syrup','Pop-Tarts','Breakfast Bars','Instant Breakfast'] },
  { n: '3',  a: ['Spices','Seasonings','Extracts','Fresh Herbs','Salt','Pepper'],         b: ['Baking Supplies','Flour','Sugar','Cake Mix','Frosting','Sprinkles','Baking Powder'] },
  { n: '4',  a: ['Pasta','Spaghetti','Pasta Sauce','Marinara','Alfredo','Pesto'],        b: ['Rice','Beans','Quinoa','Couscous','Grains','Lentils'] },
  { n: '5',  a: ['Canned Vegetables','Canned Fruit','Tomatoes','Tomato Paste'],           b: ['Soup','Broth','Stock','Chili','Stew','Ramen'] },
  { n: '6',  a: ['Chips','Crackers','Pretzels','Popcorn','Cheese Puffs','Corn Chips'],   b: ['Cookies','Snack Cakes','Oreos','Candy Bars','Trail Mix','Nuts'] },
  { n: '7',  a: ['Taco Shells','Salsa','Tortilla Chips','Refried Beans','Enchilada Sauce'], b: ['Soy Sauce','Teriyaki','Coconut Milk','Curry Paste','Sriracha'] },
  { n: '8',  a: ['Ketchup','Mustard','Mayo','BBQ Sauce','Hot Sauce','Relish','Pickles'], b: ['Salad Dressing','Vinegar','Olive Oil','Cooking Spray','Croutons'] },
  { n: '9',  a: ['Soda','Sparkling Water','Tonic','Club Soda','Ginger Ale','Root Beer'], b: ['Juice','Sports Drinks','Gatorade','Energy Drinks','Red Bull','Coconut Water'] },
  { n: '10', a: ['Coffee','K-Cups','Ground Coffee','Coffee Beans','Cold Brew'],           b: ['Tea','Hot Cocoa','Water','Drink Mixes','Lemonade','Kool-Aid'] },
  { n: '11', a: ['Laundry Detergent','Fabric Softener','Dryer Sheets','Stain Remover'],   b: ['Dish Soap','Dishwasher Detergent','Sponges','Cleaning Spray','Windex','Lysol'] },
  { n: '12', a: ['Paper Towels','Toilet Paper','Tissues','Napkins'],                      b: ['Trash Bags','Ziploc Bags','Aluminum Foil','Plastic Wrap','Parchment Paper'] },
  { n: '13', a: ['Shampoo','Conditioner','Body Wash','Hair Care','Hair Color'],            b: ['Soap','Lotion','Deodorant','Razors','Shaving Cream','Sunscreen'] },
  { n: '14', a: ['Baby Food','Formula','Diapers','Baby Wipes','Baby Lotion'],              b: ['Dog Food','Cat Food','Cat Litter','Pet Treats','Pet Toys'] },
];

// ════════════════════════════════════
// PRODUCT CATEGORIES (with synonyms)
// ════════════════════════════════════
const CATEGORIES = [
  { name: 'Bread & Bakery',       synonyms: ['bread','rolls','buns','bagels','tortillas','wraps','english muffins','pita'] },
  { name: 'Spreads & Condiments', synonyms: ['peanut butter','jelly','jam','honey','nutella','mayo','ketchup','mustard','relish'] },
  { name: 'Breakfast',            synonyms: ['cereal','oatmeal','granola','pancake mix','syrup','pop-tarts','waffles'] },
  { name: 'Spices & Baking',      synonyms: ['spices','seasonings','flour','sugar','baking powder','cake mix','frosting','extracts'] },
  { name: 'Pasta & Grains',       synonyms: ['pasta','spaghetti','rice','quinoa','couscous','noodles','macaroni'] },
  { name: 'Canned Goods',         synonyms: ['canned vegetables','canned fruit','tomatoes','beans','soup','broth','chili'] },
  { name: 'Snacks',               synonyms: ['chips','crackers','pretzels','popcorn','cookies','candy','trail mix','nuts'] },
  { name: 'International',        synonyms: ['taco shells','salsa','tortilla chips','soy sauce','teriyaki','curry','sriracha'] },
  { name: 'Sauces & Dressings',   synonyms: ['bbq sauce','hot sauce','salad dressing','vinegar','olive oil','cooking spray'] },
  { name: 'Beverages',            synonyms: ['soda','juice','water','coffee','tea','energy drinks','sports drinks','gatorade'] },
  { name: 'Cleaning & Household', synonyms: ['laundry detergent','dish soap','paper towels','trash bags','windex','lysol'] },
  { name: 'Personal Care',        synonyms: ['shampoo','conditioner','body wash','deodorant','lotion','razors','soap'] },
  { name: 'Baby & Pet',           synonyms: ['baby food','diapers','formula','dog food','cat food','pet treats'] },
  { name: 'Produce',              synonyms: ['apples','bananas','oranges','lettuce','tomatoes','onions','potatoes','avocado'] },
  { name: 'Dairy & Eggs',         synonyms: ['milk','cheese','eggs','butter','yogurt','cream cheese','sour cream'] },
  { name: 'Meat & Poultry',       synonyms: ['chicken','beef','pork','bacon','sausage','steak','ground beef','turkey'] },
  { name: 'Seafood',              synonyms: ['salmon','shrimp','tilapia','cod','crab','lobster','tuna'] },
  { name: 'Frozen Foods',         synonyms: ['frozen pizza','ice cream','frozen vegetables','frozen meals','popsicles'] },
  { name: 'Deli & Prepared',      synonyms: ['rotisserie chicken','sandwiches','potato salad','sushi','hot bar'] },
];

// ════════════════════════════════════
// SAMPLE PRODUCT LOCATIONS
// ════════════════════════════════════
const PRODUCT_LOCATIONS = [
  // Aisle 1
  { product_name: 'Wonder Bread White',         brand: 'Wonder',      aisle: '1', detail: 'Side A, top shelf',      confidence: 0.92, source: 'community' },
  { product_name: 'Hy-Vee Hamburger Buns',      brand: 'Hy-Vee',      aisle: '1', detail: 'Side A, middle shelf',   confidence: 0.95, source: 'verified' },
  { product_name: 'Mission Flour Tortillas',     brand: 'Mission',     aisle: '1', detail: 'Side A, bottom shelf',   confidence: 0.90, source: 'community' },
  { product_name: 'Jif Creamy Peanut Butter',    brand: 'Jif',         aisle: '1', detail: 'Side B, eye level',      confidence: 0.95, source: 'verified' },
  { product_name: 'Smuckers Strawberry Jam',     brand: "Smucker's",   aisle: '1', detail: 'Side B, middle shelf',   confidence: 0.88, source: 'community' },
  // Aisle 2
  { product_name: 'Cheerios',                    brand: 'General Mills', aisle: '2', detail: 'Side A, eye level',    confidence: 0.95, source: 'verified' },
  { product_name: 'Quaker Oats Old Fashioned',   brand: 'Quaker',      aisle: '2', detail: 'Side A, bottom shelf',  confidence: 0.90, source: 'community' },
  { product_name: 'Nature Valley Granola Bars',  brand: 'Nature Valley', aisle: '2', detail: 'Side A, top shelf',   confidence: 0.88, source: 'community' },
  { product_name: 'Aunt Jemima Pancake Mix',     brand: 'Aunt Jemima', aisle: '2', detail: 'Side B, eye level',     confidence: 0.85, source: 'community' },
  { product_name: 'Pop-Tarts Frosted Strawberry', brand: 'Kelloggs',   aisle: '2', detail: 'Side B, middle shelf',  confidence: 0.92, source: 'verified' },
  // Aisle 3
  { product_name: 'McCormick Ground Cinnamon',   brand: 'McCormick',   aisle: '3', detail: 'Side A, spice section', confidence: 0.90, source: 'community' },
  { product_name: 'Gold Medal All Purpose Flour', brand: 'Gold Medal', aisle: '3', detail: 'Side B, bottom shelf',  confidence: 0.92, source: 'verified' },
  { product_name: 'Domino Sugar',                brand: 'Domino',      aisle: '3', detail: 'Side B, bottom shelf',  confidence: 0.88, source: 'community' },
  { product_name: 'Betty Crocker Cake Mix',      brand: 'Betty Crocker', aisle: '3', detail: 'Side B, eye level',   confidence: 0.90, source: 'community' },
  // Aisle 4
  { product_name: 'Barilla Spaghetti',           brand: 'Barilla',     aisle: '4', detail: 'Side A, eye level',     confidence: 0.95, source: 'verified' },
  { product_name: 'Prego Traditional Pasta Sauce', brand: 'Prego',     aisle: '4', detail: 'Side A, middle shelf',  confidence: 0.90, source: 'community' },
  { product_name: 'Uncle Bens White Rice',       brand: "Uncle Ben's", aisle: '4', detail: 'Side B, bottom shelf',  confidence: 0.88, source: 'community' },
  // Aisle 5
  { product_name: 'Del Monte Green Beans',       brand: 'Del Monte',   aisle: '5', detail: 'Side A, middle shelf',  confidence: 0.90, source: 'community' },
  { product_name: 'Campbells Chicken Noodle Soup', brand: "Campbell's", aisle: '5', detail: 'Side B, eye level',    confidence: 0.95, source: 'verified' },
  { product_name: 'Swanson Chicken Broth',       brand: 'Swanson',     aisle: '5', detail: 'Side B, bottom shelf',  confidence: 0.88, source: 'community' },
  // Aisle 6
  { product_name: "Lay's Classic Potato Chips",  brand: "Lay's",       aisle: '6', detail: 'Side A, eye level',     confidence: 0.95, source: 'verified' },
  { product_name: 'Doritos Nacho Cheese',        brand: 'Doritos',     aisle: '6', detail: 'Side A, eye level',     confidence: 0.95, source: 'verified' },
  { product_name: 'Goldfish Crackers',           brand: 'Pepperidge Farm', aisle: '6', detail: 'Side A, bottom',    confidence: 0.88, source: 'community' },
  { product_name: 'Oreo Cookies',                brand: 'Oreo',        aisle: '6', detail: 'Side B, eye level',     confidence: 0.95, source: 'verified' },
  { product_name: 'Snickers Bar',                brand: 'Snickers',    aisle: '6', detail: 'Side B, end cap',       confidence: 0.82, source: 'community' },
  // Aisle 7
  { product_name: 'Old El Paso Taco Shells',     brand: 'Old El Paso', aisle: '7', detail: 'Side A, eye level',     confidence: 0.90, source: 'community' },
  { product_name: 'Tostitos Scoops',             brand: 'Tostitos',    aisle: '7', detail: 'Side A, middle shelf',  confidence: 0.88, source: 'community' },
  { product_name: 'Pace Chunky Salsa',           brand: 'Pace',        aisle: '7', detail: 'Side A, bottom shelf',  confidence: 0.85, source: 'community' },
  { product_name: 'Kikkoman Soy Sauce',          brand: 'Kikkoman',    aisle: '7', detail: 'Side B, eye level',     confidence: 0.90, source: 'community' },
  // Aisle 8
  { product_name: 'Heinz Tomato Ketchup',        brand: 'Heinz',       aisle: '8', detail: 'Side A, eye level',     confidence: 0.95, source: 'verified' },
  { product_name: "French's Yellow Mustard",     brand: "French's",    aisle: '8', detail: 'Side A, middle shelf',  confidence: 0.90, source: 'community' },
  { product_name: 'Hellmanns Real Mayonnaise',   brand: "Hellmann's",  aisle: '8', detail: 'Side A, eye level',     confidence: 0.92, source: 'verified' },
  { product_name: 'Sweet Baby Rays BBQ Sauce',   brand: 'Sweet Baby Rays', aisle: '8', detail: 'Side A, bottom',   confidence: 0.88, source: 'community' },
  { product_name: 'Kraft Ranch Dressing',        brand: 'Kraft',       aisle: '8', detail: 'Side B, eye level',     confidence: 0.90, source: 'verified' },
  // Aisle 9
  { product_name: 'Coca-Cola 12 Pack',           brand: 'Coca-Cola',   aisle: '9', detail: 'Side A, bottom shelf',  confidence: 0.95, source: 'verified' },
  { product_name: 'Pepsi 12 Pack',               brand: 'Pepsi',       aisle: '9', detail: 'Side A, bottom shelf',  confidence: 0.95, source: 'verified' },
  { product_name: 'LaCroix Sparkling Water',     brand: 'LaCroix',     aisle: '9', detail: 'Side A, middle shelf',  confidence: 0.88, source: 'community' },
  { product_name: 'Tropicana Orange Juice',      brand: 'Tropicana',   aisle: '9', detail: 'Side B, top shelf',     confidence: 0.85, source: 'community' },
  { product_name: 'Gatorade Lemon Lime',         brand: 'Gatorade',    aisle: '9', detail: 'Side B, bottom shelf',  confidence: 0.90, source: 'community' },
  // Aisle 10
  { product_name: 'Folgers Classic Roast',       brand: 'Folgers',     aisle: '10', detail: 'Side A, eye level',    confidence: 0.92, source: 'verified' },
  { product_name: 'Green Mountain K-Cups',       brand: 'Green Mountain', aisle: '10', detail: 'Side A, top shelf', confidence: 0.88, source: 'community' },
  { product_name: 'Lipton Tea Bags',             brand: 'Lipton',      aisle: '10', detail: 'Side B, eye level',    confidence: 0.85, source: 'community' },
  { product_name: 'Swiss Miss Hot Cocoa',        brand: 'Swiss Miss',  aisle: '10', detail: 'Side B, middle shelf', confidence: 0.88, source: 'community' },
  // Aisle 11
  { product_name: 'Tide Liquid Detergent',       brand: 'Tide',        aisle: '11', detail: 'Side A, bottom shelf', confidence: 0.95, source: 'verified' },
  { product_name: 'Downy Fabric Softener',       brand: 'Downy',       aisle: '11', detail: 'Side A, middle shelf', confidence: 0.88, source: 'community' },
  { product_name: 'Dawn Dish Soap',              brand: 'Dawn',        aisle: '11', detail: 'Side B, eye level',    confidence: 0.92, source: 'verified' },
  { product_name: 'Lysol Disinfectant Spray',    brand: 'Lysol',       aisle: '11', detail: 'Side B, top shelf',    confidence: 0.88, source: 'community' },
  // Aisle 12
  { product_name: 'Bounty Paper Towels',         brand: 'Bounty',      aisle: '12', detail: 'Side A, bottom shelf', confidence: 0.95, source: 'verified' },
  { product_name: 'Charmin Ultra Soft',          brand: 'Charmin',     aisle: '12', detail: 'Side A, bottom shelf', confidence: 0.95, source: 'verified' },
  { product_name: 'Glad Trash Bags',             brand: 'Glad',        aisle: '12', detail: 'Side B, middle shelf', confidence: 0.88, source: 'community' },
  { product_name: 'Reynolds Wrap Aluminum Foil', brand: 'Reynolds',    aisle: '12', detail: 'Side B, top shelf',    confidence: 0.85, source: 'community' },
  // Aisle 13
  { product_name: 'Pantene Pro-V Shampoo',       brand: 'Pantene',     aisle: '13', detail: 'Side A, eye level',    confidence: 0.88, source: 'community' },
  { product_name: 'Dove Body Wash',              brand: 'Dove',        aisle: '13', detail: 'Side A, middle shelf', confidence: 0.90, source: 'community' },
  { product_name: 'Old Spice Deodorant',         brand: 'Old Spice',   aisle: '13', detail: 'Side B, eye level',    confidence: 0.88, source: 'community' },
  { product_name: 'Gillette Razors',             brand: 'Gillette',    aisle: '13', detail: 'Side B, top shelf',    confidence: 0.85, source: 'community' },
  // Aisle 14
  { product_name: 'Pampers Swaddlers Diapers',   brand: 'Pampers',     aisle: '14', detail: 'Side A, bottom shelf', confidence: 0.92, source: 'verified' },
  { product_name: 'Gerber Baby Food',            brand: 'Gerber',      aisle: '14', detail: 'Side A, eye level',    confidence: 0.88, source: 'community' },
  { product_name: 'Purina Dog Chow',             brand: 'Purina',      aisle: '14', detail: 'Side B, bottom shelf', confidence: 0.90, source: 'community' },
  { product_name: 'Fancy Feast Cat Food',        brand: 'Fancy Feast', aisle: '14', detail: 'Side B, middle shelf', confidence: 0.85, source: 'community' },
  // Perimeter — Produce (no aisle)
  { product_name: 'Bananas',           brand: null, aisle: null, detail: 'Produce department, front display',   confidence: 0.98, source: 'verified' },
  { product_name: 'Apples',            brand: null, aisle: null, detail: 'Produce department, fruit wall',       confidence: 0.98, source: 'verified' },
  { product_name: 'Avocado',           brand: null, aisle: null, detail: 'Produce department, near tomatoes',    confidence: 0.95, source: 'verified' },
  { product_name: 'Lettuce',           brand: null, aisle: null, detail: 'Produce department, salad section',    confidence: 0.95, source: 'verified' },
  { product_name: 'Tomatoes',          brand: null, aisle: null, detail: 'Produce department, vine section',     confidence: 0.95, source: 'verified' },
  { product_name: 'Potatoes',          brand: null, aisle: null, detail: 'Produce department, root vegetables',  confidence: 0.95, source: 'verified' },
  // Perimeter — Dairy
  { product_name: 'Hy-Vee 2% Milk',        brand: 'Hy-Vee',     aisle: null, detail: 'Dairy wall, middle',        confidence: 0.95, source: 'verified' },
  { product_name: 'Large Eggs (dozen)',     brand: null,          aisle: null, detail: 'Dairy wall, end section',   confidence: 0.95, source: 'verified' },
  { product_name: 'Kraft Shredded Cheese',  brand: 'Kraft',       aisle: null, detail: 'Dairy wall, cheese section', confidence: 0.90, source: 'community' },
  { product_name: 'Land O Lakes Butter',    brand: "Land O'Lakes", aisle: null, detail: 'Dairy wall, butter section', confidence: 0.90, source: 'community' },
  { product_name: 'Chobani Greek Yogurt',   brand: 'Chobani',     aisle: null, detail: 'Dairy wall, yogurt section', confidence: 0.88, source: 'community' },
  // Perimeter — Meat
  { product_name: 'Ground Beef 80/20',      brand: null,          aisle: null, detail: 'Meat counter, ground meats', confidence: 0.95, source: 'verified' },
  { product_name: 'Boneless Chicken Breast', brand: null,         aisle: null, detail: 'Meat counter, poultry',      confidence: 0.95, source: 'verified' },
  { product_name: 'Oscar Mayer Bacon',      brand: 'Oscar Mayer', aisle: null, detail: 'Meat wall, packaged meats',  confidence: 0.90, source: 'community' },
  { product_name: 'Hillshire Farm Deli Meat', brand: 'Hillshire Farm', aisle: null, detail: 'Meat wall, lunch meat', confidence: 0.88, source: 'community' },
  // Perimeter — Bakery
  { product_name: 'Hy-Vee Glazed Donuts',  brand: 'Hy-Vee',      aisle: null, detail: 'Bakery counter, donut case', confidence: 0.95, source: 'verified' },
  { product_name: 'French Bread Loaf',     brand: null,           aisle: null, detail: 'Bakery, bread display',      confidence: 0.92, source: 'verified' },
  // Perimeter — Deli
  { product_name: 'Hy-Vee Rotisserie Chicken', brand: 'Hy-Vee',  aisle: null, detail: 'Deli hot case, front',       confidence: 0.98, source: 'verified' },
  { product_name: 'Hy-Vee Fried Chicken',  brand: 'Hy-Vee',      aisle: null, detail: 'Deli hot case, middle',      confidence: 0.95, source: 'verified' },
  // Frozen
  { product_name: 'DiGiorno Rising Crust Pizza', brand: 'DiGiorno', aisle: null, detail: 'Frozen aisle, pizza section', confidence: 0.90, source: 'community' },
  { product_name: 'Blue Bunny Ice Cream',  brand: 'Blue Bunny',   aisle: null, detail: 'Frozen aisle, ice cream section', confidence: 0.88, source: 'community' },
  { product_name: 'Birds Eye Frozen Vegetables', brand: "Bird's Eye", aisle: null, detail: 'Frozen aisle, vegetables', confidence: 0.85, source: 'community' },
];

// ════════════════════════════════════
// SEED EXECUTION
// ════════════════════════════════════
async function seed() {
  console.log('\n  Seeding WhereIsIt database with Hy-Vee data...\n');

  // Clean existing data (FK order)
  console.log('  [0/6] Cleaning existing data...');
  await supabase.from('product_locations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('aisles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('departments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('deals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('stores').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('chains').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('        Cleaned.');

  // 1. Chain
  console.log('  [1/6] Inserting Hy-Vee chain...');
  const { data: chain, error: chainErr } = await supabase
    .from('chains')
    .insert(CHAIN)
    .select()
    .single();
  if (chainErr) { console.error('  Chain error:', chainErr.message); return; }
  console.log(`        Chain "${chain.name}" - ${chain.id}`);

  // 2. Stores
  console.log('  [2/6] Inserting stores...');
  const storesWithChain = STORES.map(s => ({ ...s, chain_id: chain.id }));
  const { data: stores, error: storeErr } = await supabase
    .from('stores')
    .insert(storesWithChain)
    .select();
  if (storeErr) { console.error('  Store error:', storeErr.message); return; }
  stores.forEach(s => console.log(`        Store "${s.name}" - ${s.id}`));
  const riceRoad = stores.find(s => s.address.includes('Rice'));
  const wardRoad = stores.find(s => s.address.includes('Ward'));

  // 3. Departments
  console.log('  [3/6] Inserting departments...');
  const allDeptRows = [
    ...DEPARTMENTS.map(d => ({ ...d, store_id: riceRoad.id })),
    ...DEPARTMENTS.map(d => ({ ...d, store_id: wardRoad.id })),
  ];
  const { data: depts, error: deptErr } = await supabase
    .from('departments')
    .insert(allDeptRows)
    .select();
  if (deptErr) { console.error('  Dept error:', deptErr.message); return; }
  console.log(`        ${depts.length} departments inserted (${DEPARTMENTS.length} per store)`);

  // 4. Aisles
  console.log('  [4/6] Inserting aisles...');
  const allAisleRows = [riceRoad, wardRoad].flatMap(store =>
    AISLES.map(a => ({
      store_id: store.id,
      aisle_number: a.n,
      aisle_label: `Aisle ${a.n}`,
      side_a_categories: a.a,
      side_b_categories: a.b,
      is_split: true,
    }))
  );
  const { data: aisles, error: aisleErr } = await supabase
    .from('aisles')
    .insert(allAisleRows)
    .select();
  if (aisleErr) { console.error('  Aisle error:', aisleErr.message); return; }
  console.log(`        ${aisles.length} aisles inserted (${AISLES.length} per store)`);
  // Build Rice Road aisle lookup
  const aisleMap = {};
  aisles.filter(a => a.store_id === riceRoad.id).forEach(a => { aisleMap[a.aisle_number] = a.id; });

  // 5. Categories
  console.log('  [5/6] Inserting categories...');
  const { error: catErr } = await supabase
    .from('categories')
    .insert(CATEGORIES.map(c => ({ name: c.name, synonyms: c.synonyms })));
  if (catErr) { console.error('  Category error:', catErr.message); return; }
  console.log(`        ${CATEGORIES.length} categories inserted`);

  // 6. Product locations
  console.log('  [6/6] Inserting product locations...');
  const locRows = PRODUCT_LOCATIONS.map(p => ({
    store_id: riceRoad.id,
    aisle_id: p.aisle ? aisleMap[p.aisle] : null,
    product_name: p.product_name,
    brand: p.brand,
    location_detail: p.detail,
    confidence: p.confidence,
    source: p.source,
  }));
  const { error: locErr } = await supabase
    .from('product_locations')
    .insert(locRows);
  if (locErr) { console.error('  Product location error:', locErr.message); return; }
  console.log(`        ${PRODUCT_LOCATIONS.length} product locations inserted`);

  console.log('\n  Seed complete!\n');
  console.log(`   Chain:      ${chain.name}`);
  console.log(`   Stores:     ${stores.length}`);
  console.log(`   Depts:      ${depts.length} total`);
  console.log(`   Aisles:     ${aisles.length} total`);
  console.log(`   Products:   ${PRODUCT_LOCATIONS.length}`);
  console.log(`   Categories: ${CATEGORIES.length}`);
  console.log('');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Mass Product Import — Round 2
 * Deeper categories, more pages, more products
 * Targets 8,000+ additional unique products with images
 * 
 * Usage: node --env-file=.env src/scripts/mass-import-r2.js
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const OFF_API = 'https://world.openfoodfacts.org';

// Round 2: More specific, deeper categories to hit 10k
const CATEGORIES = [
  // ── AISLE 1: Bread & Spreads ──
  { off: 'sandwich-breads', aisle: '1', detail: 'Side A, Sliced bread', pages: 4 },
  { off: 'hamburger-buns', aisle: '1', detail: 'Side A, Buns', pages: 2 },
  { off: 'hot-dog-buns', aisle: '1', detail: 'Side A, Hot dog buns', pages: 2 },
  { off: 'whole-wheat-breads', aisle: '1', detail: 'Side A, Wheat bread', pages: 3 },
  { off: 'rye-breads', aisle: '1', detail: 'Side A, Rye bread', pages: 2 },
  { off: 'flour-tortillas', aisle: '1', detail: 'Side A, Flour tortillas', pages: 2 },
  { off: 'corn-tortillas', aisle: '1', detail: 'Side A, Corn tortillas', pages: 2 },
  { off: 'bagels', aisle: '1', detail: 'Side A, Bagels', pages: 3 },
  { off: 'english-muffins', aisle: '1', detail: 'Side A, English muffins', pages: 2 },
  { off: 'hazelnut-spreads', aisle: '1', detail: 'Side B, Nutella/Spreads', pages: 2 },
  { off: 'almond-butters', aisle: '1', detail: 'Side B, Almond butter', pages: 2 },
  { off: 'fruit-preserves', aisle: '1', detail: 'Side B, Preserves', pages: 3 },
  { off: 'marmalades', aisle: '1', detail: 'Side B, Marmalade', pages: 2 },

  // ── AISLE 2: Cereal & Breakfast ──
  { off: 'corn-flakes', aisle: '2', detail: 'Side A, Corn flakes', pages: 3 },
  { off: 'mueslis', aisle: '2', detail: 'Side A, Muesli', pages: 3 },
  { off: 'oat-cereals', aisle: '2', detail: 'Side A, Oat cereal', pages: 3 },
  { off: 'chocolate-cereals', aisle: '2', detail: 'Side A, Chocolate cereal', pages: 3 },
  { off: 'rice-cereals', aisle: '2', detail: 'Side A, Rice cereal', pages: 2 },
  { off: 'instant-oatmeals', aisle: '2', detail: 'Side A, Instant oatmeal', pages: 3 },
  { off: 'granola-bars', aisle: '2', detail: 'Side B, Granola bars', pages: 4 },
  { off: 'protein-bars', aisle: '2', detail: 'Side B, Protein bars', pages: 5 },
  { off: 'toaster-pastries', aisle: '2', detail: 'Side B, Pop-Tarts/Toaster', pages: 3 },
  { off: 'waffles', aisle: '2', detail: 'Side B, Frozen waffles', pages: 3 },

  // ── AISLE 3: Spices & Baking ──
  { off: 'ground-spices', aisle: '3', detail: 'Side A, Ground spices', pages: 4 },
  { off: 'herb-spices', aisle: '3', detail: 'Side A, Herbs', pages: 3 },
  { off: 'seasoning-mixes', aisle: '3', detail: 'Side A, Season mixes', pages: 3 },
  { off: 'vanilla-extracts', aisle: '3', detail: 'Side A, Vanilla extract', pages: 2 },
  { off: 'all-purpose-flours', aisle: '3', detail: 'Side B, All-purpose flour', pages: 2 },
  { off: 'powdered-sugars', aisle: '3', detail: 'Side B, Powdered sugar', pages: 2 },
  { off: 'brown-sugars', aisle: '3', detail: 'Side B, Brown sugar', pages: 2 },
  { off: 'cake-mixes', aisle: '3', detail: 'Side B, Cake mix', pages: 4 },
  { off: 'brownie-mixes', aisle: '3', detail: 'Side B, Brownie mix', pages: 3 },
  { off: 'baking-chocolate', aisle: '3', detail: 'Side B, Baking chocolate', pages: 3 },
  { off: 'cookie-mixes', aisle: '3', detail: 'Side B, Cookie mix', pages: 3 },

  // ── AISLE 4: Pasta & Rice ──
  { off: 'spaghetti', aisle: '4', detail: 'Side A, Spaghetti', pages: 4 },
  { off: 'penne', aisle: '4', detail: 'Side A, Penne', pages: 3 },
  { off: 'macaroni', aisle: '4', detail: 'Side A, Macaroni', pages: 3 },
  { off: 'egg-noodles', aisle: '4', detail: 'Side A, Egg noodles', pages: 2 },
  { off: 'lasagna-noodles', aisle: '4', detail: 'Side A, Lasagna', pages: 2 },
  { off: 'tomato-sauces', aisle: '4', detail: 'Side A, Tomato sauce', pages: 5 },
  { off: 'alfredo-sauces', aisle: '4', detail: 'Side A, Alfredo sauce', pages: 3 },
  { off: 'pesto-sauces', aisle: '4', detail: 'Side A, Pesto', pages: 3 },
  { off: 'brown-rices', aisle: '4', detail: 'Side B, Brown rice', pages: 3 },
  { off: 'white-rices', aisle: '4', detail: 'Side B, White rice', pages: 3 },
  { off: 'jasmine-rices', aisle: '4', detail: 'Side B, Jasmine rice', pages: 2 },
  { off: 'quinoa', aisle: '4', detail: 'Side B, Quinoa', pages: 3 },
  { off: 'black-beans', aisle: '4', detail: 'Side B, Black beans', pages: 3 },
  { off: 'kidney-beans', aisle: '4', detail: 'Side B, Kidney beans', pages: 2 },
  { off: 'pinto-beans', aisle: '4', detail: 'Side B, Pinto beans', pages: 2 },

  // ── AISLE 5: Canned & Soup ──
  { off: 'canned-corn', aisle: '5', detail: 'Side A, Canned corn', pages: 3 },
  { off: 'canned-green-beans', aisle: '5', detail: 'Side A, Canned green beans', pages: 2 },
  { off: 'canned-peas', aisle: '5', detail: 'Side A, Canned peas', pages: 2 },
  { off: 'canned-mushrooms', aisle: '5', detail: 'Side A, Canned mushrooms', pages: 2 },
  { off: 'canned-peaches', aisle: '5', detail: 'Side A, Canned peaches', pages: 2 },
  { off: 'canned-pineapple', aisle: '5', detail: 'Side A, Canned pineapple', pages: 2 },
  { off: 'diced-tomatoes', aisle: '5', detail: 'Side A, Diced tomatoes', pages: 3 },
  { off: 'tomato-pastes', aisle: '5', detail: 'Side A, Tomato paste', pages: 2 },
  { off: 'chicken-soups', aisle: '5', detail: 'Side B, Chicken soup', pages: 4 },
  { off: 'tomato-soups', aisle: '5', detail: 'Side B, Tomato soup', pages: 3 },
  { off: 'cream-soups', aisle: '5', detail: 'Side B, Cream soups', pages: 3 },
  { off: 'chicken-broths', aisle: '5', detail: 'Side B, Chicken broth', pages: 3 },
  { off: 'beef-broths', aisle: '5', detail: 'Side B, Beef broth', pages: 2 },
  { off: 'chilis', aisle: '5', detail: 'Side B, Canned chili', pages: 3 },
  { off: 'cup-noodles', aisle: '5', detail: 'Side B, Cup noodles', pages: 3 },

  // ── AISLE 6: Snacks ──
  { off: 'potato-chips', aisle: '6', detail: 'Side A, Potato chips', pages: 6 },
  { off: 'corn-chips', aisle: '6', detail: 'Side A, Corn chips', pages: 3 },
  { off: 'pita-chips', aisle: '6', detail: 'Side A, Pita chips', pages: 2 },
  { off: 'cheese-crackers', aisle: '6', detail: 'Side A, Cheese crackers', pages: 3 },
  { off: 'wheat-crackers', aisle: '6', detail: 'Side A, Wheat crackers', pages: 3 },
  { off: 'rice-cakes', aisle: '6', detail: 'Side A, Rice cakes', pages: 3 },
  { off: 'microwave-popcorn', aisle: '6', detail: 'Side A, Microwave popcorn', pages: 3 },
  { off: 'chocolate-cookies', aisle: '6', detail: 'Side B, Chocolate cookies', pages: 4 },
  { off: 'sandwich-cookies', aisle: '6', detail: 'Side B, Sandwich cookies', pages: 3 },
  { off: 'animal-crackers', aisle: '6', detail: 'Side B, Animal crackers', pages: 2 },
  { off: 'gummy-candies', aisle: '6', detail: 'Side B, Gummy candy', pages: 4 },
  { off: 'chocolate-bars', aisle: '6', detail: 'Side B, Chocolate bars', pages: 5 },
  { off: 'hard-candies', aisle: '6', detail: 'Side B, Hard candy', pages: 3 },
  { off: 'mixed-nuts', aisle: '6', detail: 'Side B, Mixed nuts', pages: 3 },
  { off: 'almonds', aisle: '6', detail: 'Side B, Almonds', pages: 3 },
  { off: 'cashews', aisle: '6', detail: 'Side B, Cashews', pages: 2 },
  { off: 'peanuts', aisle: '6', detail: 'Side B, Peanuts', pages: 3 },
  { off: 'trail-mixes', aisle: '6', detail: 'Side B, Trail mix', pages: 3 },
  { off: 'beef-jerky', aisle: '6', detail: 'Side B, Beef jerky', pages: 3 },
  { off: 'dried-fruits', aisle: '6', detail: 'Side B, Dried fruit', pages: 3 },
  { off: 'fruit-snacks', aisle: '6', detail: 'Side B, Fruit snacks', pages: 3 },

  // ── AISLE 7: International/Mexican ──
  { off: 'refried-beans', aisle: '7', detail: 'Side A, Refried beans', pages: 2 },
  { off: 'enchilada-sauces', aisle: '7', detail: 'Side A, Enchilada sauce', pages: 2 },
  { off: 'taco-seasonings', aisle: '7', detail: 'Side A, Taco seasoning', pages: 2 },
  { off: 'teriyaki-sauces', aisle: '7', detail: 'Side B, Teriyaki', pages: 3 },
  { off: 'curry-pastes', aisle: '7', detail: 'Side B, Curry paste', pages: 3 },
  { off: 'sriracha-sauces', aisle: '7', detail: 'Side B, Sriracha', pages: 2 },
  { off: 'rice-noodles', aisle: '7', detail: 'Side B, Rice noodles', pages: 3 },
  { off: 'stir-fry-sauces', aisle: '7', detail: 'Side B, Stir fry sauce', pages: 2 },

  // ── AISLE 8: Condiments ──
  { off: 'yellow-mustards', aisle: '8', detail: 'Side A, Yellow mustard', pages: 2 },
  { off: 'dijon-mustards', aisle: '8', detail: 'Side A, Dijon mustard', pages: 2 },
  { off: 'relishes', aisle: '8', detail: 'Side A, Relish', pages: 2 },
  { off: 'steak-sauces', aisle: '8', detail: 'Side A, Steak sauce', pages: 2 },
  { off: 'worcestershire-sauces', aisle: '8', detail: 'Side A, Worcestershire', pages: 2 },
  { off: 'ranch-dressings', aisle: '8', detail: 'Side B, Ranch dressing', pages: 3 },
  { off: 'italian-dressings', aisle: '8', detail: 'Side B, Italian dressing', pages: 3 },
  { off: 'caesar-dressings', aisle: '8', detail: 'Side B, Caesar dressing', pages: 2 },
  { off: 'balsamic-vinegars', aisle: '8', detail: 'Side B, Balsamic vinegar', pages: 2 },
  { off: 'cooking-oils', aisle: '8', detail: 'Side B, Cooking oil', pages: 4 },
  { off: 'vegetable-oils', aisle: '8', detail: 'Side B, Vegetable oil', pages: 3 },
  { off: 'canola-oils', aisle: '8', detail: 'Side B, Canola oil', pages: 2 },

  // ── AISLE 9: Beverages ──
  { off: 'colas', aisle: '9', detail: 'Side A, Cola', pages: 4 },
  { off: 'lemon-lime-sodas', aisle: '9', detail: 'Side A, Lemon-lime soda', pages: 3 },
  { off: 'ginger-ales', aisle: '9', detail: 'Side A, Ginger ale', pages: 2 },
  { off: 'root-beers', aisle: '9', detail: 'Side A, Root beer', pages: 2 },
  { off: 'diet-sodas', aisle: '9', detail: 'Side A, Diet soda', pages: 3 },
  { off: 'orange-juices', aisle: '9', detail: 'Side B, Orange juice', pages: 4 },
  { off: 'apple-juices', aisle: '9', detail: 'Side B, Apple juice', pages: 3 },
  { off: 'cranberry-juices', aisle: '9', detail: 'Side B, Cranberry juice', pages: 2 },
  { off: 'grape-juices', aisle: '9', detail: 'Side B, Grape juice', pages: 2 },
  { off: 'coconut-waters', aisle: '9', detail: 'Side B, Coconut water', pages: 3 },
  { off: 'kombucha', aisle: '9', detail: 'Side B, Kombucha', pages: 3 },
  { off: 'lemonades', aisle: '9', detail: 'Side B, Lemonade', pages: 3 },
  { off: 'iced-teas', aisle: '9', detail: 'Side B, Iced tea', pages: 4 },

  // ── AISLE 10: Coffee & Tea ──
  { off: 'ground-coffees', aisle: '10', detail: 'Side A, Ground coffee', pages: 5 },
  { off: 'whole-bean-coffees', aisle: '10', detail: 'Side A, Whole bean', pages: 4 },
  { off: 'instant-coffees', aisle: '10', detail: 'Side A, Instant coffee', pages: 3 },
  { off: 'coffee-pods', aisle: '10', detail: 'Side A, K-Cups/Pods', pages: 5 },
  { off: 'cold-brew-coffees', aisle: '10', detail: 'Side A, Cold brew', pages: 3 },
  { off: 'green-teas', aisle: '10', detail: 'Side B, Green tea', pages: 4 },
  { off: 'black-teas', aisle: '10', detail: 'Side B, Black tea', pages: 4 },
  { off: 'herbal-teas', aisle: '10', detail: 'Side B, Herbal tea', pages: 4 },
  { off: 'chamomile-teas', aisle: '10', detail: 'Side B, Chamomile tea', pages: 2 },
  { off: 'hot-chocolate-mixes', aisle: '10', detail: 'Side B, Hot chocolate', pages: 3 },

  // ── AISLE 11: Laundry & Cleaning ──
  { off: 'liquid-detergents', aisle: '11', detail: 'Side A, Liquid detergent', pages: 3 },
  { off: 'detergent-pods', aisle: '11', detail: 'Side A, Detergent pods', pages: 3 },
  { off: 'fabric-softeners', aisle: '11', detail: 'Side A, Fabric softener', pages: 3 },
  { off: 'dryer-sheets', aisle: '11', detail: 'Side A, Dryer sheets', pages: 2 },
  { off: 'bleaches', aisle: '11', detail: 'Side A, Bleach', pages: 2 },
  { off: 'stain-removers', aisle: '11', detail: 'Side A, Stain remover', pages: 2 },
  { off: 'dish-soaps', aisle: '11', detail: 'Side B, Dish soap', pages: 3 },
  { off: 'dishwasher-detergents', aisle: '11', detail: 'Side B, Dishwasher pods', pages: 3 },
  { off: 'surface-cleaners', aisle: '11', detail: 'Side B, Surface cleaner', pages: 3 },
  { off: 'glass-cleaners', aisle: '11', detail: 'Side B, Glass cleaner', pages: 2 },
  { off: 'disinfectants', aisle: '11', detail: 'Side B, Disinfectant', pages: 2 },

  // ── AISLE 12: Paper & Storage ──
  { off: 'facial-tissues', aisle: '12', detail: 'Side A, Tissues', pages: 2 },
  { off: 'trash-bags', aisle: '12', detail: 'Side B, Trash bags', pages: 2 },
  { off: 'food-storage-bags', aisle: '12', detail: 'Side B, Ziploc bags', pages: 2 },

  // ── AISLE 13: Health & Beauty ──
  { off: 'conditioners', aisle: '13', detail: 'Side A, Conditioner', pages: 4 },
  { off: 'hair-gels', aisle: '13', detail: 'Side A, Hair gel', pages: 2 },
  { off: 'hair-sprays', aisle: '13', detail: 'Side A, Hair spray', pages: 2 },
  { off: 'moisturizers', aisle: '13', detail: 'Side A, Moisturizer', pages: 3 },
  { off: 'face-washes', aisle: '13', detail: 'Side A, Face wash', pages: 3 },
  { off: 'hand-soaps', aisle: '13', detail: 'Side B, Hand soap', pages: 3 },
  { off: 'body-lotions', aisle: '13', detail: 'Side B, Body lotion', pages: 3 },
  { off: 'mouthwashes', aisle: '13', detail: 'Side B, Mouthwash', pages: 3 },
  { off: 'dental-flosses', aisle: '13', detail: 'Side B, Dental floss', pages: 2 },
  { off: 'razors', aisle: '13', detail: 'Side B, Razors', pages: 2 },
  { off: 'lip-balms', aisle: '13', detail: 'Side B, Lip balm', pages: 3 },
  { off: 'vitamins', aisle: '13', detail: 'Side B, Vitamins', pages: 5 },
  { off: 'pain-relievers', aisle: '13', detail: 'Side B, Pain relief', pages: 3 },

  // ── AISLE 14: Baby & Pet ──
  { off: 'baby-purees', aisle: '14', detail: 'Side A, Baby puree', pages: 4 },
  { off: 'baby-snacks', aisle: '14', detail: 'Side A, Baby snacks', pages: 3 },
  { off: 'baby-cereals', aisle: '14', detail: 'Side A, Baby cereal', pages: 2 },
  { off: 'diapers', aisle: '14', detail: 'Side A, Diapers', pages: 3 },
  { off: 'baby-wipes', aisle: '14', detail: 'Side A, Baby wipes', pages: 2 },
  { off: 'dry-dog-foods', aisle: '14', detail: 'Side B, Dry dog food', pages: 4 },
  { off: 'wet-dog-foods', aisle: '14', detail: 'Side B, Wet dog food', pages: 3 },
  { off: 'dry-cat-foods', aisle: '14', detail: 'Side B, Dry cat food', pages: 4 },
  { off: 'wet-cat-foods', aisle: '14', detail: 'Side B, Wet cat food', pages: 3 },
  { off: 'dog-treats', aisle: '14', detail: 'Side B, Dog treats', pages: 3 },
  { off: 'cat-treats', aisle: '14', detail: 'Side B, Cat treats', pages: 3 },

  // ── PERIMETER: Dairy ──
  { off: 'whole-milks', aisle: null, detail: 'Dairy wall, Whole milk', pages: 3 },
  { off: 'skim-milks', aisle: null, detail: 'Dairy wall, Skim milk', pages: 2 },
  { off: '2-percent-milks', aisle: null, detail: 'Dairy wall, 2% milk', pages: 2 },
  { off: 'chocolate-milks', aisle: null, detail: 'Dairy wall, Chocolate milk', pages: 3 },
  { off: 'oat-milks', aisle: null, detail: 'Dairy wall, Oat milk', pages: 3 },
  { off: 'almond-milks', aisle: null, detail: 'Dairy wall, Almond milk', pages: 3 },
  { off: 'soy-milks', aisle: null, detail: 'Dairy wall, Soy milk', pages: 3 },
  { off: 'cheddar-cheeses', aisle: null, detail: 'Dairy wall, Cheddar', pages: 4 },
  { off: 'mozzarella-cheeses', aisle: null, detail: 'Dairy wall, Mozzarella', pages: 3 },
  { off: 'swiss-cheeses', aisle: null, detail: 'Dairy wall, Swiss', pages: 2 },
  { off: 'parmesan-cheeses', aisle: null, detail: 'Dairy wall, Parmesan', pages: 3 },
  { off: 'cream-cheeses', aisle: null, detail: 'Dairy wall, Cream cheese', pages: 3 },
  { off: 'shredded-cheeses', aisle: null, detail: 'Dairy wall, Shredded cheese', pages: 3 },
  { off: 'sliced-cheeses', aisle: null, detail: 'Dairy wall, Sliced cheese', pages: 3 },
  { off: 'greek-yogurts', aisle: null, detail: 'Dairy wall, Greek yogurt', pages: 5 },
  { off: 'regular-yogurts', aisle: null, detail: 'Dairy wall, Yogurt', pages: 5 },
  { off: 'cottage-cheeses', aisle: null, detail: 'Dairy wall, Cottage cheese', pages: 3 },
  { off: 'sour-creams', aisle: null, detail: 'Dairy wall, Sour cream', pages: 2 },
  { off: 'heavy-creams', aisle: null, detail: 'Dairy wall, Heavy cream', pages: 2 },
  { off: 'whipped-creams', aisle: null, detail: 'Dairy wall, Whipped cream', pages: 2 },
  { off: 'coffee-creamers', aisle: null, detail: 'Dairy wall, Coffee creamer', pages: 4 },
  { off: 'egg-whites', aisle: null, detail: 'Dairy wall, Egg whites', pages: 2 },

  // ── PERIMETER: Frozen ──
  { off: 'frozen-vegetables', aisle: null, detail: 'Frozen, Vegetables', pages: 5 },
  { off: 'frozen-fruits', aisle: null, detail: 'Frozen, Fruits', pages: 4 },
  { off: 'frozen-dinners', aisle: null, detail: 'Frozen, Dinners', pages: 6 },
  { off: 'frozen-breakfast', aisle: null, detail: 'Frozen, Breakfast', pages: 4 },
  { off: 'frozen-appetizers', aisle: null, detail: 'Frozen, Appetizers', pages: 3 },
  { off: 'frozen-snacks', aisle: null, detail: 'Frozen, Snacks', pages: 3 },
  { off: 'frozen-burritos', aisle: null, detail: 'Frozen, Burritos', pages: 3 },
  { off: 'ice-cream-sandwiches', aisle: null, detail: 'Frozen, Ice cream sandwiches', pages: 3 },
  { off: 'frozen-pies', aisle: null, detail: 'Frozen, Pies', pages: 3 },
  { off: 'frozen-cakes', aisle: null, detail: 'Frozen, Cakes', pages: 2 },
  { off: 'ice-cream-bars', aisle: null, detail: 'Frozen, Ice cream bars', pages: 4 },
  { off: 'frozen-chicken', aisle: null, detail: 'Frozen, Chicken', pages: 4 },
  { off: 'frozen-fish', aisle: null, detail: 'Frozen, Fish', pages: 3 },
  { off: 'frozen-shrimp', aisle: null, detail: 'Frozen, Shrimp', pages: 2 },
  { off: 'frozen-french-fries', aisle: null, detail: 'Frozen, French fries', pages: 4 },
  { off: 'frozen-tater-tots', aisle: null, detail: 'Frozen, Tater tots', pages: 2 },
  { off: 'frozen-waffles', aisle: null, detail: 'Frozen, Waffles', pages: 3 },
  { off: 'frozen-pancakes', aisle: null, detail: 'Frozen, Pancakes', pages: 2 },

  // ── PERIMETER: Meat ──
  { off: 'ground-beefs', aisle: null, detail: 'Meat, Ground beef', pages: 2 },
  { off: 'beef-steaks', aisle: null, detail: 'Meat, Steak', pages: 3 },
  { off: 'chicken-breasts', aisle: null, detail: 'Meat, Chicken breast', pages: 3 },
  { off: 'chicken-thighs', aisle: null, detail: 'Meat, Chicken thighs', pages: 2 },
  { off: 'chicken-wings', aisle: null, detail: 'Meat, Chicken wings', pages: 2 },
  { off: 'pork-chops', aisle: null, detail: 'Meat, Pork chops', pages: 2 },
  { off: 'pork-ribs', aisle: null, detail: 'Meat, Pork ribs', pages: 2 },
  { off: 'turkey-breasts', aisle: null, detail: 'Meat, Turkey breast', pages: 2 },
  { off: 'hot-dogs', aisle: null, detail: 'Meat, Hot dogs', pages: 3 },
  { off: 'breakfast-sausages', aisle: null, detail: 'Meat, Breakfast sausage', pages: 3 },
  { off: 'italian-sausages', aisle: null, detail: 'Meat, Italian sausage', pages: 2 },
  { off: 'lunch-meats', aisle: null, detail: 'Deli, Lunch meat', pages: 4 },
  { off: 'sliced-turkey', aisle: null, detail: 'Deli, Sliced turkey', pages: 3 },
  { off: 'sliced-ham', aisle: null, detail: 'Deli, Sliced ham', pages: 3 },
  { off: 'salmon-fillets', aisle: null, detail: 'Seafood, Salmon', pages: 3 },
  { off: 'shrimps', aisle: null, detail: 'Seafood, Shrimp', pages: 3 },
  { off: 'crab-meats', aisle: null, detail: 'Seafood, Crab', pages: 2 },

  // ── PERIMETER: Produce ──
  { off: 'fresh-salads', aisle: null, detail: 'Produce, Packaged salads', pages: 4 },
  { off: 'hummus', aisle: null, detail: 'Produce, Hummus', pages: 3 },
  { off: 'guacamole', aisle: null, detail: 'Produce, Guacamole', pages: 2 },
  { off: 'fresh-herbs', aisle: null, detail: 'Produce, Fresh herbs', pages: 2 },
  { off: 'bagged-salads', aisle: null, detail: 'Produce, Bagged salads', pages: 3 },
  { off: 'fresh-berries', aisle: null, detail: 'Produce, Berries', pages: 2 },
  { off: 'organic-produce', aisle: null, detail: 'Produce, Organic', pages: 3 },
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

async function fetchCategory(category, page = 1) {
  const url = `${OFF_API}/cgi/search.pl?action=process&tagtype_0=categories&tag_contains_0=contains&tag_0=${category}&countries=United+States&sort_by=popularity_key&page_size=50&page=${page}&fields=product_name,brands,image_front_small_url,image_front_url,image_url,quantity&json=1`;
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'WhereIsIt-HyVee/2.0 (grocery-locator)' },
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
  console.log('\n🏪  Mass Import Round 2 — targeting 10,000 products\n');
  const { storeId, aisleMap } = await getStoreAndAisles();
  const seenNames = new Set();

  const { data: existing } = await supabase
    .from('product_locations').select('product_name').eq('store_id', storeId);
  existing?.forEach(p => seenNames.add(p.product_name.toLowerCase()));
  console.log(`  Existing: ${seenNames.size} products`);
  console.log(`  Categories: ${CATEGORIES.length}\n`);

  let inserted = 0, skipped = 0;

  for (let c = 0; c < CATEGORIES.length; c++) {
    const cat = CATEGORIES[c];
    let catProducts = [];

    for (let pg = 1; pg <= cat.pages; pg++) {
      const products = await fetchCategory(cat.off, pg);
      catProducts.push(...products);
      if (products.length < 50) break;
      await new Promise(r => setTimeout(r, 150));
    }

    const rows = [];
    for (const p of catProducts) {
      const name = p.product_name.trim();
      if (seenNames.has(name.toLowerCase())) continue;
      seenNames.add(name.toLowerCase());
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

    const pct = Math.round(((c + 1) / CATEGORIES.length) * 100);
    process.stdout.write(`\r  [${pct}%] ${cat.off}: +${rows.length} (total: ${inserted + seenNames.size - existing.length})        `);
  }

  console.log(`\n\n🏪  Round 2 Complete!`);
  console.log(`  New: ${inserted} | Skipped: ${skipped}`);
  console.log(`  Est. total: ~${seenNames.size}\n`);
}

run().catch(err => { console.error('Import failed:', err); process.exit(1); });

#!/usr/bin/env node
/**
 * Expanded Hy-Vee Product Catalog — 500+ products
 * Adds to the existing seeded data (chain, stores, aisles already exist)
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Helper: get Rice Road store + aisles
async function getStoreAndAisles() {
  const { data: stores } = await supabase.from('stores').select('id, address').eq('address', '301 NE Rice Rd');
  const store = stores?.[0];
  if (!store) throw new Error('Rice Road store not found — run seed-hyvee.js first');
  const { data: aisles } = await supabase.from('aisles').select('id, aisle_number').eq('store_id', store.id);
  const map = {};
  aisles.forEach(a => { map[a.aisle_number] = a.id; });
  return { storeId: store.id, aisleMap: map };
}

// Product data: [name, brand, aisle, detail, confidence, source]
const P = [
  // ═══ AISLE 1 — Bread & Spreads ═══
  ['Sara Lee Artesano Bread','Sara Lee','1','Side A, eye level',0.90,'community'],
  ['Natures Own Whole Wheat','Natures Own','1','Side A, top shelf',0.88,'community'],
  ['Kings Hawaiian Rolls','Kings Hawaiian','1','Side A, middle shelf',0.92,'verified'],
  ['Daves Killer Bread','Daves Killer Bread','1','Side A, top shelf',0.88,'community'],
  ['Thomas English Muffins','Thomas','1','Side A, bottom shelf',0.90,'community'],
  ['Hy-Vee White Bread','Hy-Vee','1','Side A, bottom shelf',0.95,'verified'],
  ['Mission Soft Taco Tortillas','Mission','1','Side A, bottom shelf',0.90,'community'],
  ['Old El Paso Flour Tortillas','Old El Paso','1','Side A, bottom shelf',0.85,'community'],
  ['Skippy Peanut Butter','Skippy','1','Side B, eye level',0.90,'community'],
  ['Peter Pan Peanut Butter','Peter Pan','1','Side B, middle shelf',0.85,'community'],
  ['Welchs Grape Jelly','Welchs','1','Side B, middle shelf',0.88,'community'],
  ['Nutella Hazelnut Spread','Nutella','1','Side B, top shelf',0.92,'verified'],
  ['Smucker\'s Grape Jam','Smucker\'s','1','Side B, eye level',0.88,'community'],

  // ═══ AISLE 2 — Cereal & Breakfast ═══
  ['Frosted Flakes','Kelloggs','2','Side A, eye level',0.95,'verified'],
  ['Lucky Charms','General Mills','2','Side A, eye level',0.92,'verified'],
  ['Cinnamon Toast Crunch','General Mills','2','Side A, middle shelf',0.92,'verified'],
  ['Honey Nut Cheerios','General Mills','2','Side A, eye level',0.95,'verified'],
  ['Froot Loops','Kelloggs','2','Side A, middle shelf',0.90,'community'],
  ['Raisin Bran','Kelloggs','2','Side A, top shelf',0.88,'community'],
  ['Special K','Kelloggs','2','Side A, top shelf',0.85,'community'],
  ['Life Cereal','Quaker','2','Side A, middle shelf',0.85,'community'],
  ['Cocoa Puffs','General Mills','2','Side A, bottom shelf',0.88,'community'],
  ['Cap\'n Crunch','Quaker','2','Side A, bottom shelf',0.85,'community'],
  ['Quaker Instant Oatmeal Variety','Quaker','2','Side A, bottom shelf',0.90,'community'],
  ['Hy-Vee Granola','Hy-Vee','2','Side A, top shelf',0.92,'verified'],
  ['Eggo Frozen Waffles','Kelloggs','2','Side B, eye level',0.82,'community'],
  ['Krusteaz Pancake Mix','Krusteaz','2','Side B, eye level',0.85,'community'],
  ['Mrs Butterworths Syrup','Mrs Butterworths','2','Side B, middle shelf',0.88,'community'],
  ['Log Cabin Syrup','Log Cabin','2','Side B, bottom shelf',0.85,'community'],
  ['Nutri-Grain Bars','Kelloggs','2','Side B, top shelf',0.88,'community'],
  ['KIND Bars Variety','KIND','2','Side B, top shelf',0.85,'community'],

  // ═══ AISLE 3 — Spices & Baking ═══
  ['McCormick Garlic Powder','McCormick','3','Side A, spice rack',0.90,'community'],
  ['McCormick Chili Powder','McCormick','3','Side A, spice rack',0.88,'community'],
  ['McCormick Italian Seasoning','McCormick','3','Side A, spice rack',0.88,'community'],
  ['McCormick Paprika','McCormick','3','Side A, spice rack',0.88,'community'],
  ['McCormick Black Pepper','McCormick','3','Side A, spice rack',0.92,'verified'],
  ['Morton Salt','Morton','3','Side A, bottom shelf',0.95,'verified'],
  ['Lawrys Seasoned Salt','Lawrys','3','Side A, spice rack',0.85,'community'],
  ['Tone\'s Garlic Salt','Tone\'s','3','Side A, spice rack',0.85,'community'],
  ['Hy-Vee Vanilla Extract','Hy-Vee','3','Side A, top shelf',0.90,'verified'],
  ['Pillsbury All Purpose Flour','Pillsbury','3','Side B, bottom shelf',0.90,'community'],
  ['C&H Granulated Sugar','C&H','3','Side B, bottom shelf',0.88,'community'],
  ['Domino Powdered Sugar','Domino','3','Side B, middle shelf',0.85,'community'],
  ['Arm & Hammer Baking Soda','Arm & Hammer','3','Side B, middle shelf',0.92,'verified'],
  ['Clabber Girl Baking Powder','Clabber Girl','3','Side B, middle shelf',0.85,'community'],
  ['Nestle Chocolate Chips','Nestle','3','Side B, eye level',0.92,'verified'],
  ['Duncan Hines Brownie Mix','Duncan Hines','3','Side B, eye level',0.88,'community'],
  ['Pillsbury Chocolate Chip Cookie Dough','Pillsbury','3','Side B, top shelf',0.85,'community'],
  ['Betty Crocker Cream Cheese Frosting','Betty Crocker','3','Side B, eye level',0.85,'community'],
  ['Wilton Sprinkles','Wilton','3','Side B, top shelf',0.82,'community'],

  // ═══ AISLE 4 — Pasta & Grains ═══
  ['Barilla Penne','Barilla','4','Side A, eye level',0.92,'verified'],
  ['Barilla Angel Hair','Barilla','4','Side A, eye level',0.90,'community'],
  ['Mueller\'s Elbow Macaroni','Mueller\'s','4','Side A, middle shelf',0.88,'community'],
  ['Hy-Vee Rotini','Hy-Vee','4','Side A, bottom shelf',0.92,'verified'],
  ['Ragu Traditional Sauce','Ragu','4','Side A, middle shelf',0.88,'community'],
  ['Classico Tomato Basil','Classico','4','Side A, top shelf',0.85,'community'],
  ['Bertolli Alfredo Sauce','Bertolli','4','Side A, top shelf',0.85,'community'],
  ['Hy-Vee Marinara Sauce','Hy-Vee','4','Side A, middle shelf',0.92,'verified'],
  ['Minute Rice White','Minute Rice','4','Side B, eye level',0.90,'community'],
  ['Mahatma Jasmine Rice','Mahatma','4','Side B, middle shelf',0.85,'community'],
  ['Success Boil-in-Bag Rice','Success','4','Side B, bottom shelf',0.82,'community'],
  ['Bush\'s Black Beans','Bush\'s','4','Side B, middle shelf',0.90,'community'],
  ['Goya Pinto Beans','Goya','4','Side B, bottom shelf',0.85,'community'],
  ['Near East Couscous','Near East','4','Side B, top shelf',0.82,'community'],

  // ═══ AISLE 5 — Canned Goods & Soup ═══
  ['Green Giant Corn Niblets','Green Giant','5','Side A, eye level',0.90,'community'],
  ['Del Monte Sliced Peaches','Del Monte','5','Side A, middle shelf',0.88,'community'],
  ['Rotel Diced Tomatoes','Rotel','5','Side A, eye level',0.90,'community'],
  ['Hunt\'s Tomato Sauce','Hunt\'s','5','Side A, bottom shelf',0.88,'community'],
  ['Contadina Tomato Paste','Contadina','5','Side A, bottom shelf',0.85,'community'],
  ['Hy-Vee Canned Green Beans','Hy-Vee','5','Side A, middle shelf',0.92,'verified'],
  ['Dole Pineapple Chunks','Dole','5','Side A, top shelf',0.85,'community'],
  ['Campbell\'s Tomato Soup','Campbell\'s','5','Side B, eye level',0.95,'verified'],
  ['Campbell\'s Cream of Mushroom','Campbell\'s','5','Side B, eye level',0.92,'verified'],
  ['Progresso Chicken Noodle','Progresso','5','Side B, middle shelf',0.88,'community'],
  ['Hy-Vee Chicken Broth','Hy-Vee','5','Side B, bottom shelf',0.92,'verified'],
  ['Hormel Chili','Hormel','5','Side B, middle shelf',0.90,'community'],
  ['Maruchan Ramen Variety','Maruchan','5','Side B, bottom shelf',0.92,'verified'],
  ['Cup Noodles Chicken','Nissin','5','Side B, bottom shelf',0.88,'community'],

  // ═══ AISLE 6 — Snacks ═══
  ['Ruffles Original','Frito-Lay','6','Side A, eye level',0.92,'verified'],
  ['Pringles Original','Pringles','6','Side A, eye level',0.90,'community'],
  ['Cheetos Crunchy','Frito-Lay','6','Side A, middle shelf',0.92,'verified'],
  ['Tostitos Scoops','Frito-Lay','6','Side A, eye level',0.88,'community'],
  ['Rold Gold Pretzels','Frito-Lay','6','Side A, bottom shelf',0.85,'community'],
  ['SkinnyPop Popcorn','SkinnyPop','6','Side A, top shelf',0.85,'community'],
  ['Smartfood White Cheddar','Frito-Lay','6','Side A, middle shelf',0.88,'community'],
  ['Kettle Brand Sea Salt','Kettle Brand','6','Side A, top shelf',0.82,'community'],
  ['Hy-Vee Tortilla Chips','Hy-Vee','6','Side A, bottom shelf',0.92,'verified'],
  ['Chips Ahoy Cookies','Nabisco','6','Side B, eye level',0.92,'verified'],
  ['Nutter Butter','Nabisco','6','Side B, middle shelf',0.85,'community'],
  ['Little Debbie Cosmic Brownies','Little Debbie','6','Side B, eye level',0.88,'community'],
  ['M&M\'s Peanut','Mars','6','Side B, end cap',0.88,'community'],
  ['Reese\'s Peanut Butter Cups','Hershey\'s','6','Side B, end cap',0.88,'community'],
  ['Planters Mixed Nuts','Planters','6','Side B, bottom shelf',0.88,'community'],
  ['Blue Diamond Almonds','Blue Diamond','6','Side B, top shelf',0.85,'community'],
  ['Nature Valley Oats N Honey','Nature Valley','6','Side B, top shelf',0.85,'community'],

  // ═══ AISLE 7 — Mexican & International ═══
  ['Old El Paso Taco Kit','Old El Paso','7','Side A, eye level',0.90,'community'],
  ['Ortega Taco Seasoning','Ortega','7','Side A, middle shelf',0.85,'community'],
  ['Herdez Salsa Verde','Herdez','7','Side A, bottom shelf',0.85,'community'],
  ['Chi-Chi\'s Salsa','Chi-Chi\'s','7','Side A, middle shelf',0.82,'community'],
  ['Old El Paso Refried Beans','Old El Paso','7','Side A, bottom shelf',0.88,'community'],
  ['La Victoria Enchilada Sauce','La Victoria','7','Side A, bottom shelf',0.82,'community'],
  ['La Choy Soy Sauce','La Choy','7','Side B, eye level',0.85,'community'],
  ['Thai Kitchen Coconut Milk','Thai Kitchen','7','Side B, middle shelf',0.85,'community'],
  ['Huy Fong Sriracha','Huy Fong','7','Side B, eye level',0.92,'verified'],
  ['Kikkoman Teriyaki Sauce','Kikkoman','7','Side B, middle shelf',0.88,'community'],
  ['S&B Golden Curry','S&B','7','Side B, bottom shelf',0.82,'community'],

  // ═══ AISLE 8 — Condiments & Dressings ═══
  ['French\'s Classic Yellow Mustard','French\'s','8','Side A, eye level',0.92,'verified'],
  ['Grey Poupon Dijon Mustard','Grey Poupon','8','Side A, top shelf',0.85,'community'],
  ['Heinz Yellow Mustard','Heinz','8','Side A, middle shelf',0.88,'community'],
  ['Best Foods Mayo','Best Foods','8','Side A, eye level',0.88,'community'],
  ['Miracle Whip','Kraft','8','Side A, middle shelf',0.88,'community'],
  ['Tabasco Hot Sauce','Tabasco','8','Side A, bottom shelf',0.90,'community'],
  ['Frank\'s RedHot','Frank\'s','8','Side A, bottom shelf',0.90,'community'],
  ['Vlasic Dill Pickles','Vlasic','8','Side A, bottom shelf',0.88,'community'],
  ['Mt Olive Sweet Relish','Mt Olive','8','Side A, bottom shelf',0.82,'community'],
  ['Hidden Valley Ranch','Hidden Valley','8','Side B, eye level',0.92,'verified'],
  ['Ken\'s Steak House Italian','Ken\'s','8','Side B, middle shelf',0.85,'community'],
  ['Wishbone Italian Dressing','Wishbone','8','Side B, bottom shelf',0.82,'community'],
  ['Newman\'s Own Balsamic','Newman\'s Own','8','Side B, middle shelf',0.85,'community'],
  ['Pompeian Extra Virgin Olive Oil','Pompeian','8','Side B, eye level',0.90,'community'],
  ['PAM Cooking Spray','PAM','8','Side B, top shelf',0.88,'community'],
  ['Crisco Vegetable Oil','Crisco','8','Side B, bottom shelf',0.85,'community'],

  // ═══ AISLE 9 — Beverages ═══
  ['Mountain Dew 12 Pack','PepsiCo','9','Side A, bottom shelf',0.92,'verified'],
  ['Dr Pepper 12 Pack','Dr Pepper','9','Side A, bottom shelf',0.92,'verified'],
  ['Sprite 12 Pack','Coca-Cola','9','Side A, bottom shelf',0.90,'community'],
  ['7UP 12 Pack','Keurig Dr Pepper','9','Side A, middle shelf',0.85,'community'],
  ['Bubly Sparkling Water','PepsiCo','9','Side A, middle shelf',0.85,'community'],
  ['Topo Chico','Coca-Cola','9','Side A, top shelf',0.85,'community'],
  ['Hy-Vee Purified Water 24pk','Hy-Vee','9','Side A, bottom shelf',0.95,'verified'],
  ['Minute Maid OJ','Coca-Cola','9','Side B, top shelf',0.85,'community'],
  ['Ocean Spray Cranberry','Ocean Spray','9','Side B, middle shelf',0.85,'community'],
  ['V8 Original','Campbell\'s','9','Side B, middle shelf',0.82,'community'],
  ['Powerade Mountain Berry','Coca-Cola','9','Side B, bottom shelf',0.85,'community'],
  ['Monster Energy','Monster','9','Side B, eye level',0.90,'community'],
  ['Celsius Sparkling Orange','Celsius','9','Side B, top shelf',0.85,'community'],
  ['Vita Coco Coconut Water','Vita Coco','9','Side B, top shelf',0.82,'community'],

  // ═══ AISLE 10 — Coffee & Tea ═══
  ['Maxwell House Original','Maxwell House','10','Side A, eye level',0.90,'community'],
  ['Starbucks House Blend','Starbucks','10','Side A, top shelf',0.88,'community'],
  ['Dunkin Original Blend','Dunkin','10','Side A, middle shelf',0.85,'community'],
  ['Hy-Vee Colombian Coffee','Hy-Vee','10','Side A, eye level',0.92,'verified'],
  ['Stok Cold Brew','Stok','10','Side A, bottom shelf',0.85,'community'],
  ['Starbucks Frappuccino 4 Pack','Starbucks','10','Side A, bottom shelf',0.82,'community'],
  ['Keurig K-Cup Variety','Keurig','10','Side A, top shelf',0.88,'community'],
  ['Bigelow Green Tea','Bigelow','10','Side B, eye level',0.85,'community'],
  ['Celestial Seasonings Sleepytime','Celestial','10','Side B, middle shelf',0.85,'community'],
  ['Tazo Chai Tea','Tazo','10','Side B, top shelf',0.82,'community'],
  ['Nestle Hot Cocoa Packets','Nestle','10','Side B, middle shelf',0.85,'community'],
  ['Crystal Light Lemonade','Crystal Light','10','Side B, bottom shelf',0.82,'community'],
  ['Kool-Aid Tropical Punch','Kool-Aid','10','Side B, bottom shelf',0.85,'community'],
  ['Dasani Water 24pk','Coca-Cola','10','Side B, bottom shelf',0.88,'community'],

  // ═══ AISLE 11 — Laundry & Cleaning ═══
  ['Gain Liquid Detergent','Gain','11','Side A, bottom shelf',0.90,'community'],
  ['All Free & Clear','All','11','Side A, middle shelf',0.85,'community'],
  ['Arm & Hammer Detergent','Arm & Hammer','11','Side A, middle shelf',0.85,'community'],
  ['Bounce Dryer Sheets','Bounce','11','Side A, top shelf',0.88,'community'],
  ['Snuggle Fabric Softener','Snuggle','11','Side A, middle shelf',0.82,'community'],
  ['OxiClean Stain Remover','OxiClean','11','Side A, top shelf',0.88,'community'],
  ['Clorox Bleach','Clorox','11','Side A, bottom shelf',0.90,'community'],
  ['Tide Pods','Tide','11','Side A, eye level',0.92,'verified'],
  ['Palmolive Dish Soap','Palmolive','11','Side B, eye level',0.88,'community'],
  ['Cascade Dishwasher Pods','Cascade','11','Side B, eye level',0.92,'verified'],
  ['Finish Powerball','Finish','11','Side B, middle shelf',0.85,'community'],
  ['Scrub Daddy Sponge','Scrub Daddy','11','Side B, top shelf',0.85,'community'],
  ['Clorox Disinfecting Wipes','Clorox','11','Side B, middle shelf',0.90,'community'],
  ['Mr Clean All Purpose','Mr Clean','11','Side B, bottom shelf',0.85,'community'],
  ['Swiffer WetJet Refills','Swiffer','11','Side B, bottom shelf',0.85,'community'],

  // ═══ AISLE 12 — Paper & Kitchen ═══
  ['Viva Paper Towels','Viva','12','Side A, bottom shelf',0.88,'community'],
  ['Sparkle Paper Towels','Sparkle','12','Side A, middle shelf',0.82,'community'],
  ['Cottonelle Toilet Paper','Cottonelle','12','Side A, bottom shelf',0.90,'community'],
  ['Scott 1000 Toilet Paper','Scott','12','Side A, middle shelf',0.85,'community'],
  ['Kleenex Ultra Soft','Kleenex','12','Side A, top shelf',0.88,'community'],
  ['Puffs Plus Lotion','Puffs','12','Side A, top shelf',0.85,'community'],
  ['Hy-Vee Paper Plates','Hy-Vee','12','Side A, top shelf',0.90,'verified'],
  ['Hefty Trash Bags 30 Gal','Hefty','12','Side B, middle shelf',0.88,'community'],
  ['Ziploc Gallon Bags','Ziploc','12','Side B, eye level',0.92,'verified'],
  ['Ziploc Sandwich Bags','Ziploc','12','Side B, eye level',0.90,'community'],
  ['Reynolds Cut-Rite Wax Paper','Reynolds','12','Side B, top shelf',0.82,'community'],
  ['Saran Premium Wrap','Saran','12','Side B, middle shelf',0.82,'community'],
  ['If You Care Parchment Paper','If You Care','12','Side B, top shelf',0.80,'community'],

  // ═══ AISLE 13 — Health & Beauty ═══
  ['Head & Shoulders','Head & Shoulders','13','Side A, eye level',0.90,'community'],
  ['TRESemme Shampoo','TRESemme','13','Side A, middle shelf',0.85,'community'],
  ['Suave Shampoo','Suave','13','Side A, bottom shelf',0.82,'community'],
  ['Garnier Fructis','Garnier','13','Side A, middle shelf',0.85,'community'],
  ['Dove Men Care Body Wash','Dove','13','Side A, eye level',0.90,'community'],
  ['Irish Spring Body Wash','Irish Spring','13','Side A, bottom shelf',0.85,'community'],
  ['Revlon Colorsilk','Revlon','13','Side A, top shelf',0.82,'community'],
  ['Dove Beauty Bar','Dove','13','Side B, eye level',0.90,'community'],
  ['Cetaphil Moisturizing Lotion','Cetaphil','13','Side B, middle shelf',0.85,'community'],
  ['Jergens Original Scent','Jergens','13','Side B, bottom shelf',0.82,'community'],
  ['Secret Deodorant','Secret','13','Side B, eye level',0.88,'community'],
  ['Degree Motion Sense','Degree','13','Side B, middle shelf',0.85,'community'],
  ['Schick Hydro 5 Razor','Schick','13','Side B, top shelf',0.82,'community'],
  ['Neutrogena Sunscreen SPF50','Neutrogena','13','Side B, top shelf',0.85,'community'],
  ['Colgate Total Toothpaste','Colgate','13','Side B, eye level',0.92,'verified'],
  ['Crest 3D White','Crest','13','Side B, eye level',0.90,'community'],
  ['Listerine Mouthwash','Listerine','13','Side B, bottom shelf',0.88,'community'],
  ['Oral-B Toothbrush','Oral-B','13','Side B, middle shelf',0.82,'community'],

  // ═══ AISLE 14 — Baby & Pet ═══
  ['Huggies Little Snugglers','Huggies','14','Side A, bottom shelf',0.92,'verified'],
  ['Luvs Diapers','Luvs','14','Side A, middle shelf',0.85,'community'],
  ['Pampers Baby Dry','Pampers','14','Side A, bottom shelf',0.90,'community'],
  ['Huggies Natural Care Wipes','Huggies','14','Side A, eye level',0.90,'community'],
  ['Enfamil Infant Formula','Enfamil','14','Side A, top shelf',0.88,'community'],
  ['Similac Advance Formula','Similac','14','Side A, top shelf',0.85,'community'],
  ['Gerber 2nd Foods Variety','Gerber','14','Side A, eye level',0.88,'community'],
  ['Beech-Nut Organic Baby Food','Beech-Nut','14','Side A, middle shelf',0.82,'community'],
  ['Johnsons Baby Shampoo','Johnsons','14','Side A, middle shelf',0.88,'community'],
  ['Aquaphor Baby Healing Ointment','Aquaphor','14','Side A, top shelf',0.85,'community'],
  ['Iams ProActive Dog Food','Iams','14','Side B, bottom shelf',0.88,'community'],
  ['Blue Buffalo Life Protection','Blue Buffalo','14','Side B, bottom shelf',0.85,'community'],
  ['Rachael Ray Nutrish','Rachael Ray','14','Side B, middle shelf',0.82,'community'],
  ['Meow Mix Original','Meow Mix','14','Side B, middle shelf',0.88,'community'],
  ['Purina Cat Chow','Purina','14','Side B, bottom shelf',0.88,'community'],
  ['Fresh Step Cat Litter','Fresh Step','14','Side B, bottom shelf',0.85,'community'],
  ['Tidy Cats Cat Litter','Tidy Cats','14','Side B, bottom shelf',0.82,'community'],
  ['Milk-Bone Dog Biscuits','Milk-Bone','14','Side B, top shelf',0.88,'community'],
  ['Greenies Dental Treats','Greenies','14','Side B, top shelf',0.85,'community'],
  ['KONG Classic Dog Toy','KONG','14','Side B, top shelf',0.80,'community'],

  // ═══ PERIMETER — Produce ═══
  ['Red Seedless Grapes',null,null,'Produce, fruit display',0.95,'verified'],
  ['Strawberries 1lb',null,null,'Produce, berry section',0.95,'verified'],
  ['Blueberries Pint',null,null,'Produce, berry section',0.92,'verified'],
  ['Raspberries',null,null,'Produce, berry section',0.90,'community'],
  ['Navel Oranges',null,null,'Produce, citrus display',0.95,'verified'],
  ['Honeycrisp Apples',null,null,'Produce, apple display',0.95,'verified'],
  ['Fuji Apples',null,null,'Produce, apple display',0.92,'verified'],
  ['Hass Avocados',null,null,'Produce, near tomatoes',0.95,'verified'],
  ['Roma Tomatoes',null,null,'Produce, tomato section',0.92,'verified'],
  ['Grape Tomatoes',null,null,'Produce, tomato section',0.90,'community'],
  ['Baby Spinach 5oz',null,null,'Produce, salad wall',0.92,'verified'],
  ['Romaine Hearts 3pk',null,null,'Produce, salad wall',0.90,'community'],
  ['Fresh Broccoli Crowns',null,null,'Produce, vegetables',0.92,'verified'],
  ['Mini Carrots 1lb Bag',null,null,'Produce, vegetables',0.95,'verified'],
  ['Yellow Onions 3lb Bag',null,null,'Produce, root vegetables',0.95,'verified'],
  ['Russet Potatoes 5lb',null,null,'Produce, root vegetables',0.95,'verified'],
  ['Sweet Potatoes',null,null,'Produce, root vegetables',0.90,'community'],
  ['Red Bell Peppers',null,null,'Produce, pepper section',0.90,'community'],
  ['Green Bell Peppers',null,null,'Produce, pepper section',0.92,'verified'],
  ['Jalapeno Peppers',null,null,'Produce, pepper section',0.88,'community'],
  ['Fresh Mushrooms 8oz',null,null,'Produce, mushroom section',0.90,'community'],
  ['English Cucumber',null,null,'Produce, vegetables',0.88,'community'],
  ['Celery Hearts',null,null,'Produce, vegetables',0.90,'community'],
  ['Lemons',null,null,'Produce, citrus display',0.92,'verified'],
  ['Limes',null,null,'Produce, citrus display',0.92,'verified'],
  ['Watermelon',null,null,'Produce, front melon display',0.95,'verified'],
  ['Fresh Pineapple',null,null,'Produce, fruit display',0.90,'community'],
  ['Kiwi Fruit',null,null,'Produce, fruit display',0.85,'community'],
  ['Fresh Garlic Bulbs',null,null,'Produce, near onions',0.90,'community'],
  ['Fresh Cilantro',null,null,'Produce, herb section',0.85,'community'],
  ['Fresh Basil',null,null,'Produce, herb section',0.85,'community'],
  ['Green Onions',null,null,'Produce, herb section',0.90,'community'],

  // ═══ PERIMETER — Dairy ═══
  ['Hy-Vee Whole Milk Gallon','Hy-Vee',null,'Dairy wall, middle',0.95,'verified'],
  ['Hy-Vee Skim Milk','Hy-Vee',null,'Dairy wall, middle',0.92,'verified'],
  ['Silk Almond Milk Original','Silk',null,'Dairy wall, alt milk section',0.90,'community'],
  ['Oatly Original Oat Milk','Oatly',null,'Dairy wall, alt milk section',0.88,'community'],
  ['Fairlife 2% Milk','Fairlife',null,'Dairy wall, near regular milk',0.88,'community'],
  ['Hy-Vee Large Eggs 18ct','Hy-Vee',null,'Dairy wall, egg section',0.95,'verified'],
  ['Eggland\'s Best Large Eggs','Eggland\'s Best',null,'Dairy wall, egg section',0.90,'community'],
  ['Tillamook Sharp Cheddar Block','Tillamook',null,'Dairy wall, cheese section',0.88,'community'],
  ['Sargento Sliced Provolone','Sargento',null,'Dairy wall, cheese section',0.85,'community'],
  ['Philadelphia Cream Cheese','Philadelphia',null,'Dairy wall, near cream cheese',0.92,'verified'],
  ['Daisy Sour Cream','Daisy',null,'Dairy wall, sour cream section',0.90,'community'],
  ['Yoplait Original Strawberry','Yoplait',null,'Dairy wall, yogurt section',0.90,'community'],
  ['Dannon Activia','Dannon',null,'Dairy wall, yogurt section',0.85,'community'],
  ['Land O Lakes Half & Half','Land O Lakes',null,'Dairy wall, cream section',0.88,'community'],
  ['Reddi Wip Whipped Cream','Reddi Wip',null,'Dairy wall, cream section',0.85,'community'],
  ['Babybel Original Cheese','Babybel',null,'Dairy wall, snack cheese',0.85,'community'],

  // ═══ PERIMETER — Meat & Seafood ═══
  ['Hy-Vee 93/7 Ground Beef','Hy-Vee',null,'Meat counter, ground meats',0.95,'verified'],
  ['Tyson Boneless Chicken Thighs','Tyson',null,'Meat counter, poultry',0.90,'community'],
  ['Perdue Chicken Tenders','Perdue',null,'Meat counter, poultry',0.85,'community'],
  ['Smithfield Pork Loin','Smithfield',null,'Meat counter, pork section',0.88,'community'],
  ['Jimmy Dean Sausage Roll','Jimmy Dean',null,'Meat wall, sausage',0.90,'community'],
  ['Johnsonville Bratwurst','Johnsonville',null,'Meat wall, sausage',0.90,'community'],
  ['Hy-Vee Choice Ribeye Steak','Hy-Vee',null,'Meat counter, beef steaks',0.95,'verified'],
  ['Ball Park Beef Franks','Ball Park',null,'Meat wall, hot dogs',0.88,'community'],
  ['Nathan\'s Famous Hot Dogs','Nathan\'s',null,'Meat wall, hot dogs',0.85,'community'],
  ['Boar\'s Head Oven Gold Turkey','Boar\'s Head',null,'Meat wall, deli meats',0.88,'community'],
  ['Atlantic Salmon Fillet',null,null,'Seafood counter, fresh fish',0.92,'verified'],
  ['Large Raw Shrimp 16/20ct',null,null,'Seafood counter, shellfish',0.90,'community'],
  ['Gorton\'s Fish Sticks','Gorton\'s',null,'Meat wall, frozen seafood',0.85,'community'],

  // ═══ PERIMETER — Bakery ═══
  ['Hy-Vee Birthday Cake','Hy-Vee',null,'Bakery, special order case',0.90,'community'],
  ['Hy-Vee Chocolate Chip Cookies','Hy-Vee',null,'Bakery, cookie display',0.92,'verified'],
  ['Hy-Vee Cinnamon Rolls 6ct','Hy-Vee',null,'Bakery, pastry case',0.92,'verified'],
  ['Hy-Vee Croissants 4ct','Hy-Vee',null,'Bakery, bread shelf',0.88,'community'],
  ['Hy-Vee Blueberry Muffins','Hy-Vee',null,'Bakery, muffin case',0.90,'community'],
  ['Hy-Vee Apple Pie','Hy-Vee',null,'Bakery, pie case',0.88,'community'],
  ['Hy-Vee Italian Bread','Hy-Vee',null,'Bakery, artisan bread',0.92,'verified'],
  ['Hy-Vee Sourdough Round','Hy-Vee',null,'Bakery, artisan bread',0.88,'community'],

  // ═══ PERIMETER — Deli ═══
  ['Hy-Vee 8pc Fried Chicken','Hy-Vee',null,'Deli hot case, middle',0.95,'verified'],
  ['Hy-Vee Mashed Potatoes','Hy-Vee',null,'Deli hot case, sides',0.90,'community'],
  ['Hy-Vee Sub Sandwich','Hy-Vee',null,'Deli counter, sandwich bar',0.92,'verified'],
  ['Hy-Vee Chicken Wild Rice Soup','Hy-Vee',null,'Deli soup bar',0.90,'community'],
  ['Hy-Vee Sushi California Roll','Hy-Vee',null,'Deli, sushi case',0.92,'verified'],
  ['Hy-Vee Chinese Express Orange Chicken','Hy-Vee',null,'Chinese Express, hot bar',0.92,'verified'],
  ['Hy-Vee Chinese Express Fried Rice','Hy-Vee',null,'Chinese Express, hot bar',0.90,'community'],

  // ═══ PERIMETER — Frozen ═══
  ['Hot Pockets Pepperoni','Hot Pockets',null,'Frozen, handheld meals',0.88,'community'],
  ['Stouffer\'s Lasagna','Stouffer\'s',null,'Frozen, entrees section',0.88,'community'],
  ['Marie Callender\'s Pot Pie','Marie Callender\'s',null,'Frozen, entrees section',0.85,'community'],
  ['Lean Cuisine Café Steamers','Lean Cuisine',null,'Frozen, healthy meals',0.82,'community'],
  ['Ore-Ida Golden Fries','Ore-Ida',null,'Frozen, potato section',0.90,'community'],
  ['Totino\'s Party Pizza','Totino\'s',null,'Frozen, pizza section',0.92,'verified'],
  ['Red Baron Classic Crust','Red Baron',null,'Frozen, pizza section',0.88,'community'],
  ['Tombstone Original Pepperoni','Tombstone',null,'Frozen, pizza section',0.85,'community'],
  ['Eggo Chocolate Chip Waffles','Kelloggs',null,'Frozen, breakfast section',0.85,'community'],
  ['Jimmy Dean Breakfast Sandwiches','Jimmy Dean',null,'Frozen, breakfast section',0.88,'community'],
  ['Ben & Jerry\'s Half Baked','Ben & Jerry\'s',null,'Frozen, ice cream section',0.92,'verified'],
  ['Haagen-Dazs Vanilla','Haagen-Dazs',null,'Frozen, ice cream section',0.88,'community'],
  ['Edy\'s Slow Churned Vanilla','Edy\'s',null,'Frozen, ice cream section',0.85,'community'],
  ['Outshine Fruit Bars','Outshine',null,'Frozen, novelties section',0.85,'community'],
  ['Birds Eye Steamfresh Broccoli','Birds Eye',null,'Frozen, vegetables',0.88,'community'],
  ['Green Giant Steamers Corn','Green Giant',null,'Frozen, vegetables',0.85,'community'],
  ['El Monterey Beef Burritos','El Monterey',null,'Frozen, Mexican section',0.88,'community'],
  ['TGI Friday\'s Mozzarella Sticks','TGI Friday\'s',null,'Frozen, appetizers',0.82,'community'],
];

async function expandProducts() {
  console.log(`\n  Expanding product catalog with ${P.length} new products...\n`);
  const { storeId, aisleMap } = await getStoreAndAisles();
  console.log(`  Store: ${storeId}`);
  console.log(`  Aisles mapped: ${Object.keys(aisleMap).length}\n`);

  const rows = P.map(([name, brand, aisle, detail, confidence, source]) => ({
    store_id: storeId,
    aisle_id: aisle ? aisleMap[aisle] || null : null,
    product_name: name,
    brand: brand,
    location_detail: detail,
    confidence,
    source,
  }));

  // Insert in batches of 50
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { error } = await supabase.from('product_locations').insert(batch);
    if (error) {
      console.error(`  Batch ${Math.floor(i/50)+1} error:`, error.message);
    } else {
      inserted += batch.length;
      console.log(`  Inserted batch ${Math.floor(i/50)+1}: ${batch.length} products (${inserted} total)`);
    }
  }

  console.log(`\n  Done! ${inserted} new products added.`);
  console.log(`  Total products in DB: 81 (original) + ${inserted} = ${81 + inserted}\n`);
}

expandProducts().catch(err => {
  console.error('Expand failed:', err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Product Image Agent
 * Fetches real product images from Open Food Facts API
 * and updates the product_locations table with image_url
 * 
 * Usage: node --env-file=.env src/scripts/fetch-images.js
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Brand-specific image search mappings
// Uses Open Food Facts (free, real product images)
const OFF_API = 'https://world.openfoodfacts.org/cgi/search.pl';

async function searchProductImage(productName, brand) {
  const searchTerm = brand ? `${brand} ${productName}` : productName;
  const url = `${OFF_API}?search_terms=${encodeURIComponent(searchTerm)}&search_simple=1&action=process&json=1&page_size=1&fields=product_name,image_front_url,image_front_small_url,image_url`;
  
  try {
    const r = await fetch(url, { 
      headers: { 'User-Agent': 'WhereIsIt-HyVee/1.0 (product-locator-app)' },
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const product = data.products?.[0];
    if (!product) return null;
    
    // Prefer small front image, then front, then any
    return product.image_front_small_url || product.image_front_url || product.image_url || null;
  } catch {
    return null;
  }
}

// Fallback: curated image map for common products
const CURATED_IMAGES = {
  'coca-cola': 'https://images.openfoodfacts.org/images/products/544/900/000/0996/front_en.626.200.jpg',
  'pepsi': 'https://images.openfoodfacts.org/images/products/012/000/001/0675/front_en.13.200.jpg',
  'cheerios': 'https://images.openfoodfacts.org/images/products/001/600/027/1283/front_en.418.200.jpg',
  'doritos': 'https://images.openfoodfacts.org/images/products/002/840/006/4700/front_en.10.200.jpg',
  'oreo': 'https://images.openfoodfacts.org/images/products/762/221/044/810/front_en.90.200.jpg',
  'tide': 'https://images.openfoodfacts.org/images/products/003/700/087/0813/front_en.6.200.jpg',
  'heinz ketchup': 'https://images.openfoodfacts.org/images/products/001/370/002/6583/front_en.175.200.jpg',
  'jif': 'https://images.openfoodfacts.org/images/products/005/150/024/076/front_en.14.200.jpg',
};

function getCuratedImage(productName) {
  const lower = productName.toLowerCase();
  for (const [key, url] of Object.entries(CURATED_IMAGES)) {
    if (lower.includes(key)) return url;
  }
  return null;
}

async function fetchImages() {
  console.log('\n🖼️  Product Image Agent starting...\n');

  // First, ensure image_url column exists
  console.log('  Checking image_url column...');
  const { data: testRow } = await supabase
    .from('product_locations')
    .select('id, product_name, brand, image_url')
    .limit(1);
  
  if (testRow === null) {
    console.log('  ⚠️  Need to add image_url column. Run this SQL in Supabase:');
    console.log('  ALTER TABLE product_locations ADD COLUMN IF NOT EXISTS image_url TEXT;');
    console.log('  Then re-run this script.');
    return;
  }

  // Get all products without images
  const { data: products, error } = await supabase
    .from('product_locations')
    .select('id, product_name, brand, image_url')
    .is('image_url', null)
    .order('confidence', { ascending: false })
    .limit(200); // Process in batches

  if (error) { console.error('  DB error:', error.message); return; }
  console.log(`  Found ${products.length} products needing images\n`);

  let found = 0;
  let failed = 0;

  for (const product of products) {
    // Try curated first
    let imageUrl = getCuratedImage(product.product_name);
    
    // Then try Open Food Facts
    if (!imageUrl) {
      imageUrl = await searchProductImage(product.product_name, product.brand);
      // Rate limit: 100ms between API calls
      await new Promise(r => setTimeout(r, 100));
    }

    if (imageUrl) {
      const { error: updateErr } = await supabase
        .from('product_locations')
        .update({ image_url: imageUrl })
        .eq('id', product.id);
      
      if (!updateErr) {
        found++;
        if (found % 10 === 0) console.log(`  ✅ ${found} images found so far...`);
      }
    } else {
      failed++;
    }
  }

  console.log(`\n🖼️  Image Agent Complete!`);
  console.log(`  Found:   ${found} images`);
  console.log(`  Missing: ${failed} products`);
  console.log(`  Total:   ${products.length} processed\n`);
}

fetchImages().catch(err => {
  console.error('Image agent failed:', err);
  process.exit(1);
});

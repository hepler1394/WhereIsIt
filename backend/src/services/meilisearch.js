import { MeiliSearch } from 'meilisearch';

const meiliUrl = process.env.MEILISEARCH_URL || 'http://localhost:7700';
const meiliKey = process.env.MEILISEARCH_API_KEY;

export const meili = new MeiliSearch({
  host: meiliUrl,
  apiKey: meiliKey,
});

// Index names
export const INDEXES = {
  PRODUCTS: 'products',
  STORES: 'stores',
  CATEGORIES: 'categories',
  DEALS: 'deals',
};

/**
 * Initialize Meilisearch indexes with proper settings.
 * Call once on startup or during seeding.
 */
export async function initializeIndexes() {
  try {
    // Products index — primary search target
    const products = await meili.getOrCreateIndex(INDEXES.PRODUCTS);
    await meili.index(INDEXES.PRODUCTS).updateSettings({
      searchableAttributes: ['product_name', 'brand', 'category', 'synonyms'],
      filterableAttributes: ['store_id', 'chain_id', 'department', 'aisle_number', 'is_temporary'],
      sortableAttributes: ['confidence', 'verified_count', 'created_at'],
      typoTolerance: { enabled: true, minWordSizeForTypos: { oneTypo: 3, twoTypos: 5 } },
      synonyms: {
        'pop': ['soda', 'soft drink', 'cola'],
        'soda': ['pop', 'soft drink', 'cola'],
        'tp': ['toilet paper', 'bath tissue'],
        'chips': ['crisps'],
        'taco': ['mexican', 'tex-mex'],
      },
    });

    // Stores index
    await meili.getOrCreateIndex(INDEXES.STORES);
    await meili.index(INDEXES.STORES).updateSettings({
      searchableAttributes: ['name', 'address', 'city', 'chain_name'],
      filterableAttributes: ['chain_id', 'state', 'zip'],
      sortableAttributes: ['name'],
    });

    // Categories index — for semantic matching
    await meili.getOrCreateIndex(INDEXES.CATEGORIES);
    await meili.index(INDEXES.CATEGORIES).updateSettings({
      searchableAttributes: ['name', 'synonyms', 'common_products'],
      filterableAttributes: ['parent_id'],
    });

    // Deals index
    await meili.getOrCreateIndex(INDEXES.DEALS);
    await meili.index(INDEXES.DEALS).updateSettings({
      searchableAttributes: ['product_name', 'description'],
      filterableAttributes: ['chain_id', 'store_id', 'is_active', 'start_date', 'end_date'],
      sortableAttributes: ['start_date', 'discount_percentage'],
    });

    console.log('✅ Meilisearch indexes initialized');
  } catch (err) {
    console.warn('⚠️  Meilisearch initialization failed:', err.message);
  }
}

/**
 * Search products with typo tolerance and filtering.
 */
export async function searchProducts(query, filters = {}) {
  const filterParts = [];
  if (filters.store_id) filterParts.push(`store_id = "${filters.store_id}"`);
  if (filters.chain_id) filterParts.push(`chain_id = "${filters.chain_id}"`);
  if (filters.department) filterParts.push(`department = "${filters.department}"`);

  return meili.index(INDEXES.PRODUCTS).search(query, {
    limit: 20,
    filter: filterParts.length > 0 ? filterParts.join(' AND ') : undefined,
    sort: ['confidence:desc', 'verified_count:desc'],
    showMatchesPosition: true,
  });
}

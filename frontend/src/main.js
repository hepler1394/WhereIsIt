import './style.css';

/* ═══════════════════════════════════════════
   WhereIsIt @ Hy-Vee — App Logic
   100% Hy-Vee Website Design
   ═══════════════════════════════════════════ */

const API = 'https://whereisit-api-production.up.railway.app/api/v1';

// ── State ──
const state = {
  store: JSON.parse(localStorage.getItem('wii_store') || 'null'),
  recent: JSON.parse(localStorage.getItem('wii_recent') || '[]'),
};

// ── Hy-Vee Stores (fetched from API, with local fallback) ──
let STORES = [
  { id: 'local-rice', name: 'Hy-Vee (Rice Road)',
    addr: "301 NE Rice Rd, Lee's Summit, MO 64086",
    phone: '(816) 524-4237', hours: '6am – 11pm Daily',
    departments: ['Bakery','Deli','Pharmacy','Floral','Wine & Spirits'], dist: 0 },
  { id: 'local-ward', name: 'Hy-Vee (Ward Road)',
    addr: "310 SW Ward Rd, Lee's Summit, MO 64081",
    phone: '(816) 524-8700', hours: '6am – 11pm Daily',
    departments: ['Bakery','Deli','Pharmacy','Floral','Wine & Spirits'], dist: 4.2 },
];

// ── Departments ──
const DEPARTMENTS = [
  { name: 'Produce', sub: 'Fruits & Vegetables', emoji: '🥬' },
  { name: 'Meat & Seafood', sub: 'Butcher & Fish Counter', emoji: '🥩' },
  { name: 'Dairy', sub: 'Milk, Cheese & Eggs', emoji: '🧀' },
  { name: 'Bakery', sub: 'Fresh Baked Daily', emoji: '🍞' },
  { name: 'Deli', sub: 'Prepared Foods & Subs', emoji: '🥪' },
  { name: 'Grocery', sub: 'Dry Goods & Canned', emoji: '🛒' },
  { name: 'Frozen', sub: 'Frozen Meals & Treats', emoji: '🧊' },
  { name: 'General Merchandise', sub: 'Health, Beauty & Home', emoji: '🏠' },
];

// ── Hy-Vee Aisle Layout (Rice Road) ──
const AISLES = [
  { n:'1', a:['Bread','Buns','Tortillas','Wraps','English Muffins','Bagels'],
           b:['Peanut Butter','Jelly','Jam','Honey','Nutella'] },
  { n:'2', a:['Cereal','Oatmeal','Granola','Granola Bars'],
           b:['Pancake Mix','Syrup','Pop-Tarts','Breakfast Bars'] },
  { n:'3', a:['Spices','Seasonings','Extracts','Salt','Pepper'],
           b:['Flour','Sugar','Cake Mix','Frosting','Baking Powder','Chocolate Chips'] },
  { n:'4', a:['Pasta','Spaghetti','Pasta Sauce','Marinara','Alfredo'],
           b:['Rice','Beans','Quinoa','Couscous','Lentils'] },
  { n:'5', a:['Canned Vegetables','Canned Fruit','Tomatoes','Tomato Paste'],
           b:['Soup','Broth','Chili','Ramen'] },
  { n:'6', a:['Chips','Crackers','Pretzels','Popcorn'],
           b:['Cookies','Snack Cakes','Candy Bars','Trail Mix','Nuts'] },
  { n:'7', a:['Taco Shells','Salsa','Tortilla Chips','Refried Beans'],
           b:['Soy Sauce','Teriyaki','Coconut Milk','Curry Paste','Sriracha'] },
  { n:'8', a:['Ketchup','Mustard','Mayo','BBQ Sauce','Hot Sauce','Pickles'],
           b:['Salad Dressing','Vinegar','Olive Oil','Cooking Spray'] },
  { n:'9', a:['Soda','Sparkling Water','Ginger Ale'],
           b:['Juice','Sports Drinks','Energy Drinks','Coconut Water'] },
  { n:'10',a:['Coffee','K-Cups','Ground Coffee','Cold Brew'],
           b:['Tea','Hot Cocoa','Drink Mixes','Lemonade'] },
  { n:'11',a:['Laundry Detergent','Fabric Softener','Dryer Sheets','Bleach'],
           b:['Dish Soap','Dishwasher Detergent','Sponges','Cleaning Spray'] },
  { n:'12',a:['Paper Towels','Toilet Paper','Tissues','Napkins'],
           b:['Trash Bags','Ziploc Bags','Aluminum Foil','Plastic Wrap'] },
  { n:'13',a:['Shampoo','Conditioner','Body Wash','Hair Care'],
           b:['Soap','Lotion','Deodorant','Razors','Sunscreen','Toothpaste'] },
  { n:'14',a:['Baby Food','Formula','Diapers','Baby Wipes'],
           b:['Dog Food','Cat Food','Cat Litter','Pet Treats'] },
];

const PERIMETER = {
  produce: ['Apples','Bananas','Oranges','Grapes','Strawberries','Blueberries','Avocado',
            'Lettuce','Spinach','Broccoli','Carrots','Onions','Potatoes','Peppers','Mushrooms',
            'Cucumbers','Celery','Corn','Lemons','Limes','Watermelon','Tomatoes'],
  dairy:   ['Milk','Butter','Eggs','Cheese','Cream Cheese','Sour Cream','Yogurt',
            'Shredded Cheese','Almond Milk','Oat Milk','Heavy Cream'],
  meat:    ['Ground Beef','Chicken Breast','Pork Chops','Bacon','Sausage','Steak',
            'Turkey','Hot Dogs','Deli Meat','Salmon','Shrimp'],
  bakery:  ['Donuts','Cupcakes','Muffins','Croissants','Cinnamon Rolls','Pies','Cakes'],
  deli:    ['Rotisserie Chicken','Fried Chicken','Sandwiches','Potato Salad','Sushi','Soup'],
  frozen:  ['Frozen Pizza','Ice Cream','Frozen Vegetables','Frozen Meals','Frozen Fries',
            'Frozen Waffles','Popsicles','Frozen Burritos'],
};

// ══════════════════════════════
// INIT
// ══════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  buildDepartments();
  buildSubnavPills();
  buildRecent();
  setupAutocomplete();
  setupBackToTop();
  setupImageObserver();

  const input = document.getElementById('search-input');
  input.addEventListener('input', () => {
    document.getElementById('search-clear').classList.toggle('hidden', !input.value);
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { hideAutocomplete(); doSearch(input.value); }
  });

  if (state.store) applyStore(state.store);
  else applyStore(STORES[0]);

  // Fetch real stores from API (non-blocking)
  fetchStores();

  // Load product carousels with skeleton placeholders first
  showCarouselSkeletons();
  setTimeout(loadCarousels, 800);
});

async function fetchStores() {
  try {
    const r = await fetch(`${API}/stores`);
    if (!r.ok) return;
    const d = await r.json();
    const apiStores = (d.data || []).map((s, i) => ({
      id: s.id, name: s.name,
      addr: `${s.address}, ${s.city}, ${s.state} ${s.zip}`,
      phone: s.phone || '', hours: '6am – 11pm Daily',
      departments: s.departments?.map(d => d.name) || [],
      dist: i === 0 ? 0 : 4.2,
    }));
    if (apiStores.length) {
      STORES = apiStores;
      buildStoreList(STORES);
      if (state.store?.id?.startsWith('local-')) {
        applyStore(STORES[0]);
      }
    }
  } catch (e) { console.warn('Store fetch failed', e); }
}

// ══════════════════════════════
// DEPARTMENTS — Hy-Vee circular icons
// ══════════════════════════════
// Map department names to aisle ranges for browsing
const DEPT_AISLE_MAP = {
  'Produce': null,
  'Meat & Seafood': null,
  'Dairy': null,
  'Bakery': null,
  'Deli': null,
  'Grocery': ['1','2','3','4','5','6','7','8','9','10'],
  'Frozen': null,
  'General Merchandise': ['11','12','13','14'],
};

function buildDepartments() {
  document.getElementById('dept-grid').innerHTML = DEPARTMENTS.map(d => `
    <button class="hv-dept-card" onclick="browseDepartment('${d.name}')">
      <div class="hv-dept-icon">${d.emoji}</div>
      <div class="hv-dept-name">${d.name}</div>
      <div class="hv-dept-sub">${d.sub}</div>
    </button>`).join('');
}

// Browse products in a department
window.browseDepartment = async (deptName) => {
  document.getElementById('browse-view').classList.add('hidden');
  document.getElementById('search-view').classList.remove('hidden');

  const grid = document.getElementById('search-results');
  const header = document.getElementById('results-header');
  grid.innerHTML = '<div class="hv-loading"><div class="hv-spinner"></div><div class="hv-loading-text">Loading ' + deptName + '...</div></div>';

  header.innerHTML = `
    <div>
      <span class="hv-results-count">${deptName}</span>
      <span class="hv-results-store"> · ${state.store?.name || 'Hy-Vee'}</span>
    </div>
    <button class="hv-results-back" onclick="clearSearch()">← Back</button>`;

  let products = [];
  const hasRealStore = state.store?.id && !state.store.id.startsWith('local-');

  if (hasRealStore) {
    try {
      // Try fetching by department name from the API
      const aisles = DEPT_AISLE_MAP[deptName];
      let url = `${API}/stores/${state.store.id}/products?perPage=60`;
      if (aisles?.length) {
        // Fetch products from specific aisles
        for (const a of aisles) {
          const r = await fetch(`${API}/stores/${state.store.id}/products?aisle=${a}&perPage=30`);
          if (r.ok) {
            const d = await r.json();
            products.push(...(d.data || []));
          }
        }
      } else {
        // Fetch by department name match
        const r = await fetch(`${url}&department=${encodeURIComponent(deptName)}`);
        if (r.ok) {
          const d = await r.json();
          products = d.data || [];
        }
      }
    } catch (e) { console.warn('Dept fetch failed', e); }
  }

  // Fallback: use local search
  if (!products.length) {
    const results = localSearch(deptName);
    renderResults(results, deptName);
    return;
  }

  // Render products as cards
  header.querySelector('.hv-results-count').textContent = `${deptName} — ${products.length} items`;
  renderProductCards(products);
};

// Render fetched products as Hy-Vee cards
function renderProductCards(products) {
  const grid = document.getElementById('search-results');
  grid.innerHTML = products.map((p, i) => {
    const pct = Math.round((p.confidence || 0.7) * 100);
    const confClass = pct >= 75 ? 'high' : pct >= 50 ? 'med' : 'low';
    const aisleNum = p.aisles?.aisle_number || p.aisle_number;
    const locationLabel = aisleNum ? `Aisle ${aisleNum}` : (p.department || 'Store');
    const badgeClass = aisleNum ? 'hv-badge-aisle' : 'hv-badge-dept';

    return `
      <div class="hv-product-card" style="animation-delay:${Math.min(i, 12) * 0.03}s">
        <div class="hv-product-img-wrap">
          <span class="hv-badge ${badgeClass}">${locationLabel}</span>
          ${p.image_url
            ? `<img class="hv-product-img" src="${p.image_url}" alt="${p.product_name}" loading="lazy" onerror="this.outerHTML='<div class=\\'hv-product-img-placeholder\\'>🛒</div>'">`
            : '<div class="hv-product-img-placeholder">🛒</div>'
          }
        </div>
        <div class="hv-product-body">
          <div class="hv-product-aisle">${locationLabel}</div>
          <div class="hv-product-name">${p.product_name}</div>
          ${p.brand ? `<div class="hv-product-brand">${p.brand}</div>` : ''}
          <div class="hv-product-detail">${p.location_detail || ''}</div>
          <div class="hv-conf-row">
            <div class="hv-conf-bar"><div class="hv-conf-fill ${confClass}" style="width:${pct}%"></div></div>
            <span class="hv-conf-text">${pct}%</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ══════════════════════════════
// SUBNAV PILLS
// ══════════════════════════════
function buildSubnavPills() {
  const pills = ['All','Produce','Dairy','Meat & Seafood','Bakery','Deli','Grocery','Frozen','General Merchandise'];
  document.getElementById('subnav-pills').innerHTML = pills.map((p, i) =>
    `<button class="hv-pill ${i === 0 ? 'active' : ''}" onclick="filterDept('${p}')">${p}</button>`
  ).join('');
}

window.filterDept = dept => {
  document.querySelectorAll('.hv-pill').forEach(p => p.classList.remove('active'));
  event.target.classList.add('active');
  if (dept === 'All') { clearSearch(); return; }
  browseDepartment(dept);
};

// ══════════════════════════════
// STORE PICKER
// ══════════════════════════════
window.showStorePicker = () => {
  document.getElementById('store-picker').classList.remove('hidden');
  buildStoreList(STORES);
};
window.hideStorePicker = () => {
  document.getElementById('store-picker').classList.add('hidden');
};

function buildStoreList(stores) {
  document.getElementById('store-list').innerHTML = stores.map(s => `
    <div class="hv-store-opt ${state.store?.id === s.id ? 'selected' : ''}"
         onclick='pickStore(${JSON.stringify(s).replace(/'/g,"&#39;")})'>
      <div class="hv-store-opt-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#CC0000" stroke="none">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3" fill="white"/>
        </svg>
      </div>
      <div class="hv-store-opt-info">
        <div class="hv-store-opt-name">${s.name}</div>
        <div class="hv-store-opt-addr">${s.addr}</div>
        <div class="hv-store-opt-details">${s.hours} · ${s.phone}</div>
      </div>
      <div class="hv-store-opt-dist">${s.dist > 0 ? s.dist + ' mi' : 'Your store'}</div>
    </div>`).join('');
}

window.pickStore = s => { applyStore(s); hideStorePicker(); };

function applyStore(s) {
  state.store = s;
  localStorage.setItem('wii_store', JSON.stringify(s));
  document.getElementById('store-name').textContent = s.name;
  document.getElementById('store-info-name').textContent = s.name;
  document.getElementById('store-address').textContent = s.addr;
}

// ══════════════════════════════
// RECENT SEARCHES
// ══════════════════════════════
function buildRecent() {
  const sec = document.getElementById('recent-section');
  const list = document.getElementById('recent-list');
  if (!state.recent.length) { sec.classList.add('hidden'); return; }
  sec.classList.remove('hidden');
  list.innerHTML = state.recent.slice(0, 8).map(q => `
    <button class="hv-recent-item" onclick="doSearch('${q.replace(/'/g,"\\'")}')">
      <svg class="hv-recent-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      <span>${q}</span>
    </button>`).join('');
}

window.clearRecent = () => {
  state.recent = [];
  localStorage.setItem('wii_recent', '[]');
  buildRecent();
};

function addRecent(q) {
  state.recent = [q, ...state.recent.filter(s => s.toLowerCase() !== q.toLowerCase())].slice(0, 20);
  localStorage.setItem('wii_recent', JSON.stringify(state.recent));
  buildRecent();
}

// ══════════════════════════════
// SEARCH
// ══════════════════════════════
window.clearSearch = () => {
  document.getElementById('search-input').value = '';
  document.getElementById('search-clear').classList.add('hidden');
  document.getElementById('search-view').classList.add('hidden');
  document.getElementById('browse-view').classList.remove('hidden');
};

window.doSearch = async query => {
  if (!query?.trim()) return;
  query = query.trim();
  document.getElementById('search-input').value = query;
  document.getElementById('search-clear').classList.remove('hidden');
  addRecent(query);

  // Show search view, hide browse
  document.getElementById('browse-view').classList.add('hidden');
  document.getElementById('search-view').classList.remove('hidden');

  const grid = document.getElementById('search-results');
  const header = document.getElementById('results-header');
  grid.innerHTML = '<div class="hv-loading"><div class="hv-spinner"></div><div class="hv-loading-text">Searching Hy-Vee...</div></div>';
  header.innerHTML = '';

  // Show search loading spinner
  const searchSpinner = document.getElementById('search-loading');
  searchSpinner?.classList.remove('hidden');

  let results = [];

  // Try live API
  const hasRealStore = state.store?.id && !state.store.id.startsWith('local-');
  if (hasRealStore) {
    try {
      const r = await fetch(`${API}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, store_id: state.store.id }),
      });
      if (r.ok) {
        const d = await r.json();
        results = (d.data?.results || d.results || []).map(hit => ({
          ...hit,
          aisle: hit.aisle,
          section: hit.locationDetail || hit.location_detail || hit.department || hit.productName,
          source: hit.source === 'database' ? 'hyvee_db' : (hit.source || 'api'),
          imageUrl: hit.imageUrl || hit.image_url || null,
          brand: hit.brand || null,
        }));
      }
    } catch (e) {
      console.warn('API search failed', e);
      showToast('Search taking longer than usual...', 'info');
    }
  }

  // Always combine with local search for better coverage
  const localResults = localSearch(query);
  // Add local results that aren't already in API results (dedup by aisle)
  const apiAisles = new Set(results.map(r => r.aisle));
  for (const lr of localResults) {
    if (!apiAisles.has(lr.aisle)) results.push(lr);
  }

  // Sort all results by confidence
  results.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

  // Hide search loading spinner
  searchSpinner?.classList.add('hidden');

  renderResults(results, query);
};

// ══════════════════════════════
// LOCAL SEARCH
// ══════════════════════════════
function localSearch(query) {
  const q = query.toLowerCase();
  const hits = [];

  for (const aisle of AISLES) {
    const all = [...aisle.a, ...aisle.b];
    let best = null, bestConf = 0;
    for (const cat of all) {
      const catL = cat.toLowerCase();
      let conf = 0;
      if (catL === q) conf = 0.92;
      else if (catL.includes(q) && q.length >= 3) conf = 0.80;
      else if (q.includes(catL) && catL.length >= 3) conf = 0.78;
      if (conf > bestConf) { bestConf = conf; best = { cat, side: aisle.a.includes(cat) ? 'A' : 'B', conf }; }
    }
    if (best) {
      hits.push({
        confidence: best.conf, source: 'local_hyvee',
        productName: query, aisle: aisle.n, section: best.cat,
        location: `Aisle ${aisle.n}, Side ${best.side}`,
        reasoning: `${best.cat} — Side ${best.side}`,
      });
    }
  }

  const deptBest = {};
  for (const [dept, items] of Object.entries(PERIMETER)) {
    for (const item of items) {
      const itemL = item.toLowerCase();
      let conf = 0;
      if (itemL === q) conf = 0.95;
      else if (itemL.includes(q) && q.length >= 3) conf = 0.85;
      else if (q.includes(itemL) && itemL.length >= 3) conf = 0.80;
      if (conf > (deptBest[dept]?.conf || 0)) deptBest[dept] = { item, conf };
    }
  }
  for (const [dept, match] of Object.entries(deptBest)) {
    const deptName = dept.charAt(0).toUpperCase() + dept.slice(1);
    hits.push({
      confidence: match.conf, source: 'local_hyvee',
      productName: query, department: deptName, section: match.item,
      location: `${deptName} Department`,
      reasoning: `${match.item} — ${deptName} section`,
    });
  }

  return hits.sort((a, b) => b.confidence - a.confidence).slice(0, 8);
}

// ══════════════════════════════
// AUTOCOMPLETE — live suggestions
// ══════════════════════════════
let acTimer = null;
function setupAutocomplete() {
  const input = document.getElementById('search-input');
  // Create dropdown
  const dd = document.createElement('div');
  dd.id = 'ac-dropdown';
  dd.className = 'hv-ac-dropdown hidden';
  input.parentElement.style.position = 'relative';
  input.parentElement.appendChild(dd);

  input.addEventListener('input', () => {
    clearTimeout(acTimer);
    const q = input.value.trim();
    if (q.length < 2) { hideAutocomplete(); return; }
    acTimer = setTimeout(() => fetchSuggestions(q), 300);
  });

  // Close on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('.hv-search-box')) hideAutocomplete();
  });
}

async function fetchSuggestions(q) {
  const dd = document.getElementById('ac-dropdown');
  try {
    const r = await fetch(`${API}/search/suggest?q=${encodeURIComponent(q)}`);
    if (!r.ok) return;
    const d = await r.json();
    const suggestions = d.data?.suggestions || [];
    if (!suggestions.length) { hideAutocomplete(); return; }

    dd.innerHTML = suggestions.map(s => `
      <button class="hv-ac-item" onclick="pickSuggestion('${s.text.replace(/'/g, '')}')">
        <span class="hv-ac-icon">${s.type === 'category' ? '📁' : '🔍'}</span>
        <span class="hv-ac-text">${s.text}</span>
        <span class="hv-ac-type">${s.type}</span>
      </button>
    `).join('');
    dd.classList.remove('hidden');
  } catch { hideAutocomplete(); }
}

function hideAutocomplete() {
  document.getElementById('ac-dropdown')?.classList.add('hidden');
}

window.pickSuggestion = (text) => {
  document.getElementById('search-input').value = text;
  hideAutocomplete();
  doSearch(text);
};

// ══════════════════════════════
// RENDER RESULTS — Hy-Vee Product Cards
// ══════════════════════════════
function renderResults(results, query) {
  const grid = document.getElementById('search-results');
  const header = document.getElementById('results-header');

  if (!results.length) {
    header.innerHTML = '';
    grid.innerHTML = `
      <div class="hv-empty">
        <div class="hv-empty-icon">🔍</div>
        <h3>No results for "${query}"</h3>
        <p>Try a different search term, check your spelling, or browse by department.</p>
        <button class="hv-empty-btn" onclick="clearSearch()">Browse Departments</button>
      </div>`;
    return;
  }

  header.innerHTML = `
    <div>
      <span class="hv-results-count">${results.length} result${results.length > 1 ? 's' : ''} for "${query}"</span>
      <span class="hv-results-store"> · ${state.store?.name || 'Hy-Vee'}</span>
    </div>
    <button class="hv-results-back" onclick="clearSearch()">← Back</button>`;

  grid.innerHTML = results.map((r, i) => {
    const pct = Math.round((r.confidence || 0.7) * 100);
    const confClass = pct >= 75 ? 'high' : pct >= 50 ? 'med' : 'low';
    const isPerimeter = !r.aisle;
    const locationLabel = isPerimeter ? (r.department || 'Perimeter') : `Aisle ${r.aisle}`;
    const badgeClass = isPerimeter ? 'hv-badge-dept' : 'hv-badge-aisle';
    const isFromDB = r.source === 'hyvee_db' || r.source === 'database';
    const placeholderEmoji = isPerimeter ? '🏪' : '🛒';

    return `
      <div class="hv-product-card" style="animation-delay:${i * 0.04}s">
        <div class="hv-product-img-wrap">
          <span class="hv-badge ${badgeClass}">${locationLabel}</span>
          ${isFromDB ? '<span class="hv-badge hv-badge-verified">✓ Verified</span>' : ''}
          ${r.imageUrl
            ? `<img class="hv-product-img" src="${r.imageUrl}" alt="${r.productName || ''}" loading="lazy" onerror="this.outerHTML='<div class=\\'hv-product-img-placeholder\\'>${placeholderEmoji}</div>'">`
            : `<div class="hv-product-img-placeholder">${placeholderEmoji}</div>`
          }
        </div>
        <div class="hv-product-body">
          <div class="hv-product-aisle">${locationLabel}</div>
          <div class="hv-product-name">${r.productName || r.section || ''}</div>
          ${r.brand ? `<div class="hv-product-brand">${r.brand}</div>` : ''}
          <div class="hv-product-detail">${r.reasoning || r.section || ''}</div>
          <div class="hv-conf-row">
            <div class="hv-conf-bar"><div class="hv-conf-fill ${confClass}" style="width:${pct}%"></div></div>
            <span class="hv-conf-text">${pct}%</span>
          </div>
          <div class="hv-product-action">
            <button class="hv-btn-correct">✓ Correct</button>
            <button class="hv-btn-wrong">✕ Wrong</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ══════════════════════════════
// HORIZONTAL SCROLL CAROUSELS — Hy-Vee style
// ══════════════════════════════
const CAROUSEL_CONFIG = [
  { id: 'carousel-snacks', title: 'Snacks & Chips', aisle: '6', emoji: '🍿' },
  { id: 'carousel-dairy', title: 'Dairy & Eggs', dept: 'Dairy', emoji: '🧀' },
  { id: 'carousel-frozen', title: 'Frozen Favorites', dept: 'Frozen', emoji: '🧊' },
  { id: 'carousel-beverages', title: 'Beverages', aisle: '9', emoji: '🥤' },
  { id: 'carousel-bakery', title: 'Bakery & Bread', aisle: '1', emoji: '🍞' },
  { id: 'carousel-cereal', title: 'Cereal & Breakfast', aisle: '2', emoji: '🥣' },
];

async function loadCarousels() {
  const hasRealStore = state.store?.id && !state.store.id.startsWith('local-');
  if (!hasRealStore) return;

  for (const cfg of CAROUSEL_CONFIG) {
    try {
      let url;
      if (cfg.aisle) {
        url = `${API}/stores/${state.store.id}/products?aisle=${cfg.aisle}&perPage=20`;
      } else if (cfg.dept) {
        url = `${API}/stores/${state.store.id}/products?department=${encodeURIComponent(cfg.dept)}&perPage=20`;
      }
      const r = await fetch(url);
      if (!r.ok) continue;
      const d = await r.json();
      const products = d.data || [];
      if (!products.length) continue;
      renderCarousel(cfg, products);
    } catch (e) { console.warn('Carousel load failed:', cfg.id, e); }
  }
}

function renderCarousel(cfg, products) {
  const section = document.getElementById(cfg.id);
  if (!section) return;

  const deptName = cfg.dept || cfg.title;

  section.innerHTML = `
    <div class="hv-carousel-header">
      <h2>${cfg.emoji} ${cfg.title}</h2>
      <span class="hv-see-all" onclick="browseDepartment('${deptName}')">See All →</span>
    </div>
    <div class="hv-carousel-wrap">
      <button class="hv-carousel-arrow left" onclick="scrollCarousel('${cfg.id}', -1)">‹</button>
      <div class="hv-carousel-row" id="${cfg.id}-row">
        ${products.map(p => {
          const aisleNum = p.aisles?.aisle_number || p.aisle_number;
          const loc = aisleNum ? `Aisle ${aisleNum}` : (p.location_detail?.split(',')[0] || 'Store');
          return `
            <div class="hv-carousel-card" onclick="doSearch('${(p.product_name || '').replace(/'/g, '')}')">
              ${p.image_url
                ? `<img class="hv-carousel-card-img" src="${p.image_url}" alt="${p.product_name}" loading="lazy" onerror="this.outerHTML='<div class=\\'hv-carousel-card-img-placeholder\\'>🛒</div>'">`
                : '<div class="hv-carousel-card-img-placeholder">🛒</div>'
              }
              <div class="hv-carousel-card-body">
                <div class="hv-carousel-card-aisle">${loc}</div>
                <div class="hv-carousel-card-name">${p.product_name}</div>
                ${p.brand ? `<div class="hv-carousel-card-brand">${p.brand}</div>` : ''}
                <button class="hv-carousel-card-btn">Find in Store</button>
              </div>
            </div>`;
        }).join('')}
      </div>
      <button class="hv-carousel-arrow right" onclick="scrollCarousel('${cfg.id}', 1)">›</button>
    </div>`;
}

window.scrollCarousel = (id, dir) => {
  const row = document.getElementById(`${id}-row`);
  if (row) row.scrollBy({ left: dir * 400, behavior: 'smooth' });
};

// ══════════════════════════════
// TOAST NOTIFICATION SYSTEM
// ══════════════════════════════
window.showToast = (message, type = 'info', duration = 3000) => {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `hv-toast ${type}`;
  toast.innerHTML = `<span class="hv-toast-icon">${icons[type] || 'ℹ'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hv-toast-exit');
    setTimeout(() => toast.remove(), 300);
  }, duration);
};

// ══════════════════════════════
// BACK TO TOP BUTTON
// ══════════════════════════════
function setupBackToTop() {
  const btn = document.getElementById('back-top');
  if (!btn) return;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        btn.classList.toggle('visible', window.scrollY > 400);
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

// ══════════════════════════════
// IMAGE LAZY-LOAD OBSERVER
// ══════════════════════════════
function setupImageObserver() {
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.classList.add('loaded');
        io.unobserve(img);
      }
    });
  }, { rootMargin: '50px' });

  // Watch for new images added to the DOM
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        const imgs = node.querySelectorAll?.('img[loading="lazy"]') || [];
        imgs.forEach(img => {
          img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
          if (img.complete) img.classList.add('loaded');
          else io.observe(img);
        });
        if (node.matches?.('img[loading="lazy"]')) {
          node.addEventListener('load', () => node.classList.add('loaded'), { once: true });
          if (node.complete) node.classList.add('loaded');
          else io.observe(node);
        }
      }
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
}

// ══════════════════════════════
// SKELETON LOADERS FOR CAROUSELS
// ══════════════════════════════
function showCarouselSkeletons() {
  const configs = [
    { id: 'carousel-snacks', title: '🍿 Snacks & Chips' },
    { id: 'carousel-dairy', title: '🧀 Dairy & Eggs' },
    { id: 'carousel-frozen', title: '🧊 Frozen Favorites' },
    { id: 'carousel-beverages', title: '🥤 Beverages' },
    { id: 'carousel-bakery', title: '🍞 Bakery & Bread' },
    { id: 'carousel-cereal', title: '🥣 Cereal & Breakfast' },
  ];
  const skeletonCards = Array(6).fill('').map(() => `
    <div class="hv-skeleton-card">
      <div class="hv-skeleton hv-skeleton-img"></div>
      <div class="hv-skeleton hv-skeleton-text"></div>
      <div class="hv-skeleton hv-skeleton-text short"></div>
    </div>
  `).join('');

  for (const cfg of configs) {
    const section = document.getElementById(cfg.id);
    if (!section) continue;
    section.innerHTML = `
      <div class="hv-carousel-header">
        <h2>${cfg.title}</h2>
        <span class="hv-see-all" style="opacity:0.3">See All →</span>
      </div>
      <div class="hv-carousel-wrap">
        <div class="hv-carousel-row">${skeletonCards}</div>
      </div>`;
  }
}

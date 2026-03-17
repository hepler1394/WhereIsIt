import './style.css';

/* ═══════════════════════════════════════════
   WhereIsIt @ Hy-Vee — App Logic
   Hy-Vee Exclusive · Everything Free
   ═══════════════════════════════════════════ */

const API = 'http://localhost:3000/api/v1';
const HYVEE_CDN = 'https://api.hy-vee.cloud/cdn-cgi/image/f=auto,w=200,q=70';

// ── State ──
const state = {
  store: JSON.parse(localStorage.getItem('wii_store') || 'null'),
  recent: JSON.parse(localStorage.getItem('wii_recent') || '[]'),
  onboarded: localStorage.getItem('wii_onboarded') === '1',
  lightMode: localStorage.getItem('wii_light') === '1',
  slide: 0,
};

// ── Hy-Vee Stores — Lee's Summit Area ──
const STORES = [
  {
    id: 's1',
    name: 'Hy-Vee (Rice Road)',
    addr: "301 NE Rice Rd, Lee's Summit, MO 64086",
    phone: '(816) 524-4237',
    hours: '6am – 11pm Daily',
    departments: ['Bakery', 'Deli', 'Chinese Express', 'Pharmacy', 'Floral', 'Wine & Spirits', 'Starbucks'],
    dist: 0,
  },
  {
    id: 's2',
    name: 'Hy-Vee (Ward Road)',
    addr: "310 SW Ward Rd, Lee's Summit, MO 64081",
    phone: '(816) 524-8700',
    hours: '6am – 11pm Daily',
    departments: ['Bakery', 'Deli', 'Italian Express', 'Pharmacy', 'Floral', 'Wine & Spirits', 'Caribou Coffee'],
    dist: 4.2,
  },
];

// ── Hy-Vee Departments (matching their real site) ──
const DEPARTMENTS = [
  { name: 'Fresh',           sub: 'Produce & Salads',    icon: 'M12 22c5 0 9.3-3.5 9.7-8.3.4-4.8-3-8.1-6.2-9.4C12.3 2.9 8 3.4 5.5 6S1.5 13 4 16c2 2.4 4.7 4.3 8 6z', path: '/category/fresh' },
  { name: 'Meat & Seafood',  sub: 'Butcher & Fresh Fish', icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM8 12l4-4 4 4', path: '/category/meat-and-seafood' },
  { name: 'Dairy',           sub: 'Milk, Cheese, Eggs',   icon: 'M17 8V5H7v3M7 8v13h10V8M9 8V5M15 8V5', path: '/category/dairy' },
  { name: 'Bakery',          sub: 'Fresh Baked Daily',     icon: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z', path: '/category/bakery' },
  { name: 'Deli',            sub: 'Ready-to-Eat',          icon: 'M3 11h18M5 11V6a7 7 0 0 1 14 0v5M12 11v11', path: '/category/deli' },
  { name: 'Pantry',          sub: 'Canned, Dry & Baking',  icon: 'M4 4h16v16H4zM4 9h16M9 4v16', path: '/category/pantry' },
  { name: 'Frozen',          sub: 'Meals, Treats & More',   icon: 'M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9L4.9 19.1', path: '/category/frozen' },
  { name: 'Beverages',       sub: 'Coffee, Juice & Soda',   icon: 'M17 8V5H7v3M7 8l1 13h8l1-13', path: '/category/beverages' },
  { name: 'Snacks',          sub: 'Chips, Cookies & Candy', icon: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9', path: '/category/snacks' },
  { name: 'Health & Beauty', sub: 'Pharmacy & Personal',    icon: 'M22 12h-4l-3 9L9 3l-3 9H2', path: '/category/health-and-beauty' },
  { name: 'Household',       sub: 'Cleaning & Laundry',     icon: 'M12 2v10M18.5 6.5l-7 7M5.5 6.5l7 7', path: '/category/household' },
  { name: 'Floral',          sub: 'Flowers & Arrangements', icon: 'M12 22c4-4 8-7 8-12a8 8 0 0 0-16 0c0 5 4 8 8 12z', path: '/category/floral' },
];

// ── Hy-Vee 301 NE Rice Rd — Expanded Aisle Layout ──
const AISLES = [
  { n: '1',  a: ['Bread', 'Buns', 'Tortillas', 'Wraps', 'English Muffins', 'Bagels'],
             b: ['Peanut Butter', 'Jelly', 'Jam', 'Honey', 'Nutella', 'Marshmallow Creme'] },
  { n: '2',  a: ['Cereal', 'Oatmeal', 'Granola', 'Granola Bars', 'Muesli'],
             b: ['Pancake Mix', 'Syrup', 'Pop-Tarts', 'Breakfast Bars', 'Instant Breakfast'] },
  { n: '3',  a: ['Spices', 'Seasonings', 'Extracts', 'Fresh Herbs', 'Salt', 'Pepper'],
             b: ['Baking Supplies', 'Flour', 'Sugar', 'Cake Mix', 'Frosting', 'Sprinkles', 'Baking Powder'] },
  { n: '4',  a: ['Pasta', 'Spaghetti', 'Pasta Sauce', 'Marinara', 'Alfredo', 'Pesto'],
             b: ['Rice', 'Beans', 'Quinoa', 'Couscous', 'Grains', 'Lentils'] },
  { n: '5',  a: ['Canned Vegetables', 'Canned Fruit', 'Tomatoes', 'Tomato Paste', 'Diced Tomatoes'],
             b: ['Soup', 'Broth', 'Stock', 'Chili', 'Stew', 'Ramen'] },
  { n: '6',  a: ['Chips', 'Crackers', 'Pretzels', 'Popcorn', 'Cheese Puffs', 'Corn Chips'],
             b: ['Cookies', 'Snack Cakes', 'Oreos', 'Candy Bars', 'Trail Mix', 'Nuts'] },
  { n: '7',  a: ['Mexican', 'Taco Shells', 'Salsa', 'Tortilla Chips', 'Refried Beans', 'Enchilada Sauce'],
             b: ['Asian', 'Indian', 'Soy Sauce', 'Teriyaki', 'Coconut Milk', 'Curry Paste', 'Sriracha'] },
  { n: '8',  a: ['Ketchup', 'Mustard', 'Mayo', 'BBQ Sauce', 'Hot Sauce', 'Relish', 'Pickles'],
             b: ['Salad Dressing', 'Vinegar', 'Olive Oil', 'Cooking Spray', 'Croutons'] },
  { n: '9',  a: ['Soda', 'Sparkling Water', 'Tonic', 'Club Soda', 'Ginger Ale', 'Root Beer'],
             b: ['Juice', 'Sports Drinks', 'Gatorade', 'Energy Drinks', 'Red Bull', 'Coconut Water'] },
  { n: '10', a: ['Coffee', 'K-Cups', 'Ground Coffee', 'Coffee Beans', 'Instant Coffee', 'Cold Brew'],
             b: ['Tea', 'Hot Cocoa', 'Water', 'Drink Mixes', 'Lemonade', 'Kool-Aid'] },
  { n: '11', a: ['Laundry Detergent', 'Fabric Softener', 'Dryer Sheets', 'Stain Remover', 'Bleach'],
             b: ['Dish Soap', 'Dishwasher Detergent', 'Sponges', 'Cleaning Spray', 'Windex', 'Lysol'] },
  { n: '12', a: ['Paper Towels', 'Toilet Paper', 'Tissues', 'Napkins'],
             b: ['Trash Bags', 'Ziploc Bags', 'Aluminum Foil', 'Plastic Wrap', 'Parchment Paper'] },
  { n: '13', a: ['Shampoo', 'Conditioner', 'Body Wash', 'Hair Care', 'Hair Color', 'Styling'],
             b: ['Soap', 'Lotion', 'Deodorant', 'Razors', 'Shaving Cream', 'Sunscreen'] },
  { n: '14', a: ['Baby Food', 'Formula', 'Diapers', 'Baby Wipes', 'Baby Lotion', 'Baby Shampoo'],
             b: ['Pet Food', 'Dog Food', 'Cat Food', 'Cat Litter', 'Pet Treats', 'Pet Toys'] },
];

// ── Common Hy-Vee produce (Perimeter — no aisle number) ──
const PERIMETER = {
  produce: ['Apples', 'Bananas', 'Oranges', 'Grapes', 'Strawberries', 'Blueberries', 'Avocado', 'Tomatoes',
            'Lettuce', 'Spinach', 'Broccoli', 'Carrots', 'Onions', 'Potatoes', 'Peppers', 'Mushrooms',
            'Cucumbers', 'Celery', 'Corn', 'Lemons', 'Limes', 'Watermelon', 'Pineapple', 'Kiwi'],
  dairy:   ['Milk', 'Butter', 'Eggs', 'Cheese', 'Cream Cheese', 'Sour Cream', 'Yogurt', 'Heavy Cream',
            'Cottage Cheese', 'Shredded Cheese', 'String Cheese', 'Almond Milk', 'Oat Milk'],
  meat:    ['Ground Beef', 'Chicken Breast', 'Pork Chops', 'Bacon', 'Sausage', 'Steak', 'Ribs', 'Ham',
            'Turkey', 'Hot Dogs', 'Bratwurst', 'Deli Meat', 'Salmon', 'Shrimp', 'Tilapia', 'Cod'],
  bakery:  ['Bread Loaves', 'Donuts', 'Cupcakes', 'Muffins', 'Croissants', 'Cinnamon Rolls', 'Pies',
            'Cakes', 'French Bread', 'Rolls', 'Cookies', 'Brownies'],
  deli:    ['Rotisserie Chicken', 'Fried Chicken', 'Sandwiches', 'Potato Salad', 'Macaroni Salad',
            'Hot Bar', 'Sushi', 'Soup', 'Pasta Salad', 'Charcuterie'],
  frozen:  ['Frozen Pizza', 'Ice Cream', 'Frozen Vegetables', 'Frozen Fruit', 'Frozen Meals',
            'Frozen Chicken', 'Frozen Fries', 'Frozen Waffles', 'Popsicles', 'Frozen Burritos'],
};

// ══════════════════════════════
// INIT
// ══════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  if (state.lightMode) {
    document.documentElement.setAttribute('data-theme', 'light');
    const t = document.getElementById('dark-mode-toggle');
    if (t) t.checked = true;
  }
  if (state.onboarded) finishOnboarding();

  buildDepartments();
  buildRecent();
  buildStoreList(STORES);

  const input = document.getElementById('search-input');
  input.addEventListener('input', () => {
    document.getElementById('search-clear').classList.toggle('hidden', !input.value);
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') doSearch(input.value);
  });

  // Auto-select user's main Hy-Vee (Rice Road)
  if (state.store) {
    applyStore(state.store);
  } else {
    applyStore(STORES[0]);
  }
});

// ══════════════════════════════
// ONBOARDING
// ══════════════════════════════
window.nextSlide = () => {
  state.slide++;
  document.querySelectorAll('.onboarding-slide').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.dot').forEach(d => d.classList.remove('active'));
  const sl = document.querySelector(`[data-slide="${state.slide}"]`);
  const dt = document.querySelector(`[data-dot="${state.slide}"]`);
  if (sl) sl.classList.add('active');
  if (dt) dt.classList.add('active');
};

window.finishOnboarding = () => {
  localStorage.setItem('wii_onboarded', '1');
  state.onboarded = true;
  document.getElementById('onboarding').classList.remove('active');
  document.getElementById('main-app').classList.add('active');
};

// ══════════════════════════════
// TABS
// ══════════════════════════════
window.switchTab = tab => {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-page="${tab}"]`).classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${tab}`).classList.add('active');
  if (navigator.vibrate) navigator.vibrate(3);
};

// ══════════════════════════════
// STORE PICKER (Hy-Vee only)
// ══════════════════════════════
window.showStorePicker = () => {
  document.getElementById('store-picker').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
};
window.hideStorePicker = () => {
  document.getElementById('store-picker').classList.add('hidden');
  document.body.style.overflow = '';
};

function buildStoreList(stores) {
  document.getElementById('store-list').innerHTML = stores.map(s => `
    <div class="store-opt ${state.store?.id === s.id ? 'selected' : ''}" onclick='pickStore(${JSON.stringify(s).replace(/'/g,"&#39;")})'>
      <div class="store-color"></div>
      <div class="store-opt-info">
        <div class="store-opt-name">${s.name}</div>
        <div class="store-opt-addr">${s.addr}</div>
        <div class="store-opt-details">${s.hours} · ${s.phone}</div>
        <div class="store-depts">${s.departments.slice(0, 4).join(' · ')}</div>
      </div>
      ${s.dist > 0 ? `<div class="store-opt-dist">${s.dist} mi</div>` : '<div class="store-opt-dist">Your store</div>'}
    </div>`).join('');
}

window.pickStore = s => { applyStore(s); hideStorePicker(); };

function applyStore(s) {
  state.store = s;
  localStorage.setItem('wii_store', JSON.stringify(s));
  document.getElementById('store-name').textContent = s.name;
  document.getElementById('store-address').textContent = s.addr;
  buildStoreList(STORES);
}

// ══════════════════════════════
// DEPARTMENTS (Hy-Vee specific)
// ══════════════════════════════
function buildDepartments() {
  const grid = document.getElementById('category-grid');
  grid.innerHTML = DEPARTMENTS.map(d => `
    <button class="cat-btn" onclick="doSearch('${d.name}')">
      <div class="cat-icon">${d.name.substring(0, 2)}</div>
      <span class="cat-label">${d.name}</span>
      <span class="cat-sub">${d.sub}</span>
    </button>`).join('');
}

// ══════════════════════════════
// RECENT
// ══════════════════════════════
function buildRecent() {
  const sec = document.getElementById('recent-section');
  const list = document.getElementById('recent-list');
  if (!state.recent.length) { sec.classList.add('hidden'); return; }
  sec.classList.remove('hidden');
  list.innerHTML = state.recent.slice(0, 5).map(q => `
    <div class="recent-item" onclick="doSearch('${q.replace(/'/g,"\\'")}')" >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <span>${q}</span>
      <svg class="recent-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
    </div>`).join('');
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
  document.getElementById('search-results').classList.add('hidden');
  document.getElementById('search-default').classList.remove('hidden');
};

window.doSearch = async query => {
  if (!query?.trim()) return;
  query = query.trim();
  document.getElementById('search-input').value = query;
  document.getElementById('search-clear').classList.remove('hidden');
  addRecent(query);

  const out = document.getElementById('search-results');
  const def = document.getElementById('search-default');
  def.classList.add('hidden');
  out.classList.remove('hidden');
  out.innerHTML = '<div class="loading-state"><div class="spinner"></div><p class="loading-text">Searching Hy-Vee...</p></div>';

  let results = [], deals = [];

  // Try live API
  try {
    if (state.store?.id) {
      const r = await fetch(`${API}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, store_id: state.store.id }),
      });
      if (r.ok) { const d = await r.json(); results = d.data?.results || d.results || []; deals = d.data?.deals || d.deals || []; }
    }
  } catch {}

  // Fallback: local Hy-Vee inference
  if (!results.length) results = localSearch(query);

  renderResults(results, deals, query);
};

// ══════════════════════════════
// LOCAL SEARCH (Hy-Vee aisle data)
// ══════════════════════════════
function localSearch(query) {
  const q = query.toLowerCase();
  const hits = [];

  // Check aisles
  for (const aisle of AISLES) {
    const all = [...aisle.a, ...aisle.b];
    for (const cat of all) {
      if (cat.toLowerCase().includes(q) || q.includes(cat.toLowerCase())) {
        const side = aisle.a.includes(cat) ? 'A' : 'B';
        hits.push({
          type: 'aisle', confidence: 0.82, source: 'local_hyvee',
          productName: query, aisle: aisle.n, section: cat,
          location: `Aisle ${aisle.n}, Side ${side}`,
          reasoning: `${cat} is on side ${side} of aisle ${aisle.n} at Hy-Vee Rice Road`,
        });
      }
    }
  }

  // Check perimeter departments
  for (const [dept, items] of Object.entries(PERIMETER)) {
    for (const item of items) {
      if (item.toLowerCase().includes(q) || q.includes(item.toLowerCase())) {
        const deptName = dept.charAt(0).toUpperCase() + dept.slice(1);
        hits.push({
          type: 'perimeter', confidence: 0.88, source: 'local_hyvee',
          productName: query, department: deptName, section: item,
          location: `${deptName} Department`,
          reasoning: `${item} is in the ${deptName} department (store perimeter)`,
        });
      }
    }
  }

  // Fuzzy word match
  if (!hits.length) {
    const words = q.split(/\s+/).filter(w => w.length > 2);
    for (const aisle of AISLES) {
      for (const cat of [...aisle.a, ...aisle.b]) {
        for (const word of words) {
          if (cat.toLowerCase().includes(word)) {
            hits.push({
              type: 'fuzzy', confidence: 0.55, source: 'local_hyvee',
              productName: query, aisle: aisle.n, section: cat,
              location: `Likely Aisle ${aisle.n}`,
              reasoning: `"${word}" may relate to ${cat} in aisle ${aisle.n}`,
            });
          }
        }
      }
    }
    // Also check perimeter fuzzy
    for (const [dept, items] of Object.entries(PERIMETER)) {
      for (const item of items) {
        for (const word of words) {
          if (item.toLowerCase().includes(word)) {
            const deptName = dept.charAt(0).toUpperCase() + dept.slice(1);
            hits.push({
              type: 'fuzzy', confidence: 0.50, source: 'local_hyvee',
              productName: query, department: deptName, section: item,
              location: `Likely ${deptName} Department`,
              reasoning: `"${word}" may relate to ${item} in ${deptName}`,
            });
          }
        }
      }
    }
  }

  const seen = new Set();
  return hits.filter(r => {
    const k = (r.aisle || r.department) + r.section;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  }).sort((a, b) => b.confidence - a.confidence).slice(0, 8);
}

// ══════════════════════════════
// RENDER RESULTS
// ══════════════════════════════
function renderResults(results, deals, query) {
  const out = document.getElementById('search-results');
  if (!results.length) {
    out.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2M9 9h.01M15 9h.01"/></svg>
        <h3>No results for "${query}"</h3>
        <p>Try a different search term or help others by reporting this product's location.</p>
        <button class="btn btn-primary btn-sm" style="margin-top:14px" onclick="switchTab('community')">Report Location</button>
      </div>`;
    return;
  }

  let html = `<div class="results-header">
    <span class="results-count">${results.length} result${results.length > 1 ? 's' : ''} for "${query}"</span>
    <span class="results-store">${state.store?.name || 'Hy-Vee'}</span>
  </div>`;

  for (const r of results) {
    const cl = r.confidence >= 0.75 ? 'conf-high' : r.confidence >= 0.5 ? 'conf-med' : 'conf-low';
    const pct = Math.round(r.confidence * 100);
    const isPerimeter = r.type === 'perimeter' || !r.aisle;
    const locationLabel = isPerimeter ? (r.department || 'Perimeter') : `Aisle ${r.aisle}`;
    const locationClass = isPerimeter ? 'result-dept-badge' : 'result-aisle';

    html += `
      <div class="result-card">
        <div class="result-top">
          <div class="${locationClass}">${locationLabel}</div>
          <span class="conf-badge ${cl}"><span class="conf-dot"></span>${pct}%</span>
        </div>
        <div class="result-section">${r.section || r.department || ''}</div>
        ${r.reasoning ? `<div class="result-reason">${r.reasoning}</div>` : ''}
        <div class="result-footer">
          ${r.source?.includes('hyvee') ? '<span class="tag tag-hyvee">Hy-Vee</span>' : ''}
          ${r.source?.includes('inference') ? '<span class="tag tag-ai">AI Inferred</span>' : ''}
          ${r.type === 'perimeter' ? '<span class="tag tag-fresh">Perimeter</span>' : ''}
          <div class="result-actions">
            <button class="act-btn act-yes" title="Correct"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></button>
            <button class="act-btn act-no" title="Wrong"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
        </div>
      </div>`;
  }

  if (deals.length) {
    html += `<div class="deals-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg> Hy-Vee Deals</div>`;
    for (const d of deals) {
      html += `
        <div class="deal-card">
          <div class="deal-info">
            <div class="deal-name">${d.productName || d.product_name}</div>
            ${d.discountText || d.discount_text ? `<div class="deal-disc">${d.discountText || d.discount_text}</div>` : ''}
          </div>
          ${d.salePrice || d.sale_price ? `<div class="deal-price">$${(d.salePrice || d.sale_price).toFixed(2)}</div>` : ''}
        </div>`;
    }
  }

  out.innerHTML = html;
}

// ══════════════════════════════
// COMMUNITY
// ══════════════════════════════
window.submitLocation = async e => {
  e.preventDefault();
  const product = document.getElementById('submit-product').value;
  const aisle = document.getElementById('submit-aisle').value;
  const dept = document.getElementById('submit-dept').value;
  if (!state.store) { alert('Please select a store first.'); return; }

  const btn = document.getElementById('submit-btn');
  btn.textContent = 'Submitting...';
  btn.disabled = true;

  try {
    await fetch(`${API}/community/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_name: product, aisle_number: aisle, department: dept || undefined, store_id: state.store.id }),
    });
  } catch {}

  btn.textContent = 'Submitted!';
  setTimeout(() => { btn.textContent = 'Submit Report'; btn.disabled = false; }, 2000);
  document.getElementById('submit-form').reset();
};

// ══════════════════════════════
// DARK MODE
// ══════════════════════════════
window.toggleDarkMode = () => {
  state.lightMode = !state.lightMode;
  localStorage.setItem('wii_light', state.lightMode ? '1' : '0');
  if (state.lightMode) document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
};

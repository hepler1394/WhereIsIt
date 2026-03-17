/**
 * WhereIsIt — Input Validation & Sanitization
 * Comprehensive validation helpers for all API inputs.
 * Prevents injection, enforces data integrity, validates geometry.
 */

// ══════════════════════════════════════════
// String Validators
// ══════════════════════════════════════════

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const AISLE_REGEX = /^[A-Za-z0-9]{1,10}$/;
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;
const ZIP_REGEX = /^\d{5}(-\d{4})?$/;
const COLOR_HEX_REGEX = /^#[0-9a-fA-F]{6}$/;
const SAFE_TEXT_REGEX = /^[^<>{}]*$/; // Block obvious injection attempts

export function isUUID(val) {
  return typeof val === 'string' && UUID_REGEX.test(val);
}

export function isSlug(val) {
  return typeof val === 'string' && val.length >= 1 && val.length <= 64 && SLUG_REGEX.test(val);
}

export function isAisle(val) {
  return typeof val === 'string' && AISLE_REGEX.test(val);
}

export function isPhone(val) {
  return typeof val === 'string' && PHONE_REGEX.test(val);
}

export function isZip(val) {
  return typeof val === 'string' && ZIP_REGEX.test(val);
}

export function isHexColor(val) {
  return typeof val === 'string' && COLOR_HEX_REGEX.test(val);
}

export function isSafeText(val) {
  return typeof val === 'string' && SAFE_TEXT_REGEX.test(val);
}

/**
 * Sanitize a string: trim, collapse whitespace, remove control chars.
 */
export function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // control chars
    .replace(/\s+/g, ' ')                                 // collapse whitespace
    .substring(0, 2000);                                   // max length guard
}

/**
 * Sanitize a query string — additional stripping for search.
 */
export function sanitizeQuery(str) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/[<>{}\\]/g, '')  // strip injection chars
    .replace(/\s+/g, ' ')
    .substring(0, 200);
}

// ══════════════════════════════════════════
// Number Validators
// ══════════════════════════════════════════

export function isLatitude(val) {
  const n = parseFloat(val);
  return !isNaN(n) && n >= -90 && n <= 90;
}

export function isLongitude(val) {
  const n = parseFloat(val);
  return !isNaN(n) && n >= -180 && n <= 180;
}

export function isPositiveInt(val) {
  const n = parseInt(val, 10);
  return !isNaN(n) && n > 0 && n === parseFloat(val);
}

export function isPositiveNumber(val) {
  const n = parseFloat(val);
  return !isNaN(n) && n > 0;
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// ══════════════════════════════════════════
// Pagination Validators
// ══════════════════════════════════════════

/**
 * Parse and validate pagination params.
 * Returns safe defaults if invalid.
 */
export function parsePagination(query, defaults = { page: 1, perPage: 20, maxPerPage: 100 }) {
  let page = parseInt(query.page, 10);
  let perPage = parseInt(query.per_page || query.limit, 10);

  if (isNaN(page) || page < 1) page = defaults.page;
  if (isNaN(perPage) || perPage < 1) perPage = defaults.perPage;
  perPage = Math.min(perPage, defaults.maxPerPage);

  return {
    page,
    perPage,
    offset: (page - 1) * perPage,
  };
}

/**
 * Parse and validate sort params.
 */
export function parseSort(query, allowedFields, defaultSort = { field: 'created_at', order: 'desc' }) {
  let field = query.sort_by || defaultSort.field;
  let order = (query.sort_order || defaultSort.order).toLowerCase();

  if (!allowedFields.includes(field)) field = defaultSort.field;
  if (order !== 'asc' && order !== 'desc') order = defaultSort.order;

  return { field, order, ascending: order === 'asc' };
}

// ══════════════════════════════════════════
// Compound Validators
// ══════════════════════════════════════════

/**
 * Validate a GPS coordinate pair.
 */
export function validateCoordinates(lat, lng) {
  const errors = [];
  if (lat === undefined || lat === null) errors.push('lat is required');
  else if (!isLatitude(lat)) errors.push('lat must be between -90 and 90');
  if (lng === undefined || lng === null) errors.push('lng is required');
  else if (!isLongitude(lng)) errors.push('lng must be between -180 and 180');
  return errors.length ? errors : null;
}

/**
 * Validate a store submission.
 */
export function validateStoreSubmission(body) {
  const errors = [];
  if (!body.name || !body.name.trim()) errors.push('name is required');
  if (body.name && body.name.length > 200) errors.push('name must be under 200 chars');
  if (!body.address || !body.address.trim()) errors.push('address is required');
  if (body.address && body.address.length > 500) errors.push('address too long');
  if (body.chain_name && body.chain_name.length > 100) errors.push('chain_name too long');
  if (body.lat !== undefined && !isLatitude(body.lat)) errors.push('invalid latitude');
  if (body.lng !== undefined && !isLongitude(body.lng)) errors.push('invalid longitude');
  if (body.phone && !isPhone(body.phone)) errors.push('invalid phone number');
  if (body.zip && !isZip(body.zip)) errors.push('invalid zip code');
  return errors.length ? errors : null;
}

/**
 * Validate a product location submission.
 */
export function validateLocationSubmission(body) {
  const errors = [];
  if (!body.product_name || !body.product_name.trim()) errors.push('product_name is required');
  if (body.product_name && body.product_name.length > 200) errors.push('product_name too long');
  if (!body.aisle_number || !body.aisle_number.trim()) errors.push('aisle_number is required');
  if (body.aisle_number && !isAisle(body.aisle_number)) errors.push('invalid aisle format');
  if (!body.store_id) errors.push('store_id is required');
  if (body.store_id && !isUUID(body.store_id)) errors.push('invalid store_id format');
  if (body.department && body.department.length > 100) errors.push('department too long');
  if (body.brand && body.brand.length > 100) errors.push('brand too long');
  return errors.length ? errors : null;
}

/**
 * Validate a deal submission.
 */
export function validateDealSubmission(body) {
  const errors = [];
  if (!body.product_name || !body.product_name.trim()) errors.push('product_name is required');
  if (body.sale_price !== undefined && !isPositiveNumber(body.sale_price)) errors.push('sale_price must be positive');
  if (body.regular_price !== undefined && !isPositiveNumber(body.regular_price)) errors.push('regular_price must be positive');
  if (body.start_date && isNaN(Date.parse(body.start_date))) errors.push('invalid start_date');
  if (body.end_date && isNaN(Date.parse(body.end_date))) errors.push('invalid end_date');
  if (body.start_date && body.end_date && new Date(body.start_date) > new Date(body.end_date)) {
    errors.push('start_date must be before end_date');
  }
  return errors.length ? errors : null;
}

/**
 * Validate chain submission.
 */
export function validateChainSubmission(body) {
  const errors = [];
  if (!body.name || !body.name.trim()) errors.push('name is required');
  if (body.name && body.name.length > 100) errors.push('name too long');
  if (body.slug && !isSlug(body.slug)) errors.push('slug must be lowercase alphanumeric with hyphens');
  if (body.primary_color && !isHexColor(body.primary_color)) errors.push('invalid primary_color hex');
  if (body.secondary_color && !isHexColor(body.secondary_color)) errors.push('invalid secondary_color hex');
  if (body.website_url && body.website_url.length > 500) errors.push('website_url too long');
  return errors.length ? errors : null;
}

// ══════════════════════════════════════════
// Date Helpers
// ══════════════════════════════════════════

export function today() {
  return new Date().toISOString().split('T')[0];
}

export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

export function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

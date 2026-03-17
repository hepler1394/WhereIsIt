-- WhereIsIt Database Schema
-- Run this in Supabase SQL Editor to create all tables

-- ============================
-- Enable extensions
-- ============================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================
-- Retail chains
-- ============================
CREATE TABLE IF NOT EXISTS chains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  website_url TEXT,
  primary_color TEXT DEFAULT '#333333',
  secondary_color TEXT DEFAULT '#666666',
  accent_color TEXT DEFAULT '#0066CC',
  loyalty_program_name TEXT,
  loyalty_program_details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================
-- Individual store locations
-- ============================
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chain_id UUID REFERENCES chains(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  phone TEXT,
  hours_json JSONB DEFAULT '{}',
  store_format TEXT DEFAULT 'grocery',
  has_pharmacy BOOLEAN DEFAULT false,
  has_bakery BOOLEAN DEFAULT false,
  has_deli BOOLEAN DEFAULT false,
  has_gas_station BOOLEAN DEFAULT false,
  layout_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stores_chain ON stores(chain_id);
CREATE INDEX idx_stores_location ON stores(lat, lng);
CREATE INDEX idx_stores_state ON stores(state);

-- ============================
-- Departments within a store
-- ============================
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  floor_section TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_departments_store ON departments(store_id);

-- ============================
-- Aisles within a store
-- ============================
CREATE TABLE IF NOT EXISTS aisles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  aisle_number TEXT NOT NULL,
  aisle_label TEXT,
  side_a_categories TEXT[] DEFAULT '{}',
  side_b_categories TEXT[] DEFAULT '{}',
  is_split BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, aisle_number)
);

CREATE INDEX idx_aisles_store ON aisles(store_id);

-- ============================
-- Product categories (normalized)
-- ============================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  parent_category_id UUID REFERENCES categories(id),
  synonyms TEXT[] DEFAULT '{}',
  common_aisle_patterns JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================
-- Product-to-location mappings
-- ============================
CREATE TABLE IF NOT EXISTS product_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  aisle_id UUID REFERENCES aisles(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  brand TEXT,
  upc TEXT,
  location_detail TEXT,
  confidence DOUBLE PRECISION DEFAULT 0.5,
  source TEXT DEFAULT 'community',
  is_temporary BOOLEAN DEFAULT false,
  needs_review BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_by UUID,
  verified_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, product_name)
);

CREATE INDEX idx_product_locations_store ON product_locations(store_id);
CREATE INDEX idx_product_locations_name ON product_locations(product_name);
CREATE INDEX idx_product_locations_confidence ON product_locations(confidence DESC);

-- ============================
-- Weekly ad / deal data
-- ============================
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chain_id UUID REFERENCES chains(id) ON DELETE SET NULL,
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  brand TEXT,
  sale_price NUMERIC(10,2),
  regular_price NUMERIC(10,2),
  discount_text TEXT,
  is_digital_coupon BOOLEAN DEFAULT false,
  placement_hint TEXT,
  image_url TEXT,
  source_url TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deals_chain ON deals(chain_id);
CREATE INDEX idx_deals_dates ON deals(start_date, end_date);
CREATE INDEX idx_deals_product ON deals(product_name);

-- ============================
-- Community contributions
-- ============================
CREATE TABLE IF NOT EXISTS contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  type TEXT NOT NULL, -- 'location_report', 'confirm', 'deny', 'photo', 'correction'
  data_json JSONB DEFAULT '{}',
  agent_decision JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'pending_review'
  reviewer_id UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contributions_user ON contributions(user_id);
CREATE INDEX idx_contributions_status ON contributions(status);
CREATE INDEX idx_contributions_store ON contributions(store_id);

-- ============================
-- User accounts
-- ============================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id TEXT UNIQUE, -- Supabase Auth UID
  display_name TEXT,
  avatar_url TEXT,
  reputation_score INTEGER DEFAULT 0,
  trust_level INTEGER DEFAULT 0, -- 0=new, 1=contributor, 2=trusted, 3=champion, 4=admin
  contributions_count INTEGER DEFAULT 0,
  subscription_tier TEXT DEFAULT 'free', -- 'free', 'premium', 'enterprise'
  favorite_stores UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================
-- Chain-specific UI themes
-- ============================
CREATE TABLE IF NOT EXISTS chain_themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chain_id UUID UNIQUE NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
  primary_color TEXT NOT NULL,
  secondary_color TEXT NOT NULL,
  accent_color TEXT,
  background_color TEXT DEFAULT '#FFFFFF',
  card_color TEXT DEFAULT '#F8F8F8',
  font_family TEXT,
  logo_dark_url TEXT,
  logo_light_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================
-- Helper RPC functions (called from backend)
-- ============================

-- Increment a user's reputation score
CREATE OR REPLACE FUNCTION increment_reputation(user_id_param UUID, amount INTEGER DEFAULT 1)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET reputation_score = reputation_score + amount,
      contributions_count = contributions_count + 1,
      trust_level = CASE
        WHEN contributions_count + 1 >= 100 THEN 3
        WHEN contributions_count + 1 >= 50 THEN 2
        WHEN contributions_count + 1 >= 10 THEN 1
        ELSE trust_level
      END,
      updated_at = NOW()
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- Increment verified count on a product location
CREATE OR REPLACE FUNCTION increment_verified(location_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE product_locations
  SET verified_count = verified_count + 1,
      confidence = LEAST(confidence + 0.02, 1.0),
      updated_at = NOW()
  WHERE id = location_id;
END;
$$ LANGUAGE plpgsql;

-- Decrease confidence on a product location
CREATE OR REPLACE FUNCTION decrease_confidence(location_id UUID, amount DOUBLE PRECISION DEFAULT 0.05)
RETURNS void AS $$
BEGIN
  UPDATE product_locations
  SET confidence = GREATEST(confidence - amount, 0.0),
      needs_review = CASE WHEN confidence - amount < 0.3 THEN true ELSE needs_review END,
      updated_at = NOW()
  WHERE id = location_id;
END;
$$ LANGUAGE plpgsql;

-- ============================
-- Row Level Security (basic)
-- ============================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY users_read_own ON users FOR SELECT USING (auth.uid()::text = auth_id);
CREATE POLICY users_update_own ON users FOR UPDATE USING (auth.uid()::text = auth_id);

-- Anyone can read stores, chains, aisles, deals (public data)
ALTER TABLE chains ENABLE ROW LEVEL SECURITY;
CREATE POLICY chains_public_read ON chains FOR SELECT USING (true);

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY stores_public_read ON stores FOR SELECT USING (true);

ALTER TABLE aisles ENABLE ROW LEVEL SECURITY;
CREATE POLICY aisles_public_read ON aisles FOR SELECT USING (true);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY deals_public_read ON deals FOR SELECT USING (true);

ALTER TABLE product_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY product_locations_public_read ON product_locations FOR SELECT USING (true);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY categories_public_read ON categories FOR SELECT USING (true);

ALTER TABLE chain_themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY chain_themes_public_read ON chain_themes FOR SELECT USING (true);

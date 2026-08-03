// Supabase Database Schema
// SQL schema for Globall Cloud application

const supabaseSchema = `
-- Customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  full_name VARCHAR(255),
  company_name VARCHAR(255),
  password_hash VARCHAR(255),
  country VARCHAR(100),
  city VARCHAR(100),
  address TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- Shipments table
CREATE TABLE shipments (
  id VARCHAR(50) PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  origin VARCHAR(100) NOT NULL,
  destination VARCHAR(100) NOT NULL,
  shipment_type VARCHAR(20) NOT NULL,
  weight DECIMAL(10,2),
  cbm DECIMAL(10,3),
  status VARCHAR(50) DEFAULT 'pending',
  current_location VARCHAR(255),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  estimated_delivery DATE,
  actual_delivery DATE,
  price DECIMAL(10,2),
  currency VARCHAR(10),
  tracking_code VARCHAR(50) UNIQUE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  shipment_id VARCHAR(50) REFERENCES shipments(id),
  shipment_type VARCHAR(20),
  weight DECIMAL(10,2),
  origin VARCHAR(100),
  destination VARCHAR(100),
  base_cost DECIMAL(10,2),
  discount_percent DECIMAL(5,2) DEFAULT 0,
  total_cost DECIMAL(10,2),
  currency VARCHAR(10),
  payment_status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50),
  transaction_id VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shipment events (timeline)
CREATE TABLE shipment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id VARCHAR(50) REFERENCES shipments(id),
  event_type VARCHAR(100),
  status VARCHAR(50),
  location VARCHAR(255),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  description TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pricing rules table
CREATE TABLE pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_type VARCHAR(20),
  base_price DECIMAL(10,2),
  per_kg_price DECIMAL(10,2),
  per_cbm_price DECIMAL(10,2),
  min_charge DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  effective_date TIMESTAMP,
  end_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin users table
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  full_name VARCHAR(255),
  role VARCHAR(50),
  permissions TEXT[],
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Support messages table
CREATE TABLE support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  shipment_id VARCHAR(50) REFERENCES shipments(id),
  message TEXT NOT NULL,
  message_type VARCHAR(50),
  priority VARCHAR(50),
  status VARCHAR(50) DEFAULT 'open',
  response TEXT,
  responded_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_shipments_customer_id ON shipments(customer_id);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_origin_destination ON shipments(origin, destination);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_shipment_events_shipment_id ON shipment_events(shipment_id);
CREATE INDEX idx_support_messages_customer_id ON support_messages(customer_id);
CREATE INDEX idx_support_messages_status ON support_messages(status);

-- Row Level Security (RLS) Policies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Customers can view their own data
CREATE POLICY "Customers view own data" ON customers
  FOR SELECT USING (auth.uid() = id);

-- Customers can view their own shipments
CREATE POLICY "Customers view own shipments" ON shipments
  FOR SELECT USING (auth.uid() = customer_id);

-- Customers can view their own orders
CREATE POLICY "Customers view own orders" ON orders
  FOR SELECT USING (auth.uid() = customer_id);

-- Customers can create orders
CREATE POLICY "Customers create orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = customer_id);
`;

// Export schema
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { supabaseSchema };
}

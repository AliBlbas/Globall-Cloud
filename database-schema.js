// Supabase Database Schema
// Live Globall Cloud schema aligned with the current project database.

const supabaseSchema = `
-- customer_directory
CREATE TABLE public.customer_directory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  name text,
  phone text,
  phone2 text,
  email text,
  city text,
  delivery_location text,
  note text,
  created_at timestamptz DEFAULT now()
);

-- shipments
CREATE TABLE public.shipments (
  id text PRIMARY KEY,
  customer_name text,
  customer_phone text,
  customer_email text,
  notes text,
  origin_key text,
  dest_key text,
  type text,
  weight_kg numeric,
  volume_cbm numeric,
  items_count integer,
  total_amount numeric DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  current_step_index integer DEFAULT 0,
  step_dates jsonb DEFAULT '{}'::jsonb,
  eta timestamptz,
  created_at timestamptz DEFAULT now(),
  customer_user_id uuid REFERENCES auth.users(id),
  directory_customer_id uuid REFERENCES public.customer_directory(id),
  step_photos jsonb DEFAULT '{}'::jsonb,
  batch_code text,
  branch text
);

-- messages
CREATE TABLE public.messages (
  id bigserial PRIMARY KEY,
  name text,
  email text,
  message text,
  created_at timestamptz DEFAULT now(),
  company text,
  request_type text
);

-- staff
CREATE TABLE public.staff (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  full_name text,
  role text CHECK (role = ANY (ARRAY['admin'::text, 'accountant'::text, 'super_admin'::text])),
  created_at timestamptz DEFAULT now(),
  branch text CHECK (branch = ANY (ARRAY['dubai'::text, 'china'::text, 'erbil'::text, 'all'::text]))
);

-- warehouse_receipts
CREATE TABLE public.warehouse_receipts (
  id bigserial PRIMARY KEY,
  batch_code text,
  location text DEFAULT 'Dubai',
  photos jsonb DEFAULT '[]'::jsonb,
  notes text,
  received_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.staff(id),
  created_by_name text,
  created_at timestamptz DEFAULT now(),
  directory_customer_id uuid REFERENCES public.customer_directory(id),
  consolidated boolean DEFAULT false,
  directory_phone text
);

-- lg_orders / lg_shipments / tracking tables kept for corridor / logistics workflows
CREATE TABLE public.lg_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  created_by uuid,
  customer_name text,
  status text DEFAULT 'draft',
  notes text
);

CREATE TABLE public.lg_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  created_by uuid,
  order_id uuid REFERENCES public.lg_orders(id),
  origin text,
  destination text,
  status text DEFAULT 'planned',
  dispatched_at timestamptz,
  delivered_at timestamptz,
  tracking_number text UNIQUE
);

CREATE TABLE public.lg_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  created_by uuid,
  shipment_id uuid REFERENCES public.lg_shipments(id),
  driver_user_id uuid,
  vehicle_tag text,
  starts_at timestamptz,
  ends_at timestamptz
);

CREATE TABLE public.lg_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  created_by uuid,
  shipment_id uuid REFERENCES public.lg_shipments(id),
  occurred_at timestamptz DEFAULT now(),
  status text,
  location text,
  details jsonb DEFAULT '{}'::jsonb
);

CREATE VIEW public.customer_directory_stats AS
SELECT
  d.id AS directory_customer_id,
  COUNT(s.id) AS shipment_count,
  COALESCE(SUM(s.total_amount), 0) AS total_amount,
  COALESCE(SUM(s.paid_amount), 0) AS paid_amount,
  COALESCE(SUM(GREATEST(COALESCE(s.total_amount, 0) - COALESCE(s.paid_amount, 0), 0)), 0) AS outstanding,
  MAX(s.created_at) AS last_shipment_at
FROM public.customer_directory d
LEFT JOIN public.shipments s
  ON s.directory_customer_id = d.id
GROUP BY d.id;

-- Helper RPCs
-- find_directory_customer_by_phone(p_phone text)
-- track_shipment(p_id text)
-- admin_list_customers_public()
-- admin_list_shipments_public()
-- admin_upsert_customer_public(...)
-- admin_delete_customer_public(p_id uuid)
-- admin_upsert_shipment_public(p_payload jsonb)
-- admin_delete_shipment_public(p_id text)
`;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { supabaseSchema };
}

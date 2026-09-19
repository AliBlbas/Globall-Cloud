-- 20260902_create_core_logistics_tables.sql
-- Initial core tables for Globall Cloud logistics control-plane
-- Creates shipments, packages, status history, proofs, warehouse receipts/movements,
-- notification outbox and payment sessions. Uses pgcrypto for UUIDs and PostGIS for GPS.

BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

-- Shipments: source of truth for shipment state and routing
CREATE TABLE IF NOT EXISTS public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_code varchar(64) UNIQUE NOT NULL,
  origin jsonb, -- {hub, address, lat, lng}
  destination jsonb, -- {city, address, lat, lng}
  operational_status text, -- human status (pending, in_transit, customs, out_for_delivery, delivered, cancelled)
  current_step_index int DEFAULT 0,
  route_id uuid NULL,
  eta timestamptz NULL,
  total_amount numeric(14,2) DEFAULT 0,
  paid_amount numeric(14,2) DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shipments_tracking_idx ON public.shipments (tracking_code);
CREATE INDEX IF NOT EXISTS shipments_status_idx ON public.shipments (operational_status);
CREATE INDEX IF NOT EXISTS shipments_created_at_idx ON public.shipments (created_at);

-- Shipment packages: items associated with a shipment
CREATE TABLE IF NOT EXISTS public.shipment_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  package_code varchar(64) NULL,
  barcode varchar(128) NULL,
  weight_kg numeric(10,3) NULL,
  length_cm numeric(10,3) NULL,
  width_cm numeric(10,3) NULL,
  height_cm numeric(10,3) NULL,
  declared_value numeric(14,2) DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shipment_packages_shipment_idx ON public.shipment_packages (shipment_id);
CREATE INDEX IF NOT EXISTS shipment_packages_code_idx ON public.shipment_packages (package_code);

-- Shipment status history (append-only event ledger)
CREATE TABLE IF NOT EXISTS public.shipment_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  status_key text NOT NULL, -- machine key (placed, picked_up, in_transit, customs, out_for_delivery, delivered)
  status text NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  location geometry(Point,4326) NULL,
  actor_id uuid NULL, -- staff / system / driver id
  meta jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS shipment_status_history_ship_idx ON public.shipment_status_history (shipment_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS shipment_status_history_occurred_idx ON public.shipment_status_history (occurred_at DESC);
CREATE INDEX IF NOT EXISTS shipment_status_history_geo_gist ON public.shipment_status_history USING GIST (location);

-- Delivery proofs (photo + GPS + device metadata), hashed for tamper resistance
CREATE TABLE IF NOT EXISTS public.delivery_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  proof_type text NOT NULL, -- photo, signature, barcode_scan
  storage_path text NOT NULL, -- object storage path / key
  sha256 text NOT NULL, -- hash of stored file
  gps geometry(Point,4326) NULL,
  device_meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS delivery_proofs_shipment_idx ON public.delivery_proofs (shipment_id);
CREATE INDEX IF NOT EXISTS delivery_proofs_created_idx ON public.delivery_proofs (created_at);
CREATE INDEX IF NOT EXISTS delivery_proofs_gist ON public.delivery_proofs USING GIST (gps);

-- Warehouse receipts and movements (chain-of-custody)
CREATE TABLE IF NOT EXISTS public.warehouse_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_code varchar(64) UNIQUE NOT NULL,
  shipment_id uuid NULL REFERENCES public.shipments(id) ON DELETE SET NULL,
  hub text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  handler_id uuid NULL,
  photos jsonb DEFAULT '[]'::jsonb, -- array of storage paths / metadata
  metadata jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS warehouse_receipts_shipment_idx ON public.warehouse_receipts (shipment_id);
CREATE INDEX IF NOT EXISTS warehouse_receipts_hub_idx ON public.warehouse_receipts (hub);

CREATE TABLE IF NOT EXISTS public.warehouse_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  package_id uuid NULL REFERENCES public.shipment_packages(id) ON DELETE SET NULL,
  from_hub text NULL,
  to_hub text NULL,
  movement_type text NOT NULL, -- inbound, outbound, transfer
  occurred_at timestamptz NOT NULL DEFAULT now(),
  gps geometry(Point,4326) NULL,
  photos jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS warehouse_movements_ship_idx ON public.warehouse_movements (shipment_id);
CREATE INDEX IF NOT EXISTS warehouse_movements_geo_gist ON public.warehouse_movements USING GIST (gps);

-- Notification outbox for reliable delivery (workers claim rows with FOR UPDATE SKIP LOCKED)
CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL, -- in_app, email, whatsapp, sms
  recipient text NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, processing, sent, failed
  attempts int NOT NULL DEFAULT 0,
  last_error text NULL,
  locked_at timestamptz NULL,
  next_try timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notification_outbox_status_idx ON public.notification_outbox (status, next_try);
CREATE INDEX IF NOT EXISTS notification_outbox_next_try_idx ON public.notification_outbox (next_try);

-- Payment sessions and webhook events
CREATE TABLE IF NOT EXISTS public.payment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL, -- qicard, fib
  provider_session_id text NULL,
  invoice_id uuid NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'IQD',
  status text NOT NULL DEFAULT 'pending', -- created, pending, succeeded, failed, cancelled
  idempotency_key text NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_sessions_invoice_idx ON public.payment_sessions (invoice_id);
CREATE INDEX IF NOT EXISTS payment_sessions_status_idx ON public.payment_sessions (status);
CREATE INDEX IF NOT EXISTS payment_sessions_provider_idx ON public.payment_sessions (provider);

-- Payment webhook events (idempotent storage)
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_payload jsonb NOT NULL,
  provider_event_id text NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed boolean NOT NULL DEFAULT false,
  processed_at timestamptz NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_webhook_provider_event_uniq ON public.payment_webhook_events (provider, provider_event_id);

-- Utility: update timestamp trigger for updated_at fields
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Attach trigger to tables that have updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'shipments_set_timestamp') THEN
    CREATE TRIGGER shipments_set_timestamp BEFORE UPDATE ON public.shipments FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'notification_outbox_set_timestamp') THEN
    CREATE TRIGGER notification_outbox_set_timestamp BEFORE UPDATE ON public.notification_outbox FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'payment_sessions_set_timestamp') THEN
    CREATE TRIGGER payment_sessions_set_timestamp BEFORE UPDATE ON public.payment_sessions FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();
  END IF;
END$$;

COMMIT;

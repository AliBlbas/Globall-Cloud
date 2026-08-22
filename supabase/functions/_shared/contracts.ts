export const SHIPMENT_STATUSES = ['pending', 'received', 'in_transit', 'customs', 'out_for_delivery', 'delivered', 'cancelled', 'archived'] as const
export type ShipmentStatus = typeof SHIPMENT_STATUSES[number]

export const PAYMENT_STATUSES = ['pending', 'requires_action', 'succeeded', 'failed', 'cancelled', 'refunded'] as const
export type PaymentStatus = typeof PAYMENT_STATUSES[number]

export const QUOTE_STATUSES = ['pending', 'quoted', 'accepted', 'rejected', 'expired', 'cancelled'] as const
export type QuoteStatus = typeof QUOTE_STATUSES[number]

export type JsonObject = Record<string, unknown>

export interface ShipmentContract {
  id: string
  customer_user_id: string | null
  directory_customer_id: string | null
  branch: string
  origin_key: string
  dest_key: string
  type: 'air' | 'sea' | 'land' | string
  operational_status: ShipmentStatus
  current_step_index: number
  assigned_staff_id: string | null
  batch_code: string | null
  eta: string | null
  total_amount: number
  paid_amount: number
  weight_kg: number | null
  volume_cbm: number | null
  items_count: number | null
  created_at: string
}

export interface ShipmentEventContract {
  id: number | string
  shipment_id: string
  event_type: string
  status: ShipmentStatus | null
  location: string | null
  note: string | null
  occurred_at: string
  created_by: string | null
  metadata: JsonObject
}

export interface PackageContract {
  id: string
  shipment_id: string
  tracking_code: string
  description: string | null
  weight_kg: number | null
  volume_cbm: number | null
  quantity: number
  status: string
}

export interface QuoteContract {
  id: string
  customer_user_id: string
  origin_key: string
  dest_key: string
  transport_mode: string
  status: QuoteStatus
  quoted_amount: number | null
  currency: string
  valid_until: string | null
}

export interface InvoiceContract {
  id: string
  shipment_id: string
  invoice_number: string
  total: number
  paid_total: number
  currency: string
  status: string
  due_at: string | null
}

export interface PaymentTransactionContract {
  id: string
  invoice_id: string | null
  provider: 'qicard' | 'fib' | string
  provider_reference: string | null
  amount: number
  currency: string
  status: PaymentStatus
  idempotency_key: string
  created_at: string
}

export interface DeliveryProofContract {
  shipment_id: string
  delivered_at: string | null
  receiver_name: string | null
  note: string | null
}

export interface AuditEventContract {
  id: number | string
  staff_id: string | null
  action: string
  target_id: string | null
  details: JsonObject
  created_at: string
}

export const PRODUCTION_RULES = {
  paymentSettlement: 'Only a verified provider response may move a transaction to succeeded.',
  idempotency: 'Provider callbacks and state transitions must be safe to replay using an idempotency key.',
  ownership: 'Customer data is scoped by customer_user_id; staff operational data is scoped by role and branch.',
  auditability: 'Every operational write records actor, target, action, and structured details.',
} as const

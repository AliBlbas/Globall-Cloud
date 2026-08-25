# Capability map for the attached Globall Cloud brief

The attachment is an enterprise logistics product and implementation brief. It is not, by itself, a complete MCP server specification: it does not define an MCP server name, transport, tool schemas, resource URIs, prompt templates, authentication flow, or host/client integration requirements. It can nevertheless serve as the product specification for a website and Staff OS, and it identifies several capabilities that could later be exposed as protected MCP tools.

| Requested capability | Existing in-place boundary | Safe next website increment | MCP exposure candidate | Dependency or limit |
|---|---|---|---|---|
| Global Operations Control Tower | Staff OS overview plus protected logistics-control-plane reads | Read-only regional status, current shipment counts, critical exceptions, stale tracking and next-action summary | `get_operations_snapshot` | Must use bounded protected reads; no invented KPI values |
| Shipment 360 | Protected shipments, events, packages, route legs, customs, documents and exceptions | Unified shipment detail drawer/page with ownership and branch scope | `get_shipment_360` | Requires a synthetic staff account for authenticated click-through verification |
| Package QR/barcode chain of custody | shipment_packages and warehouse_movements contracts | Scan-ready package lookup and movement history | `get_package_chain_of_custody` | Barcode generation/scanning provider and device testing may remain separate |
| Warehouse receiving/photo proof | warehouse receipts, photos, GPS and customer visibility already exist | Receiving checklist and package-level evidence summary | `get_receipt_evidence` | OCR/AI requires provider credentials; no production uploads by default |
| Consolidation and manifest | consolidation batches/items and shipment manifests | Batch health, package reconciliation and manifest status view | `get_consolidation_status` | No fictional weight/CBM; only real rows |
| Customs | shipment customs cases and protected logistics reads | Customs checklist, hold reason and missing-document summary | `get_customs_case` | HS-code library/provider is not currently configured |
| Finance Control | Protected finance aggregation, invoices, payments and reconciliation | Branch/currency filters and profitability read model | `get_finance_summary` | Financial writes and payment callbacks require explicit staging/provider tests |
| Driver/Delivery OS | Driver GPS and delivery-related contracts | Role-specific mobile read surface and proof state | `get_driver_jobs` | Offline sync, signature and push need dedicated validation/provider work |
| Live shipment map | Coordinates and map-ready links | Real-coordinate map panel with freshness and ETA | `get_live_shipment_location` | Map tile provider/key/terms must be selected before live map tiles |
| Event-driven alerts | Protected alert feed, dedupe migration and outbox foundations | Control-tower alert grouping and next-action routing | `get_logistics_alerts` | Scheduler/fan-out remains opt-in; external channels need credentials |
| AI Logistics Assistant | No verified operational LLM query boundary in the current brief | First add a narrow read-only query contract with allow-listed intents | `query_logistics_assistant` | Must be read-only, bounded, audited and model/provider-configured |
| Customer Portal | Customer-self, shipment/timeline, receipt evidence and notifications | Customer shipment 360 and evidence timeline polish | `get_customer_shipments` | Requires dedicated synthetic customer account for authenticated proof |
| Intelligent quote engine | Public quote and protected pricing/quote contracts | Explainable quote inputs and server-calculated estimate display | `calculate_quote_preview` | Must not invent rates; pricing data must exist and writes remain controlled |
| Document Vault | Protected document access/storage and shipment documents | Verification/version/status filters and safe signed links | `get_document_vault` | Storage/provider and signed URL behavior require authenticated testing |
| Analytics/BI | Existing report RPC and read models | Real-data operational trend summaries with source labels | `get_logistics_report` | No charts without sufficient real data; no fabricated benchmarks |
| Public trust layer | Existing public homepage, tracking, quote and WhatsApp CTA | Clear service architecture and primary conversion hierarchy | Not an MCP tool | Marketing copy can be improved without exposing operations data |
| Release synchronization | GitHub, Supabase, Cloudflare and existing release checks | Stronger exact-commit and live-health evidence | Not an MCP tool | Deployment and account permissions remain external constraints |

## Recommended next increment

The smallest high-value increment is a **read-only Global Operations Control Tower** inside the existing Staff OS. It can be built from the current protected `logistics-control-plane` shipment and alert reads without adding a new table, without enabling a scheduler, and without creating production business rows. It should show only real, bounded data: active shipment count, in-transit count, critical/high attention count, stale-tracking count, open exception count, branch/region grouping, and a prioritized next-action list. When no rows exist, the interface must state that no data exists.

## MCP decision

To create a real MCP for this product, the user must later provide or approve the MCP boundary: the intended host/client, transport (stdio or HTTP), authentication method, tool names and schemas, allowed read/write operations, deployment target, and whether tools may access the existing Supabase project through a server-side connector. Until those details are supplied, the safe action is to improve the existing website and keep any future MCP surface read-only and server-side.

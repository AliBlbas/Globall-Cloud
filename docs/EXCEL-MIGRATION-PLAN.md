# Excel migration — phase 1

## Goal

Turn `WSHKANIcopy.xlsx` from a manually maintained operational ledger into a reviewable, lineage-preserving staging input. Phase 1 does not overwrite production customer, shipment, invoice, payment, or cash records.

## What is now in the repository

- `scripts/prepare_excel_migration.py` reads the workbook in read-only business terms and emits a lossless `rows.ndjson` plus `manifest.json`.
- `supabase/migrations/20261101000100_excel_import_staging_v1.sql` creates private staging tables for batches and source rows. It grants access only to `service_role`.

Run locally:

```bash
python3 scripts/prepare_excel_migration.py \
  /home/ubuntu/upload/WSHKANIcopy.xlsx \
  --output /tmp/globall-excel-stage
```

The generated row records preserve `source_sheet`, `source_row`, `raw_values`, normalized date/GC candidates, and warnings. Generated exports are review artifacts and must not be committed because they contain customer and finance data.

## Source-to-system mapping

| Workbook area | Existing target surface | Phase-two decision needed |
|---|---|---|
| `2026wshkani barekra`, `baraurd` | `shipments`, `shipment_packages`, `shipment_cargo_items`, `shipment_financial_ledger` | Deduplicate by stable shipment/reference and approve customer matches |
| `qard `, `7ISAB`, `7ISAB DARGUL` | customer finance/receivable ledger and `customer_directory` | Resolve party aliases, branch, and currency semantics |
| `QASA HAWLER`, `QASA DUBAI` | `ledger_cash_entries`, `ledger_transfers`, `company_cost_entries` | Reconcile duplicate Dubai/Hawler blocks and choose base-currency policy |
| `ROZHANA` | `company_cost_entries` | Categorize free-text expenses and confirm missing dates/amounts |
| `---`, `مانگانە`, `BARAWRD MANGANA` | reporting views | Recompute from transaction facts; do not import formula cells as source truth |

## Review gates before committing business data

1. Verify the workbook SHA-256 and retain the original file as an immutable source artifact.
2. Resolve rows with missing customer, date, currency, amount, or shipment references.
3. Review date outliers, especially apparent 2027 values in historical blocks.
4. Normalize currencies and record effective exchange rates separately from transactions.
5. Deduplicate customers and generate stable GC/customer aliases.
6. Match shipment rows to existing `customer_directory` and `shipments` records before any upsert.
7. Reconcile cash, receivables, shipment totals, and monthly rollups against the workbook.
8. Approve the batch in the staff console; only then run a controlled import through a server-side function.

## Security boundary

The staging tables are in the private schema and are not exposed to browser clients. No workbook value should be inserted into public tables from a client-side page. The eventual import must be server-side, idempotent, auditable, and scoped to an approved batch.

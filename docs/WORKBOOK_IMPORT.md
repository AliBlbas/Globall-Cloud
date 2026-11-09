# Excel workbook import and reconciliation

`WSHKANI(2).xlsx` is an operational workbook containing warehouse cargo, customer debts, daily expenses, branch cash ledgers, and monthly profit summaries. It is **private business data** and must not be committed to this repository or uploaded to a public GitHub repository.

## Safe audit

Run the local audit utility with Python and LibreOffice installed:

```bash
python3 scripts/audit-workbook.py \
  "/path/to/WSHKANI(2).xlsx" \
  --out /tmp/globall-workbook-audit.json
```

The utility repairs the workbook in a temporary directory when strict XLSX readers reject its stylesheet XML. It emits only sheet structure, row/column counts, sample metadata, and a suggested domain. It does not export private rows, upload the workbook, or write to Supabase.

## Reconciliation mapping

| Workbook sheet | Review domain | Safe system boundary |
|---|---|---|
| `2026wshkani barekra` | warehouse cargo / shipment intake | Review GC codes, date, type, cartons, pieces, weight, and price before creating `shipments` or `warehouse_receipts`. |
| `7ISAB` and `7ISAB DARGUL` | customer debts and cargo accounts | Match a customer identity first; never infer a customer account from a free-text name alone. |
| `qard ` | Hawler/Dubai debt ledgers | Keep branch, currency, status, and due date separate before importing invoices or balances. |
| `ROZHANA` | daily expenses | Confirm accounting period and currency before importing finance transactions. |
| `QASA DUBAI` and `QASA HAWLER` | branch cashier balances | Keep Dubai and Hawler ledgers separate; reconcile IQD and USD independently. |
| `baraurd`, `مانگانە`, and `BARAWRD MANGANA` | profit/loss summaries | Use for reconciliation and reporting, not as a source of operational shipment rows. |

## Import safety rules

1. Keep the original workbook offline and make a dated backup before any correction.
2. Import operational cargo only after duplicate detection on GC code, date, batch, and customer identity.
3. Import debts and balances only after customer-directory matching and branch/currency confirmation.
4. Do not overwrite existing shipment, invoice, payment, or warehouse-receipt rows from a spreadsheet import. Use a review queue or an idempotency key.
5. Preserve the workbook as an audit source; the application database remains the source of truth after an approved import.
6. Use the existing authenticated Edge Functions and RLS boundaries for approved imports; never put a service-role key in the browser.

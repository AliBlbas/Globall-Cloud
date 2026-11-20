CREATE INDEX IF NOT EXISTS excel_import_batches_approved_by_idx
  ON public.excel_import_batches (approved_by);

CREATE INDEX IF NOT EXISTS excel_import_batches_created_by_idx
  ON public.excel_import_batches (created_by);

CREATE INDEX IF NOT EXISTS excel_import_rows_reviewed_by_idx
  ON public.excel_import_rows (reviewed_by);

CREATE INDEX IF NOT EXISTS exchange_rates_updated_by_idx
  ON public.exchange_rates (updated_by);

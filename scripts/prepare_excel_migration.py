#!/usr/bin/env python3
"""Prepare a reviewable, lossless staging export from the legacy logistics workbook.

This script never writes to Supabase and never imports directly into production tables.
It preserves source sheet/row lineage, captures raw values, and emits normalized
candidates plus warnings for human review before database import.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import math
import re
from pathlib import Path
from typing import Any

from openpyxl import load_workbook


MEANINGFUL_LIMIT = 50
DATE_RE = re.compile(r"^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$")
GC_RE = re.compile(r"^GC[- ]?(\d+)$", re.I)


def clean(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (dt.datetime, dt.date)):
        return value.isoformat()
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    if isinstance(value, str):
        value = " ".join(value.replace("\u00a0", " ").split())
        return value or None
    return value


def normalize_gc(value: Any) -> str | None:
    text = str(clean(value) or "").strip().upper().replace(" ", "")
    match = GC_RE.match(text)
    return f"GC-{match.group(1)}" if match else None


def parse_date(value: Any) -> tuple[str | None, str | None]:
    value = clean(value)
    if value is None:
        return None, None
    if isinstance(value, str):
        m = DATE_RE.match(value)
        if m:
            day, month, year = map(int, m.groups())
            if year < 100:
                year += 2000
            try:
                parsed = dt.date(year, month, day)
            except ValueError:
                return None, "invalid_date"
            if parsed > dt.date.today() + dt.timedelta(days=370):
                return parsed.isoformat(), "future_date_outlier"
            return parsed.isoformat(), None
    if isinstance(value, str) and re.match(r"^\d{4}-\d{2}-\d{2}", value):
        try:
            parsed = dt.date.fromisoformat(value[:10])
            if parsed > dt.date.today() + dt.timedelta(days=370):
                return parsed.isoformat(), "future_date_outlier"
            return parsed.isoformat(), None
        except ValueError:
            pass
    return None, "unparsed_date"


def row_nonempty(values: list[Any]) -> bool:
    return sum(v is not None and v != "" for v in values) >= 2


def sheet_rows(ws):
    rows = []
    for row_number, row in enumerate(ws.iter_rows(values_only=True), start=1):
        values = [clean(v) for v in row]
        if row_nonempty(values):
            rows.append((row_number, values))
    return rows


def classify(sheet_name: str) -> str:
    name = sheet_name.lower().strip()
    if "wshkani" in name or "baraurd" in name:
        return "shipment_intake"
    if "qard" in name or "7isab" in name:
        return "receivables"
    if "qasa" in name:
        return "cash_ledger"
    if "rozhana" in name:
        return "expenses"
    if "mangana" in name or name == "---":
        return "rollup"
    return "unclassified"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    wb = load_workbook(args.input, data_only=False, read_only=False)
    source_sha = hashlib.sha256(args.input.read_bytes()).hexdigest()
    args.output.mkdir(parents=True, exist_ok=True)
    rows_path = args.output / "rows.ndjson"
    manifest_path = args.output / "manifest.json"

    manifest = {
        "source_file": args.input.name,
        "source_sha256": source_sha,
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "mode": "review_only",
        "sheets": [],
        "totals": {"rows": 0, "warnings": 0},
    }

    with rows_path.open("w", encoding="utf-8") as out:
        for ws in wb.worksheets:
            rows = sheet_rows(ws)
            sheet_info = {
                "name": ws.title,
                "category": classify(ws.title),
                "used_rows": ws.max_row,
                "used_columns": ws.max_column,
                "meaningful_rows": len(rows),
                "first_row": rows[0][0] if rows else None,
                "last_row": rows[-1][0] if rows else None,
            }
            manifest["sheets"].append(sheet_info)
            for row_number, values in rows:
                warnings: list[str] = []
                normalized: dict[str, Any] = {}
                for idx, value in enumerate(values):
                    if value is None:
                        continue
                    date_value, date_warning = parse_date(value)
                    if date_value:
                        normalized[f"date_col_{idx + 1}"] = date_value
                    if date_warning:
                        warnings.append(f"{date_warning}:col_{idx + 1}")
                    gc = normalize_gc(value)
                    if gc:
                        normalized.setdefault("gc_codes", []).append(gc)
                if len(values) >= 1 and not any(normalized.get("gc_codes", [])):
                    if classify(ws.title) in {"shipment_intake", "receivables"}:
                        warnings.append("no_gc_code_candidate")
                if not any(v is not None for v in values):
                    warnings.append("empty_row")
                record = {
                    "source_sheet": ws.title,
                    "source_row": row_number,
                    "category": classify(ws.title),
                    "raw_values": values,
                    "normalized_candidates": normalized,
                    "warnings": sorted(set(warnings)),
                }
                out.write(json.dumps(record, ensure_ascii=False, default=str) + "\n")
                manifest["totals"]["rows"] += 1
                manifest["totals"]["warnings"] += len(record["warnings"])

    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"manifest": str(manifest_path), "rows": str(rows_path), "totals": manifest["totals"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()

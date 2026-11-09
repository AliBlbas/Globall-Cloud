#!/usr/bin/env python3
"""Audit a Globall Cloud Excel workbook without publishing private rows.

The supplied workbook was produced by Excel with stylesheet XML that strict
openpyxl rejects. LibreOffice is used as a local repair/read bridge. The
script writes only a structural audit and optional local CSV extracts; it
never uploads or commits workbook contents.
"""
from __future__ import annotations

import argparse
import csv
import json
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path
from typing import Any

from openpyxl import load_workbook


def repaired_copy(source: Path, work: Path) -> Path:
    try:
        load_workbook(source, read_only=True, data_only=False).close()
        return source
    except Exception:
        out = work / "repaired"
        profile = work / "lo-profile"
        out.mkdir(parents=True, exist_ok=True)
        profile.mkdir(parents=True, exist_ok=True)
        command = [
            "libreoffice", "--headless",
            f"-env:UserInstallation=file://{profile}",
            "--convert-to", "xlsx", "--outdir", str(out), str(source),
        ]
        subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        repaired = out / source.name
        if not repaired.exists():
            raise RuntimeError("LibreOffice did not produce a repaired workbook")
        return repaired


def nonempty(row: tuple[Any, ...]) -> bool:
    return any(value not in (None, "") for value in row)


def sheet_audit(ws, sample_rows: int = 5) -> dict[str, Any]:
    rows = []
    nonempty_rows = 0
    max_nonempty_col = 0
    for row in ws.iter_rows(values_only=True):
        if nonempty(row):
            nonempty_rows += 1
            for index, value in enumerate(row, start=1):
                if value not in (None, ""):
                    max_nonempty_col = max(max_nonempty_col, index)
            if len(rows) < sample_rows:
                rows.append(list(row[: min(max(20, max_nonempty_col), 20)]))
    return {
        "title": ws.title,
        "reported_rows": ws.max_row,
        "reported_columns": ws.max_column,
        "nonempty_rows": nonempty_rows,
        "nonempty_columns": max_nonempty_col,
        "sample_rows": rows,
    }


def suggested_domain(title: str) -> str:
    key = title.lower().strip()
    if "wshkani" in key or "barekra" in key:
        return "warehouse_receipts_or_shipments"
    if "qard" in key or "7isab" in key:
        return "debts_and_customer_accounts"
    if "rozhana" in key:
        return "daily_expenses"
    if "qasa" in key:
        return "cashier_and_branch_balances"
    if "baraurd" in key or "mangana" in key:
        return "monthly_profit_and_loss"
    return "review_required"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("workbook", type=Path)
    parser.add_argument("--out", type=Path, default=Path("workbook-audit.json"))
    args = parser.parse_args()
    source = args.workbook.expanduser().resolve()
    if not source.exists():
        raise SystemExit(f"Workbook not found: {source}")
    with tempfile.TemporaryDirectory(prefix="globall-workbook-") as tmp:
        repaired = repaired_copy(source, Path(tmp))
        wb = load_workbook(repaired, read_only=True, data_only=False)
        sheets = []
        for ws in wb.worksheets:
            result = sheet_audit(ws)
            result["suggested_domain"] = suggested_domain(ws.title)
            sheets.append(result)
        report = {
            "source_file": source.name,
            "source_size_bytes": source.stat().st_size,
            "read_via": "direct-openpyxl" if repaired == source else "libreoffice-repaired-copy",
            "private_rows_exported": False,
            "sheets": sheets,
            "mapping_notes": {
                "warehouse_receipts_or_shipments": "Review GC code, date, type, carton, quantity, weight and price before importing into shipments or warehouse_receipts.",
                "debts_and_customer_accounts": "Requires customer identity confirmation before linking to customer_directory or invoices.",
                "daily_expenses": "Import only after confirming currency and accounting period.",
                "cashier_and_branch_balances": "Keep branch and currency separated; do not merge Dubai and Hawler balances.",
                "monthly_profit_and_loss": "Use as reconciliation input, not as a source of operational shipment rows.",
            },
        }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2, default=str) + "\n")
    print(json.dumps({"output": str(args.out), "sheets": len(sheets), "read_via": report["read_via"]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

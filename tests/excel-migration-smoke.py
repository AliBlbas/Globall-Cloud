#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys
import tempfile
import json

ROOT = Path(__file__).resolve().parents[1]
workbook = Path('/home/ubuntu/upload/WSHKANIcopy.xlsx')
if not workbook.exists():
    print('SKIP: workbook not present')
    raise SystemExit(0)

with tempfile.TemporaryDirectory(prefix='globall-excel-smoke-') as tmp:
    result = subprocess.run([
        sys.executable,
        str(ROOT / 'scripts' / 'prepare_excel_migration.py'),
        str(workbook),
        '--output', tmp,
    ], check=True, capture_output=True, text=True)
    summary = json.loads(result.stdout)
    manifest = json.loads((Path(tmp) / 'manifest.json').read_text())
    assert manifest['totals']['rows'] > 0
    assert len(manifest['sheets']) == 11
    assert summary['totals']['rows'] == manifest['totals']['rows']
    assert (Path(tmp) / 'rows.ndjson').stat().st_size > 0
    print('PASS Excel migration staging smoke')

#!/usr/bin/env python3
"""Validate first-party assets referenced by the service worker and HTML middleware."""
from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parents[1]
errors: list[str] = []

sw = (root / "sw.js").read_text(encoding="utf-8")
static_prefix = sw.split("const BROWSER_COMPAT_CSS=", 1)[0]
assets = re.findall(r"'(/[^']+)'", static_prefix)
for asset in assets:
    path = asset.split("?", 1)[0].lstrip("/")
    if path and not (root / path).is_file():
        errors.append(f"service-worker asset is missing: {asset}")

middleware = (root / "functions" / "_middleware.js").read_text(encoding="utf-8")
for asset in re.findall(r'''(?:href|src)=["'](/[^?"']+)''', middleware):
    if not (root / asset.lstrip("/")).is_file():
        errors.append(f"middleware asset is missing: {asset}")

for html_path in root.rglob("*.html"):
    if ".git" in html_path.parts:
        continue
    html = html_path.read_text(encoding="utf-8", errors="ignore")
    if re.search(r"\s+on(?:click|change|submit|keydown|keyup|input|load|error|focus|blur|mouseover|mouseout)\s*=", html, re.I):
        errors.append(f"inline event attribute found: {html_path.relative_to(root)}")

if errors:
    for error in errors:
        print(f"FAIL {error}")
    sys.exit(1)

print(f"PASS asset integrity ({len(assets)} service-worker assets; middleware and HTML surfaces checked)")

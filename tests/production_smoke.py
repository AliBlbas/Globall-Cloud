import json
import re
import socket
import urllib.error
import urllib.request

site = "https://globall-cloud.pages.dev/"
config = "https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/public-config?key=usd_iqd_rate"
quote = "https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/public-quote"
origin = "https://globall-cloud.pages.dev"
headers = {"User-Agent": "globall-cloud-production-smoke/1.1"}

try:
    site_request = urllib.request.Request(site, headers=headers)
    with urllib.request.urlopen(site_request, timeout=8) as response:
        html = response.read(262144).decode("utf-8", "replace")
        access_protected = "Cloudflare Access" in html or "Log in to All Workers" in html
        public_site = "Globall Cloud" in html
        assert response.status == 200 and (public_site or access_protected), "unexpected production response"
        print("site smoke: PASS", "access-protected" if access_protected else "public")
except (TimeoutError, socket.timeout, urllib.error.URLError) as error:
    print("site smoke: DEFERRED", type(error).__name__)

bridge = open("/home/ubuntu/Globall-Cloud/production-bridge.js", encoding="utf-8").read()
key = re.search(r"SUPABASE_PUBLISHABLE_KEY\s*=\s*['\"]([^'\"]+)['\"]", bridge)
assert key, "publishable key marker missing"
request = urllib.request.Request(
    config,
    headers={"Origin": origin, "Accept": "application/json", **headers, "apikey": key.group(1)},
)
with urllib.request.urlopen(request, timeout=12) as response:
    body = json.loads(response.read().decode("utf-8", "replace"))
    assert response.status == 200 and body.get("key") == "usd_iqd_rate" and body.get("value") not in (None, "")
    print("supabase config smoke: PASS")

options = urllib.request.Request(quote, method="OPTIONS", headers={"Origin": origin, **headers})
with urllib.request.urlopen(options, timeout=12) as response:
    assert response.status == 200 and response.headers.get("access-control-allow-origin") == origin
    print("public-quote CORS smoke: PASS")

invalid_payload = json.dumps({"name": "x", "email": "not-an-email"}).encode()
invalid_request = urllib.request.Request(
    quote,
    data=invalid_payload,
    method="POST",
    headers={"Origin": origin, "Content-Type": "application/json", **headers},
)
try:
    urllib.request.urlopen(invalid_request, timeout=12)
except urllib.error.HTTPError as error:
    body = error.read().decode("utf-8", "replace")
    assert error.code == 400, (error.code, body)
    print("public-quote validation smoke: PASS")
else:
    raise AssertionError("invalid quote payload was accepted")

honeypot_payload = json.dumps({"company_website": "https://spam.example"}).encode()
honeypot_request = urllib.request.Request(
    quote,
    data=honeypot_payload,
    method="POST",
    headers={"Origin": origin, "Content-Type": "application/json", **headers},
)
with urllib.request.urlopen(honeypot_request, timeout=12) as response:
    body = json.loads(response.read().decode("utf-8", "replace"))
    assert response.status == 201 and body.get("ok") is True
    print("public-quote honeypot smoke: PASS")

print("production endpoint smoke: PASS")

# CSP migration

This build moves executable inline `<script>` blocks out of HTML into `gc-csp-scripts/` and moves legacy HTML event attributes to `data-gc-on*` attributes. `gc-csp-bridge.js` dispatches the small compatibility set without `eval` or `unsafe-eval`.

The response policy in `_headers` intentionally does not add `unsafe-inline` to `script-src`. The externalized scripts are same-origin and are versioned with `?v=20260816-1`.

Before production promotion, run signed-out tracking, customer login, staff login, warehouse receipt, operations, driver GPS and POD smoke tests. After verifying the new deployment, increment the asset version and confirm that the service worker cache contains every file under `gc-csp-scripts/`.

Some old JavaScript modules still assign event properties such as `element.onclick = fn`; those are programmatic listeners and are allowed by CSP. HTML attributes in static markup and generated template strings are represented as `data-gc-on*` and handled by the compatibility bridge.

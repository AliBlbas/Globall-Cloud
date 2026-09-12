const CACHE_VERSION='gc-v98';
const STATIC_CACHE=`gc-static-${CACHE_VERSION}`;
const STATIC_ASSETS=['/','/index.html','/management.html','/status.html','/status-page.js?v=20260908-1','/staff-os.html','/staff-os-v5.html','/staff-manifest.json','/staff-os-v5.css?v=20260905-3','/staff-os-v5.js?v=20260905-3','/staff-os-v5-shipment-create-fix.js?v=20260905-3','/staff-os-v5-shipment-control-bridge.js?v=20260905-1','/staff-os-data-health-panel.js?v=20260905-1','/staff-os-v5-integrations.js?v=20260905-3','/staff-os-v5-profile.js?v=20260905-3','/staff-os-production-analytics-bridge.js?v=20260905-3','/staff-os-v5-stability.js?v=20260905-3','/staff-logistics-intelligence.css?v=20260908-1','/staff-logistics-intelligence.js?v=20260908-1','/staff-os-v2-compat.js?v=20260908-2','/staff-mobile-command-dock.css?v=20260908-1','/staff-mobile-command-dock.js?v=20260908-1','/mobile-premium-responsive-v2026.css?v=20260908-1','/staff-os-pro-20260909.css?v=20260909-1','/staff-os-pro-20260909.js?v=20260909-1','/staff-shell-polish-20260909.css?v=20260909-1','/staff-shell-polish-20260909.js?v=20260909-1','/staff-premium-mobile-20260909.css?v=20260909-1','/staff-premium-mobile-20260909.js?v=20260909-1','/production-mobile-ux-v2026.css','/staff-os-console.js?v=20260826-1','/staff-os-ultra.css?v=20260826-1','/staff-portal.html','/superadmin.html','/super-admin-command-center.html','/accounts-console.html','/operations-suite.html','/logistics-os.html','/operations-command-center.html','/operations-control.html','/operations-control-v2.html','/driver-workspace.html','/customer-portal.html','/gc-csp-scripts/customer-portal-inline-1.js?v=20260825-2','/warehouse-os.html','/warehouse-offline-sync.js?v=20260903-1','/warehouse-receipt-proof.css?v=20260828-1','/control-plane.html','/control-plane.css?v=20260817-1','/control-plane.js?v=20260817-1','/control-plane-data-hub.js?v=20260825-1','/payment-checkout.html','/payment-checkout.css?v=20260816-1','/payment-checkout.js?v=20260816-1','/styles.css','/tracking-styles.css','/tracking-intelligence.css?v=20260908-1','/tracking-intelligence.js?v=20260908-1','/gc-csp-scripts/index-inline-2.js?v=20260826-1','/premium-brand-overrides.css','/site-enhancement-20260824.css?v=20260824-2','/staff-os-premium.css?v=20260825-2','/staff-os-compat.js?v=20260824-5','/site-polish.css','/browser-compat.css','/safari-compat-elite.css','/mobile-final.css','/mobile-polish.css','/mobile-elite.css','/live-logistics-map.css','/live-logistics-map.js','/logo-fix.css','/logo-icon.svg','/production-bridge.js','/production-brand-repair.js','/public-production-safety.js?v=20260908-1','/public-route-bootstrap.js?v=20260909-1','/site-navigation-20260909.css?v=20260909-1','/site-navigation-20260909.js?v=20260909-1','/public-premium-mobile-20260909.css?v=20260909-1','/public-premium-mobile-20260909.js?v=20260909-1','/public-staff-guard-20260909.js?v=20260909-1','/staff-auth-fix.js','/staff-os-enhancements-v2.js?v=20260902-1','/staff-os-fx.js?v=20260903-2','/staff-os-warehouse-notify.js?v=20260902-1','/staff-os-dashboard.js?v=20260902-1','/staff-os-ai-tools.js?v=20260902-1','/operations-events.js','/superadmin.css','/superadmin.js','/superadmin-staff-actions.js','/super-admin-command-center.css','/super-admin-command-center.js','/super-admin-live-control-v2.js?v=20260829-2','/super-admin-elite.css','/super-admin-elite.js','/tracking-enhanced.js','/tracking-enhanced.js?v=20260826-2','/tracking-integration.html','/tracking-route-controller.js?v=20260826-2','/translations.js','/form-validation.js','/form-validation-styles.css','/site-analytics.js?v=20260824-1','/whatsapp-messenger.js','/webhook-handler.js','/admin-dashboard.js','/price-calculator.js','/logo-icon-original.png','/logo-icon.png','/og-image.jpg','/manifest.json','/operations-exception-engine.js','/gc-csp-bridge.js','/gc-csp-scripts/accounts-console-inline-1.js','/gc-csp-scripts/command-center-inline-1.js','/gc-csp-scripts/customer-portal-inline-1.js','/gc-csp-scripts/driver-workspace-inline-1.js','/gc-csp-scripts/index-inline-1.js','/gc-csp-scripts/index-inline-2.js','/gc-csp-scripts/logistics-os-inline-1.js','/gc-csp-scripts/operations-command-center-inline-1.js','/gc-csp-scripts/operations-control-inline-1.js','/gc-csp-scripts/operations-control-v2-inline-1.js','/gc-csp-scripts/operations-suite-inline-1.js','/gc-csp-scripts/staff-os-inline-1.js','/gc-csp-scripts/staff-portal-inline-1.js','/gc-csp-scripts/tracking-integration-inline-1.js','/gc-csp-scripts/warehouse-os-inline-1.js?v=20260828-1','/gc-csp-scripts/warehouse-receipt-proof-enhancement.js?v=20260828-1','/gc-csp-scripts/warehouse-receiving-chain-bridge.js?v=20260828-1'];
const BROWSER_COMPAT_CSS='/browser-compat.css?v=20260816-4';
const SAFARI_ELITE_CSS='/safari-compat-elite.css?v=20260816-4';
const MOBILE_CSS='/mobile-final.css?v=20260812-12';
const MOBILE_POLISH_CSS='/mobile-polish.css?v=20260812-3';
const MOBILE_ELITE_CSS='/mobile-elite.css?v=20260812-1';
const LIVE_MAP_CSS='/live-logistics-map.css?v=20260812-1';
const LIVE_MAP_JS='/live-logistics-map.js?v=20260812-1';
const LOGO_CSS='/logo-fix.css?v=20260816-4';

function upgradeHtml(response){
  const contentType=response.headers.get('content-type')||'';
  if(!contentType.toLowerCase().includes('text/html')) return response;
  return response.text().then((html)=>{
    let out=html;
    out=out.replace(/\/gc-csp-scripts\/index-inline-1\.js\?v=[^"']+/g,'/gc-csp-scripts/index-inline-1.js?v=20260912-6');
    out=out.replace(/\/gc-csp-scripts\/index-inline-2\.js\?v=[^"']+/g,'/gc-csp-scripts/index-inline-2.js?v=20260912-6');
    out=out.replace(/\/public-route-bootstrap\.js\?v=[^"']+/g,'/public-route-bootstrap.js?v=20260912-6');
    if(!out.includes('data-gc-public-hardfix')) out=out.replace(/<\/body>/i,'<script src="/public-hardfix-v2.js?v=20260912-6" defer data-gc-public-hardfix="1"></script></body>');
    const headers=new Headers(response.headers);
    headers.delete('content-encoding');
    headers.delete('content-length');
    headers.delete('etag');
    headers.set('content-type','text/html; charset=UTF-8');
    headers.set('cache-control','no-store, max-age=0, must-revalidate');
    return new Response(out,{status:response.status,statusText:response.statusText,headers});
  });
}

self.addEventListener('install',(event)=>{
  event.waitUntil((async()=>{
    await self.skipWaiting();
    try{
      const cache=await caches.open(STATIC_CACHE);
      await cache.add(new Request('/',{cache:'reload'}));
    }catch(_){ }
  })());
});

self.addEventListener('activate',(event)=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter((key)=>key.startsWith('gc-static-')&&key!==STATIC_CACHE).map((key)=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',(event)=>{
  const request=event.request;
  if(request.method!=='GET') return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin) return;

  if(request.mode==='navigate'){
    event.respondWith(fetch(request,{cache:'no-store'}).then(upgradeHtml));
    return;
  }

  if(['script','style','image','font','worker','manifest'].includes(request.destination)){
    event.respondWith(fetch(request,{cache:'no-store'}).then((response)=>{
      if(response.ok&&request.destination!=='script'){
        const copy=response.clone();
        caches.open(STATIC_CACHE).then((cache)=>cache.put(request,copy)).catch(()=>{});
      }
      return response;
    }).catch(async()=>{
      const cached=await caches.match(request);
      return cached||Response.error();
    }));
  }
});

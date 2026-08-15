/* Globall Cloud — HTML delivery middleware
 * Production runtime + browser compatibility + canonical branding + premium/admin layers.
 */
const HTML_ACCEPT='text/html';
export async function onRequest(context){
  const accept=context.request.headers.get('accept')||'';
  if(!accept.toLowerCase().includes(HTML_ACCEPT))return context.next();
  const requestUrl=new URL(context.request.url); const path=requestUrl.pathname;
  const response=await context.next();
  const contentType=response.headers.get('content-type')||'';
  if(!contentType.toLowerCase().includes(HTML_ACCEPT))return response;
  const rewriter=new HTMLRewriter()
    .on('head',{element(element){
      element.append('<meta name="color-scheme" content="dark light">',{html:true});
      element.append('<link rel="preload" as="image" href="/logo-icon-original.png" fetchpriority="high">',{html:true});
      element.append('<link rel="preload" as="image" href="/logo-icon.svg" fetchpriority="high">',{html:true});
      element.append('<link rel="stylesheet" href="/browser-compat.css?v=20260813-7" data-gc-browser-compat="1">',{html:true});
      element.append('<link rel="stylesheet" href="/safari-compat-elite.css?v=20260813-1" data-gc-safari-elite="1">',{html:true});
      element.append('<link rel="stylesheet" href="/logo-fix.css?v=20260813-8" data-gc-logo-fix="1">',{html:true});
      element.append('<link rel="stylesheet" href="/site-polish.css?v=20260813-4" data-gc-premium-polish="1">',{html:true});
      element.append('<link rel="stylesheet" href="/production-mobile-hotfix.css?v=20260813-1" data-gc-production-mobile-hotfix="1">',{html:true});
      element.append('<script src="/production-brand-repair.js?v=20260813-1" defer data-gc-production-brand-repair="1"></script>',{html:true});
      element.append('<script src="/runtime-guard.js?v=20260815-3" defer data-gc-runtime-guard="1"></script>',{html:true});
      element.append('<link rel="stylesheet" href="/admin-console-enhanced.css?v=20260813-2" data-gc-admin-polish="1">',{html:true});
      element.append('<script src="/admin-console-enhanced.js?v=20260813-2" defer data-gc-admin-recovery="1"></script>',{html:true});
      if(path==='/super-admin-command-center.html'){
        element.append('<link rel="stylesheet" href="/super-admin-elite.css?v=20260813-4" data-gc-superadmin-elite="1">',{html:true});
      }
    }})
    .on('body',{element(element){
      if(path==='/staff-os.html')element.append('<div class="gc-superadmin-entry" style="position:fixed;inset-block-end:18px;inset-inline-start:18px;z-index:9999"><a href="./super-admin-command-center.html" style="display:inline-flex;align-items:center;gap:8px;padding:11px 14px;border-radius:999px;background:linear-gradient(135deg,#67edf5,#12d5e7);color:#03151b;font:800 11px system-ui,sans-serif;box-shadow:0 12px 35px rgba(18,213,231,.22);text-decoration:none">GC · Super Admin</a></div>',{html:true});
      if(path==='/superadmin.html')element.append('<script src="/superadmin-staff-actions.js?v=20260813-3" defer data-gc-superadmin-staff-actions="1"></script>',{html:true});
      if(path==='/super-admin-command-center.html')element.append('<script src="/super-admin-elite.js?v=20260813-4" defer data-gc-superadmin-elite="1"></script>',{html:true});
    }});
  return rewriter.transform(response);
}
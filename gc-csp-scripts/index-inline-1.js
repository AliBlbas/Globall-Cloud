/* Globall Cloud — pre-paint bootstrap.
 * Applies the preferred theme, starts the verified Supabase bridge early,
 * and guarantees that the public UI hydrates even when backend calls are slow.
 */
(function(){
  try{
    var saved = localStorage.getItem('gc-theme');
    var theme = saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    if(theme==='light') document.documentElement.setAttribute('data-theme','light');
  }catch(e){}

  try{
    if(!window.gcSupabase && !document.querySelector('script[data-gc-prepaint-bridge]')){
      var script = document.createElement('script');
      script.src = '/production-bridge.js?v=20260828-1';
      script.async = true;
      script.dataset.gcPrepaintBridge = '1';
      document.head.appendChild(script);
    }
  }catch(e){
    try{ console.warn('[Globall Cloud] Supabase pre-paint bootstrap:', e); }catch(_){}
  }

  function hydratePublicUI(){
    try{
      var renderers = [
        'renderHomeServices',
        'renderBusinessHub',
        'renderDashboardPreview',
        'renderCorridorStrip',
        'renderWarehouseCards',
        'renderOperationsHub',
        'renderHow',
        'renderWhy'
      ];
      for(var i=0;i<renderers.length;i++){
        try{
          var fn = window[renderers[i]];
          if(typeof fn === 'function') fn();
        }catch(e){}
      }
      try{
        if(typeof window.applyI18n === 'function') window.applyI18n();
      }catch(e){}
      try{
        if(!document.querySelector('script[data-gc-site-navigation]')){
          var nav=document.createElement('script');
          nav.src='/site-navigation-20260909.js?v=20260912-2';
          nav.defer=true;
          nav.dataset.gcSiteNavigation='1';
          (document.head || document.documentElement).appendChild(nav);
        }
      }catch(e){}
      document.documentElement.dataset.gcUiHydration='active';
    }catch(e){}
  }

  function startPublicUIRecovery(){
    var delays=[0,150,500,1000,1800,3000,5000];
    for(var i=0;i<delays.length;i++){
      (function(delay){ window.setTimeout(hydratePublicUI,delay); })(delays[i]);
    }
    try{
      window.addEventListener('error',function(){ window.setTimeout(hydratePublicUI,0); },{passive:true});
      window.addEventListener('unhandledrejection',function(){ window.setTimeout(hydratePublicUI,0); },{passive:true});
    }catch(e){}
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',startPublicUIRecovery,{once:true});
  }else{
    startPublicUIRecovery();
  }
})();
/* Globall Cloud — pre-paint bootstrap.
 * Applies the preferred theme and starts the verified Supabase bridge early.
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
})();

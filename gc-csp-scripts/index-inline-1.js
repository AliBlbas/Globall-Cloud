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
    var bridgeStarted = false;
    var loadBridge = function(){
      if(bridgeStarted || window.gcSupabase || document.querySelector('script[data-gc-prepaint-bridge]')) return;
      bridgeStarted = true;
      var script = document.createElement('script');
      script.src = '/production-bridge.js?v=20260926-1';
      script.async = true;
      script.dataset.gcPrepaintBridge = '1';
      document.head.appendChild(script);
    };
    window.gcLoadSupabaseBridge = loadBridge;
    var intent = '[href*="request"], [href*="quote"], [href*="dashboard"], [href*="track"], #gcRateWeight, #gcRateVolume, #gcRequestForm, [data-gc-supabase-intent]';
    ['pointerdown','keydown','focusin'].forEach(function(event){ document.addEventListener(event, function(e){ if(e.target && e.target.closest && e.target.closest(intent)) loadBridge(); }, {passive:true}); });
  }catch(e){
    try{ console.warn('[Globall Cloud] Supabase intent bootstrap:', e); }catch(_){ }
  }
})();

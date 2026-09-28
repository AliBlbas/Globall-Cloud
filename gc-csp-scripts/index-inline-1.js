/* Applies the saved/preferred theme before first paint, so there's no flash of the wrong theme. */
(function(){
  try{
    var saved = localStorage.getItem('gc-theme');
    var theme = saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    if(theme==='light') document.documentElement.setAttribute('data-theme','light');
  }catch(e){}
})();

/* Load the visual redesign after the page stylesheet so it can override the legacy visual layer without changing app logic. */
(function(){
  try{
    var load = function(){
      if(document.getElementById('gcPremiumStyles')) return;
      var link = document.createElement('link');
      link.id = 'gcPremiumStyles';
      link.rel = 'stylesheet';
      link.href = '/gc-premium.css?v=20260928-1';
      document.head.appendChild(link);
    };
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, {once:true});
    else load();
  }catch(e){}
})();

/* Applies the saved/preferred theme before first paint, so there's no flash of the wrong theme. */
(function(){
  try{
    var saved = localStorage.getItem('gc-theme');
    var theme = saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    if(theme==='light') document.documentElement.setAttribute('data-theme','light');
  }catch(e){}
})();

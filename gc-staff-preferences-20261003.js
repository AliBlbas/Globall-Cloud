/* Staff Console preference bridge — visual-only, backend-safe. */
(() => {
  'use strict';
  const THEME='gc-staff-theme';
  const apply=theme=>{
    const next=theme==='light'?'light':'dark';
    localStorage.setItem(THEME,next);
    document.documentElement.dataset.staffTheme=next;
    document.documentElement.style.colorScheme=next;
    const b=document.querySelector('[data-staff-theme]');
    if(b){b.textContent=next==='dark'?'☼ ڕووناک':'☾ تاریک';b.setAttribute('aria-label',next==='dark'?'گۆڕین بۆ دۆخی ڕووناک':'گۆڕین بۆ دۆخی تاریک');}
  };
  const mount=()=>{
    const shell=document.querySelector('.gc-shell');
    if(!shell)return;
    const top=shell.querySelector('.top-actions');
    if(!top||top.querySelector('[data-staff-theme]'))return;
    const b=document.createElement('button');
    b.className='btn'; b.dataset.staffTheme='1'; b.type='button';
    b.onclick=()=>apply(localStorage.getItem(THEME)==='light'?'dark':'light');
    top.insertBefore(b,top.firstChild);
    apply(localStorage.getItem(THEME)||'dark');
  };
  const observer=new MutationObserver(mount);
  observer.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();

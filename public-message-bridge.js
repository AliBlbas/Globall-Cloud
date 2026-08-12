/* Globall Cloud — public contact message bridge
 * Step 7: bypass the legacy direct `messages` insert and submit public
 * contact messages to the hardened Supabase Edge Function instead.
 */
(function(){
  'use strict';

  const ENDPOINT = 'https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/public-message';

  function show(message, tone){
    if(typeof window.showToast === 'function') window.showToast(message, tone || 'error');
    else window.alert(message);
  }

  async function submit(form){
    const name = String(document.getElementById('cName')?.value || '').trim();
    const company = String(document.getElementById('cCompany')?.value || '').trim();
    const email = String(document.getElementById('cEmail')?.value || '').trim();
    const requestType = String(document.getElementById('cType')?.value || '').trim();
    const message = String(document.getElementById('cMsg')?.value || '').trim();
    const honeypot = String(document.getElementById('cHoneypot')?.value || '').trim();
    const button = form.querySelector('button[type=submit]');
    if(button) button.disabled = true;

    try{
      const response = await fetch(ENDPOINT, {
        method:'POST',
        headers:{'Content-Type':'application/json','Accept':'application/json'},
        credentials:'omit',
        cache:'no-store',
        body:JSON.stringify({name, company, email, request_type:requestType, message, company_website:honeypot}),
      });
      let body = null;
      try { body = await response.json(); } catch (_) {}
      if(!response.ok || !body?.ok) throw new Error(body?.error || 'Message could not be sent.');
      form.reset();
      show('پەیامەکەت بە سەرکەوتوویی نێردرا.', 'success');
    }catch(error){
      console.error('[Globall Cloud] Public message:', error);
      const msg = String(error?.message || '');
      show(/Too many requests/i.test(msg)
        ? 'پەیامی زۆر لە کاتێکی کورتدا نێردراوە. تکایە دواتر هەوڵبدەوە.'
        : 'هەڵەیەک ڕوویدا، پەیامەکە نەنێردرا. تکایە دووبارە هەوڵبدەرەوە.', 'error');
    }finally{
      if(button) button.disabled = false;
    }
  }

  function boot(){
    const form = document.querySelector('#page-contact form');
    if(!form || form.dataset.gcMessageBridge === '1') return;
    form.dataset.gcMessageBridge = '1';
    form.addEventListener('submit', function(event){
      event.preventDefault();
      event.stopImmediatePropagation();
      submit(form);
    }, true);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();

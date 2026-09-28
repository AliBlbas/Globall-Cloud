/* Globall Cloud — authenticated customer ↔ support live chat. */
(() => {
  'use strict';
  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const css = `
  #gcSupportLive{position:fixed;inset-inline-end:18px;bottom:86px;z-index:4900;font-family:inherit;color:#f5f9fd}
  #gcSupportLive .gcs-toggle{width:58px;height:58px;border:1px solid rgba(212,175,55,.75);border-radius:19px;background:linear-gradient(145deg,#f8d77b,#c99d27);color:#101a2d;box-shadow:0 16px 36px rgba(0,0,0,.38),0 0 0 5px rgba(212,175,55,.09);font-size:25px;font-weight:900;cursor:pointer}
  #gcSupportLive .gcs-panel{display:none;position:absolute;inset-inline-end:0;bottom:70px;width:min(390px,calc(100vw - 28px));height:min(560px,calc(100dvh - 150px));overflow:hidden;border:1px solid rgba(212,175,55,.42);border-radius:24px;background:linear-gradient(180deg,#102641,#071426);box-shadow:0 30px 80px rgba(0,0,0,.55)}
  #gcSupportLive.open .gcs-panel{display:flex;flex-direction:column}
  #gcSupportLive .gcs-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 17px;background:linear-gradient(135deg,rgba(212,175,55,.18),rgba(7,20,38,.9));border-bottom:1px solid rgba(212,175,55,.2)}
  #gcSupportLive .gcs-head b{font-size:14px}#gcSupportLive .gcs-head small{display:block;color:#a9bfd5;font-size:10px;margin-top:3px}
  #gcSupportLive .gcs-close{border:0;background:transparent;color:#d9e6f2;font-size:24px;cursor:pointer}
  #gcSupportLive .gcs-status{padding:9px 14px;color:#a9bfd5;font-size:10px;border-bottom:1px solid rgba(255,255,255,.06)}
  #gcSupportLive .gcs-status.online{color:#78e6aa}.gcs-status.error{color:#ffabab}
  #gcSupportLive .gcs-msgs{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:9px}
  #gcSupportLive .gcs-msg{max-width:84%;padding:10px 12px;border-radius:15px;background:rgba(255,255,255,.06);font-size:12px;line-height:1.8;white-space:pre-wrap;overflow-wrap:anywhere}
  #gcSupportLive .gcs-msg.mine{align-self:flex-start;background:linear-gradient(135deg,rgba(212,175,55,.25),rgba(212,175,55,.08));border:1px solid rgba(212,175,55,.2)}
  #gcSupportLive .gcs-msg.staff{align-self:flex-end;border:1px solid rgba(124,240,246,.16)}
  #gcSupportLive .gcs-msg time{display:block;color:#8fa7be;font-size:9px;margin-top:3px}
  #gcSupportLive .gcs-empty{margin:auto;text-align:center;color:#a9bfd5;font-size:12px;line-height:1.8}
  #gcSupportLive .gcs-form{display:grid;grid-template-columns:1fr auto;gap:8px;padding:11px;border-top:1px solid rgba(255,255,255,.08)}
  #gcSupportLive textarea{min-height:44px;max-height:110px;resize:vertical;padding:10px;border-radius:13px;border:1px solid rgba(124,240,246,.22);background:#061426;color:#fff;font:inherit;font-size:12px;outline:none}
  #gcSupportLive .gcs-send{border:0;border-radius:13px;padding:0 14px;background:#d4af37;color:#111b2e;font-weight:900;cursor:pointer}#gcSupportLive .gcs-send:disabled{opacity:.55;cursor:wait}
  @media(max-width:520px){#gcSupportLive{inset-inline-end:10px;bottom:78px}#gcSupportLive .gcs-panel{width:calc(100vw - 20px);height:min(600px,calc(100dvh - 130px))}}
  `;
  let client = null;
  let state = { user: null, thread: null, messages: [], channel: null, loading: false };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = value => { const d = new Date(value); return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('ku-IQ',{hour:'2-digit',minute:'2-digit'}); };
  const setStatus = (text, kind='') => { const el = document.querySelector('#gcSupportLive .gcs-status'); if(el){ el.textContent = text; el.className = `gcs-status ${kind}`; } };
  const render = () => {
    const root = document.getElementById('gcSupportLive'); if(!root) return;
    const box = root.querySelector('.gcs-msgs');
    if(!state.messages.length){ box.innerHTML = '<div class="gcs-empty">پەیوەندی بە تیمەکەمان بکە.<br>پرسیارەکەت بنووسە؛ وەڵام بە شێوەی ڕاستەوخۆ دێت.</div>'; return; }
    box.innerHTML = state.messages.map(m => `<div class="gcs-msg ${m.sender_type === 'customer' ? 'mine' : 'staff'}">${esc(m.body)}<time>${m.sender_type === 'customer' ? 'تۆ' : 'پشتیوانی'} · ${esc(fmt(m.created_at))}</time></div>`).join('');
    box.scrollTop = box.scrollHeight;
  };
  const ensureClient = () => { if(!client) client = window.supabase?.createClient?.(SUPABASE_URL, SUPABASE_KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}); return client; };
  const load = async () => {
    if(!state.user) return;
    setStatus('پەیوەندی بە پشتیوانی…');
    const {data: threads, error: threadError} = await client.from('customer_chat_threads').select('id,subject,status,last_message_at,created_at').eq('customer_user_id', state.user.id).neq('status','closed').order('last_message_at',{ascending:false}).limit(1);
    if(threadError) throw threadError;
    state.thread = threads?.[0] || null;
    if(state.thread){ const {data, error} = await client.from('customer_chat_messages').select('id,thread_id,sender_user_id,sender_type,body,created_at,read_at').eq('thread_id',state.thread.id).order('created_at',{ascending:true}).limit(200); if(error) throw error; state.messages=data||[]; subscribe(); }
    else state.messages=[];
    setStatus(state.thread ? 'پشتیوانی online ـە' : 'ئامادەی وەرگرتنی پەیام', state.thread ? 'online' : '');
    render();
  };
  const subscribe = () => {
    if(!state.thread) return;
    if(state.channel) client.removeChannel(state.channel);
    state.channel = client.channel(`customer-support-${state.thread.id}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'customer_chat_messages',filter:`thread_id=eq.${state.thread.id}`},payload=>{ if(!state.messages.some(m=>m.id===payload.new.id)){state.messages.push(payload.new);render();} })
      .subscribe(status=>{ if(status==='SUBSCRIBED') setStatus('پشتیوانی online ـە','online'); if(status==='CHANNEL_ERROR') setStatus('پەیوەندی کاتییە؛ refresh بکە','error'); });
  };
  const send = async event => {
    event.preventDefault(); if(state.loading) return;
    const input = document.querySelector('#gcSupportLive textarea'); const body=input?.value.trim(); if(!body||body.length>4000) return;
    state.loading=true; document.querySelector('#gcSupportLive .gcs-send').disabled=true; setStatus('پەیامەکە دەنێردرێت…');
    try{
      if(!state.thread){ const r=await client.from('customer_chat_threads').insert({customer_user_id:state.user.id,subject:'Customer Support',status:'open',priority:'normal'}).select('id,subject,status,last_message_at,created_at').single(); if(r.error) throw r.error; state.thread=r.data; subscribe(); }
      const r=await client.from('customer_chat_messages').insert({thread_id:state.thread.id,sender_user_id:state.user.id,sender_type:'customer',body,attachments:[]}).select('id,thread_id,sender_user_id,sender_type,body,created_at,read_at').single();
      if(r.error) throw r.error; state.messages.push(r.data); await client.from('customer_chat_threads').update({last_message_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',state.thread.id); input.value=''; setStatus('پەیام نێردرا؛ چاوەڕوانی وەڵام بە','online'); render();
    }catch(error){ console.error('customer live chat',error); setStatus('ناردنی پەیام سەرکەوتوو نەبوو؛ تکایە دووبارە هەوڵ بدە','error'); }
    finally{state.loading=false;document.querySelector('#gcSupportLive .gcs-send').disabled=false;}
  };
  const mount = () => {
    if(document.getElementById('gcSupportLive')) return;
    const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
    const root=document.createElement('section');root.id='gcSupportLive';root.innerHTML='<div class="gcs-panel"><header class="gcs-head"><div><b>پشتیوانی Globall Cloud</b><small>Customer Support · Live</small></div><button class="gcs-close" type="button" aria-label="داخستن">×</button></header><div class="gcs-status">چاوەڕوانی چوونەژوورەوە…</div><div class="gcs-msgs"></div><form class="gcs-form"><textarea maxlength="4000" placeholder="پەیامەکەت بنووسە…" aria-label="پەیام"></textarea><button class="gcs-send" type="submit">ناردن</button></form></div><button class="gcs-toggle" type="button" aria-label="کردنەوەی live support">✦</button>';
    document.body.appendChild(root); root.querySelector('.gcs-toggle').onclick=()=>root.classList.toggle('open'); root.querySelector('.gcs-close').onclick=()=>root.classList.remove('open'); root.querySelector('.gcs-form').onsubmit=send;
  };
  const boot = async () => { mount(); ensureClient(); if(!client) return; const {data:{session}}=await client.auth.getSession(); state.user=session?.user||null; setStatus(state.user?'ئامادەیە بۆ پەیام':'بۆ chat بچۆ ژوورەوە',state.user?'online':''); if(state.user) load().catch(()=>setStatus('نەتوانرا chat بار بکرێت','error')); client.auth.onAuthStateChange((_event,s)=>{state.user=s?.user||null;if(state.user)load().catch(()=>setStatus('نەتوانرا chat بار بکرێت','error'));else{state.thread=null;state.messages=[];setStatus('بۆ chat بچۆ ژوورەوە');render();}}); };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();

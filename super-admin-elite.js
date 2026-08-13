(()=>{'use strict';
const $=id=>document.getElementById(id); const state={lastRefresh:null};
const commands=[['overview','Overview','وێنەی گشتی'],['operations','Operations','shipment و ETA'],['staff','Staff & Roles','ڕۆڵ و branch'],['approvals','Approvals','approval queue'],['finance','Finance','پارە و rate'],['exceptions','Exceptions','risk و delay'],['audit','Audit Trail','audit logs'],['settings','Settings','security و config']];
function openTab(id){const btn=document.querySelector(`.nav[data-tab="${CSS.escape(id)}"]`);btn?.click();}
function setupPalette(){
 const root=document.createElement('div'); root.className='command-palette hidden'; root.innerHTML='<div class="command-box"><div class="command-head"><input id="eliteCommandInput" placeholder="گەڕان لە سیستەم…" autocomplete="off"><span class="command-hint">ESC · ↑↓ · ENTER</span></div><div id="eliteCommandList" class="command-list"></div></div>'; document.body.append(root);
 const input=root.querySelector('#eliteCommandInput'),list=root.querySelector('#eliteCommandList'); let selected=0,items=[];
 const render=()=>{const q=input.value.trim().toLowerCase();items=commands.filter(c=>!q||c.join(' ').toLowerCase().includes(q));selected=Math.min(selected,Math.max(0,items.length-1));list.innerHTML=items.map((c,i)=>`<button type="button" class="command-item ${i===selected?'active':''}" data-cmd="${c[0]}"><span><b>${c[0]}</b><small> · ${c[2]}</small></span><small>${c[1]}</small></button>`).join('')||'<div class="command-item"><span>هیچ ئەنجامێک نەدۆزرایەوە</span></div>';list.querySelectorAll('[data-cmd]').forEach(b=>b.onclick=()=>{openTab(b.dataset.cmd);root.classList.add('hidden')});};
 const close=()=>root.classList.add('hidden'); const open=()=>{root.classList.remove('hidden');input.value='';selected=0;render();setTimeout(()=>input.focus(),20)};
 document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();open()} else if(e.key==='Escape'&&!root.classList.contains('hidden'))close(); else if(!root.classList.contains('hidden')&&e.key==='ArrowDown'){e.preventDefault();selected=Math.min(selected+1,items.length-1);render()} else if(!root.classList.contains('hidden')&&e.key==='ArrowUp'){e.preventDefault();selected=Math.max(selected-1,0);render()} else if(!root.classList.contains('hidden')&&e.key==='Enter'){e.preventDefault();if(items[selected]){openTab(items[selected][0]);close()}}});
 root.addEventListener('click',e=>{if(e.target===root)close()}); input.addEventListener('input',render); render();
 const source=$('command'); if(source){source.addEventListener('focus',open);source.addEventListener('keydown',e=>{if(e.key==='Enter'){open();input.value=source.value;render()}})}
}
function addMeta(){
 const hero=document.querySelector('.hero'); if(hero&&!hero.querySelector('.elite-meta')){const m=document.createElement('div');m.className='elite-meta';m.innerHTML='<span class="elite-chip"><i class="live-pulse"></i> LIVE DATA</span><span class="elite-chip">RLS ENFORCED</span><span class="elite-chip">PRODUCTION</span><span id="eliteFreshness" class="freshness"><i></i> data freshness: —</span>';hero.append(m)}
 const nav=document.querySelector('nav'); if(nav&&!nav.querySelector('.elite-nav-counts')) nav.querySelectorAll('.nav').forEach(btn=>{const b=document.createElement('span');b.className='elite-nav-counts';b.style.cssText='float:inline-end;opacity:.8;font:800 9px ui-monospace,monospace';b.textContent='';btn.append(b)});
}
function updateSignals(){
 state.lastRefresh=new Date(); const fresh=$('eliteFreshness'); if(fresh) fresh.innerHTML='<i></i> data refreshed '+state.lastRefresh.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
 const ex=document.querySelector('[id="exceptions"]'); if(ex){const k=document.querySelectorAll('#exceptions .card').length; const nav=document.querySelector('.nav[data-tab="exceptions"] .elite-nav-counts'); if(nav)nav.textContent=k?String(k):''}
 const ap=document.querySelector('.nav[data-tab="approvals"] .elite-nav-counts'); const approvals=document.querySelectorAll('#approvalCards [data-approve]').length; if(ap)ap.textContent=approvals?String(Math.ceil(approvals/2)):'';
 document.querySelectorAll('.kpi').forEach(k=>{const text=k.innerText||'';k.dataset.state=text.includes('0')?'healthy':text.includes('$0.00')?'healthy':'attention'});
}
function decorateBranches(){document.querySelectorAll('.branch').forEach(b=>{const strong=b.querySelector('strong');const n=parseInt((strong?.textContent||'0').replace(/,/g,''),10)||0;const max=120;b.style.setProperty('--load',Math.min(1,n/max));});}
function observe(){const root=document.querySelector('.tabs'); if(!root)return; const obs=new MutationObserver(()=>{updateSignals();decorateBranches()});obs.observe(root,{subtree:true,childList:true,characterData:true}); setInterval(()=>{const r=$('refresh'); if(r)r.click()},180000)}
function boot(){addMeta();setupPalette();observe();setTimeout(()=>{updateSignals();decorateBranches()},800);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
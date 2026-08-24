(() => {
  'use strict';
  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const FN = `${SUPABASE_URL}/functions/v1/account-admin`;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const fmt = (v) => v == null || v === '' ? '—' : esc(v);
  const date = (v) => v ? new Intl.DateTimeFormat('ku-IQ',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v)) : '—';
  const state = { client:null, session:null, user:null, staff:null, tab:'overview', cache:new Map(), busy:false };
  const tabs = [
    ['overview','داشبۆرد','◈'],['shipments','بارەکان','▣'],['customers','کڕیاران','♙'],['tasks','ئەرکەکان','✓'],['quotes','نرخەکان','◌'],['chat','چات','⌁'],['notifications','ئاگاداری','!'],['warehouse','کۆگا','▤'],['finance','دارایی','₿'],['staff','ستاف','♜'],['activity','چالاکی','◷']
  ];

  function setStatus(text, kind='info') { const el=$('#consoleStatus'); if(el){el.textContent=text;el.dataset.kind=kind;} }
  function isAdmin(){ return ['admin','super_admin','accountant'].includes(String(state.staff?.role||'')); }
  function canOperate(){ return ['admin','super_admin','accountant','warehouse','operations'].includes(String(state.staff?.role||'')); }
  function canChat(){ return ['admin','super_admin','accountant','finance','warehouse','operations','driver'].includes(String(state.staff?.role||'')); }

  async function bootstrapClient(){
    if(window.gcEnsureSupabase){ await window.gcEnsureSupabase(); state.client=window.gcSupabase; return state.client; }
    if(window.supabase?.createClient){ state.client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}); return state.client; }
    throw new Error('Supabase client نەبارکراوە');
  }
  async function api(kind, options={}){
    if(!state.session) throw new Error('Session required');
    const u = new URL(FN); u.searchParams.set('kind',kind);
    const res = await fetch(u,{method:options.method||'GET',headers:{Authorization:`Bearer ${state.session.access_token}`,apikey:SUPABASE_KEY,'Content-Type':'application/json'},body:options.body?JSON.stringify(options.body):undefined,cache:'no-store'});
    const text = await res.text(); let data={}; try{ data=text?JSON.parse(text):{}; }catch{ data={error:text}; }
    if(!res.ok) throw new Error(data?.error || `API ${res.status}`);
    return data;
  }
  async function loadStaffIdentity(){
    const data = await api('staff');
    state.cache.set('staff',data.items||[]);
    state.staff = (data.items||[]).find(x=>String(x.id)===String(state.user?.id)) || null;
    if(!state.staff) throw new Error('ئەم هەژمارە مۆڵەتی staff ـی نییە');
    $('#staffName').textContent=state.staff.full_name||state.user.email||'Staff';
    $('#staffRole').textContent=state.staff.role||'staff';
    $('#staffBranch').textContent=state.staff.branch||'all';
  }
  function renderNav(){
    $('#nav').innerHTML=tabs.map(([id,label,icon])=>`<button class="nav-item ${id===state.tab?'active':''}" data-tab="${id}" type="button"><span>${icon}</span>${label}<b data-count="${id}"></b></button>`).join('');
    $$('#nav .nav-item').forEach(b=>b.addEventListener('click',()=>{state.tab=b.dataset.tab;renderNav();renderTab();}));
  }
  function shell(title,subtitle,actions=''){ return `<div class="section-head"><div><div class="kicker">STAFF COMMAND CENTER</div><h2>${title}</h2><p>${subtitle}</p></div><div class="head-actions">${actions}</div></div><div id="viewBody"></div>`; }
  function table(cols, rows, empty='هیچ داتایەک نییە'){ if(!rows?.length) return `<div class="empty"><strong>${empty}</strong><span>داتا کاتێک دەردەکەوێت کە لە سیستەم تۆمار بکرێت.</span></div>`; return `<div class="table-wrap"><table><thead><tr>${cols.map(c=>`<th>${c[0]}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${c[1](r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; }
  function metric(label,value,detail=''){ return `<div class="metric"><span>${label}</span><strong>${value}</strong><small>${detail}</small></div>`; }

  async function dashboard(){
    const data=await Promise.allSettled(['shipment','customer','receipt','task','quote_requests','notification','chat'].map(api));
    const get=(i)=>data[i].status==='fulfilled'?data[i].value:{};
    const shipments=get(0).items||[], customers=get(1).items||[], receipts=get(2).items||[], tasks=get(3).items||[], quotes=get(4).items||[], notes=get(5).items||[], chat=get(6).rooms||[];
    const active=shipments.filter(x=>!x.step_dates?.delivered && Number(x.current_step_index||0)<5).length;
    const outstanding=shipments.reduce((s,x)=>s+Math.max(0,Number(x.total_amount||0)-Number(x.paid_amount||0)),0);
    $('#view').innerHTML=`${shell('کۆنتڕۆڵ پانێڵی ستاف','هەموو کارە ڕاستەوخۆکان لە یەک شوێن؛ data ـی پارێزراو لە Supabase و Edge Function ـەکانەوە دێت.','<button class="btn primary" id="refreshBtn">نوێکردنەوە</button>')}
      <div class="metrics-grid">${metric('بارە چالاکەکان',active,'shipment')}${metric('کڕیاران',customers.length,'customer_directory')}${metric('ئەرکەکان',tasks.length,'staff tasks')}${metric('داواکاری نرخ',quotes.length,'quote requests')}${metric('وەسڵی کۆگا',receipts.length,'warehouse receipts')}${metric('ئاگاداری',notes.length,'staff notifications')}${metric('ژووری چات',chat.length,'team chat')}${metric('قەرزی بارەکان',outstanding.toFixed(2),'balance')}</div>
      <div class="dashboard-grid"><div class="card"><div class="card-head"><h3>کارە پێویستەکان</h3><span class="muted">Priority</span></div><div class="quick-grid"><button class="quick" data-go="shipments">شوێنکەوتنی بار<span>بینینی بارە نوێکان</span></button><button class="quick" data-go="tasks">ئەرکی نوێ<span>کار بە تیم بسپێرە</span></button><button class="quick" data-go="quotes">نرخی چاوەڕوان<span>داواکاری نرخەکان</span></button><button class="quick" data-go="warehouse">کۆگا<span>وەسڵ و بەڵگە</span></button><button class="quick" data-go="chat">چات<span>گفتوگۆی ناوخۆ</span></button><button class="quick" data-go="finance">دارایی<span>پارە و outstanding</span></button></div></div><div class="card"><div class="card-head"><h3>دۆخی سیستەم</h3><span class="live">● LIVE</span></div><div class="health-list"><div><b>Supabase</b><span class="ok">Connected</span></div><div><b>Account Admin</b><span class="ok">Authenticated</span></div><div><b>Role</b><span>${esc(state.staff.role)}</span></div><div><b>Branch</b><span>${esc(state.staff.branch||'all')}</span></div></div></div></div>`;
    $('#refreshBtn').onclick=()=>renderTab(true); $$('.quick').forEach(b=>b.onclick=()=>{state.tab=b.dataset.go;renderNav();renderTab();});
  }

  async function shipments(){ const data=await api('shipment'); $('#view').innerHTML=shell('بارەکان','بارەکانی 30 ڕۆژی دوایین بۆ بەڕێوەبردنی ئۆپەراسیون.') + table([['Tracking / ID',r=>`<span class="mono">${fmt(r.id)}</span>`],['کڕیار',r=>fmt(r.customer_name)],['ڕێگا',r=>`${fmt(r.origin_key)} → ${fmt(r.dest_key)}`],['بڕ',r=>`${Number(r.total_amount||0).toFixed(2)} ${fmt(r.currency||'USD')}`],['دۆخ',r=>r.step_dates?.delivered||Number(r.current_step_index||0)>=5?'<span class="ok">گەیەنراوە</span>':'<span class="warn">چالاک</span>'],['Created',r=>date(r.created_at)]],data.items||[],'هیچ بارێک لە 30 ڕۆژی دوایین نییە'); }
  async function customers(){ const data=await api('customer'); $('#view').innerHTML=shell('کڕیاران','Directory ـی کڕیاران، هەژمار و shipment summary.') + table([['Code',r=>`<span class="mono">${fmt(r.code)}</span>`],['ناو',r=>fmt(r.name)],['تەلەفۆن',r=>fmt(r.phone)],['شار',r=>fmt(r.city)],['بار',r=>fmt(r.shipment_count)],['قەرز',r=>Number(r.outstanding_amount||0).toFixed(2)],['دۆخ',r=>r.is_active?'<span class="ok">چالاک</span>':'<span class="bad">ناچالاک</span>']],data.items||[],'هیچ کڕیارێک نییە'); }
  async function tasks(){ const data=await api('task'); $('#view').innerHTML=shell('ئەرکەکان','Task queue ـی تیم، بە پێی priority و branch.','<button class="btn primary" id="newTask">+ ئەرکی نوێ</button>') + table([['ئەرک',r=>`<b>${fmt(r.title)}</b><div class="muted">${fmt(r.description)}</div>`],['Priority',r=>`<span class="pill">${fmt(r.priority)}</span>`],['Status',r=>`<span class="${r.status==='done'?'ok':r.status==='blocked'?'bad':'warn'}">${fmt(r.status)}</span>`],['Branch',r=>fmt(r.branch)],['Due',r=>date(r.due_at)],['Assignee',r=>fmt(r.assignee?.full_name||r.assignee_id)]],data.items||[],'هیچ ئەرکێک نییە'); const btn=$('#newTask'); if(btn&&['admin','super_admin','accountant'].includes(state.staff.role)) btn.onclick=taskModal; }
  async function quotes(){ const data=await api('quote_requests'); $('#view').innerHTML=shell('داواکاری نرخەکان','داواکارییەکانی کڕیار بۆ خزمەتگوزاری و نرخ.') + table([['کڕیار',r=>fmt(r.customer_name)],['ڕێگا',r=>`${fmt(r.origin_key)} → ${fmt(r.dest_key)}`],['Mode',r=>fmt(r.transport_mode)],['کێش',r=>fmt(r.weight_kg)],['دۆخ',r=>`<span class="${r.status==='accepted'?'ok':'warn'}">${fmt(r.status)}</span>`],['نرخ',r=>r.quoted_amount?`${r.quoted_amount} ${fmt(r.currency)}`:'—'],['Created',r=>date(r.created_at)]],data.items||[],'هیچ داواکارییەکی نرخ نییە'); }
  async function notifications(){ const data=await api('notification'); $('#view').innerHTML=shell('ئاگادارییەکان','ئاگاداریی تایبەتی بۆ ئەم ستافە.','<button class="btn" id="refreshNotifications">نوێکردنەوە</button>') + (data.items?.length?data.items.map(r=>`<article class="notice ${r.read_at?'':'unread'}"><div><b>${fmt(r.title)}</b><p>${fmt(r.body)}</p><small>${date(r.created_at)}</small></div><button class="btn tiny" data-notify="${r.id}">${r.read_at?'خوێندراوەتەوە':'خوێندراوە'}</button></article>`).join(''):'<div class="empty"><strong>هیچ ئاگادارییەک نییە</strong></div>'); $$('#view [data-notify]').forEach(b=>b.onclick=async()=>{await api('notification',{method:'POST',body:{action:'update',data:{id:b.dataset.notify}}});renderTab();}); $('#refreshNotifications').onclick=()=>renderTab(true); }
  async function chat(){ const data=await api('chat'); const rooms=data.rooms||[]; $('#view').innerHTML=shell('چاتی تیم','گفتوگۆی ناوخۆیی ستاف، پەیامەکان لە Supabase Realtime ـدا دەژین.') + `<div class="chat-layout"><div class="room-list">${rooms.map((r,i)=>`<button class="room ${i===0?'active':''}" data-room="${r.id}"><b>${fmt(r.name)}</b><span>${r.messages?.length||0} messages</span><em>${r.unread_count||0}</em></button>`).join('') || '<div class="empty"><strong>هیچ room ـێک نییە</strong></div>'}</div><div class="chat-card" id="chatCard"></div></div>`; if(rooms[0]) renderRoom(rooms[0]); $$('.room').forEach(b=>b.onclick=()=>{ $$('.room').forEach(x=>x.classList.remove('active'));b.classList.add('active'); const r=rooms.find(x=>x.id===b.dataset.room);renderRoom(r);}); }
  function renderRoom(room){ $('#chatCard').innerHTML=`<div class="card-head"><div><h3>${fmt(room.name)}</h3><span class="muted">${fmt(room.description)}</span></div><span class="live">${room.unread_count||0} unread</span></div><div class="messages">${(room.messages||[]).map(m=>`<div class="message ${String(m.sender_id)===String(state.user.id)?'me':''}"><b>${fmt(m.sender?.full_name||'Staff')}</b><p>${fmt(m.body)}</p><small>${date(m.created_at)}</small></div>`).join('')||'<div class="empty"><strong>هێشتا پەیام نییە</strong></div>'}</div><form id="chatForm" class="composer"><input class="field" id="chatInput" maxlength="4000" placeholder="پەیامەکەت بنووسە…" autocomplete="off"><button class="btn primary">ناردن</button></form>`; $('#chatForm').onsubmit=async(e)=>{e.preventDefault();const body=$('#chatInput').value.trim();if(!body)return;await api('chat',{method:'POST',body:{action:'send',data:{room_id:room.id,body,client_message_id:crypto.randomUUID()}}});chat();}; }
  async function warehouse(){ const data=await api('receipt'); $('#view').innerHTML=shell('کۆگا','وەسڵەکانی وەرگرتنی بار و بەڵگەکانی هاب.','<a class="btn" href="/staff-portal.html#warehouse" target="_blank" rel="noopener">کۆنسۆڵی وردتر</a>') + table([['Batch',r=>`<span class="mono">${fmt(r.batch_code)}</span>`],['Location',r=>fmt(r.location)],['کڕیار',r=>fmt(r.directory_phone)],['Received',r=>date(r.received_at)],['Consolidated',r=>r.consolidated?'<span class="ok">Yes</span>':'<span class="warn">No</span>'],['Photos',r=>fmt((r.photos||[]).length)]],data.items||[],'هیچ وەسڵێک نییە'); }
  async function finance(){ const data=await api('finance'); const s=data.summary||{}; $('#view').innerHTML=shell('دارایی','کورتەی فاکتۆر، پارە و قەرزەکان.') + `<div class="metrics-grid">${metric('Revenue',JSON.stringify(s.revenue||{}),'all')}${metric('Collected',JSON.stringify(s.collected||{}),'all')}${metric('Outstanding',JSON.stringify(s.outstanding||{}),'all')}${metric('Costs',JSON.stringify(s.costs||{}),'all')}${metric('Profit',JSON.stringify(s.profit||{}),'all')}</div>` + table([['Invoice',r=>fmt(r.invoice_number)],['Shipment',r=>fmt(r.shipment_id)],['Total',r=>`${fmt(r.total)} ${fmt(r.currency)}`],['Paid',r=>fmt(r.paid_total)],['Status',r=>`<span class="pill">${fmt(r.status)}</span>`],['Due',r=>date(r.due_at)]],data.invoices||[],'هیچ invoice ـێک نییە'); }
  async function staff(){ const data=state.cache.get('staff')?{items:state.cache.get('staff')} : await api('staff'); state.cache.set('staff',data.items||[]); $('#view').innerHTML=shell('ستاف','کارمەندەکان، role و branch.','<a class="btn" href="/super-admin-command-center.html" target="_blank" rel="noopener">بەڕێوەبردنی Super Admin</a>') + table([['ناو',r=>fmt(r.full_name)],['Role',r=>`<span class="pill">${fmt(r.role)}</span>`],['Branch',r=>fmt(r.branch)],['دۆخ',r=>r.is_active?'<span class="ok">Active</span>':'<span class="bad">Inactive</span>'],['Updated',r=>date(r.updated_at)]],data.items||[],'هیچ ستافێک نییە'); }
  async function activity(){ const data=await api('log'); $('#view').innerHTML=shell('Activity Log','تۆماری کارەکانی ستاف و گۆڕانکارییەکان.') + table([['Staff',r=>fmt(r.staff_name)],['Action',r=>`<span class="mono">${fmt(r.action)}</span>`],['Target',r=>fmt(r.target_id)],['Time',r=>date(r.created_at)]],data.items||[],'Activity log بەتاڵە'); }
  async function taskModal(){ const html=`<div class="modal-backdrop" id="modal"><form class="modal" id="taskForm"><div class="card-head"><div><div class="kicker">NEW TASK</div><h3>ئەرکی نوێ</h3></div><button type="button" class="icon-btn" id="closeModal">×</button></div><label>ناونیشان<input class="field" name="title" required maxlength="180"></label><label>وەسف<textarea class="field" name="description"></textarea></label><div class="form-grid"><label>Priority<select class="field" name="priority"><option>normal</option><option>high</option><option>critical</option><option>low</option></select></label><label>Branch<input class="field" name="branch" value="all"></label></div><label>Due<input class="field" name="due_at" type="datetime-local"></label><button class="btn primary" type="submit">دروستکردن</button></form></div>`; document.body.insertAdjacentHTML('beforeend',html); $('#closeModal').onclick=()=>$('#modal').remove(); $('#taskForm').onsubmit=async(e)=>{e.preventDefault();const f=new FormData(e.target);await api('task',{method:'POST',body:{action:'create',data:{title:f.get('title'),description:f.get('description'),priority:f.get('priority'),branch:f.get('branch'),due_at:f.get('due_at')}}});$('#modal').remove();renderTab();}; }
  async function renderTab(force=false){ if(state.busy)return; state.busy=true; setStatus('داتا نوێ دەکرێتەوە…','loading'); try{ const map={overview:dashboard,shipments,customers,tasks,quotes,chat,notifications,warehouse,finance,staff,activity}; await map[state.tab](force); setStatus(`ئامادە · ${date(new Date())}`,'ok'); }catch(err){ $('#view').innerHTML=shell('هەڵەی کۆنسۆڵ',err.message,'<button class="btn" id="retry">دووبارە هەوڵدان</button>') ; $('#retry').onclick=()=>renderTab(true); setStatus(err.message,'bad'); }finally{state.busy=false;} }

  async function boot(){
    try{
      state.client=await bootstrapClient();
      const {data,error}=await state.client.auth.getSession(); if(error)throw error;
      state.session=data.session;
      if(!state.session){ $('#loginGate').classList.remove('hidden'); return; }
      const {data:ud,error:ue}=await state.client.auth.getUser(); if(ue)throw ue; state.user=ud.user;
      await loadStaffIdentity();
      $('#loginGate').classList.add('hidden'); $('#app').classList.remove('hidden');
      renderNav(); await renderTab();
      state.client.auth.onAuthStateChange((_e,session)=>{state.session=session;if(!session){location.reload();}});
    }catch(err){ $('#loginError').textContent=err.message||'هەڵەیەک ڕوویدا'; $('#loginGate').classList.remove('hidden'); }
  }
  window.addEventListener('DOMContentLoaded',boot);
  window.GCStaffOS={state,renderTab};
})();
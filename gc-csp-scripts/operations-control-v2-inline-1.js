const SUPA_URL='https://ahslifnthiwfkmaswjno.supabase.co';const PUB='sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';const sb=()=>window.supabase?.createClient(SUPA_URL,PUB,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});let client=null,state={session:null,role:'guest',shipments:[],customers:[],receipts:[],staff:[],audit:[],view:'overview'};const $=id=>document.getElementById(id);const money=n=>'$'+Number(n||0).toLocaleString('en-US',{maximumFractionDigits:2});const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
async function api(kind){const s=(await client.auth.getSession()).data.session;if(!s)throw Error('Session required');const r=await fetch(`${SUPA_URL}/functions/v1/operations-admin?kind=${encodeURIComponent(kind)}`,{headers:{Authorization:`Bearer ${s.access_token}`,apikey:PUB},cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||`API ${r.status}`);return d.items||[]}
async function writeShipment(action,data){const s=(await client.auth.getSession()).data.session;if(!s)throw Error('Session required');const r=await fetch(`${SUPA_URL}/functions/v1/operations-admin`,{method:'POST',headers:{Authorization:`Bearer ${s.access_token}`,apikey:PUB,'Content-Type':'application/json'},body:JSON.stringify({kind:'shipments',action,data})});const d=await r.json();if(!r.ok)throw Error(d.error||`API ${r.status}`);return d.item}
function delivered(s){return Boolean(s.step_dates?.delivered)||Number(s.current_step_index||0)>=5}function progress(s){return Math.min(100,Math.round((Number(s.current_step_index||0)/5)*100))}function status(s){return s.operational_status|| (delivered(s)?'delivered':'pending')}
function render(){renderKpis();renderAttention();renderRoutes();renderRecent();renderShipments();renderCustomers();renderReceipts();renderStaff();renderFinance();renderAudit()}
function renderKpis(){const active=state.shipments.filter(s=>!delivered(s)&&status(s)!=='archived').length;const revenue=state.shipments.reduce((a,s)=>a+Number(s.total_amount||0),0);const due=state.shipments.reduce((a,s)=>a+Math.max(0,Number(s.total_amount||0)-Number(s.paid_amount||0)),0);const del=state.shipments.filter(delivered).length;const urgent=state.shipments.filter(s=>s.priority==='urgent').length;const cards=[['Shipments',state.shipments.length],['Active',active],['Delivered',del],['Customers',state.customers.length],['Revenue',money(revenue)],['Outstanding',money(due)]];$('kpis').innerHTML=cards.map(x=>`<div class="kpi"><span>${x[0]}</span><b>${x[1]}</b><small>Live</small></div>`).join('');$('nShip').textContent=state.shipments.length;$('nCust').textContent=state.customers.length;$('nRec').textContent=state.receipts.length;$('nStaff').textContent=state.staff.length;$('attention').innerHTML=`<div class="mini"><b>${urgent}</b><small>Urgent shipments</small></div><div class="mini"><b>${state.shipments.filter(s=>status(s)==='delayed').length}</b><small>Delayed</small></div><div class="mini"><b>${state.shipments.filter(s=>Math.max(0,Number(s.total_amount||0)-Number(s.paid_amount||0))>0).length}</b><small>With outstanding</small></div>`}
function renderAttention(){ }function renderRoutes(){const map={};for(const s of state.shipments){const k=`${s.origin_key||'—'} → ${s.dest_key||'—'}`;map[k]=(map[k]||0)+Number(s.total_amount||0)}$('routes').innerHTML=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([r,v])=>`<div class="mini"><b>${esc(r)}</b><small>${money(v)} revenue</small></div>`).join('')||'<div class="mini">No data</div>'}
function renderRecent(){$('recent').querySelector('tbody').innerHTML=state.audit.slice(0,8).map(x=>`<tr><td>${esc(x.action)}</td><td>${esc(x.staff_name||'')}</td><td class="mono">${esc(x.target_id||'')}</td><td>${new Date(x.created_at).toLocaleString()}</td></tr>`).join('')||'<tr><td colspan="4">No activity</td></tr>'}
function renderShipments(){const q=$('shipSearch')?.value.toLowerCase()||'';const f=$('shipFilter')?.value||'all';let rows=state.shipments.filter(s=>{const text=`${s.id} ${s.customer_name||''} ${s.origin_key||''} ${s.dest_key||''}`.toLowerCase();if(q&&!text.includes(q))return false;if(f==='all')return true;if(f==='delivered')return delivered(s);return status(s)===f});$('shipTable').querySelector('tbody').innerHTML=rows.map(s=>`<tr><td class="mono"><b>${esc(s.id)}</b></td><td>${esc(s.customer_name||'—')}<div class="muted">${esc(s.customer_phone||'')}</div></td><td>${esc(s.origin_key||'—')} → ${esc(s.dest_key||'—')}</td><td>${money(s.total_amount)}<div class="muted">${money(Math.max(0,Number(s.total_amount||0)-Number(s.paid_amount||0)))} due</div></td><td><b>${progress(s)}%</b></td><td><span class="status ${s.priority==='urgent'?'s-red':s.priority==='high'?'s-amber':'s-cyan'}">${esc(s.priority||'normal')}</span></td><td><span class="status ${status(s)==='delayed'?'s-red':delivered(s)?'s-green':'s-cyan'}">${esc(status(s))}</span></td><td>${s.eta?new Date(s.eta).toLocaleString():'—'}</td><td><button class="btn" data-edit="${esc(s.id)}">Edit</button></td></tr>`).join('')||'<tr><td colspan="9">No shipments</td></tr>'}
function renderCustomers(){const q=$('custSearch')?.value.toLowerCase()||'';const rows=state.customers.filter(c=>!q||JSON.stringify(c).toLowerCase().includes(q));$('custTable').querySelector('tbody').innerHTML=rows.slice(0,150).map(c=>`<tr><td class="mono">${esc(c.code||'—')}</td><td><b>${esc(c.name||'—')}</b></td><td>${esc(c.phone||'—')}</td><td>${esc(c.city||'—')}</td><td><span class="status ${c.is_active?'s-green':'s-red'}">${c.is_active?'ACTIVE':'INACTIVE'}</span></td></tr>`).join('')||'<tr><td colspan="5">No customers</td></tr>'}
function renderReceipts(){$('recTable').querySelector('tbody').innerHTML=state.receipts.map(r=>`<tr><td class="mono">${esc(r.batch_code||'')}</td><td>${esc(r.location||'')}</td><td>${esc(r.directory_phone||'—')}</td><td>${r.received_at?new Date(r.received_at).toLocaleString():'—'}</td><td><span class="status ${r.consolidated?'s-green':'s-amber'}">${r.consolidated?'YES':'PENDING'}</span></td></tr>`).join('')||'<tr><td colspan="5">No receipts</td></tr>'}
function renderStaff(){$('staffTable').querySelector('tbody').innerHTML=state.staff.map(s=>`<tr><td>${esc(s.full_name||'—')}</td><td>${esc(s.role||'')}</td><td>${esc(s.branch||'')}</td><td><span class="status ${s.is_active?'s-green':'s-red'}">${s.is_active?'ACTIVE':'INACTIVE'}</span></td></tr>`).join('')||'<tr><td colspan="4">No staff</td></tr>'}
function renderFinance(){const rev=state.shipments.reduce((a,s)=>a+Number(s.total_amount||0),0),paid=state.shipments.reduce((a,s)=>a+Number(s.paid_amount||0),0),due=Math.max(0,rev-paid),rate=rev?Math.round((paid/rev)*100):0;$('financeKpis').innerHTML=[['Revenue',money(rev)],['Collected',money(paid)],['Outstanding',money(due)],['Collection rate',rate+'%']].map(x=>`<div class="kpi"><span>${x[0]}</span><b>${x[1]}</b><small>Current data</small></div>`).join('');$('collection').innerHTML=`<b>${rate}% collected</b><div style="height:8px;background:#07192d;border-radius:99px;margin-top:10px"><i style="display:block;width:${rate}%;height:100%;background:linear-gradient(90deg,var(--cyan),var(--green));border-radius:99px"></i></div>`;$('financeRoutes').innerHTML=Object.entries(state.shipments.reduce((m,s)=>{const k=`${s.origin_key||'—'} → ${s.dest_key||'—'}`;m[k]=(m[k]||0)+Number(s.total_amount||0);return m},{})).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([r,v])=>`<div class="mini"><b>${esc(r)}</b><small>${money(v)}</small></div>`).join('')||'<div class="mini">No route data</div>'}
function renderAudit(){$('auditTable').querySelector('tbody').innerHTML=state.audit.map(x=>`<tr><td>${new Date(x.created_at).toLocaleString()}</td><td>${esc(x.staff_name||'')}</td><td>${esc(x.action||'')}</td><td class="mono">${esc(x.target_id||'')}</td><td class="muted">${esc(x.details||'')}</td></tr>`).join('')||'<tr><td colspan="5">No audit</td></tr>'}
function setView(v){state.view=v;document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.view===v));document.querySelectorAll('[data-panel]').forEach(p=>p.classList.toggle('hidden',p.dataset.panel!==v));const m={overview:['Overview','Live operational data'],shipments:['Shipment control','Status / priority / ETA / finance'],customers:['Customers','CRM directory'],warehouse:['Warehouse','Receipt control'],staff:['Staff','Access and roles'],finance:['Finance','Revenue and collections'],audit:['Audit','Every operational action']};$('title').textContent=m[v][0];$('sub').textContent=m[v][1];$('side').classList.remove('open')}
function openModal(shipment=null){$('modal').classList.remove('hidden');$('sid').value=shipment?.id||'';$('modalTitle').textContent=shipment?'Edit Shipment':'New Shipment';$('scustomer').value=shipment?.customer_name||'';$('sphone').value=shipment?.customer_phone||'';$('sorigin').value=shipment?.origin_key||'china';$('sdest').value=shipment?.dest_key||'erbil';$('stype').value=shipment?.type||'air';$('sbranch').value=shipment?.branch||'all';$('samount').value=shipment?.total_amount??'';$('spaid').value=shipment?.paid_amount??'';$('sprio').value=shipment?.priority||'normal';$('sstatus').value=shipment?.operational_status||'pending';$('seta').value=shipment?.eta?new Date(shipment.eta).toISOString().slice(0,16):'';$('sweight').value=shipment?.weight_kg??'';$('snotes').value=shipment?.notes||'';$('archive').classList.toggle('hidden',!shipment)}
async function load(){try{const [ship,customers,receipts,staff,audit]=await Promise.all([api('shipments'),api('customers'),api('receipts'),api('staff'),api('audit')]);state.shipments=ship;state.customers=customers;state.receipts=receipts;state.staff=staff;state.audit=audit;render()}catch(e){alert(e.message)}}
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();try{client=sb();const r=await client.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(r.error)throw r.error;const s=r.data.session;const roleRow=await client.from('staff').select('full_name,role,branch,is_active').eq('id',s.user.id).maybeSingle();if(roleRow.error||!roleRow.data?.is_active)throw Error('Staff access required');state.session=s;state.role=roleRow.data.role;$('uName').textContent=roleRow.data.full_name||s.user.email;$('uRole').textContent=`${roleRow.data.role} · ${roleRow.data.branch}`;$('login').classList.add('hidden');$('app').classList.remove('hidden');await load()}catch(e){$('loginMsg').textContent=e.message}});
$('logout').onclick = async () => {
  await client.auth.signOut();
  location.reload();
};
document.querySelectorAll('.nav').forEach((button) => {
  button.onclick = () => setView(button.dataset.view);
});
$('menu').onclick = () => $('side').classList.toggle('open');
$('refresh').onclick = load;
$('shipSearch').oninput = renderShipments;
$('shipFilter').onchange = renderShipments;
$('custSearch').oninput = renderCustomers;
$('new').onclick = () => openModal();
document.querySelectorAll('[data-new]').forEach((button) => {
  button.onclick = () => openModal();
});
$('close').onclick = () => $('modal').classList.add('hidden');
$('shipTable').addEventListener('click', (event) => {
  const button = event.target.closest('[data-edit]');
  if (!button) return;
  const shipment = state.shipments.find((item) => item.id === button.dataset.edit);
  if (shipment) openModal(shipment);
});
$('shipForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  $('formMsg').textContent = 'Saving…';
  try {
    const data = {
      id: $('sid').value || undefined,
      customer_name: $('scustomer').value,
      customer_phone: $('sphone').value,
      origin_key: $('sorigin').value,
      dest_key: $('sdest').value,
      type: $('stype').value,
      branch: $('sbranch').value,
      total_amount: Number($('samount').value || 0),
      paid_amount: Number($('spaid').value || 0),
      priority: $('sprio').value,
      operational_status: $('sstatus').value,
      eta: $('seta').value ? new Date($('seta').value).toISOString() : null,
      weight_kg: Number($('sweight').value || 0),
      notes: $('snotes').value,
    };
    await writeShipment($('sid').value ? 'update' : 'create', data);
    $('formMsg').textContent = 'پاشەکەوت کرا ✓';
    $('formMsg').style.color = 'var(--green)';
    await load();
    setTimeout(() => $('modal').classList.add('hidden'), 400);
  } catch (error) {
    $('formMsg').textContent = error.message;
    $('formMsg').style.color = 'var(--red)';
  }
});
$('archive').onclick = async () => {
  if (!$('sid').value) return;
  if (!confirm('Archive shipment?')) return;
  try {
    await writeShipment('archive', { id: $('sid').value });
    $('modal').classList.add('hidden');
    await load();
  } catch (error) {
    alert(error.message);
  }
};
window.addEventListener('load',async()=>{client=sb();const s=(await client.auth.getSession()).data.session;if(s){const row=await client.from('staff').select('full_name,role,branch,is_active').eq('id',s.user.id).maybeSingle();if(row.data?.is_active){state.session=s;state.role=row.data.role;$('uName').textContent=row.data.full_name||s.user.email;$('uRole').textContent=`${row.data.role} · ${row.data.branch}`;$('login').classList.add('hidden');$('app').classList.remove('hidden');await load()}}});

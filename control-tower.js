const SUPABASE_URL='https://ahslifnthiwfkmaswjno.supabase.co'
const SUPABASE_KEY='sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda'
let sb=null
let state={data:null}

const $=id=>document.getElementById(id)
const esc=v=>String(v??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]))
const fmt=n=>n==null?'—':new Intl.NumberFormat('ku-IQ',{maximumFractionDigits:0}).format(Number(n)||0)
const fmtMoney=n=>n==null?'—':new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(Number(n)||0)
const fmtDate=v=>{if(!v)return '—';const d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleString('ku-IQ',{dateStyle:'medium',timeStyle:'short'}):'—'}
function toast(msg,bad=false){$('toast').textContent=msg;$('toast').className=`toast ${bad?'bad':'ok'}`;clearTimeout(window.__toast);window.__toast=setTimeout(()=>{$('toast').className='toast hidden'},3200)}
function statusLabel(v){const m={received_origin:'وەرگیراوە',in_transit:'لە گواستنەوە',at_transit_hub:'لە هابی گواستنەوە',customs:'گومرگ',out_for_delivery:'لە ڕێگای گەیاندنەوە',delivered:'گەیەنراو',cancelled:'هەڵوەشێنراوە'};return m[String(v||'').toLowerCase()]||String(v||'—')}
function severityClass(v){return `severity sev-${String(v||'medium').toLowerCase()}`}

function render(d){
  state.data=d
  const k=d.kpis||{}
  $('identity').textContent=`${d.actor?.name||'Staff'} · ${d.actor?.role||''}`
  $('logout').classList.remove('hidden')
  $('state').textContent='LIVE'
  $('stateText').textContent=`داتا نوێکراوەتەوە · ${fmtDate(d.generated_at)}`
  $('hAuth').textContent=d.health?.auth==='ok'?'OK':'ERROR'
  $('hDb').textContent=d.health?.database_queries==='ok'?'OK':'ERROR'
  $('hScope').textContent=d.health?.branch_scope||'all'
  const cards=[
    ['Shipments',k.shipments,'هەموو بارەکانی دەستپێگەیشتوو','accent'],
    ['Active',k.active,'بارە چالاکەکان','accent'],
    ['Moving',k.moving,'لە گواستنەوەدا','good'],
    ['Overdue',k.overdue,'دواکەوتوو','bad'],
    ['Exceptions',k.exceptions,'پێویستی بە سەرنج','warn'],
  ]
  $('kpis').innerHTML=cards.map(([t,n,s,c])=>`<div class="card kpi ${c}"><span class="muted">${esc(t)}</span><b>${fmt(n)}</b><small>${esc(s)}</small></div>`).join('')
  $('kReceipts').textContent=fmt(k.warehouse_receipts)
  $('kMovements').textContent=fmt(k.warehouse_movements)
  $('kDocs').textContent=fmt(k.unverified_documents)
  $('kOutbox').textContent=k.notification_pending==null?'—':fmt(k.notification_pending)
  $('alertCount').textContent=fmt((d.alerts||[]).length)
  $('alerts').innerHTML=(d.alerts||[]).slice(0,30).map(a=>`<div class="row"><div><strong>${esc(a.title||'Alert')}</strong><small>${esc(a.note||'')}</small><small class="route">${a.tracking_number?esc(a.tracking_number)+' · ':''}${fmtDate(a.occurred_at)}</small></div><span class="${severityClass(a.severity)}">${esc(a.severity||'medium')}</span></div>`).join('')||'<div class="empty">هیچ ئاگادارییەکی چالاک نییە.</div>'
  renderShipments()
}
function renderShipments(){
  const q=String($('search').value||'').trim().toLowerCase()
  const rows=(state.data?.recent_shipments||[]).filter(s=>!q||String(s.tracking_number||'').toLowerCase().includes(q)||String(s.customer_name||'').toLowerCase().includes(q)||String(s.id||'').toLowerCase().includes(q))
  $('shipments').innerHTML=rows.map(s=>`<div class="row"><div><strong>${esc(s.tracking_number||s.id||'—')}</strong><small>${esc(s.customer_name||'کڕیار نەناسراو')}</small><small class="route">${esc(statusLabel(s.status))} · ${esc(s.location||'شوێن نەناسراو')} · ${esc(s.transport_mode||'mode نەناسراو')}</small></div><span class="tag">${fmtDate(s.eta)}</span></div>`).join('')||'<div class="empty">هیچ shipment ـێک نەدۆزرایەوە.</div>'
}
async function load(){
  if(!sb)return
  const {data:{session}}=await sb.auth.getSession()
  if(!session){$('login').classList.remove('hidden');$('state').textContent='LOCKED';$('stateText').textContent='چوونەژوورەوە پێویستە';return}
  const res=await fetch(`${SUPABASE_URL}/functions/v1/control-tower`,{headers:{Authorization:`Bearer ${session.access_token}`,apikey:SUPABASE_KEY,Accept:'application/json'}})
  const body=await res.json().catch(()=>({error:'Invalid server response'}))
  if(!res.ok){throw new Error(body.error||`Server error ${res.status}`)}
  $('login').classList.add('hidden');render(body)
}
async function login(){
  $('loginMsg').textContent=''
  const email=$('email').value.trim();const password=$('password').value
  if(!email||!password){$('loginMsg').textContent='ئیمەیل و وشەی نهێنی پێویستن';return}
  const {data,error}=await sb.auth.signInWithPassword({email,password})
  if(error){$('loginMsg').textContent=error.message;return}
  if(!data.session){$('loginMsg').textContent='Session دروست نەبوو';return}
  await load().catch(e=>{$('loginMsg').textContent=e.message})
}
async function logout(){await sb.auth.signOut();location.reload()}
async function boot(){
  if(!window.supabase){setTimeout(boot,100);return}
  sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})
  $('loginBtn').addEventListener('click',login)
  $('logout').addEventListener('click',logout)
  $('refresh').addEventListener('click',()=>load().then(()=>toast('داتا نوێکرایەوە')).catch(e=>toast(e.message,true)))
  $('search').addEventListener('input',renderShipments)
  $('password').addEventListener('keydown',e=>{if(e.key==='Enter')login()})
  sb.auth.onAuthStateChange(()=>load().catch(()=>{}))
  await load().catch(e=>{toast(e.message,true);$('state').textContent='ERROR';$('stateText').textContent=e.message})
  window.setInterval(()=>load().catch(()=>{}),60000)
}
boot()

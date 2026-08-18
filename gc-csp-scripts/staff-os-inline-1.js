const SUPABASE_URL='https://ahslifnthiwfkmaswjno.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
const API_URL=`${SUPABASE_URL}/functions/v1/account-admin`;
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
window.sb=sb;
const $=id=>document.getElementById(id);
function setMsg(t,ok=false){$('loginMsg').textContent=t||'';$('loginMsg').style.color=ok?'#58e6b0':'#ffb9c0'}
async function authFetch(path='/'){const {data:{session}}=await sb.auth.getSession();if(!session)throw new Error('No active staff session');const r=await fetch(API_URL+path,{headers:{Authorization:`Bearer ${session.access_token}`}});const text=await r.text();let data={};try{data=text?JSON.parse(text):{}}catch{}if(!r.ok)throw new Error(data.error||`Request failed (${r.status})`);return data}
async function verifyStaff(user){const res=await authFetch('/?kind=staff');const row=(res.items||[]).find(s=>s.id===user.id);if(!row||row.is_active===false||!['admin','accountant','super_admin'].includes(row.role))throw new Error('ئەم ئەکاونتە دەستڕاگەیشتنی ستافی نییە.');return row}
async function loadMetrics(){try{$('mCustomers').textContent=(await authFetch('/?kind=customer')).items?.length??0}catch{$('mCustomers').textContent='—'}try{$('mStaff').textContent=(await authFetch('/?kind=staff')).items?.length??0}catch{$('mStaff').textContent='—'}try{$('mReceipts').textContent=(await authFetch('/?kind=receipt')).items?.length??0}catch{$('mReceipts').textContent='—'}try{$('mShipments').textContent='Live'}catch{$('mShipments').textContent='—'}}
async function enter(user){const row=await verifyStaff(user);$('gate').classList.add('hidden');$('app').classList.remove('hidden');const name=row.full_name||user.user_metadata?.full_name||user.email?.split('@')[0]||'Staff';$('staffName').textContent=name;$('staffEmail').textContent=user.email||row.email||'—';$('staffRole').textContent=`${row.role} · ${row.branch||'all'} branch`;$('avatar').textContent=name.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();await loadMetrics()}
async function boot(){const {data:{session}}=await sb.auth.getSession();if(session){try{await enter(session.user)}catch(e){await sb.auth.signOut();setMsg(e.message)}}}
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();setMsg('پشکنین دەکرێت…',true);try{const {data,error}=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)throw error;await enter(data.user)}catch(e){setMsg(e.message||'چوونەژوورەوە سەرکەوتوو نەبوو.');await sb.auth.signOut().catch(()=>{})}});
$('signOut').addEventListener('click',async()=>{await sb.auth.signOut();location.reload()});
sb.auth.onAuthStateChange((_event,session)=>{if(!session){$('app').classList.add('hidden');$('gate').classList.remove('hidden')}});boot();

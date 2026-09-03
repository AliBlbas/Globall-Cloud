import { createClient } from 'npm:@supabase/supabase-js@2'
const ORIGINS=new Set(['https://globall-cloud.pages.dev','https://globall-cloud.netlify.app'])
const cors=(req:Request)=>{const origin=req.headers.get('origin')||'';return {'Access-Control-Allow-Origin':ORIGINS.has(origin)?origin:'https://globall-cloud.pages.dev','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info,x-supabase-auth-token','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin'}}
const json=(req:Request,b:Record<string,unknown>,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...cors(req)}})
const env=(n:string)=>{const v=Deno.env.get(n);if(!v)throw Error(`${n} is not configured`);return v}
const roles=new Set(['admin','super_admin','accountant','finance','operations'])
Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(req)})
  try{
    const url=env('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY')||Deno.env.get('SUPABASE_PUBLISHABLE_KEY'),svc=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY')
    if(!anon||!svc)throw Error('Supabase keys are not configured')
    const authHeader=req.headers.get('Authorization')||''
    if(!/^Bearer\s+/i.test(authHeader))return json(req,{error:'Unauthorized'},401)
    const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{headers:{Authorization:authHeader}}})
    const {data:u,error:ue}=await auth.auth.getUser();if(ue||!u.user)return json(req,{error:'Unauthorized'},401)
    const db=createClient(url,svc,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
    const {data:actor,error:ae}=await db.from('staff').select('id,full_name,role,branch,is_active').eq('id',u.user.id).maybeSingle()
    if(ae)throw ae
    if(!actor?.is_active||!roles.has(String(actor.role)))return json(req,{error:'Forbidden'},403)
    if(req.method==='POST'){
      const body=await req.json().catch(()=>({})) as Record<string,unknown>
      if(body.action!=='create_cost')return json(req,{error:'Unsupported action'},400)
      const amount=Number(body.amount_iqd);if(!Number.isFinite(amount)||amount<=0)return json(req,{error:'Invalid cost amount'},400)
      const row={description:String(body.description||'Company cost').trim().slice(0,240),amount_iqd:Math.round(amount),origin_key:String(body.origin_key||'').trim()||null,dest_key:String(body.dest_key||'').trim()||null,staff_id:body.staff_id||null,branch:String(body.branch||actor.branch||'all'),occurred_at:body.occurred_at||new Date().toISOString(),created_by:actor.id}
      const {data,error}=await db.from('company_costs').insert(row).select('*').single();if(error)throw error
      await db.from('staff_activity_log').insert({staff_id:actor.id,staff_name:actor.full_name,action:'create_company_cost',target_id:String(data.id),details:JSON.stringify(row)})
      return json(req,{item:data})
    }
    if(req.method!=='GET')return json(req,{error:'Method not allowed'},405)
    const urlObj=new URL(req.url),days=Math.min(90,Math.max(7,Number(urlObj.searchParams.get('days')||30))),since=new Date(Date.now()-days*86400000).toISOString()
    const [{data:s,error:se},{data:st,error:ste},{data:m,error:me},{data:c,error:ce}]=await Promise.all([
      db.from('shipments').select('id,created_at,total_amount,paid_amount,origin_key,dest_key,transport_mode,type,assigned_staff_id,operational_status,archived_at').gte('created_at',since).limit(5000),
      db.from('staff').select('id,full_name,role,branch,is_active').limit(500),
      db.from('warehouse_movements').select('id,shipment_id,scanned_by,movement_type,from_hub,to_hub,scanned_at').gte('scanned_at',since).limit(10000),
      db.from('company_costs').select('id,description,amount_iqd,origin_key,dest_key,staff_id,branch,occurred_at,created_by').gte('occurred_at',since).limit(5000)
    ])
    if(se)throw se;if(ste)throw ste;if(me)throw me;if(ce)throw ce
    const route=new Map<string,any>()
    for(const x of s||[]){if(x.archived_at)continue;const k=`${x.origin_key||'—'} → ${x.dest_key||'—'}`;const r=route.get(k)||{route:k,shipments:0,revenue:0,paid:0,outstanding:0,cost:0,profit:0};r.shipments++;r.revenue+=Number(x.total_amount||0);r.paid+=Number(x.paid_amount||0);r.outstanding+=Math.max(0,Number(x.total_amount||0)-Number(x.paid_amount||0));route.set(k,r)}
    for(const x of c||[]){const k=x.origin_key&&x.dest_key?`${x.origin_key} → ${x.dest_key}`:'ALL';const r=route.get(k)||{route:k,shipments:0,revenue:0,paid:0,outstanding:0,cost:0,profit:0};r.cost+=Number(x.amount_iqd||0);route.set(k,r)}
    for(const r of route.values())r.profit=r.revenue-r.cost
    const sm=new Map<string,any>();for(const x of st||[])sm.set(String(x.id),{staff_id:String(x.id),name:x.full_name||'—',role:x.role||'—',branch:x.branch||'all',assigned_shipments:0,movement_actions:0,delivered:0})
    for(const x of s||[]){const a=sm.get(String(x.assigned_staff_id));if(a){a.assigned_shipments++;if(['delivered','completed'].includes(String(x.operational_status||'').toLowerCase()))a.delivered++}}
    for(const x of m||[]){const a=sm.get(String(x.scanned_by));if(a)a.movement_actions++}
    const live=(s||[]).filter(x=>!x.archived_at),active=live.filter(x=>!['delivered','completed','cancelled','canceled'].includes(String(x.operational_status||'').toLowerCase()))
    const totalRevenue=live.reduce((n,x)=>n+Number(x.total_amount||0),0),totalCollected=live.reduce((n,x)=>n+Number(x.paid_amount||0),0),totalCost=(c||[]).reduce((n,x)=>n+Number(x.amount_iqd||0),0)
    return json(req,{days,actor:{id:actor.id,name:actor.full_name,role:actor.role,branch:actor.branch},summary:{total_revenue:totalRevenue,total_collected:totalCollected,total_cost:totalCost,total_profit:totalRevenue-totalCost,total_outstanding:Math.max(0,totalRevenue-totalCollected),active_shipments:active.length,total_shipments:live.length},routes:[...route.values()].sort((a,b)=>b.profit-a.profit).slice(0,15),staff:[...sm.values()].sort((a,b)=>(b.delivered*10+b.movement_actions+b.assigned_shipments)-(a.delivered*10+a.movement_actions+a.assigned_shipments)).slice(0,15),recent_costs:[...(c||[])].sort((a,b)=>new Date(String(b.occurred_at)).getTime()-new Date(String(a.occurred_at)).getTime()).slice(0,20)})
  }catch(e){console.error('staff-analytics',e);return json(req,{error:e instanceof Error?e.message:'Internal server error'},500)}
})

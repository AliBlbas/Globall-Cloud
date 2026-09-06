import { createClient } from 'npm:@supabase/supabase-js@2'
const ORIGINS=new Set(['https://globall-cloud.pages.dev','https://globall-cloud.netlify.app'])
const REPORT_ROLES=new Set(['admin','super_admin','accountant','finance','operations'])
const FINANCE_ROLES=new Set(['admin','super_admin','accountant','finance'])
const cors=(req:Request)=>{const origin=req.headers.get('origin')||'';return {'Access-Control-Allow-Origin':ORIGINS.has(origin)?origin:'https://globall-cloud.pages.dev','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info,x-supabase-auth-token','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store'}}
const json=(req:Request,b:Record<string,unknown>,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{'Content-Type':'application/json; charset=utf-8',...cors(req)}})
const env=(n:string)=>{const v=Deno.env.get(n);if(!v)throw Error(`${n} is not configured`);return v}
const clean=(v:unknown)=>String(v??'').trim()
const parseDays=(v:unknown)=>{const n=Number(v??30);return Number.isFinite(n)?Math.min(90,Math.max(7,Math.floor(n))):30}
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
    const role=clean(actor?.role)
    if(!actor?.is_active||!REPORT_ROLES.has(role))return json(req,{error:'Forbidden'},403)
    const globalScope=FINANCE_ROLES.has(role)
    const actorBranch=clean(actor.branch)||'all'
    if(req.method==='POST'){
      if(!FINANCE_ROLES.has(role))return json(req,{error:'Finance/admin permission required'},403)
      const body=await req.json().catch(()=>({})) as Record<string,unknown>
      if(body.action!=='create_cost')return json(req,{error:'Unsupported action'},400)
      const amount=Number(body.amount_iqd);if(!Number.isFinite(amount)||amount<=0)return json(req,{error:'Invalid cost amount'},400)
      const requestedBranch=clean(body.branch)||actorBranch
      if(!globalScope&&requestedBranch!==actorBranch)return json(req,{error:'Cannot create cost for another branch'},403)
      let targetStaffId:string|null=null
      if(body.staff_id!==undefined&&body.staff_id!==null&&clean(body.staff_id)){
        targetStaffId=clean(body.staff_id)
        const {data:target,error:targetError}=await db.from('staff').select('id,branch,is_active').eq('id',targetStaffId).maybeSingle()
        if(targetError)throw targetError
        if(!target?.is_active)return json(req,{error:'Target staff is inactive or missing'},400)
        if(!globalScope&&clean(target.branch)!==actorBranch)return json(req,{error:'Target staff is outside your branch'},403)
      }
      const row={description:clean(body.description)||'Company cost',amount_iqd:Math.round(amount),origin_key:clean(body.origin_key)||null,dest_key:clean(body.dest_key)||null,staff_id:targetStaffId,branch:requestedBranch,occurred_at:clean(body.occurred_at)||new Date().toISOString(),created_by:actor.id}
      const {data,error}=await db.from('company_costs').insert(row).select('*').single();if(error)throw error
      await db.from('staff_activity_log').insert({staff_id:actor.id,staff_name:actor.full_name,action:'create_company_cost',target_id:String(data.id),details:JSON.stringify(row)})
      return json(req,{item:data})
    }
    if(req.method!=='GET')return json(req,{error:'Method not allowed'},405)
    const urlObj=new URL(req.url),days=parseDays(urlObj.searchParams.get('days')),since=new Date(Date.now()-days*86400000).toISOString()
    const financeVisible=FINANCE_ROLES.has(role)
    const [shipmentsQ,staffQ,movementsQ,costsQ,fxQ]=await Promise.all([
      db.from('shipments').select('id,created_at,total_amount,paid_amount,origin_key,dest_key,transport_mode,type,assigned_staff_id,operational_status,archived_at,branch').gte('created_at',since).limit(5000),
      db.from('staff').select('id,full_name,role,branch,is_active').limit(1000),
      db.from('warehouse_movements').select('id,shipment_id,scanned_by,movement_type,from_hub,to_hub,scanned_at').gte('scanned_at',since).limit(10000),
      financeVisible?db.from('company_costs').select('id,description,amount_iqd,origin_key,dest_key,staff_id,branch,occurred_at,created_by').gte('occurred_at',since).limit(5000):Promise.resolve({data:[],error:null}),
      financeVisible?db.from('app_settings').select('value').eq('key','usd_iqd_rate').maybeSingle():Promise.resolve({data:null,error:null})
    ])
    for(const q of [shipmentsQ,staffQ,movementsQ,costsQ,fxQ])if(q.error)throw q.error
    let shipments=(shipmentsQ.data||[]) as Record<string,unknown>[]
    let staff=(staffQ.data||[]) as Record<string,unknown>[]
    let movements=(movementsQ.data||[]) as Record<string,unknown>[]
    let costs=(costsQ.data||[]) as Record<string,unknown>[]
    if(!globalScope){
      shipments=shipments.filter(x=>clean(x.branch)===actorBranch)
      staff=staff.filter(x=>clean(x.branch)===actorBranch)
      const scopedIds=new Set(shipments.map(x=>String(x.id)))
      movements=movements.filter(x=>scopedIds.has(String(x.shipment_id)))
    }
    if(financeVisible&&!globalScope)costs=costs.filter(x=>clean(x.branch)===actorBranch)
    const fxRaw=financeVisible?Number((fxQ as any).data?.value):NaN
    const fx=Number.isFinite(fxRaw)&&fxRaw>0?fxRaw:1500
    const route=new Map<string,any>()
    for(const x of shipments){if(x.archived_at)continue;const k=`${clean(x.origin_key)||'—'} → ${clean(x.dest_key)||'—'}`;const r=route.get(k)||{route:k,shipments:0,revenue:0,paid:0,outstanding:0,cost:0,cost_iqd:0,profit:0};r.shipments++;r.revenue+=Number(x.total_amount||0);r.paid+=Number(x.paid_amount||0);r.outstanding+=Math.max(0,Number(x.total_amount||0)-Number(x.paid_amount||0));route.set(k,r)}
    for(const x of costs){const k=x.origin_key&&x.dest_key?`${x.origin_key} → ${x.dest_key}`:'ALL';const r=route.get(k)||{route:k,shipments:0,revenue:0,paid:0,outstanding:0,cost:0,cost_iqd:0,profit:0};r.cost_iqd+=Number(x.amount_iqd||0);route.set(k,r)}
    for(const r of route.values()){r.cost=Number((r.cost_iqd/fx).toFixed(2));r.profit=Number((r.revenue-r.cost).toFixed(2))}
    const sm=new Map<string,any>();for(const x of staff)sm.set(String(x.id),{staff_id:String(x.id),name:x.full_name||'—',role:x.role||'—',branch:x.branch||'all',assigned_shipments:0,movement_actions:0,delivered:0})
    for(const x of shipments){const a=sm.get(String(x.assigned_staff_id));if(a){a.assigned_shipments++;if(['delivered','completed'].includes(clean(x.operational_status).toLowerCase()))a.delivered++}}
    for(const x of movements){const a=sm.get(String(x.scanned_by));if(a)a.movement_actions++}
    const live=shipments.filter(x=>!x.archived_at),active=live.filter(x=>!['delivered','completed','cancelled','canceled'].includes(clean(x.operational_status).toLowerCase()))
    const totalRevenue=live.reduce((n,x)=>n+Number(x.total_amount||0),0)
    const totalCollected=live.reduce((n,x)=>n+Number(x.paid_amount||0),0)
    const totalCostIqd=costs.reduce((n,x)=>n+Number(x.amount_iqd||0),0)
    const totalCostUsd=Number((totalCostIqd/fx).toFixed(2))
    const summary=financeVisible?{total_revenue:Number(totalRevenue.toFixed(2)),total_collected:Number(totalCollected.toFixed(2)),total_cost:totalCostIqd,total_cost_usd:totalCostUsd,total_profit:Number((totalRevenue-totalCostUsd).toFixed(2)),total_outstanding:Number(Math.max(0,totalRevenue-totalCollected).toFixed(2)),active_shipments:active.length,total_shipments:live.length,finance_visible:true,fx_usd_iqd:fx}:{total_revenue:null,total_collected:null,total_cost:null,total_cost_usd:null,total_profit:null,total_outstanding:null,active_shipments:active.length,total_shipments:live.length,finance_visible:false,fx_usd_iqd:null}
    const routeList=[...route.values()].sort((a,b)=>b.profit-a.profit).slice(0,15)
    const outRoutes=financeVisible?routeList:routeList.map(r=>({route:r.route,shipments:r.shipments}))
    return json(req,{days,actor:{id:actor.id,name:actor.full_name,role,branch:actorBranch},summary,routes:outRoutes,staff:[...sm.values()].sort((a,b)=>(b.delivered*10+b.movement_actions+b.assigned_shipments)-(a.delivered*10+a.movement_actions+a.assigned_shipments)).slice(0,15),recent_costs:financeVisible?[...costs].sort((a,b)=>new Date(String(b.occurred_at)).getTime()-new Date(String(a.occurred_at)).getTime()).slice(0,20):[],health:{auth:'ok',branch_scope:globalScope?'global':actorBranch,finance_visibility:financeVisible?'enabled':'restricted'}})
  }catch(e){console.error('staff-analytics',e);return json(req,{error:e instanceof Error?e.message:'Internal server error'},500)}
})

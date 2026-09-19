import { createClient } from 'npm:@supabase/supabase-js@2'

type Json = Record<string, unknown>
const ORIGINS = new Set(['https://globall-cloud.pages.dev','https://globall-cloud.netlify.app'])
const cors=(req:Request)=>({
  'Content-Type':'application/json; charset=utf-8',
  'Access-Control-Allow-Origin':ORIGINS.has(req.headers.get('origin')||'')?(req.headers.get('origin')||''):'https://globall-cloud.pages.dev',
  'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods':'POST,OPTIONS', 'Cache-Control':'no-store','Vary':'Origin'
})
const out=(req:Request,body:Json,status=200)=>new Response(JSON.stringify(body),{status,headers:cors(req)})
const txt=(v:unknown)=>String(v??'').trim()
const key=()=>Deno.env.get('OPENAI_API_KEY')||Deno.env.get('OPENAI_SECRET_KEY')
async function auth(req:Request){
  const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY')||Deno.env.get('SUPABASE_PUBLISHABLE_KEY'),secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY')
  const authorization=req.headers.get('authorization')||''
  if(!url||!anon||!secret||!authorization.toLowerCase().startsWith('bearer '))throw new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:cors(req)})
  const userClient=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{headers:{Authorization:authorization}}})
  const u=await userClient.auth.getUser();if(u.error||!u.data.user)throw new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:cors(req)})
  const service=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
  const s=await service.from('staff').select('id,role,is_active').eq('id',u.data.user.id).maybeSingle();if(s.error)throw s.error;if(!s.data?.is_active||!['admin','super_admin','accountant','warehouse','warehouse_china','warehouse_uae','warehouse_erbil','operations'].includes(String(s.data.role)))throw new Response(JSON.stringify({error:'Staff role required'}),{status:403,headers:cors(req)})
  return {service,staff:s.data}
}
function parseJsonText(text:string){try{const cleaned=text.replace(/^```json\s*/i,'').replace(/```$/,'').trim();return JSON.parse(cleaned)}catch{return {items:[],kurdish_summary:text.trim()}}}
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors(req)})
  try{
    const {service,staff}=await auth(req);const form=await req.formData();const file=form.get('file');if(!(file instanceof File))return out(req,{error:'Invoice image is required'},400);if(file.size<=0||file.size>12*1024*1024)return out(req,{error:'Image must be 1 byte to 12MB'},400)
    const api=key();if(!api)return out(req,{error:'OPENAI_API_KEY is not configured'},503)
    const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));const dataUrl=`data:${file.type||'image/jpeg'};base64,${btoa(binary)}`
    const prompt=`Read this Chinese commercial invoice/photo. Return JSON only with this shape: {"items":[{"name":"","quantity":0,"unit":"","sku":"","confidence":0}],"kurdish_summary":""}. Translate item names and the final concise summary into Central Kurdish (Sorani). Do not invent quantities. Use null/empty when unreadable.`
    const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${api}`,'Content-Type':'application/json'},body:JSON.stringify({model:Deno.env.get('INVOICE_AI_MODEL')||'gpt-5.6-luna',input:[{role:'user',content:[{type:'input_text',text:prompt},{type:'input_image',image_url:dataUrl}]}]})})
    const body=await r.json().catch(()=>({}));if(!r.ok)return out(req,{error:`AI provider returned ${r.status}`,detail:body},502)
    const text=String(body.output_text||body.output?.flatMap((x:any)=>x.content||[]).map((x:any)=>x.text||'').join(' ')||'')
    const parsed=parseJsonText(text)
    const summary={items:Array.isArray(parsed.items)?parsed.items:[],kurdish_summary:txt(parsed.kurdish_summary)||text}
    await service.from('staff_activity_log').insert({staff_id:staff.id,action:'ai_invoice_read',target_id:null,details:summary as any})
    return out(req,summary)
  }catch(e){if(e instanceof Response)return e;return out(req,{error:e instanceof Error?e.message:'Internal error'},500)}
})

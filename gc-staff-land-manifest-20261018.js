(() => {
  'use strict';
  if (window.__gcStaffLandManifest20261018) return;
  window.__gcStaffLandManifest20261018 = true;

  const API = 'https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/land-manifests';
  const PUBLIC_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const state = { active:false, manifests:[], current:null, lines:[], draftRows:[], editId:'', editRow:null, currency:'USD', loading:false };
  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = (v, currency='USD') => Number(v || 0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' ' + currency;
  const num = (v) => Number(v || 0).toLocaleString('en-US',{maximumFractionDigits:3});
  const today = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  };
  const normalizeGC = (v) => {
    const match = String(v || '').normalize('NFKC').toUpperCase().match(/\bGC\s*[-–—]?\s*[A-Z0-9]{2,24}\b/);
    return match ? match[0].replace(/[–—−]/g,'-').replace(/\s+/g,'').replace(/^GC(?!-)/,'GC-').replace(/^GC-?/, 'GC-') : '';
  };
  const toDate = (v) => {
    if (v instanceof Date && Number.isFinite(v.getTime())) return v.getFullYear()+'-'+String(v.getMonth()+1).padStart(2,'0')+'-'+String(v.getDate()).padStart(2,'0');
    if (typeof v === 'number' && Number.isFinite(v) && v > 1000 && window.XLSX?.SSF?.parse_date_code) {
      const p = window.XLSX.SSF.parse_date_code(v);
      if (p && p.y && p.m && p.d) return p.y+'-'+String(p.m).padStart(2,'0')+'-'+String(p.d).padStart(2,'0');
    }
    const s=String(v == null ? '' : v).trim();
    if (!s) return today();
    let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0');
    m=s.match(/^(\d{1,2})[.,/-](\d{1,2})[.,/-](\d{4})$/);
    if (m) return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
    const parsed=new Date(s);
    if (Number.isFinite(parsed.getTime())) return parsed.getFullYear()+'-'+String(parsed.getMonth()+1).padStart(2,'0')+'-'+String(parsed.getDate()).padStart(2,'0');
    return today();
  };
  const numCell=(v) => {
    if (v == null || String(v).trim()==='') return 0;
    const n=Number(String(v).replace(/,/g,'').replace(/[^\d.-]/g,''));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  const statusLabel=(v) => ({
    draft:'ڕەشنووس',issued:'ئامادەی ناردن',departed:'لە دوبەی نێردراوە',
    arrived:'گەیشتووە هەولێر',closed:'داخراو',cancelled:'هەڵوەشێنراوە',
    pending:'چاوەڕوانی ناردن',in_transit:'لە ڕێگایە',at_transit_hub:'لە کۆگای هەولێر'
  })[String(v || '').toLowerCase()] || String(v || '—');
  const statusClass=(v) => ({
    draft:'draft',issued:'issued',departed:'departed',arrived:'arrived',closed:'closed',
    cancelled:'cancelled',in_transit:'departed',at_transit_hub:'arrived'
  })[String(v || '').toLowerCase()] || 'draft';
  const showToast=(message,kind='info') => {
    let el=$('#gc-land-toast');
    if (!el) { el=document.createElement('div');el.id='gc-land-toast';el.className='gc-land-toast';document.body.appendChild(el); }
    el.textContent=message;el.dataset.kind=kind;el.classList.add('show');
    clearTimeout(el._hide);el._hide=setTimeout(()=>el.classList.remove('show'),3800);
  };
  const session=async() => {
    const client=window.gcSupabase || window.sb;
    if (!client?.auth) throw new Error('هەژماری ستاف ئامادە نییە؛ دووبارە بچۆ ژوورەوە.');
    const result=await client.auth.getSession();
    const token=result?.data?.session?.access_token;
    if (!token) throw new Error('Session ی ستاف بەسەرچووە؛ دووبارە بچۆ ژوورەوە.');
    return token;
  };
  const request=async(path, options={}) => {
    const token=await session();
    const response=await fetch(API+path,{
      method:options.method || 'GET',
      cache:'no-store',
      headers:{Authorization:'Bearer '+token,apikey:PUBLIC_KEY,'Content-Type':'application/json',...(options.headers||{})},
      body:options.body ? JSON.stringify(options.body) : undefined
    });
    const payload=await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(payload.error || 'هەڵە لە پەیوەندی بە سیستەمی مانيفێست ('+response.status+')');
    return payload;
  };
  const post=async(action,data) => request('',{method:'POST',body:{action,data}});
  const totals=(rows) => (rows||[]).reduce((t,r)=>({
    rows:t.rows+1,boxes:t.boxes+Number(r.box_count||0),pcs:t.pcs+Number(r.quantity_pc||0),
    kg:t.kg+Number(r.weight_kg||0),price:t.price+Number(r.sell_price||0),
    linked:t.linked+(r.gc_linked || r.gc_code && r.directory_customer_id ? 1 : 0)
  }),{rows:0,boxes:0,pcs:0,kg:0,price:0,linked:0});
  const summaryCard=(label,value,detail,kind) => '<article class="gc-land-kpi '+(kind||'')+'"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong><small>'+esc(detail||'')+'</small></article>';
  const button=(label,action,klass,extra) => '<button type="button" class="gc-land-btn '+(klass||'')+'" data-action="'+esc(action)+'" '+(extra||'')+'>'+label+'</button>';
  const base=(title,desc,content) => {
    const view=$('#view');
    if (!view) return;
    view.innerHTML='<section class="gc-land-manifest">'+
      '<div class="gc-land-hero"><div class="gc-land-hero-copy"><div class="gc-land-eyebrow">GLOBALL CLOUD · DUBAI → ERBIL · LAND FREIGHT</div>'+
      '<h1>'+esc(title)+'</h1><p>'+esc(desc)+'</p></div>'+
      '<div class="gc-land-hero-mark"><span class="gc-land-route-node">DXB</span><span class="gc-land-route-line"></span><span class="gc-land-route-node">EBL</span></div></div>'+
      content+'</section>';
  };
  const summaryMarkup=(t,currency) => '<div class="gc-land-kpis">'+
    summaryCard('ڕیزی کڕیاران',num(t.rows),'Customer rows','')+
    summaryCard('بۆکس',num(t.boxes),'Total cartons','')+
    summaryCard('دانە · PCS',num(t.pcs),'Total pieces','')+
    summaryCard('کێش · KG',num(t.kg),'Total weight','')+
    summaryCard('نرخی فرۆشتن',money(t.price,currency),'Sell price total','price')+
    '</div>';
  const lineDefaults=()=>({customer_name:'',gc_code:'',shipment_date:$('#gc-land-date')?.value || today(),cargo_type:'SHEIN',box_count:0,quantity_pc:0,weight_kg:0,sell_price:0,currency:state.currency||'USD',notes:''});
  const inputCell=(label,field,value,type='text',placeholder='') =>
    '<label class="gc-land-cell gc-land-cell-'+esc(field)+'"><span>'+esc(label)+'</span><input data-line-field="'+esc(field)+'" type="'+esc(type)+'" value="'+esc(value == null ? '' : value)+'" placeholder="'+esc(placeholder)+'" '+(['box_count','quantity_pc','weight_kg','sell_price'].includes(field)?'min="0" step="'+(field==='weight_kg'||field==='sell_price'?'0.01':'1')+'"':'')+'></label>';
  const lineCard=(row,index,editMode=false) => {
    const r=row || {};
    const fields=[
      inputCell('ناوی کڕیار · NAME','customer_name',r.customer_name,'text','ناوی کڕیار'),
      inputCell('کۆدی GC','gc_code',r.gc_code,'text','GC-108'),
      inputCell('بەروار · DATE','shipment_date',r.shipment_date || today(),'date'),
      inputCell('جۆری کاڵا · TYPE','cargo_type',r.cargo_type,'text','SHEIN'),
      inputCell('بۆکس · BOX','box_count',r.box_count,'number'),
      inputCell('دانە · PCS','quantity_pc',r.quantity_pc,'number'),
      inputCell('کیلۆ · KG','weight_kg',r.weight_kg,'number'),
      inputCell('نرخی فرۆشتن','sell_price',r.sell_price,'number')
    ].join('');
    return '<div class="gc-land-line" data-row-index="'+index+'"><div class="gc-land-line-no">'+(index+1)+'</div><div class="gc-land-line-fields">'+fields+
      (editMode?'<label class="gc-land-cell gc-land-cell-notes"><span>تێبینی</span><input data-line-field="notes" value="'+esc(r.notes||'')+'" placeholder="تێبینیی زیادە"></label>':'')+
      '</div><button type="button" class="gc-land-remove" data-action="'+(editMode?'remove-draft-row':'remove-edit-row')+'" data-index="'+index+'" title="سڕینەوەی ڕیز">×</button></div>';
  };
  const updateLiveTotals=() => {
    const t=totals(state.draftRows);
    const el=$('.gc-land-live-summary');
    if(el) el.innerHTML=summaryMarkup(t,state.currency);
  };
  const draftTable=() => '<div class="gc-land-lines-head"><div>ڕیز</div><div>زانیاری بار / Customer cargo</div><div>کردار</div></div>'+
    '<div class="gc-land-lines" id="gc-land-draft-lines">'+state.draftRows.map((r,i)=>lineCard(r,i,true)).join('')+'</div>';
  const renderCreate=() => {
    state.active=true;
    const t=totals(state.draftRows);
    const numberDefault='GC-LAND-'+today().replace(/-/g,'')+'-028';
    const content='<form id="gc-land-create-form" class="gc-land-create-form">'+
      '<div class="gc-land-section-head"><div><span class="gc-land-eyebrow">NEW MANIFEST</span><h2>مانيفێستی نوێی دوبەی بۆ هەولێر</h2><p>یەک مانيفێست بۆ هەموو کڕیارەکانی ئەم ناردنە؛ هەر ڕیزێک بە جیا تۆمار دەکرێت.</p></div>'+
      '<div class="gc-land-form-actions">'+button('گەڕانەوە','back','')+button('داگرتنی فۆڕمی Excel','template','')+'</div></div>'+
      '<div class="gc-land-header-fields">'+
      '<label><span>ژمارەی مانيفێست · SHIPMENT NO</span><input id="gc-land-number" value="'+esc(numberDefault)+'" required maxlength="80" pattern="[A-Za-z0-9][A-Za-z0-9._/-]{1,79}"></label>'+
      '<label><span>بەرواری مانيفێست</span><input id="gc-land-date" type="date" value="'+today()+'" required></label>'+
      '<label><span>دراو</span><select id="gc-land-currency"><option value="USD">USD · دۆلار</option><option value="IQD">IQD · دینار</option><option value="AED">AED · درهەم</option></select></label>'+
      '<label class="gc-land-notes-field"><span>تێبینیی ناردن</span><input id="gc-land-notes" maxlength="2000" placeholder="بۆ نموونە: دوبەی → هەولێر، بارە وشکەکان"></label>'+
      '</div>'+
      '<div class="gc-land-import-row"><div><strong>لیستی Excel ـی دوبەی</strong><small>فایلی .xlsx یان .xls بخوێنەوە؛ پێش تۆمارکردن دەتوانیت هەر ڕیزێک دەستکاری بکەیت.</small></div>'+
      '<div class="gc-land-import-actions"><input id="gc-land-import-file" type="file" accept=".xlsx,.xls,.csv" hidden>'+button('هێنانی Excel','import','primary')+button('＋ زیادکردنی ڕیز','add-draft-row','')+'</div></div>'+
      '<div id="gc-land-import-message" class="gc-land-import-message" aria-live="polite"></div>'+
      '<div class="gc-land-live-summary">'+summaryMarkup(t,state.currency)+'</div>'+
      '<div class="gc-land-lines-scroll">'+draftTable()+'</div>'+
      '<div class="gc-land-footer-actions">'+button('هەڵوەشاندنەوە','back','')+button('پاشەکەوتی مانيفێست','save-create','primary')+'</div></form>';
    base('مانيفێستی بارە وشکەکان', 'وەک خشتەی ئێکسل: NAME · date · type · box · pcs · kg · sell price', content);
    const form=$('#gc-land-create-form');
    form?.addEventListener('submit',async(e)=>{e.preventDefault();await saveDraft()});
    $('#gc-land-currency')?.addEventListener('change',e=>{state.currency=e.target.value;state.draftRows.forEach(r=>r.currency=state.currency);updateLiveTotals()});
    mountCreateRows();
  };
  const draftLineToPayload=(r) => ({
    customer_name:String(r.customer_name||'').trim(),
    gc_code:normalizeGC({gc_code:r.gc_code,customer_name:r.customer_name}),
    shipment_date:toDate(r.shipment_date || $('#gc-land-date')?.value || today()),
    cargo_type:String(r.cargo_type||'').trim(),
    box_count:numCell(r.box_count),
    quantity_pc:numCell(r.quantity_pc),
    weight_kg:numCell(r.weight_kg),
    sell_price:numCell(r.sell_price),
    currency:state.currency,
    notes:String(r.notes||'').trim()
  });
  const numCell=(v)=>{
    if(v==null||String(v).trim()==='')return 0;
    const n=Number(String(v).replace(/,/g,'').replace(/[^\d.-]/g,''));
    return Number.isFinite(n)&&n>=0?n:0;
  };
  const setMessage=(message,kind='info')=>{
    const el=$('#gc-land-import-message');
    if(el){el.textContent=message;el.dataset.kind=kind}
  };
  const saveDraft=async() => {
    const numberValue=String($('#gc-land-number')?.value||'').trim();
    const dateValue=toDate($('#gc-land-date')?.value||today());
    const currency=String($('#gc-land-currency')?.value||state.currency||'USD');
    if(!numberValue){showToast('ژمارەی مانيفێست بنووسە','bad');return}
    const rows=state.draftRows.map(draftLineToPayload).filter(r=>r.customer_name||r.cargo_type||r.gc_code||r.box_count||r.quantity_pc||r.weight_kg||r.sell_price);
    if(!rows.length){showToast('لانیکەم یەک ڕیزی بار زیاد بکە','bad');return}
    const missing=rows.filter(r=>!r.customer_name||!r.cargo_type);
    if(missing.length){showToast('ناوی کڕیار و جۆری کاڵا بۆ هەموو ڕیزە چالاکەکان پێویستە','bad');return}
    if(rows.length>1000){showToast('زۆرترین ژمارەی ڕیز ١٠٠٠ ـە','bad');return}
    const buttonEl=$('[data-action="save-create"]');
    if(buttonEl){buttonEl.disabled=true;buttonEl.textContent='پاشەکەوتکردن…'}
    try{
      const result=await post('create',{
        manifest_number:numberValue,planned_departure:dateValue,notes:$('#gc-land-notes')?.value||'',currency,rows
      });
      showToast('مانيفێست '+numberValue+' پاشەکەوت کرا؛ '+num(result.row_count)+' ڕیز تۆمارکرا','ok');
      state.draftRows=[];
      await openDetail(result.manifest_id);
    }catch(error){showToast(error.message||'پاشەکەوت سەرکەوتوو نەبوو','bad')}
    finally{if(buttonEl){buttonEl.disabled=false;buttonEl.textContent='پاشەکەوتی مانيفێست'}}
  };
  const goDashboard=()=>{state.editId='';state.editRow=null;void renderDashboard()};
  const renderDashboard=async() => {
    state.active=true;state.current=null;state.editId='';state.editRow=null;
    base('مانيفێستی بارە وشکەکان','کۆنترۆڵی ناردنەکانی دوبەی → هەولێر، وەک فۆڕمی Excel بە زانیاریی ڕاستەقینەی سیستەم.',
      '<div class="gc-land-loading"><span class="gc-land-spinner"></span> بارکردنی مانيفێستەکان…</div>');
    try{
      const result=await request('?kind=list');
      state.manifests=result.items||[];
      const all=state.manifests.reduce((t,m)=>({
        rows:t.rows+Number(m.row_count||0),boxes:t.boxes+Number(m.total_packages||0),
        pcs:t.pcs+Number(m.total_pieces||0),kg:t.kg+Number(m.total_weight_kg||0),
        price:t.price+Number(m.total_sell_price||0),linked:t.linked+Number(m.linked_rows||0)
      }),{rows:0,boxes:0,pcs:0,kg:0,price:0,linked:0});
      const currency=state.manifests[0]?.currency||'USD';
      const cards=state.manifests.length?state.manifests.map(m=>{
        const date=String(m.actual_departure||m.planned_departure||m.created_at||'').slice(0,10);
        return '<article class="gc-land-manifest-card">'+
          '<div class="gc-land-manifest-card-top"><div><span class="gc-land-eyebrow">SHIPMENT NO</span><h3>'+esc(m.manifest_number)+'</h3><small>'+esc(date)+' · Dubai → Erbil · Land</small></div>'+
          '<span class="gc-land-status '+statusClass(m.status)+'">'+esc(statusLabel(m.status))+'</span></div>'+
          '<div class="gc-land-mini-metrics"><div><span>ڕیزی کڕیاران</span><b>'+num(m.row_count)+'</b></div><div><span>بۆکس</span><b>'+num(m.total_packages)+'</b></div><div><span>PCS</span><b>'+num(m.total_pieces)+'</b></div><div><span>KG</span><b>'+num(m.total_weight_kg)+'</b></div></div>'+
          '<div class="gc-land-manifest-card-foot"><div><small>کۆی نرخی فرۆشتن</small><strong>'+esc(money(m.total_sell_price,m.currency||currency))+'</strong></div>'+
          '<div class="gc-land-card-actions">'+button('بینینی وردەکاری','open-detail','primary','data-id="'+esc(m.id)+'"')+button('Excel','export-list','','data-id="'+esc(m.id)+'"')+'</div></div>'+
          '<div class="gc-land-link-note '+(Number(m.unlinked_rows)>0?'warn':'ok')+'">'+
          (Number(m.unlinked_rows)>0?num(m.unlinked_rows)+' ڕیز پێویستی بە پشکنینی GC هەیە':'✓ هەموو ڕیزەکان بە کۆدی کڕیار بەستراون')+'</div></article>';
      }).join(''):'<div class="gc-land-empty"><div class="gc-land-empty-mark">DXB → EBL</div><h3>هێشتا مانيفێست تۆمار نەکراوە</h3><p>فایلی Excel ـی دوبەی هێنە ژوورەوە و ژمارەی بۆکس، دانە، کیلۆ و نرخی فرۆشتن بە یەکجار تۆمار بکە.</p>'+button('＋ دروستکردنی مانيفێستی یەکەم','new-manifest','primary')+'</div>';
      const content='<div class="gc-land-dashboard-actions">'+
        '<div class="gc-land-dashboard-note"><span class="gc-land-route-pip"></span><div><strong>Dubai Warehouse <span>→</span> Erbil Warehouse</strong><small>باری وشک · ناردنی ڕۆژانە · مانيفێست و لیستی کڕیاران</small></div></div>'+
        '<div class="gc-land-form-actions">'+button('نوێکردنەوە','reload','')+button('＋ مانيفێستی نوێ','new-manifest','primary')+'</div></div>'+
        '<div class="gc-land-kpis">'+summaryCard('مانيفێستەکان',num(state.manifests.length),'Manifests','')+
        summaryCard('ڕیزی کڕیاران',num(all.rows),'Customer lines','')+
        summaryCard('بۆکس / دانە',num(all.boxes)+' / '+num(all.pcs),'Boxes · pieces','')+
        summaryCard('کێشی کۆیی',num(all.kg)+' kg','Gross cargo weight','')+
        summaryCard('نرخی فرۆشتن',money(all.price,currency),'All listed manifests','price')+'</div>'+
        '<div class="gc-land-list-head"><div><span class="gc-land-eyebrow">MANIFEST REGISTER</span><h2>تۆمارەکانی ناردن</h2><p>مانيفێستێک هەڵبژێرە بۆ بینینی ناوی کڕیار، جۆری کاڵا و وردەکاریی بەڵگەکان.</p></div>'+
        '<label class="gc-land-search"><span>گەڕان</span><input id="gc-land-search" placeholder="ژمارەی shipment، GC، ناوی کڕیار"></label></div>'+
        '<div class="gc-land-manifest-list" id="gc-land-manifest-list">'+cards+'</div>';
      base('مانيفێستی بارە وشکەکان','کۆنترۆڵی ناردنەکانی دوبەی → هەولێر، وەک فۆڕمی Excel بە زانیاریی ڕاستەقینەی سیستەم.',content);
      $('#gc-land-search')?.addEventListener('input',filterManifestCards);
    }catch(error){
      base('مانيفێستی بارە وشکەکان','پەیوەندی بە داتابەیسی کۆنسۆلی ستاف',
        '<div class="gc-land-error"><h3>نەتوانرا مانيفێستەکان باربکرێن</h3><p>'+esc(error.message)+'</p>'+button('دووبارە هەوڵدان','reload','primary')+'</div>');
    }
  };
  const filterManifestCards=()=>{
    const q=String($('#gc-land-search')?.value||'').trim().toLowerCase();
    $$('.gc-land-manifest-card').forEach(card=>{card.hidden=!card.textContent.toLowerCase().includes(q)});
  };
  const statusActionMarkup=(m)=>{
    const actions=[];
    if(m.status==='draft') actions.push(button('ئامادەی ناردن','status-issued','', 'data-id="'+esc(m.id)+'"'));
    if(m.status==='issued') actions.push(button('ناردن لە دوبەی','status-departed','primary','data-id="'+esc(m.id)+'"'));
    if(m.status==='departed') actions.push(button('گەیشتن بە هەولێر','status-arrived','primary','data-id="'+esc(m.id)+'"'));
    if(m.status==='arrived') actions.push(button('داخستنی مانيفێست','status-closed','','data-id="'+esc(m.id)+'"'));
    if(['draft','issued'].includes(m.status)) actions.push(button('هەڵوەشاندنەوە','status-cancelled','danger','data-id="'+esc(m.id)+'"'));
    return actions.join('');
  };
  const renderSavedLine=(r,index,editable)=>{
    return '<div class="gc-land-saved-line"><div class="gc-land-saved-line-index">'+(index+1)+'</div>'+
      '<div class="gc-land-saved-line-main"><strong>'+esc(r.customer_name)+'</strong><small>'+(r.gc_code?'<span class="gc-land-code">'+esc(r.gc_code)+'</span> ':'')+esc(r.shipment_date)+' · '+esc(r.cargo_type)+'</small><small>Tracking: '+esc(r.tracking_id||'—')+'</small></div>'+
      '<div class="gc-land-saved-line-metric"><span>BOX</span><b>'+num(r.box_count)+'</b></div>'+
      '<div class="gc-land-saved-line-metric"><span>PCS</span><b>'+num(r.quantity_pc)+'</b></div>'+
      '<div class="gc-land-saved-line-metric"><span>KG</span><b>'+num(r.weight_kg)+'</b></div>'+
      '<div class="gc-land-saved-line-price">'+esc(money(r.sell_price,r.currency||'USD'))+'</div>'+
      '<div class="gc-land-link-status '+(r.gc_linked?'ok':'warn')+'">'+(r.gc_linked?'GC ✓':'پشکنینی GC')+'</div>'+
      (editable?'<div class="gc-land-saved-line-actions">'+button('دەستکاری','edit-row','','data-shipment-id="'+esc(r.id)+'"')+button('سڕینەوە','archive-row','danger','data-shipment-id="'+esc(r.id)+'"')+'</div>':'')+
      '</div>';
  };
  const renderEditRow=()=>{
    if(!state.editId || !state.editRow) return '';
    const r=state.editRow;
    return '<form id="gc-land-edit-row-form" class="gc-land-edit-panel"><div class="gc-land-section-head"><div><span class="gc-land-eyebrow">EDIT DRAFT ROW</span><h2>دەستکاریی زانیاریی ڕیز</h2></div>'+button('پاشگەزبوونەوە','cancel-edit-row','')+'</div>'+
      '<input type="hidden" id="gc-land-edit-id" value="'+esc(state.editId)+'">'+
      '<div class="gc-land-header-fields">'+
      '<label><span>ناوی کڕیار</span><input data-edit-field="customer_name" value="'+esc(r.customer_name)+'" required></label>'+
      '<label><span>کۆدی GC</span><input data-edit-field="gc_code" value="'+esc(r.gc_code)+'" placeholder="GC-108"></label>'+
      '<label><span>بەروار</span><input data-edit-field="shipment_date" type="date" value="'+esc(toDate(r.shipment_date))+'" required></label>'+
      '<label><span>جۆری کاڵا</span><input data-edit-field="cargo_type" value="'+esc(r.cargo_type)+'" required></label>'+
      '<label><span>بۆکس</span><input data-edit-field="box_count" type="number" min="0" step="1" value="'+esc(r.box_count)+'"></label>'+
      '<label><span>PCS</span><input data-edit-field="quantity_pc" type="number" min="0" step="1" value="'+esc(r.quantity_pc)+'"></label>'+
      '<label><span>KG</span><input data-edit-field="weight_kg" type="number" min="0" step="0.01" value="'+esc(r.weight_kg)+'"></label>'+
      '<label><span>نرخی فرۆشتن</span><input data-edit-field="sell_price" type="number" min="0" step="0.01" value="'+esc(r.sell_price)+'"></label>'+
      '</div><div class="gc-land-footer-actions">'+button('پاشەکەوتی دەستکاری','save-edit-row','primary')+'</div></form>';
  };
  const renderDetailIntoView=(result)=>{
    const m=result.manifest;
    state.current=m;
    state.lines=result.lines||[];
    state.active=true;
    const t=totals(state.lines);
    const editable=m.status==='draft';
    const date=String(m.actual_departure||m.planned_departure||m.created_at||'').slice(0,10);
    const lines=state.lines.length?state.lines.map((r,i)=>renderSavedLine(r,i,editable)).join(''):'<div class="gc-land-empty"><h3>هیچ ڕیزێک بۆ ئەم مانيفێستە نییە</h3></div>';
    const body='<div class="gc-land-detail-actions">'+button('← هەموو مانيفێستەکان','back','')+
      '<div class="gc-land-form-actions">'+button('داگرتنی Excel','export-detail','')+button('نوێکردنەوە','reload-detail','')+'</div></div>'+
      '<article class="gc-land-detail-header"><div><span class="gc-land-eyebrow">SHIPMENT NO</span><h2>'+esc(m.manifest_number)+'</h2><p>Dubai → Erbil · Land freight · '+esc(date)+'</p></div><span class="gc-land-status '+statusClass(m.status)+'">'+esc(statusLabel(m.status))+'</span>'+
      '<div class="gc-land-detail-workflow">'+statusActionMarkup(m)+'</div></article>'+
      summaryMarkup(t,m.metadata?.currency||'USD')+
      '<div class="gc-land-link-audit"><strong>پشکنینی کۆدی کڕیار:</strong><span>'+num(t.linked)+' بەستراو</span><span>'+num(t.rows-t.linked)+' پێویستی بە پشتڕاستکردنەوە هەیە</span><small>تەنها GC ـی گونجاو بە داتابەیسەوە دەبەسترێت؛ کۆدی ناسراوی نادڵنیا خۆکارانە بە هەژمارێک نابەسترێت.</small></div>'+
      renderEditRow()+
      '<div class="gc-land-list-head"><div><span class="gc-land-eyebrow">CUSTOMER MANIFEST ROWS</span><h2>لیستی کاڵاکانی کڕیاران</h2><p>هەر ڕیزێک بارێکی کڕیارە و Tracking ـی تایبەتی خۆی هەیە.</p></div></div>'+
      '<div class="gc-land-saved-lines">'+lines+'</div>'+
      '<div class="gc-land-footer-actions">'+button('گەڕانەوە بۆ مانيفێستەکان','back','')+button('داگرتنی ئەم مانيفێستە بۆ Excel','export-detail','primary')+'</div>';
    base('مانيفێست · '+m.manifest_number,'وردەکاریی ناردن و کۆی گشتیی داتای کڕیاران.',body);
  };
  const openDetail=async(id)=>{
    state.active=true;state.editId='';state.editRow=null;
    base('مانيفێست','بارکردنی وردەکاریی ناردن…','<div class="gc-land-loading"><span class="gc-land-spinner"></span> پشکنینی ڕیزەکان…</div>');
    try{const result=await request('?kind=detail&id='+encodeURIComponent(id));renderDetailIntoView(result)}
    catch(error){base('مانيفێست','پشکنینی داتای ناردن','<div class="gc-land-error"><h3>وردەکاری نەدۆزرایەوە</h3><p>'+esc(error.message)+'</p>'+button('گەڕانەوە','back','')+'</div>')}
  };
  const saveEditRow=async()=>{
    const id=state.editId;
    if(!id||!state.current)return;
    const row={};
    $$('#gc-land-edit-row-form [data-edit-field]').forEach(input=>row[input.dataset.editField]=input.value);
    row.currency=state.current.metadata?.currency||'USD';
    row.customer_name=String(row.customer_name||'').trim();row.cargo_type=String(row.cargo_type||'').trim();row.gc_code=normalizeGC(row);
    row.box_count=numCell(row.box_count);row.quantity_pc=numCell(row.quantity_pc);row.weight_kg=numCell(row.weight_kg);row.sell_price=numCell(row.sell_price);
    if(!row.customer_name||!row.cargo_type){showToast('ناوی کڕیار و جۆری کاڵا پێویستن','bad');return}
    const btn=$('[data-action="save-edit-row"]');if(btn){btn.disabled=true;btn.textContent='پاشەکەوت…'}
    try{
      await post('update_row',{manifest_id:state.current.id,shipment_id:id,row,currency:row.currency});
      showToast('ڕیزی مانيفێست نوێکرایەوە','ok');
      state.editId='';state.editRow=null;await openDetail(state.current.id);
    }catch(error){showToast(error.message||'دەستکاری سەرکەوتوو نەبوو','bad')}
    finally{if(btn){btn.disabled=false;btn.textContent='پاشەکەوتی دەستکاری'}}
  };
  const openEdit=(id)=>{
    const line=state.lines.find(r=>String(r.id)===String(id));
    if(!line||state.current?.status!=='draft')return;
    state.editId=id;state.editRow={...line};renderDetailIntoView({manifest:state.current,lines:state.lines});
  };
  const statusConfirm=(status)=>{
    if(status==='departed')return 'دڵنیایت ئەم مانيفێستە لە دوبەی بەڕاستی نێردراوە؟ دۆخی هەموو بارەکانی دەگۆڕدرێت بۆ لە ڕێگایە.';
    if(status==='arrived')return 'دڵنیایت مانيفێستەکە گەیشتووەتە کۆگای هەولێر؟ دۆخی Tracking ـی هەموو بارەکان نوێ دەکرێتەوە.';
    if(status==='closed')return 'مانيفێستەکە داخە؟ داتای بارەکان دەمێنێتەوە.';
    if(status==='cancelled')return 'دڵنیایت مانيفێستەکە هەڵدەوەشێنیتەوە؟ دۆخی هەموو بارەکانی ئەم مانيفێستە دەگۆڕدرێت.';
    return 'مانيفێست بۆ هەنگاوی داهاتوو ئامادە بکرێت؟';
  };
  const updateStatus=async(id,status)=>{
    if(!window.confirm(statusConfirm(status)))return;
    try{await post('set_status',{manifest_id:id,status});showToast('دۆخی مانيفێست نوێکرایەوە','ok');await openDetail(id)}
    catch(error){showToast(error.message||'گۆڕینی دۆخ سەرکەوتوو نەبوو','bad')}
  };
  const archiveLine=async(id)=>{
    if(!state.current||state.current.status!=='draft')return;
    if(!window.confirm('ئەم ڕیزە لە مانيفێستی ڕەشنووس لادەبەیت؟ تۆمارەکە لە پاشبنەما دەمێنێتەوە بۆ مێژووی کردار.'))return;
    try{await post('archive_row',{manifest_id:state.current.id,shipment_id:id});showToast('ڕیزەکە لە مانيفێستی ڕەشنووس لادرا','ok');await openDetail(state.current.id)}
    catch(error){showToast(error.message||'سڕینەوەی ڕیز سەرکەوتوو نەبوو','bad')}
  };
  const lineExportRows=(lines)=>[['NAME','GC CODE','date','type','box','pcs','kg','sell price','Tracking','Status']].concat((lines||[]).map(r=>[
    r.customer_name||'',r.gc_code||'',r.shipment_date||'',r.cargo_type||'',Number(r.box_count||0),Number(r.quantity_pc||0),Number(r.weight_kg||0),Number(r.sell_price||0),r.tracking_id||'',statusLabel(r.status)
  ]));
  const exportWorkbook=(manifest,lines)=>{
    const currency=manifest.metadata?.currency||manifest.currency||'USD';
    const data=[
      ['GLOBALL CLOUD · DUBAI TO ERBIL LAND MANIFEST'],
      ['SHIPMENT NO',manifest.manifest_number],
      ['ROUTE','Dubai → Erbil'],
      ['STATUS',statusLabel(manifest.status)],
      ['CURRENCY',currency],
      [],
      ...lineExportRows(lines)
    ];
    if(window.XLSX){
      const ws=XLSX.utils.aoa_to_sheet(data);
      ws['!cols']=[{wch:30},{wch:18},{wch:14},{wch:20},{wch:10},{wch:10},{wch:12},{wch:16},{wch:32},{wch:22}];
      ws['!autofilter']={ref:'A7:J'+Math.max(7,data.length)};
      const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Land Manifest');
      XLSX.writeFile(wb, String(manifest.manifest_number||'GC-LAND')+'.xlsx');
    }else{
      const csv=data.map(row=>row.map(value=>'"'+String(value??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
      const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=String(manifest.manifest_number||'GC-LAND')+'.csv';a.click();URL.revokeObjectURL(a.href);
    }
  };
  const exportById=async(id)=>{
    try{
      const found=await request('?kind=detail&id='+encodeURIComponent(id));
      exportWorkbook(found.manifest,found.lines);
    }catch(error){showToast(error.message||'Excel دەرنەچوو','bad')}
  };
  const downloadTemplate=()=>{
    const rows=[
      ['GLOBALL CLOUD · DUBAI TO ERBIL LAND MANIFEST'],
      ['NAME','GC CODE','date','type','box','pcs','kg','sell price'],
      ['GC-108','GC-108',today(),'SHEIN',1,3,5.5,25],
      ['','',today(),'CAR PARTS',0,0,0,0],
    ];
    if(window.XLSX){
      const ws=XLSX.utils.aoa_to_sheet(rows);ws['!cols']=[{wch:32},{wch:18},{wch:14},{wch:24},{wch:10},{wch:10},{wch:12},{wch:16}];
      const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Dubai Manifest');XLSX.writeFile(wb,'GC-Dubai-Land-Manifest-Template.xlsx');
    }else{
      const csv=rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
      const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}));a.download='GC-Dubai-Land-Manifest-Template.csv';a.click();URL.revokeObjectURL(a.href);
    }
  };
  const headerAliases={
    customer_name:['name','customer','customer name','customer_name','ناو','ناوی کڕیار'],
    gc_code:['gc code','gc_code','gc','کۆدی gc'],
    shipment_date:['date','shipment date','shipment_date','بەروار','بەرواری ناردن'],
    cargo_type:['type','cargo type','cargo_type','item type','جۆری کاڵا'],
    box_count:['box','boxes','box count','box_count','carton','cartons','بۆکس'],
    quantity_pc:['pcs','pc','pieces','quantity','quantity pc','quantity_pc','دانە'],
    weight_kg:['kg','weight','weight kg','weight_kg','kilograms','کیلۆ'],
    sell_price:['sell price','sell_price','price','selling price','نرخی فرۆشتن']
  };
  const headKey=(v)=>String(v==null?'':v).normalize('NFKC').toLowerCase().replace(/[_\s.-]+/g,' ').trim();
  const importRowsFromMatrix=(matrix)=>{
    let headerAt=-1, indexes={};
    for(let i=0;i<Math.min(matrix.length,30);i++){
      const row=(matrix[i]||[]).map(headKey);
      const test={};
      for(const [key,aliases] of Object.entries(headerAliases)){
        test[key]=row.findIndex(h=>aliases.map(headKey).includes(h));
      }
      if(test.customer_name>=0&&test.cargo_type>=0&&(test.box_count>=0||test.quantity_pc>=0||test.weight_kg>=0)){
        headerAt=i;indexes=test;break;
      }
    }
    if(headerAt<0) throw new Error('سەردێڕی Excel نەدۆزرایەوە؛ پێویستە NAME، date، type، box، pcs، kg و sell price لە سەرەتای خشتەکەدا هەبن.');
    const dateFallback=$('#gc-land-date')?.value||today();
    const imported=[];
    for(let i=headerAt+1;i<matrix.length;i++){
      const row=matrix[i]||[];
      const value=(key)=>indexes[key]>=0?row[indexes[key]]:'';
      const name=String(value('customer_name')||'').trim();
      const type=String(value('cargo_type')||'').trim();
      if(!name && !type) continue;
      if(!name && [value('box_count'),value('quantity_pc'),value('weight_kg'),value('sell_price')].every(v=>v==null||String(v).trim()==='')) continue;
      imported.push({
        customer_name:name,
        gc_code:normalizeGC({gc_code:value('gc_code'),customer_name:name}),
        shipment_date:toDate(value('shipment_date')||dateFallback),
        cargo_type:type || 'OTHER — پێویستی بە پشکنین',
        box_count:numCell(value('box_count')),
        quantity_pc:numCell(value('quantity_pc')),
        weight_kg:numCell(value('weight_kg')),
        sell_price:numCell(value('sell_price')),
        currency:state.currency,
        notes:''
      });
    }
    if(!imported.length) throw new Error('هیچ ڕیزی بار نەدۆزرایەوە لە فایلەکە.');
    return imported;
  };
  const importFile=async(file)=>{
    if(!file)return;
    setMessage('فایلەکە خەریکی خوێندنەوەیە…');
    try{
      let matrix=[];
      if(file.name.toLowerCase().endsWith('.csv')&&!window.XLSX){
        const text=await file.text();
        matrix=text.split(/\r?\n/).map(line=>line.split(',').map(x=>x.trim().replace(/^"|"$/g,'').replace(/""/g,'"')));
      }else{
        if(!window.XLSX) throw new Error('خوێنەری Excel بارنەبووە؛ دووبارە reload بکە یان CSV هەڵبژێرە.');
        const data=await file.arrayBuffer();
        const wb=XLSX.read(data,{type:'array',cellDates:true});
        const ws=wb.Sheets[wb.SheetNames[0]];
        matrix=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:''});
      }
      state.draftRows=importRowsFromMatrix(matrix);
      state.draftRows.forEach(r=>r.currency=state.currency);
      renderCreate();
      const missing=state.draftRows.filter(r=>!r.customer_name||!r.cargo_type||!r.weight_kg).length;
      setMessage('Excel خوێندرایەوە: '+num(state.draftRows.length)+' ڕیز. ڕیزەکانی پێویستیان بە پشکنینی زانیاری هەیە پێش پاشەکەوتکردن.',missing?'warn':'ok');
      showToast('Excel بە سەرکەوتوویی خوێندرایەوە','ok');
    }catch(error){setMessage(error.message||'فایلەکە نەخوێندرایەوە','error');showToast(error.message||'Excel نەخوێندرایەوە','bad')}
    finally{const input=$('#gc-land-import-file');if(input)input.value=''}
  };
  const mountCreateRows=()=>{
    $('#gc-land-draft-lines')?.addEventListener('input',e=>{
      const input=e.target.closest('[data-line-field]');
      if(!input)return;
      const row=input.closest('[data-row-index]');const index=Number(row?.dataset.rowIndex);
      if(!Number.isInteger(index)||!state.draftRows[index])return;
      state.draftRows[index][input.dataset.lineField]=input.value;
      updateLiveTotals();
    });
  };
  const clickAction=async(action,buttonEl)=>{
    if(action==='new-manifest'){state.currency='USD';state.draftRows=[lineDefaults()];renderCreate();return}
    if(action==='back'){goDashboard();return}
    if(action==='reload'){renderDashboard();return}
    if(action==='reload-detail'&&state.current){openDetail(state.current.id);return}
    if(action==='template'){downloadTemplate();return}
    if(action==='import'){$('#gc-land-import-file')?.click();return}
    if(action==='add-draft-row'){state.draftRows.push(lineDefaults());renderCreate();mountCreateRows();return}
    if(action==='remove-draft-row'){
      const row=buttonEl.closest('[data-row-index]');const index=Number(row?.dataset.rowIndex);
      if(Number.isInteger(index)){state.draftRows.splice(index,1);if(!state.draftRows.length)state.draftRows.push(lineDefaults());renderCreate();mountCreateRows()}return
    }
    if(action==='save-create'){await saveDraft();return}
    if(action==='open-detail'){openDetail(buttonEl.dataset.id);return}
    if(action==='export-list'){exportById(buttonEl.dataset.id);return}
    if(action==='export-detail'&&state.current){exportWorkbook(state.current,state.lines);return}
    if(action.startsWith('status-')&&state.current){
      const status=action.slice(7);await updateStatus(buttonEl.dataset.id||state.current.id,status);return
    }
    if(action==='edit-row'){openEdit(buttonEl.dataset.shipmentId);return}
    if(action==='archive-row'){archiveLine(buttonEl.dataset.shipmentId);return}
    if(action==='cancel-edit-row'){state.editId='';state.editRow=null;renderDetailIntoView({manifest:state.current,lines:state.lines});return}
    if(action==='save-edit-row'){await saveEditRow();return}
  };
  const mount = () => {
    const nav=$('.gc-side .nav');
    if(nav&&!$('[data-tab="land-manifests"]',nav)){
      const btn=document.createElement('button');
      btn.type='button';btn.className='nav-btn';btn.dataset.tab='land-manifests';
      btn.innerHTML='<span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h18v13H3zM7 7V4h10v3M7 12h10M7 16h6"/></svg></span><span>مانيفێستی دوبەی</span><em class="nav-badge hidden">0</em>';
      const before=nav.querySelector('[data-tab="warehouses"]');
      if(before)nav.insertBefore(btn,before);else nav.appendChild(btn);
    }
  };
  document.addEventListener('click',(event)=>{
    const el=event.target.closest('[data-action]');
    if(!el||!$('#view')?.closest('.gc-shell'))return;
    if(state.active){
      const action=el.dataset.action;
      if(action){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();void clickAction(action,el)}
    }
  },true);
  document.addEventListener('click',(event)=>{
    const tab=event.target.closest('.nav-btn[data-tab]');
    if(!tab)return;
    if(tab.dataset.tab==='land-manifests'){
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
      state.active=true;$$('.nav-btn').forEach(x=>x.classList.toggle('active',x===tab));
      const title=$('#pageTitle');if(title)title.textContent='مانيفێستی دوبەی → هەولێر';
      const sub=$('#pageSub');if(sub)sub.textContent='Excel · manifest · boxes · pcs · kg · sell price';
      renderDashboard();
    }else{
      state.active=false;
    }
  },true);
  document.addEventListener('click',(event)=>{
    const refresh=event.target.closest('#refreshBtn');
    if(refresh&&state.active){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();if(state.current)openDetail(state.current.id);else renderDashboard()}
  },true);
  document.addEventListener('change',(event)=>{
    if(event.target.id==='gc-land-import-file') void importFile(event.target.files?.[0]);
  },true);
  const observer=new MutationObserver(()=>mount());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  mount();
})();
'use strict';
(() => {
  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const FLEET_HR_API_URL = SUPABASE_URL + '/functions/v1/fleet-hr-admin';
  const FINANCE_API_URL = SUPABASE_URL + '/functions/v1/finance-erp-admin';
  const $ = (id) => document.getElementById(id);
  const state = { client:null, session:null, me:null, view:'overview', data:{summary:null,vehicles:[],maintenance:[],fuel:[],attendance:[],leave_requests:[],payroll_periods:[],payroll_entries:[],vehicle_events:[],staff:[],assignments:[],accounts:[],periods:[],journals:[],finance_report:null}, modalAction:null };
  const titles = {
    overview:['کورتەی سیستەم','دۆخی ماژوولەکان و کردارە پێویستەکان.'],
    fleet:['Fleet Management','تۆمار و چاودێری ئۆتۆمبێلەکانی branch ـە دەستپێگەیشتووەکان.'],
    maintenance:['Maintenance Schedule','سێرڤیس، چاکسازی و تێچووی ئۆتۆمبێل.'],
    fuel:['Fuel Tracking','خەرجی سووتەمەنی و مێژووی بڕ و نرخ.'],
    vehicle_events:['Vehicle Event Log','مێژووی ڕووداو، ڕێگا، شوێن و بەستنی ئۆتۆمبێل بە shipment.'],
    attendance:['Attendance','تۆمارکردنی هاتن و چوون بە کاتی سێرڤەر.'],
    leave:['Leave Management','داواکاریی مۆڵەت و بڕیاری پارێزراو.'],
    finance:['Finance ERP','ژوورنالی دوولایەنە، P&L، cash flow و حسابەکانی دارایی.'],
    payroll:['Payroll Control','مووچە، خولی مووچە و audit trail.']
  };
  const escapeHtml = (v) => String(v ?? '—').replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const fmtDate = (v, time=false) => { if(!v) return '—'; const d=new Date(v); return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('en-GB',time?{dateStyle:'medium',timeStyle:'short'}:{dateStyle:'medium'}).format(d); };
  const fmtMoney = (v,c='IQD') => Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2})+' '+c;
  const statusClass = (s) => { const value=String(s||'').toLowerCase(); if(['paid','approved','completed','active','delivered','closed','posted'].includes(value))return 'ok'; if(['pending','planned','in_progress','draft','assigned','accepted','picked_up','out_for_delivery'].includes(value))return 'warn'; if(['rejected','cancelled','retired','failed','inactive','reversed','damaged','lost'].includes(value))return 'bad'; return ''; };
  const toast = (message,kind='') => { const e=$('toast'); e.textContent=message; e.className='toast'+(kind?' '+kind:''); e.classList.remove('hidden'); window.clearTimeout(toast.timer); toast.timer=window.setTimeout(()=>e.classList.add('hidden'),5500); };
  const notice = (message,kind='') => { const e=$('notice'); e.textContent=message; e.className='notice'+(kind?' '+kind:''); e.classList.remove('hidden'); };
  const showLogin = () => { $('boot').classList.add('hidden'); $('app').classList.add('hidden'); $('login').classList.remove('hidden'); };
  const showApp = () => { $('boot').classList.add('hidden'); $('login').classList.add('hidden'); $('app').classList.remove('hidden'); };
  const api = async (method='GET',params={},body=null) => {
    if(!state.session?.access_token) throw new Error('چوونەژوورەوە پێویستە.');
    const financeKinds = ['accounts','periods','journals','report'];
    const financeActions = ['create_account','create_period','close_period','create_journal','post_journal'];
    const isFinanceRequest = (method==='GET' && financeKinds.includes(String(params.kind||''))) ||
      (method!=='GET' && financeActions.includes(String(body?.action||'')));
    const baseUrl = isFinanceRequest ? FINANCE_API_URL : FLEET_HR_API_URL;
    const url = baseUrl + (method==='GET' ? '?' + new URLSearchParams(params).toString() : '');
    const response = await fetch(url,{method,headers:{Authorization:'Bearer '+state.session.access_token,apikey:SUPABASE_KEY,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store'});
    const payload = await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(payload.error || 'داواکاری سەرکەوتوو نەبوو ('+response.status+').');
    return payload;
  };
  const isAdmin = () => ['admin','super_admin'].includes(state.me?.role);
  const isFinance = () => ['admin','super_admin','accountant','finance'].includes(state.me?.role);
  const canOperate = () => ['admin','super_admin','operations'].includes(state.me?.role);
  const canReviewLeave = () => isAdmin();
  const canPayrollWrite = () => isAdmin();
  const setNavVisibility = () => {
    document.querySelectorAll('.finance-module,.finance-nav,[data-view="payroll"]').forEach(el=>el.classList.toggle('hidden',!isFinance()));
    $('superAdminLink').classList.toggle('hidden',!isAdmin());
    document.querySelectorAll('[data-action="create-vehicle"],[data-action="vehicle-event"],[data-action="create-maintenance"]').forEach(el=>el.classList.toggle('hidden',!canOperate()));
    document.querySelectorAll('[data-action="record-fuel"]').forEach(el=>el.classList.toggle('hidden',!(['admin','super_admin','operations','accountant','finance'].includes(state.me?.role))));
    document.querySelectorAll('[data-action="payroll-entry"],[data-action="payroll-period"],[data-action="create-account"],[data-action="create-period"],.finance-admin-only').forEach(el=>el.classList.toggle('hidden',!canPayrollWrite()));
  };
  const setView = async (name) => {
    if(!titles[name]) return;
    if((name==='payroll'||name==='finance')&&!isFinance()) { toast('دەستڕاگەیشتن بە Payroll تەنها بۆ Finance/Admin ـە.','bad'); return; }
    state.view=name;
    document.querySelectorAll('[data-panel]').forEach(e=>e.classList.toggle('active',e.dataset.panel===name));
    document.querySelectorAll('[data-view]').forEach(e=>e.classList.toggle('active',e.dataset.view===name));
    $('viewTitle').textContent=titles[name][0]; $('viewSubtitle').textContent=titles[name][1];
    $('sidebar').classList.remove('open');
    if(name==='overview') await loadSummary();
    else await loadViewData(name);
  };
  const loadSummary = async () => {
    const result=await api('GET',{kind:'summary'});
    state.data.summary=result.item;
    const s=result.item||{}; state.me=s;
    $('kpiVehicles').textContent=s.vehicles??'—';
    $('kpiMaintenance').textContent=s.maintenance_open??'—';
    $('kpiAttendance').textContent=s.attendance_today??'—';
    $('kpiLeave').textContent=s.pending_leave??'—';
    $('scopeLabel').textContent=(s.scope||[]).join(' · ')||s.branch||'Assigned scope';
    $('roleTag').textContent=String(s.role||'staff').replaceAll('_',' ').toUpperCase();
    $('staffName').textContent=s.staff_name||'Staff'; $('staffRole').textContent=(s.role||'staff')+' · '+(s.branch||'branch');
    $('avatar').textContent=String(s.staff_name||'GC').split(/\s+/).map(x=>x[0]||'').slice(0,2).join('').toUpperCase()||'GC';
    setNavVisibility();
  };
  const loadKind = async(kind) => {
    const result=await api('GET',{kind,limit:100,offset:0});
    if(kind==='report'||kind==='summary'){state.data.finance_report=result.report||null;return state.data.finance_report;}
    state.data[kind]=result.items||[];
    return state.data[kind];
  };
  const loadViewData = async(name) => {
    const mapping={fleet:['vehicles',...(canOperate()?['assignments']:[])],maintenance:['vehicles','maintenance'],fuel:['vehicles','fuel'],vehicle_events:['vehicles','vehicle_events'],attendance:['attendance'],leave:['leave_requests',...(isAdmin()?['staff']:[])],payroll:['payroll_periods','payroll_entries','staff'],finance:['accounts','periods','journals','report']};
    const kinds=mapping[name]||[];
    try { await Promise.all(kinds.map(loadKind)); renderView(name); }
    catch(e) { notice(e.message,'bad'); }
  };
  const loadAll = async() => {
    await loadSummary();
    if(state.view!=='overview') await loadViewData(state.view);
  };
  const vehicleLabel = (id) => { const v=state.data.vehicles.find(x=>x.id===id); return v ? v.vehicle_code+' · '+v.plate_number : String(id||'—').slice(0,10); };
  const tableEmpty = (cols,msg) => '<tr><td colspan="'+cols+'" class="empty">'+escapeHtml(msg)+'</td></tr>';
  const renderFinance = () => {
    const report=state.data.finance_report||{};
    const n=(v)=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:0});
    $('financeRevenue').textContent=n(report.revenue_iqd);
    $('financeExpenses').textContent=n(report.expenses_iqd);
    $('financeProfit').textContent=n(report.profit_iqd);
    $('financeCashflow').textContent=n(report.net_cashflow_iqd);
    $('financeReportScope').textContent=(report.branch||'All authorized branches')+' · IQD · '+(report.posted_entries||0)+' posted';
    if(!$('financeFrom').value&&report.from_date)$('financeFrom').value=report.from_date;
    if(!$('financeTo').value&&report.to_date)$('financeTo').value=report.to_date;
    const scope=state.data.summary?.scope||[];
    [...$('financeBranch').options].forEach(option=>{if(option.value)option.disabled=!scope.includes(option.value);});
    if(scope.length===1&&$('financeBranch').value!==scope[0])$('financeBranch').value=scope[0];
    $('financeMonthlyRows').innerHTML=(report.monthly_trend||[]).length?(report.monthly_trend||[]).map(r=>'<tr><td class="mono">'+escapeHtml(r.month)+'</td><td>'+escapeHtml(fmtMoney(r.revenue_iqd,'IQD'))+'</td><td>'+escapeHtml(fmtMoney(r.expenses_iqd,'IQD'))+'</td><td><b>'+escapeHtml(fmtMoney(r.profit_iqd,'IQD'))+'</b></td></tr>').join(''):tableEmpty(4,'لەو ماوەیەدا ژوورنالی پۆستکراو نییە.');
    $('financeBranchRows').innerHTML=(report.branch_comparison||[]).length?(report.branch_comparison||[]).map(r=>'<tr><td>'+escapeHtml(r.branch)+'</td><td>'+escapeHtml(fmtMoney(r.revenue_iqd,'IQD'))+'</td><td>'+escapeHtml(fmtMoney(r.expenses_iqd,'IQD'))+'</td><td><b>'+escapeHtml(fmtMoney(r.profit_iqd,'IQD'))+'</b></td><td>'+escapeHtml(fmtMoney(r.cashflow_iqd,'IQD'))+'</td></tr>').join(''):tableEmpty(5,'بۆ ئەم ماوەیە داتای دارایی نییە.');
    $('financeJournalRows').innerHTML=state.data.journals.length?state.data.journals.map(j=>{
      const lines=j.finance_journal_lines||[];
      const debit=lines.reduce((sum,l)=>sum+Number(l.debit_iqd||0),0);
      const credit=lines.reduce((sum,l)=>sum+Number(l.credit_iqd||0),0);
      const action=j.status==='draft'?'<button class="row-action primary" data-action="post-journal" data-id="'+escapeHtml(j.id)+'">Post</button>':'—';
      return '<tr><td><b class="mono">'+escapeHtml(j.journal_number)+'</b><span class="cell-sub">'+escapeHtml(j.reference||j.source_type||'manual')+'</span></td><td>'+escapeHtml(j.entry_date)+'</td><td>'+escapeHtml(j.branch)+'</td><td>'+escapeHtml(j.description)+'<span class="cell-sub">'+lines.length+' line(s)</span></td><td>'+escapeHtml(fmtMoney(debit,'IQD'))+'</td><td>'+escapeHtml(fmtMoney(credit,'IQD'))+'</td><td><span class="status-badge '+statusClass(j.status)+'">'+escapeHtml(j.status)+'</span></td><td>'+action+'</td></tr>';
    }).join(''):tableEmpty(8,'هێشتا ژوورنالی دارایی نییە.');
    $('financeAccountsRows').innerHTML=state.data.accounts.length?state.data.accounts.map(a=>'<tr><td class="mono">'+escapeHtml(a.account_code)+'</td><td><b>'+escapeHtml(a.name_ckb)+'</b><span class="cell-sub">'+escapeHtml(a.name_en)+'</span></td><td>'+escapeHtml(a.account_type)+'</td><td>'+((a.is_cash_account)?'<span class="status-badge ok">Cash</span>':'—')+'</td><td><span class="status-badge '+statusClass(a.is_active?'active':'inactive')+'">'+(a.is_active?'Active':'Inactive')+'</span></td></tr>').join(''):tableEmpty(5,'Chart of Accounts بەردەست نییە.');
    $('financePeriodRows').innerHTML=state.data.periods.length?state.data.periods.map(p=>'<tr><td><b>'+escapeHtml(p.period_name)+'</b></td><td>'+escapeHtml(p.starts_on)+'</td><td>'+escapeHtml(p.ends_on)+'</td><td><span class="status-badge '+statusClass(p.status)+'">'+escapeHtml(p.status)+'</span></td><td>'+escapeHtml(fmtDate(p.closed_at,true))+'</td><td>'+(p.status==='open'&&canPayrollWrite()?'<button class="row-action primary" data-action="close-finance-period" data-id="'+escapeHtml(p.id)+'">Close period</button>':'—')+'</td></tr>').join(''):tableEmpty(6,'Accounting Period دروست نەکراوە.');
  };
  const renderView = (name) => {
    const rows=state.data;
    if(name==='fleet') {
      $('vehiclesRows').innerHTML=rows.vehicles.length?rows.vehicles.map(v=>'<tr><td><b>'+escapeHtml(v.vehicle_code)+'</b><span class="cell-sub">'+escapeHtml([v.make,v.model].filter(Boolean).join(' '))+'</span></td><td class="mono">'+escapeHtml(v.plate_number)+'</td><td>'+escapeHtml(v.vehicle_type)+'</td><td>'+escapeHtml(v.branch)+'</td><td>'+escapeHtml(v.capacity_kg??'—')+' kg</td><td>'+escapeHtml(v.odometer_km)+' km</td><td><span class="status-badge '+statusClass(v.status)+'">'+escapeHtml(v.status)+'</span></td><td>'+(canOperate()?'<button class="row-action primary" data-action="edit-vehicle" data-id="'+escapeHtml(v.id)+'">دەستکاری</button><button class="row-action" data-action="assign-vehicle" data-id="'+escapeHtml(v.id)+'">بەستنەوە بە delivery</button>':'—')+'</td></tr>').join(''):tableEmpty(8,'هیچ ئۆتۆمبێلێک لەم scope ـەدا نییە.');
    } else if(name==='maintenance') {
      $('maintenanceRows').innerHTML=rows.maintenance.length?rows.maintenance.map(v=>'<tr><td>'+escapeHtml(vehicleLabel(v.vehicle_id))+'</td><td>'+escapeHtml(v.maintenance_type)+'</td><td>'+escapeHtml(v.description)+'</td><td>'+escapeHtml(fmtDate(v.scheduled_at))+'</td><td><span class="status-badge '+statusClass(v.status)+'">'+escapeHtml(v.status)+'</span></td><td>'+escapeHtml(fmtMoney(v.cost_amount,v.cost_currency))+'</td></tr>').join(''):tableEmpty(6,'تۆماری سێرڤیس نییە.');
    } else if(name==='fuel') {
      $('fuelRows').innerHTML=rows.fuel.length?rows.fuel.map(v=>'<tr><td>'+escapeHtml(vehicleLabel(v.vehicle_id))+'</td><td>'+escapeHtml(fmtDate(v.logged_at,true))+'</td><td>'+escapeHtml(v.liters)+'</td><td>'+escapeHtml(v.amount)+'</td><td>'+escapeHtml(v.currency)+'</td><td>'+escapeHtml(v.odometer_km??'—')+'</td><td>'+escapeHtml(v.station_name||'—')+'</td></tr>').join(''):tableEmpty(7,'تۆماری سووتەمەنی نییە.');
    } else if(name==='vehicle_events') {
      $('vehicleEventRows').innerHTML=rows.vehicle_events.length?rows.vehicle_events.map(v=>'<tr><td>'+escapeHtml(vehicleLabel(v.vehicle_id))+'</td><td><span class="status-badge '+statusClass(v.event_type)+'">'+escapeHtml(v.event_type)+'</span></td><td>'+escapeHtml(fmtDate(v.event_at,true))+'</td><td class="mono">'+escapeHtml(v.shipment_id||'—')+'</td><td class="mono">'+escapeHtml(String(v.delivery_assignment_id||'—').slice(0,12))+'</td><td>'+escapeHtml(v.latitude==null?'—':String(v.latitude)+', '+String(v.longitude))+'</td><td>'+escapeHtml(v.odometer_km==null?'—':String(v.odometer_km)+' km')+'</td><td>'+escapeHtml(v.note||'—')+'</td></tr>').join(''):tableEmpty(8,'هێشتا ڕووداوی ئۆتۆمبێل تۆمار نەکراوە.');
    } else if(name==='attendance') {
      const open=rows.attendance.find(x=>!x.check_out_at);
      $('attendanceState').textContent=open?'هاتنت تۆمار کراوە لە '+fmtDate(open.check_in_at,true)+'. دەتوانیت چوون تۆمار بکەیت.':'خولی کراوەی هاتن نییە. دەتوانیت هاتن تۆمار بکەیت.';
      $('checkInBtn').disabled=Boolean(open); $('checkOutBtn').disabled=!open;
      $('attendanceRows').innerHTML=rows.attendance.length?rows.attendance.map(v=>{let duration='—';if(v.check_in_at&&v.check_out_at) duration=((new Date(v.check_out_at)-new Date(v.check_in_at))/3600000).toFixed(2)+' h';return '<tr><td>'+escapeHtml(v.work_date)+'</td><td>'+escapeHtml(fmtDate(v.check_in_at,true))+'</td><td>'+escapeHtml(fmtDate(v.check_out_at,true))+'</td><td>'+escapeHtml(duration)+'</td><td>'+escapeHtml(v.check_in_source)+'</td></tr>'}).join(''):tableEmpty(5,'هێشتا تۆماری ئامادەبوون نییە.');
    } else if(name==='leave') {
      $('leaveRows').innerHTML=rows.leave_requests.length?rows.leave_requests.map(v=>'<tr><td>'+escapeHtml((state.data.staff.find(s=>s.id===v.staff_id)?.full_name)||String(v.staff_id).slice(0,8))+'</td><td>'+escapeHtml(v.leave_type)+'</td><td>'+escapeHtml(v.starts_on)+'</td><td>'+escapeHtml(v.ends_on)+'</td><td>'+escapeHtml(v.reason||'—')+'</td><td><span class="status-badge '+statusClass(v.status)+'">'+escapeHtml(v.status)+'</span></td><td>'+(canReviewLeave()&&v.status==='pending'?'<button class="row-action primary" data-action="approve-leave" data-id="'+escapeHtml(v.id)+'">پەسەند</button><button class="row-action" data-action="reject-leave" data-id="'+escapeHtml(v.id)+'">ڕەتکردنەوە</button>':'—')+'</td></tr>').join(''):tableEmpty(7,'داواکاری مۆڵەت نییە.');
    } else if(name==='finance') {
      renderFinance();
    } else if(name==='payroll') {
      $('payrollRows').innerHTML=rows.payroll_periods.length?rows.payroll_periods.map(p=>'<tr><td>'+escapeHtml(p.period_start)+'</td><td>'+escapeHtml(p.period_end)+'</td><td><span class="status-badge '+statusClass(p.status)+'">'+escapeHtml(p.status)+'</span></td><td>'+escapeHtml(fmtDate(p.approved_at,true))+'</td><td>'+escapeHtml(fmtDate(p.paid_at,true))+'</td><td>'+(['draft','approved','paid'].includes(p.status)&&canPayrollWrite()?'<button class="row-action primary" data-action="payroll-advance" data-id="'+escapeHtml(p.id)+'" data-status="'+escapeHtml(p.status)+'">'+(p.status==='draft'?'پەسەندکردن':p.status==='approved'?'تۆمارکردنی پارەدان':'داخستن')+'</button>':'—')+'</td></tr>').join(''):tableEmpty(6,'خولی مووچە نییە.');
      $('payrollEntryRows').innerHTML=rows.payroll_entries.length?rows.payroll_entries.map(p=>'<tr><td>'+escapeHtml(String(p.payroll_period_id).slice(0,8))+'</td><td class="mono">'+escapeHtml((state.data.staff.find(s=>s.id===p.staff_id)?.full_name)||String(p.staff_id).slice(0,8))+'</td><td>'+escapeHtml(fmtMoney(p.base_salary,p.currency))+'</td><td>'+escapeHtml(fmtMoney(p.allowances,p.currency))+'</td><td>'+escapeHtml(fmtMoney(p.deductions,p.currency))+'</td><td><b>'+escapeHtml(fmtMoney(p.net_pay,p.currency))+'</b></td><td>'+escapeHtml(p.currency)+'</td></tr>').join(''):tableEmpty(7,'تۆماری مووچە نییە.');
    }
  };
  const field = (name,label,type='text',opts={}) => {
    const wide=opts.wide?' full':'';
    let control='';
    if(type==='select') control='<select class="field-control" name="'+escapeHtml(name)+'" '+(opts.required===false?'':'required')+'>'+opts.options.map(([v,t])=>'<option value="'+escapeHtml(v)+'">'+escapeHtml(t)+'</option>').join('')+'</select>';
    else if(type==='textarea') control='<textarea class="field-control" name="'+escapeHtml(name)+'" '+(opts.required===false?'':'required')+'></textarea>';
    else control='<input class="field-control" name="'+escapeHtml(name)+'" type="'+escapeHtml(type)+'" '+(opts.required===false?'':'required')+(opts.step?' step="'+escapeHtml(opts.step)+'"':'')+(opts.min!==undefined?' min="'+escapeHtml(opts.min)+'"':'')+(opts.max!==undefined?' max="'+escapeHtml(opts.max)+'"':'')+(opts.value!==undefined?' value="'+escapeHtml(opts.value)+'"':'')+(opts.readonly?' readonly':'')+'>';
    return '<label class="form-field'+wide+'"><span>'+escapeHtml(label)+'</span>'+control+'</label>';
  };
  const vehicleOptions=()=>state.data.vehicles.map(v=>[v.id,v.vehicle_code+' · '+v.plate_number]);
  const openModal = (action,id=null) => {
    state.modalAction={action,id};
    let title='',fields='';
    const vehicles=vehicleOptions();
    if(action==='create-account') {
      title='زیادکردنی حساب لە Chart of Accounts';
      fields=field('account_code','کۆدی حساب','text')+field('account_type','جۆری حساب','select',{options:[['asset','Asset'],['liability','Liability'],['equity','Equity'],['revenue','Revenue'],['expense','Expense']]})+
       field('name_en','Account name (English)','text')+field('name_ckb','ناوی حساب بە کوردی','text')+
       field('is_cash_account','Cash / Bank account','select',{options:[['false','No'],['true','Yes']]})+
       field('parent_account_id','Parent account','select',{required:false,options:[['','No parent'],...state.data.accounts.filter(x=>x.is_active).map(x=>[x.id,x.account_code+' · '+x.name_en])]});
    } else if(action==='create-period') {
      title='دروستکردنی Accounting Period';
      fields=field('period_name','ناوی ماوە','text')+field('starts_on','لە بەرواری','date')+
       field('ends_on','تا بەرواری','date')+field('note','تێبینی','textarea',{required:false,wide:true});
    } else if(action==='create-journal') {
      title='دروستکردنی Journal / Expense';
      const accountOptions=state.data.accounts.filter(x=>x.is_active).map(x=>[x.id,x.account_code+' · '+x.name_en+' ('+x.account_type+')']);
      fields=field('entry_date','بەرواری ژوورنال','date')+
       field('branch','لق','select',{options:(state.data.summary?.scope||['erbil']).map(b=>[b,b.charAt(0).toUpperCase()+b.slice(1)])})+
       field('description','وەسفی ژوورنال','text',{wide:true})+
       field('source_type','جۆری مامەڵە','select',{options:[['manual','Manual journal'],['expense','Expense'],['shipment_invoice','Shipment invoice'],['payment','Payment'],['payroll','Payroll'],['customs','Customs'],['fuel','Fuel'],['maintenance','Maintenance'],['adjustment','Adjustment'],['reversal','Reversal']]})+
       field('reference','ژمارەی پەیوەندیدار','text',{required:false})+
       field('debit_account_id','Debit account','select',{options:accountOptions})+
       field('credit_account_id','Credit account','select',{options:accountOptions})+
       field('amount_iqd','بڕ بە IQD','number',{min:'0.01',step:'0.01'})+
       field('memo','تێبینیی هێڵ','textarea',{required:false,wide:true})+
       field('post_status','دۆخی سەرەتایی','select',{options:[['draft','Draft · پێش تۆمارکردن'],['posted','Post now · تۆمارکردنی کۆتایی']]})+
       '<p class="form-hint full">ژوورنال بە دوو هێڵی یەکسانی Debit/Credit دروست دەبێت. Draft تا کاتی Post کردن لە P&amp;L حساب ناکرێت.</p>';
    } else if(action==='create-vehicle'||action==='edit-vehicle') {
      title=action==='edit-vehicle'?'دەستکاری ئۆتۆمبێل':'تۆمارکردنی ئۆتۆمبێلی نوێ';
      const v=state.data.vehicles.find(x=>x.id===id)||{};
      fields=field('vehicle_code','کۆدی ئۆتۆمبێل','text',{value:v.vehicle_code})+field('plate_number','ژمارەی پلاک','text',{value:v.plate_number})+
       field('vehicle_type','جۆری ئۆتۆمبێل','select',{options:[['car','Car'],['van','Van'],['truck','Truck']]} )+
       field('branch','لق','select',{options:(state.data.summary?.scope||['erbil']).map(b=>[b,b.charAt(0).toUpperCase()+b.slice(1)]),value:v.branch})+
       field('make','بەرهەمهێنەر','text',{required:false,value:v.make})+field('model','مۆدێل','text',{required:false,value:v.model})+
       field('model_year','ساڵ','number',{required:false,min:1980,max:2100,step:1,value:v.model_year})+
       field('fuel_type','جۆری سووتەمەنی','select',{required:false,options:[['','نادیار / هەڵبژێرە'],['diesel','Diesel'],['petrol','Petrol'],['hybrid','Hybrid'],['electric','Electric'],['other','Other']]} )+
       field('capacity_kg','توانای بار (kg)','number',{required:false,min:0,step:'0.001',value:v.capacity_kg})+
       field('odometer_km','کیلۆمەتر','number',{min:0,step:'0.01',value:v.odometer_km||0})+
       field('status','دۆخ','select',{options:[['active','Active'],['inactive','Inactive'],['maintenance','Maintenance'],['retired','Retired']]})+
       field('vin','VIN','text',{required:false,value:v.vin})+field('notes','تێبینی','textarea',{required:false,wide:true});
      $('actionForm').dataset.editId=id||'';
      if(v.vehicle_type) fields=fields.replace('<option value="'+v.vehicle_type+'">','<option value="'+v.vehicle_type+'" selected>');
      if(v.branch) fields=fields.replace('<option value="'+v.branch+'">','<option value="'+v.branch+'" selected>');
      if(v.fuel_type) fields=fields.replace('<option value="'+v.fuel_type+'">','<option value="'+v.fuel_type+'" selected>');
      if(v.status) fields=fields.replace('<option value="'+v.status+'">','<option value="'+v.status+'" selected>');
    } else if(action==='assign-vehicle') {
      title='بەستنەوەی ئۆتۆمبێل بە delivery';
      fields=field('vehicle_id','ئۆتۆمبێل','select',{options:vehicles})+field('assignment_id','Delivery و شۆفێر','select',{options:state.data.assignments.map(x=>[x.id,String(x.shipment_id)+' · '+String(x.driver_name||x.assigned_staff_id)+' · '+String(x.status)])});
      fields=fields.replace('<option value="'+id+'">','<option value="'+id+'" selected>');
    } else if(action==='create-maintenance') {
      title='تۆمارکردنی سێرڤیس';
      fields=field('vehicle_id','ئۆتۆمبێل','select',{options:vehicles})+field('maintenance_type','جۆری کار','select',{options:[['scheduled','Scheduled'],['repair','Repair'],['inspection','Inspection'],['tyres','Tyres'],['oil','Oil'],['other','Other']]})+
       field('description','وردەکاری','text',{wide:true})+field('scheduled_at','بەرواری پلاندانان','datetime-local',{required:false})+
       field('status','دۆخ','select',{options:[['planned','Planned'],['in_progress','In progress'],['completed','Completed'],['cancelled','Cancelled']]})+
       field('cost_amount','تێچوو','number',{min:0,step:'0.01',value:0})+field('cost_currency','دراو','select',{options:[['IQD','IQD'],['USD','USD'],['AED','AED'],['CNY','CNY']]})+
       field('provider_name','ناوی سێرڤیس','text',{required:false})+field('odometer_km','کیلۆمەتر','number',{required:false,min:0,step:'0.01'})+field('invoice_reference','ژمارەی پسووڵە','text',{required:false})+field('notes','تێبینی','textarea',{required:false,wide:true});
    } else if(action==='record-fuel') {
      title='تۆمارکردنی سووتەمەنی';
      fields=field('vehicle_id','ئۆتۆمبێل','select',{options:vehicles})+field('logged_at','بەروار','datetime-local',{required:false})+
       field('liters','لیتر','number',{min:'0.001',step:'0.001'})+field('amount','بڕی پارە','number',{min:0,step:'0.01'})+
       field('currency','دراو','select',{options:[['IQD','IQD'],['USD','USD'],['AED','AED'],['CNY','CNY']]})+field('odometer_km','کیلۆمەتر','number',{required:false,min:0,step:'0.01'})+
       field('station_name','ناوی شوێن','text',{required:false})+field('receipt_reference','ژمارەی پسووڵە','text',{required:false})+field('note','تێبینی','textarea',{required:false,wide:true});
    } else if(action==='vehicle-event') {
      title='تۆمارکردنی ڕووداوی ئۆتۆمبێل';
      fields=field('vehicle_id','ئۆتۆمبێل','select',{options:vehicles})+field('event_type','جۆری ڕووداو','select',{options:[['inspection','Inspection'],['route_started','Route started'],['route_completed','Route completed'],['status_changed','Status changed'],['maintenance_started','Maintenance started'],['maintenance_completed','Maintenance completed']]})+
       field('odometer_km','کیلۆمەتر','number',{required:false,min:0,step:'0.01'})+field('note','تێبینی','textarea',{required:false,wide:true});
    } else if(action==='request-leave') {
      title='داواکاری مۆڵەت';
      fields=field('leave_type','جۆری مۆڵەت','select',{options:[['annual','Annual'],['sick','Sick'],['unpaid','Unpaid'],['emergency','Emergency'],['other','Other']]})+
       field('starts_on','لە بەرواری','date')+field('ends_on','تا بەرواری','date')+field('reason','هۆکار','textarea',{required:false,wide:true});
    } else if(action==='payroll-period') {
      title='خولی مووچە';
      fields=field('period_start','لە بەرواری','date')+field('period_end','تا بەرواری','date')+field('notes','تێبینی','textarea',{required:false,wide:true});
    } else if(action==='payroll-entry') {
      title='تۆماری مووچە';
      fields=field('payroll_period_id','خولی مووچە','select',{options:state.data.payroll_periods.filter(x=>x.status==='draft').map(x=>[x.id,x.period_start+' → '+x.period_end])})+
       field('staff_id','کارمەند','select',{options:state.data.staff.filter(x=>x.is_active).map(x=>[x.id,(x.full_name||x.email||x.id)+' · '+x.role])})+field('base_salary','مووچەی بنەڕەتی','number',{min:0,step:'0.01'})+field('allowances','زیادە','number',{min:0,step:'0.01',value:0})+
       field('deductions','داشکاندن','number',{min:0,step:'0.01',value:0})+field('currency','دراو','select',{options:[['IQD','IQD'],['USD','USD'],['AED','AED'],['CNY','CNY']]})+
       field('payment_reference','ژمارەی پارەدان','text',{required:false})+field('note','تێبینی','textarea',{required:false,wide:true});
    }
    $('modalTitle').textContent=title;
    $('formFields').innerHTML=fields;
    $('modalBackdrop').classList.remove('hidden');
    $('formFields').querySelector('input,select,textarea')?.focus();
  };
  const closeModal=()=>{$('modalBackdrop').classList.add('hidden');state.modalAction=null;$('actionForm').reset();};
  const formData=()=>Object.fromEntries([...new FormData($('actionForm')).entries()].map(([k,v])=>[k, v===''?null:v]));
  const submitAction=async(event)=>{
    event.preventDefault();
    if(!state.modalAction) return;
    const submit=$('saveAction');submit.disabled=true;
    try {
      const {action,id}=state.modalAction;const data=formData();let endpointAction=action;
      if(action==='create-vehicle'||action==='edit-vehicle') {endpointAction=action==='edit-vehicle'?'update_vehicle':'create_vehicle';if(id)data.vehicle_id=id;data.model_year=data.model_year===null?null:Number(data.model_year);data.capacity_kg=data.capacity_kg===null?null:Number(data.capacity_kg);data.odometer_km=Number(data.odometer_km||0);}
      else if(action==='create-account'){endpointAction='create_account';data.is_cash_account=data.is_cash_account==='true';}
      else if(action==='create-period'){endpointAction='create_period';}
      else if(action==='create-journal'){
        endpointAction='create_journal';
        if(data.debit_account_id===data.credit_account_id)throw new Error('Debit and Credit accounts must be different.');
        const value=Number(data.amount_iqd);
        if(!Number.isFinite(value)||value<=0)throw new Error('Journal amount must be greater than zero.');
        data.lines=[
          {account_id:data.debit_account_id,debit_iqd:value,credit_iqd:0,memo:data.memo||null,transaction_currency:'IQD'},
          {account_id:data.credit_account_id,debit_iqd:0,credit_iqd:value,memo:data.memo||null,transaction_currency:'IQD'}
        ];
        data.post=data.post_status==='posted';
        delete data.post_status;delete data.debit_account_id;delete data.credit_account_id;delete data.amount_iqd;delete data.memo;
      }
      else if(action==='create-maintenance'){endpointAction='create_maintenance';data.cost_amount=Number(data.cost_amount||0);if(data.odometer_km!==null)data.odometer_km=Number(data.odometer_km);if(data.scheduled_at)data.scheduled_at=new Date(data.scheduled_at).toISOString();}
      else if(action==='record-fuel'){endpointAction='record_fuel';data.liters=Number(data.liters);data.amount=Number(data.amount);if(data.odometer_km!==null)data.odometer_km=Number(data.odometer_km);if(data.logged_at)data.logged_at=new Date(data.logged_at).toISOString();}
      else if(action==='vehicle-event')endpointAction='record_vehicle_event';
      else if(action==='assign-vehicle'){endpointAction='assign_vehicle_to_delivery';data.vehicle_id=id||data.vehicle_id;}
      else if(action==='request-leave')endpointAction='request_leave';
      else if(action==='payroll-period')endpointAction='create_payroll_period';
      else if(action==='payroll-entry'){endpointAction='upsert_payroll_entry';for(const k of ['base_salary','allowances','deductions'])data[k]=Number(data[k]||0);}
      if(action==='edit-vehicle') await api('POST',{}, {action:endpointAction,data});
      else await api('POST',{}, {action:endpointAction,data});
      closeModal();toast('تۆمارەکە بە سەرکەوتوویی پاشەکەوت کرا.');await loadViewData(state.view);await loadSummary();
    } catch(e) { toast(e.message,'bad'); }
    finally {submit.disabled=false;}
  };
  const postFinanceJournal=async(id)=>{
    if(!window.confirm('دڵنیایت ژوورنالەکە Post بکرێت؟ دوای Post کردن لە P&L و General Ledger حساب دەکرێت.'))return;
    try{await api('POST',{}, {action:'post_journal',data:{journal_id:id}});toast('ژوورنال بە سەرکەوتوویی پۆست کرا.');await loadViewData('finance');}
    catch(e){toast(e.message,'bad');}
  };
  const closeFinancePeriod=async(id)=>{
    if(!window.confirm('دڵنیایت ئەم Accounting Period ـە داخەیت؟ ئەگەر draft journal هەبێت داخستن ڕەت دەکرێتەوە.'))return;
    try{await api('POST',{}, {action:'close_period',data:{period_id:id}});toast('Accounting Period داخرا.');await loadViewData('finance');}
    catch(e){toast(e.message,'bad');}
  };
  const runFinanceReport=async()=>{
    const params={kind:'report'};
    if($('financeFrom').value)params.from=$('financeFrom').value;
    if($('financeTo').value)params.to=$('financeTo').value;
    if($('financeBranch').value)params.branch=$('financeBranch').value;
    try{const result=await api('GET',params);state.data.finance_report=result.report||null;renderFinance();toast('ڕاپۆرتی دارایی نوێکرایەوە.');}
    catch(e){toast(e.message,'bad');}
  };
  const attendanceAction=async(action)=>{
    $('checkInBtn').disabled=true;$('checkOutBtn').disabled=true;
    try { await api('POST',{}, {action:'attendance',data:{action}});toast(action==='check_in'?'کاتی هاتن تۆمار کرا.':'کاتی چوون تۆمار کرا.');await loadViewData('attendance');await loadSummary(); }
    catch(e){toast(e.message,'bad');await loadViewData('attendance');}
  };
  const leaveReview=async(id,status)=>{
    const note=window.prompt(status==='approved'?'تێبینی پەسەندکردن (دەتوانرێت بەتاڵ بێت):':'هۆکاری ڕەتکردنەوە (دەتوانرێت بەتاڵ بێت):','');
    if(note===null)return;
    try{await api('POST',{}, {action:'review_leave',data:{request_id:id,status,review_note:note}});toast(status==='approved'?'داواکاری پەسەندکرا.':'داواکاری ڕەتکرایەوە.');await loadViewData('leave');await loadSummary();}
    catch(e){toast(e.message,'bad');}
  };
  const payrollAdvance=async(id,status)=>{
    const next=status==='draft'?'approved':status==='approved'?'paid':'closed';
    const textConfirm={approved:'دڵنیایت لەم خولی مووچە پەسەند بکەیت؟',paid:'پارەدانی مووچە پشتڕاست دەکەیتەوە؟',closed:'خولی مووچە داخەیت؟'};
    if(!window.confirm(textConfirm[next]||'بەردەوامبوون؟'))return;
    try{await api('POST',{}, {action:'set_payroll_period_status',data:{period_id:id,status:next}});toast('دۆخی خولی مووچە نوێکرایەوە.');await loadViewData('payroll');}
    catch(e){toast(e.message,'bad');}
  };
  const boot=async()=>{
    state.client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data,error}=await state.client.auth.getSession();if(error)throw error;
    if(!data.session){showLogin();return}
    state.session=data.session;showApp();
    try{await loadSummary();await setView('overview')}catch(e){await state.client.auth.signOut();state.session=null;showLogin();$('loginError').textContent=e.message;}
  };
  $('loginForm').addEventListener('submit',async(event)=>{event.preventDefault();$('loginError').classList.add('hidden');const b=event.submitter;b.disabled=true;try{const {data,error}=await state.client.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)throw error;state.session=data.session;showApp();await loadSummary();await setView('overview');}catch(e){$('loginError').textContent=e.message;$('loginError').classList.remove('hidden');showLogin()}finally{b.disabled=false}});
  $('signOut').addEventListener('click',async()=>{await state.client.auth.signOut();state.session=null;state.me=null;showLogin()});
  $('refreshBtn').addEventListener('click',()=>loadAll().catch(e=>notice(e.message,'bad')));
  $('runFinanceReport').addEventListener('click',runFinanceReport);
  $('checkInBtn').addEventListener('click',()=>attendanceAction('check_in'));
  $('checkOutBtn').addEventListener('click',()=>attendanceAction('check_out'));
  $('closeModal').addEventListener('click',closeModal);$('cancelModal').addEventListener('click',closeModal);$('actionForm').addEventListener('submit',submitAction);
  $('modalBackdrop').addEventListener('click',(e)=>{if(e.target===$('modalBackdrop'))closeModal()});
  $('mobileMenu').addEventListener('click',()=>$('sidebar').classList.toggle('open'));
  document.addEventListener('keydown',(e)=>{if(e.key==='Escape'){closeModal();$('sidebar').classList.remove('open')}});
  document.addEventListener('click',(e)=>{
    const view=e.target.closest('[data-view]');if(view){e.preventDefault();setView(view.dataset.view).catch(err=>notice(err.message,'bad'));return;}
    const action=e.target.closest('[data-action]');if(!action)return;
    const a=action.dataset.action,id=action.dataset.id||null;
    if(a==='create-vehicle'||a==='edit-vehicle'||a==='assign-vehicle'||a==='create-maintenance'||a==='record-fuel'||a==='vehicle-event'||a==='request-leave'||a==='payroll-period'||a==='payroll-entry'||a==='create-account'||a==='create-period'||a==='create-journal')openModal(a,id);
    else if(a==='approve-leave')leaveReview(id,'approved');
    else if(a==='reject-leave')leaveReview(id,'rejected');
    else if(a==='payroll-advance')payrollAdvance(id,action.dataset.status);
    else if(a==='post-journal')postFinanceJournal(id);
    else if(a==='close-finance-period')closeFinancePeriod(id);
  });
  document.addEventListener('DOMContentLoaded',()=>{const until=Date.now()+2500;const poll=()=>{if(window.supabase?.createClient){boot().catch(e=>{showLogin();$('loginError').textContent=e.message;$('loginError').classList.remove('hidden')});}else if(Date.now()<until)window.setTimeout(poll,40);else{showLogin();$('loginError').textContent='Supabase library did not load.';$('loginError').classList.remove('hidden')}};poll()});
})();
'use strict';

(() => {
  const TABLES = [
    ['shipments','Shipment Core','بارەکان','id,customer_name,origin_key,dest_key,current_step_index,operational_status,eta,updated_at'],
    ['shipment_tracking_events','Shipment Core','ڕووداوەکانی شوێنکەوتن','id,shipment_id,status_key,title,note,occurred_at'],
    ['shipment_status_history','Shipment Core','مێژووی دۆخ','id,shipment_id,from_status,to_status,from_step,to_step,occurred_at'],
    ['shipment_events','Shipment Core','ڕووداوەکانی بار','id,shipment_id,event_type,status,location,note,occurred_at'],
    ['shipment_route_legs','Shipment Core','Route legs','id,shipment_id,leg_number,from_hub,to_hub,transport_mode,status,planned_departure,planned_arrival'],
    ['shipment_packages','Shipment Core','پەکەج','id,shipment_id,package_code,current_hub,status,weight_kg,updated_at'],
    ['shipment_documents','Shipment Core','بەڵگەنامەکانی بار','id,shipment_id,document_type,title,document_status,is_public,created_at'],
    ['shipment_customs_cases','Shipment Core','گومرگ','id,shipment_id,status,declaration_number,duty_amount,duty_currency,documents_complete,updated_at'],
    ['shipment_manifests','Shipment Core','Manifest ـەکان','id,manifest_number,batch_id,status,total_packages,planned_departure,updated_at'],
    ['delivery_assignments','Delivery','ئەرکەکانی گەیاندن','id,shipment_id,assigned_staff_id,status,pickup_at,delivered_at,updated_at'],
    ['delivery_proofs','Delivery','بەڵگەی گەیاندن','id,shipment_id,delivered_at,receiver_name,note,created_at'],
    ['warehouse_receipts','Warehouse','وەرگرتنی کۆگا','id,batch_code,location,received_at,consolidated,created_at'],
    ['warehouse_movements','Warehouse','جوڵەی کۆگا','id,shipment_id,package_id,from_hub,to_hub,movement_type,scanned_at'],
    ['consolidation_batches','Warehouse','کۆکردنەوەی batch','id,batch_code,origin_hub,transit_hub,destination_hub,transport_mode,status,package_count,total_weight_kg,created_at'],
    ['consolidation_items','Warehouse','دانەکانی batch','id,batch_id,package_id,shipment_id,status,loaded_at'],
    ['customer_directory','Customer','دیرەکتۆری کڕیار','id,code,name,phone,city,is_active,updated_at'],
    ['customer_notifications','Customer','ئاگادارکردنەوەی کڕیار','id,customer_user_id,shipment_id,kind,title,read_at,created_at'],
    ['customer_notification_preferences','Customer','هەڵبژاردەکانی ئاگادارکردنەوە','customer_user_id,email_enabled,whatsapp_enabled,sms_enabled,in_app_enabled,updated_at'],
    ['quote_requests','Quote','داواکارییەکانی نرخ','id,customer_user_id,customer_name,origin_key,dest_key,transport_mode,status,quoted_amount,currency,created_at'],
    ['shipment_financial_ledger','Finance','لەدەفتەری دارایی','id,shipment_id,entry_type,amount,currency,created_at'],
    ['shipment_invoices','Finance','Invoice ـەکان','id,invoice_number,shipment_id,total,paid_total,currency,status,due_at,created_at'],
    ['payment_transactions','Finance','مامەڵەی پارەدان','id,invoice_id,shipment_id,provider,status,amount,currency,paid_at,created_at'],
    ['payment_sessions','Finance','سێشنی پارەدان','id,invoice_id,shipment_id,provider,status,amount,currency,expires_at,completed_at,created_at'],
    ['payment_webhook_events','Finance','Payment webhook events','id,provider,event_key,payment_session_id,signature_valid,provider_status,processed_at'],
    ['reconciliation_runs','Finance','ڕێکخستنەوەی پارەکان','id,provider,status,matched_count,unmatched_count,total_amount,started_at,completed_at'],
    ['pricing_rates','Finance','نرخی گواستنەوە','id,rate_key,origin_key,destination_key,transport_mode,unit,amount,currency,is_active,updated_at'],
    ['exchange_rates','Finance','نرخی ئاڵوگۆڕ','id,base_currency,quote_currency,rate,is_active,updated_at'],
    ['company_cost_entries','Finance','خەرجی کۆمپانیا','id,category,description,amount,currency,branch,occurred_at'],
    ['staff','Staff','ئەندامانی ستاف','id,full_name,role,branch,is_active,updated_at'],
    ['staff_permissions','Staff','ڕێگەپێدانەکانی ستاف','id,staff_id,permission,branch,created_at'],
    ['staff_permission_grants','Staff','بەخشینی ڕێگەپێدان','id,staff_id,permission,branch,granted_by,created_at'],
    ['staff_profiles','Staff','پرۆفایلی ستاف','staff_id,job_title,phone,locale,timezone,updated_at'],
    ['staff_activity_log','Staff','تۆماری چالاکی','id,staff_id,action,target_id,created_at'],
    ['staff_tasks','Staff','ئەرکەکانی ستاف','id,title,status,priority,branch,assignee_id,due_at,updated_at'],
    ['staff_notifications','Staff','ئاگادارکردنەوەی ستاف','id,staff_id,kind,title,read_at,created_at'],
    ['admin_action_requests','Staff','داواکارییەکانی بەڕێوەبەرایەتی','id,requested_by,action,status,created_at'],
    ['staff_chat_rooms','Staff Chat','ژوورەکانی چات','id,slug,name,is_active,updated_at'],
    ['staff_chat_members','Staff Chat','ئەندامانی چات','room_id,staff_id,last_read_at,joined_at'],
    ['staff_chat_messages','Staff Chat','پەیامەکانی چات','id,room_id,sender_id,body,created_at'],
    ['notification_outbox','System','Notification outbox','id,customer_user_id,shipment_id,channel,event_key,status,attempts,next_attempt_at,created_at'],
    ['notification_delivery_events','System','Delivery events','id,outbox_id,provider,status,recipient,occurred_at'],
    ['integration_inbox','System','Integration inbox','id,provider,event_id,event_type,signature_valid,status,received_at,processed_at'],
    ['logistics_exceptions','System','کێشەکانی لۆجستیک','id,shipment_id,severity,title,status,due_at,created_at'],
    ['app_settings','System','ڕێکخستنەکانی ئەپ','key,value,updated_at'],
    ['messages','System','پەیامەکانی contact','id,name,email,message,company,request_type,created_at'],
  ].map(([table, module, label, select]) => ({ table, module, label, select }));

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '—').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const redactValue = (key, value) => /secret|token|password|private_key|access_key|api_key/i.test(String(key)) ? '••••••••' : value;
  const compactJson = (row) => Object.entries(row || {}).slice(0, 8).map(([key, value]) => `${key}: ${JSON.stringify(redactValue(key, value))}`).join(' · ');
  const state = { loaded: false, loading: false, cards: [] };

  const statusFor = (error, rows) => {
    if (error) return { key: /jwt|permission|forbidden|not authorized|rls|42501|401|403/i.test(`${error.message || ''} ${error.code || ''}`) ? 'restricted' : 'error', label: 'RLS / دستگەیشتن سنووردارە' };
    return rows.length ? { key: 'connected', label: 'پەیوەستە' } : { key: 'empty', label: 'پەیوەستە · بەتاڵە' };
  };

  const renderSummary = (cards) => {
    const counts = cards.reduce((out, card) => { out[card.status.key] = (out[card.status.key] || 0) + 1; return out; }, {});
    $('hubSummary').innerHTML = `<span class="hub-summary-chip"><b>${cards.length}</b> خشتە</span><span class="hub-summary-chip is-ok"><b>${counts.connected || 0}</b> داتا بەردەستە</span><span class="hub-summary-chip is-empty"><b>${counts.empty || 0}</b> بەتاڵ</span><span class="hub-summary-chip is-locked"><b>${counts.restricted || 0}</b> RLS سنووردار</span><span class="hub-summary-chip is-error"><b>${counts.error || 0}</b> هەڵە</span>`;
  };

  const renderCards = (cards) => {
    const query = String($('hubSearch')?.value || '').trim().toLowerCase();
    const module = $('hubModule')?.value || 'all';
    const visible = cards.filter((card) => (!query || `${card.table} ${card.label} ${card.module}`.toLowerCase().includes(query)) && (module === 'all' || card.module === module));
    if (!visible.length) { $('hubGrid').innerHTML = '<div class="hub-empty">هیچ خشتەیەک لەگەڵ ئەم filter ـە نەگونجا.</div>'; return; }
    $('hubGrid').innerHTML = visible.map((card) => `<article class="hub-table-card status-${esc(card.status.key)}"><div class="hub-table-top"><div><span class="hub-module">${esc(card.module)}</span><h4>${esc(card.label)}</h4><code>${esc(card.table)}</code></div><span class="hub-status">${esc(card.status.label)}</span></div><div class="hub-table-meta"><span>${card.error ? esc(card.error) : `${card.rows.length} نموونەی خوێندراوە · RLS client read`}</span><span>${card.count == null ? 'count نادیار' : `${card.count} تۆمار`}</span></div><div class="hub-samples">${card.rows.length ? card.rows.map((row) => `<div class="hub-sample">${esc(compactJson(row))}</div>`).join('') : `<div class="hub-sample is-muted">${card.status.key === 'restricted' ? 'ئەم table ـە تەنها لە protected Edge Function ـەوە دەخوێندرێتەوە.' : card.status.key === 'error' ? 'دووبارە هەوڵ بدەرەوە بۆ پشکنینی API.' : 'هێشتا هیچ تۆمارێک نییە.'}</div>`}</div></article>`).join('');
  };

  const queryTable = async (client, meta) => {
    try {
      const result = await client.from(meta.table).select(meta.select, { count: 'exact' }).limit(8);
      const status = statusFor(result.error, result.data || []);
      return { ...meta, rows: result.data || [], count: result.count, status, error: result.error ? `${result.error.code || ''} ${result.error.message || 'Query failed'}`.trim() : '' };
    } catch (error) {
      return { ...meta, rows: [], count: null, status: statusFor(error, []), error: error?.message || 'Query failed' };
    }
  };

  const load = async () => {
    if (state.loading) return;
    const client = window.gcSupabaseClient;
    if (!client) { $('hubGrid').innerHTML = '<div class="hub-empty">Supabase client ئامادە نییە؛ تکایە دووبارە نوێی بکەرەوە.</div>'; return; }
    state.loading = true;
    $('hubGrid').innerHTML = '<div class="hub-loading">لە Supabase ـەوە خوێندنەوەی 45 table دەکرێت…</div>';
    try {
      const { data: sessionResult } = await client.auth.getSession();
      if (!sessionResult.session) throw new Error('Session required');
      const cards = [];
      for (let index = 0; index < TABLES.length; index += 6) {
        cards.push(...await Promise.all(TABLES.slice(index, index + 6).map((meta) => queryTable(client, meta))));
      }
      state.cards = cards; state.loaded = true; renderSummary(cards); renderCards(cards);
      $('hubUpdatedAt').textContent = `نوێکراوەتەوە: ${new Date().toLocaleString('ku-IQ')}`;
    } catch (error) {
      $('hubGrid').innerHTML = `<div class="hub-empty" role="alert">${esc(error.message || 'داتا بار نەکرا.')}</div>`;
    } finally { state.loading = false; }
  };

  const open = () => { if (!state.loaded) void load(); else { renderSummary(state.cards); renderCards(state.cards); } };
  document.querySelectorAll('[data-view="data_hub"]').forEach((button) => button.addEventListener('click', open));
  $('hubRefresh')?.addEventListener('click', () => { state.loaded = false; void load(); });
  $('hubSearch')?.addEventListener('input', () => renderCards(state.cards));
  $('hubModule')?.addEventListener('change', () => renderCards(state.cards));
})();

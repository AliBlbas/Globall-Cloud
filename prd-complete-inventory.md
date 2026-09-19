# Globall Cloud PRD implementation inventory
# Generated from repository HEAD 8765f7f

## Edge Functions
_shared
account-admin
account-self-password
account-self-profile
customer-self
document-access
driver-gps
integration-webhook
lg-track-shipment
logistics-control-plane
notification-dispatch
notification-webhook
operations-admin
payment-checkout
payment-reconcile
payment-webhook
public-config
public-message
public-quote
public-track
system-health

## Tables referenced by Data Hub
admin_action_requests | Staff'
app_settings | System'
company_cost_entries | Finance'
consolidation_batches | Warehouse'
consolidation_items | Warehouse'
customer_directory | Customer'
customer_notification_preferences | Customer'
customer_notifications | Customer'
delivery_assignments | Delivery'
delivery_proofs | Delivery'
exchange_rates | Finance'
integration_inbox | System'
logistics_exceptions | System'
messages | System'
notification_delivery_events | System'
notification_outbox | System'
payment_sessions | Finance'
payment_transactions | Finance'
payment_webhook_events | Finance'
pricing_rates | Finance'
quote_requests | Quote'
reconciliation_runs | Finance'
shipment_customs_cases | Shipment Core'
shipment_documents | Shipment Core'
shipment_events | Shipment Core'
shipment_financial_ledger | Finance'
shipment_invoices | Finance'
shipment_manifests | Shipment Core'
shipment_packages | Shipment Core'
shipment_route_legs | Shipment Core'
shipment_status_history | Shipment Core'
shipment_tracking_events | Shipment Core'
shipments | Shipment Core'
staff | Staff'
staff_activity_log | Staff'
staff_chat_members | Staff Chat'
staff_chat_messages | Staff Chat'
staff_chat_rooms | Staff Chat'
staff_notifications | Staff'
staff_permission_grants | Staff'
staff_permissions | Staff'
staff_profiles | Staff'
staff_tasks | Staff'
warehouse_movements | Warehouse'
warehouse_receipts | Warehouse'

## Main UI surfaces
accounts-console.html
command-center.html
control-plane.html
customer-portal.html
driver-portal.html
driver-workspace.html
elite-hub.html
index.html
logistics-os.html
management.html
operations-command-center.html
operations-control-v2.html
operations-control.html
operations-suite.html
payment-checkout.html
provider-setup.html
staff-os.html
staff-portal.html
super-admin-command-center.html
superadmin.html
system-status.html
tracking-integration.html
warehouse-os.html

## Storage and Realtime references
./PRODUCT-EXCELLENCE-BLUEPRINT.md:13:| Speed | Shorter path to tracking and quote request; good empty/error states | Bounded list responses, refresh and realtime signals | Keep account-admin JWT boundary and Supabase RLS |
./PRODUCT-EXCELLENCE-BLUEPRINT.md:19:First, preserve and verify the current production foundation: Supabase bootstrap, Staff OS route, account-admin, migrations, RLS, Realtime publication, and Cloudflare Git integration. Second, add visual refinement through externalized, low-risk CSS overrides and small markup additions that do not change existing data attributes or event contracts. Third, improve staff and public empty/error/loading states only where the live contract proves a real issue. Fourth, validate at 320, 360, 390, 430, 768, and desktop widths, then verify public deployment and protected API behavior.
./PRODUCT-EXCELLENCE-BLUEPRINT.md:23:The implementation must not replace the static-site architecture, remove the legacy `staff-os.html` route, change Supabase table semantics, expose staff data to anonymous users, or bypass `account-admin` for privileged mutations. Any new UI action must use the existing `data-gc-onclick` or current Staff OS controller patterns. Database changes must be forward-only and must preserve Realtime, notifications, activity logs, and service-role Edge Function access.
./PRODUCT-EXCELLENCE-BLUEPRINT.md:27:A release is successful when the public homepage presents a premium and coherent logistics identity, tracking and quote actions remain functional, the Staff OS opens at `/staff`, role-aware staff access remains protected, account-admin protected requests return intentional 401/403 responses instead of schema/permission-driven 500s, and the repository and Cloudflare production deployment point to the same commit. Authenticated multi-user Realtime chat remains a separately identified test if no two staff sessions are available.
./PRODUCTION-HARDENING-REPORT.md:31:> The absence of a failing smoke test does not prove that authenticated admin, driver, customer, storage, and realtime workflows are fully certified. Those workflows still require role-by-role regression testing with the organization’s real test accounts.
./PRODUCTION-QA.md:62:   `shipments` doesn't grant anonymous SELECT, and the realtime
./PRODUCTION-QA.md:71:   page degrades gracefully if realtime is unavailable.
./README.md:7:- Backend: Supabase (Postgres, Auth, Storage, RLS, Realtime, Edge Functions)
./README.md:39:Driver and customer surfaces use responsive/mobile-first layouts, safe-area handling, touch-sized controls, realtime tracking states, and Safari/WebKit compatibility layers.
./README.md:49:`.github/workflows/production-integrity.yml` validates JavaScript syntax, required files, migration naming, security invariants, Supabase configuration, service-role secret absence, Realtime/CSP requirements, and runtime/cache version consistency before a change is considered production-ready.
./SYSTEM_STATUS.md:17:- `public.shipment_tracking_events` stores auditable status/location/photo events with public-safe visibility and Supabase Realtime support.
./elite-hub.html:5:<section class="hero"><div><div class="eyebrow">CHINA · UAE · IRAQ / LOGISTICS OS</div><h1>لۆجستیک بە <em>ئاستێکی نوێ</em></h1><p>باشترین concept ـەکانی Kaml ـی visual و mobile UX لەگەڵ architecture ـی Tamo، tracking، operations، warehouse، payments و security ـی production یەکخراون.</p><div class="actions"><a class="btn primary" href="index.html">Customer Experience</a><a class="btn" href="operations-command-center.html">Operations</a><a class="btn" href="super-admin-command-center.html">Super Admin</a></div></div><div class="hero-card"><div class="eyebrow">PLATFORM SIGNALS</div><div class="metric"><div><strong>Realtime</strong><small>Tracking & events</small></div><div><strong>RLS</strong><small>Security boundary</small></div><div><strong>Air + Sea</strong><small>China / UAE routes</small></div><div><strong>IQD</strong><small>Payment-ready</small></div></div></div></section>
./gc-csp-scripts/driver-workspace-inline-1.js:1:const SUPABASE_URL='https://ahslifnthiwfkmaswjno.supabase.co';const SUPABASE_ANON_KEY='sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';let sb,session,staff,jobs=[];const $=id=>document.getElementById(id);function setMsg(t){$('msg').textContent=t}async function boot(){if(!window.supabase){setTimeout(boot,100);return}sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});const {data:{session:s}}=await sb.auth.getSession();if(s){session=s;await loadStaff();}}async function loadStaff(){const {data,error}=await sb.from('staff').select('*').eq('id',session.user.id).eq('is_active',true).single();if(error||!data){$('login').classList.remove('hidden');setMsg('Staff access required');return}staff=data;$('login').classList.add('hidden');$('app').classList.remove('hidden');$('staffName').textContent=data.full_name||'Staff';$('staffRole').textContent=(data.role||'').toUpperCase();await loadJobs()}async function login(){const {data,error}=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error){setMsg(error.message);return}session=data.session;await loadStaff()}async function loadJobs(){const {data,error}=await sb.from('delivery_assignments').select('id,shipment_id,status,pickup_at,delivered_at,note,shipments:shipment_id(id,customer_name,customer_phone,dest_key,origin_key,eta,current_location_label,priority)').eq('assigned_staff_id',staff.id).order('created_at',{ascending:false});if(error){$('jobs').innerHTML='<div class="panel">'+error.message+'</div>';return}jobs=data||[];renderJobs()}function renderJobs(){ $('jobs').innerHTML=jobs.map(j=>{const s=j.shipments||{};return `<article class="job"><div class="row"><strong>${s.id||j.shipment_id}</strong><span class="tag">${j.status}</span></div><p>${s.customer_name||'—'}</p><p class="muted">${s.origin_key||'—'} → ${s.dest_key||'—'}</p><p class="muted">${s.customer_phone||''}</p><div class="actions">${nextButtons(j)}</div></article>`}).join('')||'<div class="panel">هیچ delivery assignment ـێکی چالاک نییە.</div>'}function nextButtons(j){if(j.status==='assigned')return `<button class="btn primary" data-gc-onclick="advance('${j.id}','accepted')">وەرگرتن</button>`;if(j.status==='accepted')return `<button class="btn primary" data-gc-onclick="advance('${j.id}','picked_up')">وەرگرتنی بار</button>`;if(j.status==='picked_up')return `<button class="btn primary" data-gc-onclick="advance('${j.id}','out_for_delivery')">دەرچوون بۆ گەیاندن</button>`;if(j.status==='out_for_delivery')return `<button class="btn primary" data-gc-onclick="openPod('${j.id}','${(j.shipment_id||'').replace(/'/g,'')}')">تۆمارکردنی POD</button>`;return ''}async function advance(id,status){const {error}=await sb.rpc('advance_delivery_assignment',{p_assignment_id:id,p_next_status:status,p_note:null});if(error){alert(error.message);return}await loadJobs()}function openPod(id,shipment){$('modal').classList.remove('hidden');$('podShipment').textContent='Shipment: '+shipment;$('modal').dataset.assignment=id}async function completePod(){const id=$('modal').dataset.assignment;const rec=$('receiver').value.trim();if(!rec){$('podMsg').textContent='ناوی وەرگر پێویستە';return}let photoUrl=null;const file=$('photo').files?.[0];if(file){const path=`pod/${staff.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const up=await sb.storage.from('shipment-photos').upload(path,file,{upsert:true});if(up.error){$('podMsg').textContent=up.error.message;return}photoUrl=sb.storage.from('shipment-photos').getPublicUrl(path).data.publicUrl}const {data,error}=await sb.from('delivery_assignments').select('shipment_id').eq('id',id).single();if(error){$('podMsg').textContent=error.message;return}const {error:e1}=await sb.from('delivery_proofs').upsert({shipment_id:data.shipment_id,delivered_at:new Date().toISOString(),receiver_name:rec,receiver_phone:$('phone').value.trim()||null,photo_urls:photoUrl?[photoUrl]:[],note:$('note').value.trim()||null,created_by:staff.id,updated_at:new Date().toISOString()},{onConflict:'shipment_id'});if(e1){$('podMsg').textContent=e1.message;return}const {error:e2}=await sb.rpc('advance_delivery_assignment',{p_assignment_id:id,p_next_status:'delivered',p_note:$('note').value.trim()||'POD recorded'});if(e2){$('podMsg').textContent=e2.message;return}closePod();await loadJobs()}function closePod(){$('modal').classList.add('hidden');$('receiver').value='';$('phone').value='';$('note').value='';$('photo').value='';$('preview').classList.add('hidden');$('podMsg').textContent=''}$('photo').addEventListener('change',e=>{const f=e.target.files?.[0];if(!f)return;$('preview').src=URL.createObjectURL(f);$('preview').classList.remove('hidden')});$('loginBtn').onclick=login;$('logout').onclick=async()=>{await sb.auth.signOut();location.reload()};$('close').onclick=closePod;$('deliver').onclick=completePod;boot();
./gc-csp-scripts/index-inline-2.js:1102:/* Starts the live map + realtime updates for the currently-displayed shipment.
./gc-csp-scripts/index-inline-2.js:1448:  const {error:upErr} = await sb.storage.from('avatars').upload(path, file, {upsert:true, cacheControl:'3600'});
./gc-csp-scripts/index-inline-2.js:1450:  const {data:pub} = sb.storage.from('avatars').getPublicUrl(path);
./gc-csp-scripts/index-inline-2.js:2662:    const {error: upErr} = await sb.storage.from('shipment-photos').upload(path, file, {upsert:true});
./gc-csp-scripts/index-inline-2.js:2664:    const {data: pub} = sb.storage.from('shipment-photos').getPublicUrl(path);
./gc-csp-scripts/index-inline-2.js:2877:    const {error: upErr} = await sb.storage.from('warehouse-receipts').upload(path, file, {upsert:true});
./gc-csp-scripts/index-inline-2.js:2879:    const {data: pub} = sb.storage.from('warehouse-receipts').getPublicUrl(path);
./gc-csp-scripts/staff-os-inline-1.js:28:function subscribeNotifications(){if(window.staffNotificationChannel){sb.removeChannel(window.staffNotificationChannel).catch(()=>{});window.staffNotificationChannel=null}const channel=sb.channel(`staff-notifications-${crypto.randomUUID()}`);channel.on('postgres_changes',{event:'INSERT',schema:'public',table:'staff_notifications'},()=>loadNotifications());channel.on('postgres_changes',{event:'INSERT',schema:'public',table:'notification_delivery_events'},()=>loadDeliveryEvents());window.staffNotificationChannel=channel;channel.subscribe((status,error)=>{if(status==='CHANNEL_ERROR'){console.warn('Staff notification realtime unavailable',error?.message||'channel error');}})}
./gc-csp-scripts/staff-os-inline-1.js:36:function subscribeChat(){if(window.staffChatChannel)sb.removeChannel(window.staffChatChannel).catch(()=>{});const channel=sb.channel('staff-live-chat',{config:{presence:{key:String(state.chatSelf?.id||crypto.randomUUID())}}});channel.on('postgres_changes',{event:'INSERT',schema:'public',table:'staff_chat_messages'},payload=>{if(String(payload.new?.room_id)===String(state.activeChatRoomId))void loadChat();else void loadChat()});channel.on('presence',{event:'sync'},()=>{const stateByKey=channel.presenceState();state.chatOnline=Object.values(stateByKey).flat().filter(Boolean);renderChat()});channel.on('presence',{event:'join'},()=>{const stateByKey=channel.presenceState();state.chatOnline=Object.values(stateByKey).flat().filter(Boolean);renderChat()});channel.on('presence',{event:'leave'},()=>{const stateByKey=channel.presenceState();state.chatOnline=Object.values(stateByKey).flat().filter(Boolean);renderChat()});window.staffChatChannel=channel;channel.subscribe(async(status,error)=>{if(status==='SUBSCRIBED'){await channel.track({staff_id:state.chatSelf?.id,full_name:state.chatSelf?.name||'Staff',online_at:new Date().toISOString()});$('chatPresenceText').textContent='تیمەکە زیندووە'}else if(status==='CHANNEL_ERROR'){console.warn('Staff chat realtime unavailable',error?.message||'channel error');$('chatPresenceText').textContent='پەیوەندی چات کێشەی هەیە'}})}
./gc-csp-scripts/tracking-integration-inline-1.js:49:// search can clean up the first one's realtime subscription.
./live-logistics-map.js:124:      const channel=sb.channel(`gc-public-map-${shipment.id}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'shipments',filter:`id=eq.${shipment.id}`},payload=>{
./live-logistics-map.js:127:        const info=root.querySelector('.gc-map-info small'); if(info)info.textContent=p.eta?`ETA · ${new Date(p.eta).toLocaleDateString('ckb-IQ')}`:'نوێکراوەتەوە بە Realtime';
./staff-os-console.js:96:  async function chat(){ const data=await api('chat'); const rooms=data.rooms||[]; $('#view').innerHTML=shell('چاتی تیم','گفتوگۆی ناوخۆیی ستاف، پەیامەکان لە Supabase Realtime ـدا دەژین.') + `<div class="chat-layout"><div class="room-list">${rooms.map((r,i)=>`<button class="room ${i===0?'active':''}" data-room="${r.id}"><b>${fmt(r.name)}</b><span>${r.messages?.length||0} messages</span><em>${r.unread_count||0}</em></button>`).join('') || '<div class="empty"><strong>هیچ room ـێک نییە</strong></div>'}</div><div class="chat-card" id="chatCard"></div></div>`; if(rooms[0]) renderRoom(rooms[0]); $$('.room').forEach(b=>b.onclick=()=>{ $$('.room').forEach(x=>x.classList.remove('active'));b.classList.add('active'); const r=rooms.find(x=>x.id===b.dataset.room);renderRoom(r);}); }
./supabase/functions/account-admin/index.ts:596:    const { error: uploadErr } = await client.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false })
./supabase/functions/account-admin/index.ts:598:    const { data: publicUrl } = client.storage.from(bucket).getPublicUrl(path)
./supabase/functions/document-access/index.ts:44:    const signed = await service.storage.from('shipment-documents').createSignedUrl(documentResult.data.file_path, 60 * 60)
./supabase/functions/logistics-control-plane/index.ts:356:  const upload = await service.storage.from('shipment-documents').upload(path, bytes, {
./supabase/functions/logistics-control-plane/index.ts:361:  const signed = await service.storage.from('shipment-documents').createSignedUrl(path, 60 * 60 * 24 * 7)
./supabase/functions/logistics-control-plane/index.ts:363:    await service.storage.from('shipment-documents').remove([path])
./supabase/functions/logistics-control-plane/index.ts:379:    await service.storage.from('shipment-documents').remove([path])
./supabase/functions/system-health/index.ts:101:      const storageProbe = await db.storage.from('shipment-documents').list('', { limit: 1 })
./supabase/migrations/20260812142105_add_live_logistics_tracking.sql:63:-- Realtime event stream for operational tracking updates.
./supabase/migrations/20260812142105_add_live_logistics_tracking.sql:66:  alter publication supabase_realtime add table public.shipment_tracking_events;
./supabase/migrations/20260817222344_notification_dispatch_hardening.sql:4:create or replace function public.claim_notification_outbox_channel(
./supabase/migrations/20260817222344_notification_dispatch_hardening.sql:35:revoke all on function public.claim_notification_outbox_channel(text,integer) from public, anon, authenticated;
./supabase/migrations/20260817222344_notification_dispatch_hardening.sql:36:grant execute on function public.claim_notification_outbox_channel(text,integer) to service_role;
./supabase/migrations/20260817222344_notification_dispatch_hardening.sql:38:comment on function public.claim_notification_outbox_channel(text,integer)
./supabase/migrations/20260817222449_logistics_notifications_contract_hardening.sql:56:create or replace function public.claim_notification_outbox_channel(
./supabase/migrations/20260817222449_logistics_notifications_contract_hardening.sql:166:revoke all on function public.claim_notification_outbox_channel(text, integer) from public, anon, authenticated;
./supabase/migrations/20260817222449_logistics_notifications_contract_hardening.sql:169:grant execute on function public.claim_notification_outbox_channel(text, integer) to service_role;
./supabase/migrations/20260822143000_staff_quote_request_notifications.sql:69:    alter publication supabase_realtime add table public.staff_notifications;
./supabase/migrations/20260823153000_notification_delivery_audit_webhooks.sql:85:-- Realtime is intentionally not required for webhook correctness; Staff OS can poll the protected API.
./supabase/migrations/20260823160000_notification_provider_webhooks.sql:85:    alter publication supabase_realtime add table public.notification_delivery_events;
./supabase/migrations/20260824110000_staff_live_chat.sql:1:-- Staff-to-staff Live Chat: forward-only, RLS-protected, realtime-enabled.
./supabase/migrations/20260824110000_staff_live_chat.sql:164:    alter publication supabase_realtime add table public.staff_chat_rooms;
./supabase/migrations/20260824110000_staff_live_chat.sql:168:    alter publication supabase_realtime add table public.staff_chat_members;
./supabase/migrations/20260824110000_staff_live_chat.sql:172:    alter publication supabase_realtime add table public.staff_chat_messages;
./supabase/migrations/20260824120000_staff_and_chat_security_advisor_hardening.sql:12:--   * existing Supabase Realtime publication membership is retained.
./supabase/migrations/20260824120000_staff_and_chat_security_advisor_hardening.sql:255:-- Staff OS can render the common-room roster and Realtime presence. Messages
./supabase/migrations/20260824120000_staff_and_chat_security_advisor_hardening.sql:324:-- Realtime is part of the deployed Staff OS contract. Adding an already
./supabase/migrations/20260824120000_staff_and_chat_security_advisor_hardening.sql:329:    alter publication supabase_realtime add table public.staff_notifications;
./supabase/migrations/20260824120000_staff_and_chat_security_advisor_hardening.sql:333:    alter publication supabase_realtime add table public.staff_chat_rooms;
./supabase/migrations/20260824120000_staff_and_chat_security_advisor_hardening.sql:337:    alter publication supabase_realtime add table public.staff_chat_members;
./supabase/migrations/20260824120000_staff_and_chat_security_advisor_hardening.sql:341:    alter publication supabase_realtime add table public.staff_chat_messages;
./supabase/migrations/20260824130000_tighten_service_and_client_table_privileges.sql:39:-- Staff delivery monitoring uses Realtime and the account-admin API; SELECT is
./supabase/migrations/20260824130000_tighten_service_and_client_table_privileges.sql:40:-- sufficient for the authenticated Realtime authorization path.
./supabase/migrations/20260824131000_remove_residual_authenticated_privileges.sql:7:-- REFERENCES are not required by the browser or Realtime client.
./tests/e2e/README.md:14:| `two-staff` / `staff-2` | دوو staff test user | نەخێر | هەمان read suite بۆ هەردوو session و هەڵسەنگاندنی role access؛ message realtime بە browser/provider credentials پێویستی هەیە |
./tests/e2e/README.md:60: Realtime presence و دوو-browser message delivery بە API تەنها بە تەواوی ناپشکنرێت؛ بۆ ئەوە پێویستە دوو browser context بە Playwright یان دوو browser ـی test بە credential ـی test لە staging بەکاربهێنرێت. هەروەها payment provider، Gmail و WhatsApp callback ـەکان پێویستیان بە sandbox credentials و webhook replay ـی تایبەت هەیە.
./tests/e2e/run.mjs:266:    record('two-session Realtime boundary', true, 'API sessions verified; browser-level delivery requires Playwright/provider contexts')
./tracking-enhanced.js:3:// Adds a small live SVG route map + realtime shipment updates + browser
./tracking-enhanced.js:46:    this.realtimeChannels = new Map();
./tracking-enhanced.js:58:    this.subscribeToRealtime(sb, shipmentId);
./tracking-enhanced.js:105:  subscribeToRealtime(sb, shipmentId) {
./tracking-enhanced.js:106:    this.unsubscribeChannel(shipmentId);
./tracking-enhanced.js:108:      .channel(`shipment-live-${shipmentId}`)
./tracking-enhanced.js:110:        'postgres_changes',
./tracking-enhanced.js:112:        (payload) => this.handleRealtimeUpdate(shipmentId, payload)
./tracking-enhanced.js:115:        'postgres_changes',
./tracking-enhanced.js:117:        (payload) => this.handleRealtimeEventInsert(shipmentId, payload)
./tracking-enhanced.js:120:        this.emit('realtime', { shipmentId, status });
./tracking-enhanced.js:122:    this.realtimeChannels.set(shipmentId, channel);
./tracking-enhanced.js:125:  unsubscribeChannel(shipmentId) {
./tracking-enhanced.js:127:    const channel = this.realtimeChannels.get(shipmentId);
./tracking-enhanced.js:128:    if (channel && sb) sb.removeChannel(channel);
./tracking-enhanced.js:129:    this.realtimeChannels.delete(shipmentId);
./tracking-enhanced.js:132:  handleRealtimeUpdate(shipmentId, payload) {
./tracking-enhanced.js:142:  handleRealtimeEventInsert(shipmentId, payload) {
./tracking-enhanced.js:242:    this.unsubscribeChannel(shipmentId);
./node_modules/typescript/lib/lib.dom.d.ts:3273:     * The **`copyFromChannel()`** method of the channel of the `AudioBuffer` to a specified ```js-nolint copyFromChannel(destination, channelNumber, startInChannel) ``` - `destination` - : A Float32Array to copy the channel's samples to.
./node_modules/typescript/lib/lib.dom.d.ts:3277:    copyFromChannel(destination: Float32Array<ArrayBuffer>, channelNumber: number, bufferOffset?: number): void;
./node_modules/typescript/lib/lib.dom.d.ts:3279:     * The `copyToChannel()` method of the AudioBuffer interface copies the samples to the specified channel of the `AudioBuffer`, from the source array.
./node_modules/typescript/lib/lib.dom.d.ts:3283:    copyToChannel(source: Float32Array<ArrayBuffer>, channelNumber: number, bufferOffset?: number): void;
./node_modules/typescript/lib/lib.dom.d.ts:25101:     * The **`createDataChannel()`** method of the RTCPeerConnection interface creates a new channel linked with the remote peer, over which any kind of data may be transmitted.
./node_modules/typescript/lib/lib.dom.d.ts:25105:    createDataChannel(label: string, dataChannelDict?: RTCDataChannelInit): RTCDataChannel;
./node_modules/typescript/lib/lib.dom.d.ts:39318:type LatencyMode = "quality" | "realtime";
./node_modules/typescript/lib/lib.webworker.d.ts:13109:type LatencyMode = "quality" | "realtime";
./staff-prd-gap-matrix.md:5:The current application remains a static HTML/CSS/vanilla JavaScript Cloudflare Pages site backed by Supabase Auth, Postgres, RLS, Storage, Realtime, and protected Edge Functions. The existing Staff OS now authenticates the owner successfully as `super_admin` with `branch = all`. The current protected API is `account-admin`; its actor check derives identity from the JWT and loads the matching `public.staff` row server-side.
./staff-prd-gap-matrix.md:16:| Cargo lifecycle | Existing shipment/tracking tables, status history/events, route legs, and public/private tracking functions | Staff OS has no timeline/map view; map provider configuration and realtime live updates are not yet proven | Add a read-only lifecycle timeline and map-ready coordinates using existing shipment event contracts; require provider key only for actual map tiles |
./staff-prd-gap-matrix.md:18:| Chat and notifications | account-admin chat list/send/read handlers and staff chat tables exist | Screenshot showed empty room state; two-user realtime/presence is not verified | Add room membership/onboarding visibility, unread/read state, reconnect handling, and explicitly test two synthetic sessions in staging |
./staff-prd-gap-matrix.md:34:6. Chat/notification realtime UX and two-session validation.
./prd-complete-inventory.md:99:## Storage and Realtime references
./prd-complete-inventory.md:100:./PRODUCT-EXCELLENCE-BLUEPRINT.md:13:| Speed | Shorter path to tracking and quote request; good empty/error states | Bounded list responses, refresh and realtime signals | Keep account-admin JWT boundary and Supabase RLS |
./prd-complete-inventory.md:101:./PRODUCT-EXCELLENCE-BLUEPRINT.md:19:First, preserve and verify the current production foundation: Supabase bootstrap, Staff OS route, account-admin, migrations, RLS, Realtime publication, and Cloudflare Git integration. Second, add visual refinement through externalized, low-risk CSS overrides and small markup additions that do not change existing data attributes or event contracts. Third, improve staff and public empty/error/loading states only where the live contract proves a real issue. Fourth, validate at 320, 360, 390, 430, 768, and desktop widths, then verify public deployment and protected API behavior.
./prd-complete-inventory.md:102:./PRODUCT-EXCELLENCE-BLUEPRINT.md:23:The implementation must not replace the static-site architecture, remove the legacy `staff-os.html` route, change Supabase table semantics, expose staff data to anonymous users, or bypass `account-admin` for privileged mutations. Any new UI action must use the existing `data-gc-onclick` or current Staff OS controller patterns. Database changes must be forward-only and must preserve Realtime, notifications, activity logs, and service-role Edge Function access.
./prd-complete-inventory.md:103:./PRODUCT-EXCELLENCE-BLUEPRINT.md:27:A release is successful when the public homepage presents a premium and coherent logistics identity, tracking and quote actions remain functional, the Staff OS opens at `/staff`, role-aware staff access remains protected, account-admin protected requests return intentional 401/403 responses instead of schema/permission-driven 500s, and the repository and Cloudflare production deployment point to the same commit. Authenticated multi-user Realtime chat remains a separately identified test if no two staff sessions are available.
./prd-complete-inventory.md:104:./PRODUCTION-HARDENING-REPORT.md:31:> The absence of a failing smoke test does not prove that authenticated admin, driver, customer, storage, and realtime workflows are fully certified. Those workflows still require role-by-role regression testing with the organization’s real test accounts.
./prd-complete-inventory.md:105:./PRODUCTION-QA.md:62:   `shipments` doesn't grant anonymous SELECT, and the realtime
./prd-complete-inventory.md:106:./PRODUCTION-QA.md:71:   page degrades gracefully if realtime is unavailable.
./prd-complete-inventory.md:107:./README.md:7:- Backend: Supabase (Postgres, Auth, Storage, RLS, Realtime, Edge Functions)
./prd-complete-inventory.md:108:./README.md:39:Driver and customer surfaces use responsive/mobile-first layouts, safe-area handling, touch-sized controls, realtime tracking states, and Safari/WebKit compatibility layers.
./prd-complete-inventory.md:109:./README.md:49:`.github/workflows/production-integrity.yml` validates JavaScript syntax, required files, migration naming, security invariants, Supabase configuration, service-role secret absence, Realtime/CSP requirements, and runtime/cache version consistency before a change is considered production-ready.
./prd-complete-inventory.md:110:./SYSTEM_STATUS.md:17:- `public.shipment_tracking_events` stores auditable status/location/photo events with public-safe visibility and Supabase Realtime support.
./prd-complete-inventory.md:111:./elite-hub.html:5:<section class="hero"><div><div class="eyebrow">CHINA · UAE · IRAQ / LOGISTICS OS</div><h1>لۆجستیک بە <em>ئاستێکی نوێ</em></h1><p>باشترین concept ـەکانی Kaml ـی visual و mobile UX لەگەڵ architecture ـی Tamo، tracking، operations، warehouse، payments و security ـی production یەکخراون.</p><div class="actions"><a class="btn primary" href="index.html">Customer Experience</a><a class="btn" href="operations-command-center.html">Operations</a><a class="btn" href="super-admin-command-center.html">Super Admin</a></div></div><div class="hero-card"><div class="eyebrow">PLATFORM SIGNALS</div><div class="metric"><div><strong>Realtime</strong><small>Tracking & events</small></div><div><strong>RLS</strong><small>Security boundary</small></div><div><strong>Air + Sea</strong><small>China / UAE routes</small></div><div><strong>IQD</strong><small>Payment-ready</small></div></div></div></section>
./prd-complete-inventory.md:112:./gc-csp-scripts/driver-workspace-inline-1.js:1:const SUPABASE_URL='https://ahslifnthiwfkmaswjno.supabase.co';const SUPABASE_ANON_KEY='sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';let sb,session,staff,jobs=[];const $=id=>document.getElementById(id);function setMsg(t){$('msg').textContent=t}async function boot(){if(!window.supabase){setTimeout(boot,100);return}sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});const {data:{session:s}}=await sb.auth.getSession();if(s){session=s;await loadStaff();}}async function loadStaff(){const {data,error}=await sb.from('staff').select('*').eq('id',session.user.id).eq('is_active',true).single();if(error||!data){$('login').classList.remove('hidden');setMsg('Staff access required');return}staff=data;$('login').classList.add('hidden');$('app').classList.remove('hidden');$('staffName').textContent=data.full_name||'Staff';$('staffRole').textContent=(data.role||'').toUpperCase();await loadJobs()}async function login(){const {data,error}=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error){setMsg(error.message);return}session=data.session;await loadStaff()}async function loadJobs(){const {data,error}=await sb.from('delivery_assignments').select('id,shipment_id,status,pickup_at,delivered_at,note,shipments:shipment_id(id,customer_name,customer_phone,dest_key,origin_key,eta,current_location_label,priority)').eq('assigned_staff_id',staff.id).order('created_at',{ascending:false});if(error){$('jobs').innerHTML='<div class="panel">'+error.message+'</div>';return}jobs=data||[];renderJobs()}function renderJobs(){ $('jobs').innerHTML=jobs.map(j=>{const s=j.shipments||{};return `<article class="job"><div class="row"><strong>${s.id||j.shipment_id}</strong><span class="tag">${j.status}</span></div><p>${s.customer_name||'—'}</p><p class="muted">${s.origin_key||'—'} → ${s.dest_key||'—'}</p><p class="muted">${s.customer_phone||''}</p><div class="actions">${nextButtons(j)}</div></article>`}).join('')||'<div class="panel">هیچ delivery assignment ـێکی چالاک نییە.</div>'}function nextButtons(j){if(j.status==='assigned')return `<button class="btn primary" data-gc-onclick="advance('${j.id}','accepted')">وەرگرتن</button>`;if(j.status==='accepted')return `<button class="btn primary" data-gc-onclick="advance('${j.id}','picked_up')">وەرگرتنی بار</button>`;if(j.status==='picked_up')return `<button class="btn primary" data-gc-onclick="advance('${j.id}','out_for_delivery')">دەرچوون بۆ گەیاندن</button>`;if(j.status==='out_for_delivery')return `<button class="btn primary" data-gc-onclick="openPod('${j.id}','${(j.shipment_id||'').replace(/'/g,'')}')">تۆمارکردنی POD</button>`;return ''}async function advance(id,status){const {error}=await sb.rpc('advance_delivery_assignment',{p_assignment_id:id,p_next_status:status,p_note:null});if(error){alert(error.message);return}await loadJobs()}function openPod(id,shipment){$('modal').classList.remove('hidden');$('podShipment').textContent='Shipment: '+shipment;$('modal').dataset.assignment=id}async function completePod(){const id=$('modal').dataset.assignment;const rec=$('receiver').value.trim();if(!rec){$('podMsg').textContent='ناوی وەرگر پێویستە';return}let photoUrl=null;const file=$('photo').files?.[0];if(file){const path=`pod/${staff.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const up=await sb.storage.from('shipment-photos').upload(path,file,{upsert:true});if(up.error){$('podMsg').textContent=up.error.message;return}photoUrl=sb.storage.from('shipment-photos').getPublicUrl(path).data.publicUrl}const {data,error}=await sb.from('delivery_assignments').select('shipment_id').eq('id',id).single();if(error){$('podMsg').textContent=error.message;return}const {error:e1}=await sb.from('delivery_proofs').upsert({shipment_id:data.shipment_id,delivered_at:new Date().toISOString(),receiver_name:rec,receiver_phone:$('phone').value.trim()||null,photo_urls:photoUrl?[photoUrl]:[],note:$('note').value.trim()||null,created_by:staff.id,updated_at:new Date().toISOString()},{onConflict:'shipment_id'});if(e1){$('podMsg').textContent=e1.message;return}const {error:e2}=await sb.rpc('advance_delivery_assignment',{p_assignment_id:id,p_next_status:'delivered',p_note:$('note').value.trim()||'POD recorded'});if(e2){$('podMsg').textContent=e2.message;return}closePod();await loadJobs()}function closePod(){$('modal').classList.add('hidden');$('receiver').value='';$('phone').value='';$('note').value='';$('photo').value='';$('preview').classList.add('hidden');$('podMsg').textContent=''}$('photo').addEventListener('change',e=>{const f=e.target.files?.[0];if(!f)return;$('preview').src=URL.createObjectURL(f);$('preview').classList.remove('hidden')});$('loginBtn').onclick=login;$('logout').onclick=async()=>{await sb.auth.signOut();location.reload()};$('close').onclick=closePod;$('deliver').onclick=completePod;boot();
./prd-complete-inventory.md:113:./gc-csp-scripts/index-inline-2.js:1102:/* Starts the live map + realtime updates for the currently-displayed shipment.
./prd-complete-inventory.md:114:./gc-csp-scripts/index-inline-2.js:1448:  const {error:upErr} = await sb.storage.from('avatars').upload(path, file, {upsert:true, cacheControl:'3600'});
./prd-complete-inventory.md:115:./gc-csp-scripts/index-inline-2.js:1450:  const {data:pub} = sb.storage.from('avatars').getPublicUrl(path);
./prd-complete-inventory.md:116:./gc-csp-scripts/index-inline-2.js:2662:    const {error: upErr} = await sb.storage.from('shipment-photos').upload(path, file, {upsert:true});
./prd-complete-inventory.md:117:./gc-csp-scripts/index-inline-2.js:2664:    const {data: pub} = sb.storage.from('shipment-photos').getPublicUrl(path);
./prd-complete-inventory.md:118:./gc-csp-scripts/index-inline-2.js:2877:    const {error: upErr} = await sb.storage.from('warehouse-receipts').upload(path, file, {upsert:true});
./prd-complete-inventory.md:119:./gc-csp-scripts/index-inline-2.js:2879:    const {data: pub} = sb.storage.from('warehouse-receipts').getPublicUrl(path);
./prd-complete-inventory.md:120:./gc-csp-scripts/staff-os-inline-1.js:28:function subscribeNotifications(){if(window.staffNotificationChannel){sb.removeChannel(window.staffNotificationChannel).catch(()=>{});window.staffNotificationChannel=null}const channel=sb.channel(`staff-notifications-${crypto.randomUUID()}`);channel.on('postgres_changes',{event:'INSERT',schema:'public',table:'staff_notifications'},()=>loadNotifications());channel.on('postgres_changes',{event:'INSERT',schema:'public',table:'notification_delivery_events'},()=>loadDeliveryEvents());window.staffNotificationChannel=channel;channel.subscribe((status,error)=>{if(status==='CHANNEL_ERROR'){console.warn('Staff notification realtime unavailable',error?.message||'channel error');}})}
./prd-complete-inventory.md:121:./gc-csp-scripts/staff-os-inline-1.js:36:function subscribeChat(){if(window.staffChatChannel)sb.removeChannel(window.staffChatChannel).catch(()=>{});const channel=sb.channel('staff-live-chat',{config:{presence:{key:String(state.chatSelf?.id||crypto.randomUUID())}}});channel.on('postgres_changes',{event:'INSERT',schema:'public',table:'staff_chat_messages'},payload=>{if(String(payload.new?.room_id)===String(state.activeChatRoomId))void loadChat();else void loadChat()});channel.on('presence',{event:'sync'},()=>{const stateByKey=channel.presenceState();state.chatOnline=Object.values(stateByKey).flat().filter(Boolean);renderChat()});channel.on('presence',{event:'join'},()=>{const stateByKey=channel.presenceState();state.chatOnline=Object.values(stateByKey).flat().filter(Boolean);renderChat()});channel.on('presence',{event:'leave'},()=>{const stateByKey=channel.presenceState();state.chatOnline=Object.values(stateByKey).flat().filter(Boolean);renderChat()});window.staffChatChannel=channel;channel.subscribe(async(status,error)=>{if(status==='SUBSCRIBED'){await channel.track({staff_id:state.chatSelf?.id,full_name:state.chatSelf?.name||'Staff',online_at:new Date().toISOString()});$('chatPresenceText').textContent='تیمەکە زیندووە'}else if(status==='CHANNEL_ERROR'){console.warn('Staff chat realtime unavailable',error?.message||'channel error');$('chatPresenceText').textContent='پەیوەندی چات کێشەی هەیە'}})}
./prd-complete-inventory.md:122:./gc-csp-scripts/tracking-integration-inline-1.js:49:// search can clean up the first one's realtime subscription.
./prd-complete-inventory.md:123:./live-logistics-map.js:124:      const channel=sb.channel(`gc-public-map-${shipment.id}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'shipments',filter:`id=eq.${shipment.id}`},payload=>{
./prd-complete-inventory.md:124:./live-logistics-map.js:127:        const info=root.querySelector('.gc-map-info small'); if(info)info.textContent=p.eta?`ETA · ${new Date(p.eta).toLocaleDateString('ckb-IQ')}`:'نوێکراوەتەوە بە Realtime';
./prd-complete-inventory.md:125:./staff-os-console.js:96:  async function chat(){ const data=await api('chat'); const rooms=data.rooms||[]; $('#view').innerHTML=shell('چاتی تیم','گفتوگۆی ناوخۆیی ستاف، پەیامەکان لە Supabase Realtime ـدا دەژین.') + `<div class="chat-layout"><div class="room-list">${rooms.map((r,i)=>`<button class="room ${i===0?'active':''}" data-room="${r.id}"><b>${fmt(r.name)}</b><span>${r.messages?.length||0} messages</span><em>${r.unread_count||0}</em></button>`).join('') || '<div class="empty"><strong>هیچ room ـێک نییە</strong></div>'}</div><div class="chat-card" id="chatCard"></div></div>`; if(rooms[0]) renderRoom(rooms[0]); $$('.room').forEach(b=>b.onclick=()=>{ $$('.room').forEach(x=>x.classList.remove('active'));b.classList.add('active'); const r=rooms.find(x=>x.id===b.dataset.room);renderRoom(r);}); }
./prd-complete-inventory.md:126:./supabase/functions/account-admin/index.ts:596:    const { error: uploadErr } = await client.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false })
./prd-complete-inventory.md:127:./supabase/functions/account-admin/index.ts:598:    const { data: publicUrl } = client.storage.from(bucket).getPublicUrl(path)
./prd-complete-inventory.md:128:./supabase/functions/document-access/index.ts:44:    const signed = await service.storage.from('shipment-documents').createSignedUrl(documentResult.data.file_path, 60 * 60)
./prd-complete-inventory.md:129:./supabase/functions/logistics-control-plane/index.ts:356:  const upload = await service.storage.from('shipment-documents').upload(path, bytes, {
./prd-complete-inventory.md:130:./supabase/functions/logistics-control-plane/index.ts:361:  const signed = await service.storage.from('shipment-documents').createSignedUrl(path, 60 * 60 * 24 * 7)
./prd-complete-inventory.md:131:./supabase/functions/logistics-control-plane/index.ts:363:    await service.storage.from('shipment-documents').remove([path])
./prd-complete-inventory.md:132:./supabase/functions/logistics-control-plane/index.ts:379:    await service.storage.from('shipment-documents').remove([path])
./prd-complete-inventory.md:133:./supabase/functions/system-health/index.ts:101:      const storageProbe = await db.storage.from('shipment-documents').list('', { limit: 1 })
./prd-complete-inventory.md:134:./supabase/migrations/20260812142105_add_live_logistics_tracking.sql:63:-- Realtime event stream for operational tracking updates.
./prd-complete-inventory.md:135:./supabase/migrations/20260812142105_add_live_logistics_tracking.sql:66:  alter publication supabase_realtime add table public.shipment_tracking_events;
./prd-complete-inventory.md:136:./supabase/migrations/20260817222344_notification_dispatch_hardening.sql:4:create or replace function public.claim_notification_outbox_channel(
./prd-complete-inventory.md:137:./supabase/migrations/20260817222344_notification_dispatch_hardening.sql:35:revoke all on function public.claim_notification_outbox_channel(text,integer) from public, anon, authenticated;
./prd-complete-inventory.md:138:./supabase/migrations/20260817222344_notification_dispatch_hardening.sql:36:grant execute on function public.claim_notification_outbox_channel(text,integer) to service_role;
./prd-complete-inventory.md:139:./supabase/migrations/20260817222344_notification_dispatch_hardening.sql:38:comment on function public.claim_notification_outbox_channel(text,integer)
./prd-complete-inventory.md:140:./supabase/migrations/20260817222449_logistics_notifications_contract_hardening.sql:56:create or replace function public.claim_notification_outbox_channel(
./prd-complete-inventory.md:141:./supabase/migrations/20260817222449_logistics_notifications_contract_hardening.sql:166:revoke all on function public.claim_notification_outbox_channel(text, integer) from public, anon, authenticated;
./prd-complete-inventory.md:142:./supabase/migrations/20260817222449_logistics_notifications_contract_hardening.sql:169:grant execute on function public.claim_notification_outbox_channel(text, integer) to service_role;

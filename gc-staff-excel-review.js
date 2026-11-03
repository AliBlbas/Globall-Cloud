(() => {
  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const ENDPOINT = `${SUPABASE_URL}/functions/v1/excel-import-control`;
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text = (v) => String(v ?? '').trim();
  const category = (name) => { const n = name.toLowerCase(); if (/wshkani|baraurd/.test(n)) return 'shipment_intake'; if (/qard|7isab/.test(n)) return 'receivables'; if (/qasa/.test(n)) return 'cash_ledger'; if (/rozhana/.test(n)) return 'expenses'; if (/mangana|^---$/.test(n)) return 'rollup'; return 'unclassified'; };
  const api = async (path = '', options = {}) => {
    const session = (await window.gcSupabase?.auth.getSession())?.data?.session;
    if (!session?.access_token) throw new Error('Session ـی ستاف نەدۆزرایەوە');
    const response = await fetch(`${ENDPOINT}${path}`, { ...options, headers: { Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_KEY, 'Content-Type': 'application/json', ...(options.headers || {}) } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `Excel service ${response.status}`);
    return body;
  };
  const post = (action, data) => api('', { method: 'POST', body: JSON.stringify({ action, data }) });
  const hash = async (file) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()))).map((b) => b.toString(16).padStart(2, '0')).join('');
  const rowsFromWorkbook = (file) => {
    const wb = XLSX.read(file, { type: 'array', cellDates: true }); const rows = []; const sheets = [];
    for (const wsName of wb.SheetNames) {
      const values = XLSX.utils.sheet_to_json(wb.Sheets[wsName], { header: 1, raw: true, defval: null });
      const kind = category(wsName);
      const populated = values.filter((raw) => raw.some((v) => v !== null && v !== ''));
      const formulaCount = values.flat().filter((v) => typeof v === 'string' && v.startsWith('=')).length;
      const header = (populated.find((raw) => raw.filter((v) => v !== null && v !== '').length >= 2) || []).slice(0, 12).map((v) => text(v)).filter(Boolean);
      sheets.push({ name: wsName, category: kind, rows: populated.length, formulas: formulaCount, header });
      values.forEach((raw, index) => {
        const cleaned = raw.map((v) => v instanceof Date ? v.toISOString() : v);
        if (cleaned.filter((v) => v !== null && v !== '').length < 2) return;
        const gcCodes = cleaned.map((v) => text(v).toUpperCase().replace(/\s+/g, '')).filter((v) => /^GC-?[A-Z0-9-]{2,30}$/.test(v)).map((v) => v.startsWith('GC-') ? v : `GC-${v.slice(2)}`);
        const warnings = [];
        if (['shipment_intake', 'receivables'].includes(kind) && !gcCodes.length) warnings.push('no_gc_code_candidate');
        rows.push({ source_sheet: wsName, source_row: index + 1, category: kind, raw_values: cleaned, normalized_candidates: gcCodes.length ? { gc_codes: [...new Set(gcCodes)] } : {}, warnings });
      });
    }
    return { rows, profile: { workbook_type: 'Globall Cloud operations workbook', sheet_count: sheets.length, total_rows: rows.length, total_formulas: sheets.reduce((n, sheet) => n + sheet.formulas, 0), sheets } };
  };
  const statusLabel = (status) => ({ unreviewed: 'پشکنین نەکراوە', accepted: 'پەسەندکراو', needs_mapping: 'پێویستی بە mapping ـە', rejected: 'ڕەتکراوە' }[status] || status);
  const statusClass = (status) => ({ unreviewed: 'warn', accepted: 'good', needs_mapping: 'danger', rejected: 'muted' }[status] || 'muted');
  const render = async () => {
    const view = document.getElementById('view'); if (!view) return;
    view.innerHTML = '<div class="empty">Excel data لە بارکردندایە…</div>';
    try {
      const { batches } = await api('?kind=batches');
      const active = window.gcExcelActiveBatch || batches[0]?.id || '';
      window.gcExcelActiveBatch = active;
      const profile = active ? (batches.find((b) => b.id === active)?.notes ? (() => { try { return JSON.parse(batches.find((b) => b.id === active).notes).workbook_profile || null; } catch (_) { return null; } })() : null) : null;
      view.innerHTML = `<div class="section-head"><div><div class="eyebrow">EXCEL CONTROL PLANE</div><h1>بەڕێوەبردنی Excel</h1><p>داتا سەرەتا لە staging ـدا پشکنین دەکرێت؛ هیچ row ـێک بەخۆکارانە ناچێتە shipment یان finance.</p></div><div class="actions"><label class="btn primary gc-excel-upload">+ بارکردنی Excel<input id="gcExcelFile" type="file" accept=".xlsx,.xls,.csv" hidden></label><button class="btn" id="gcExcelRefresh">نوێکردنەوە</button></div></div><div class="grid-kpi gc-excel-kpis"><div class="kpi"><span>Batch ـەکان</span><strong>${batches.length}</strong></div><div class="kpi"><span>Rows</span><strong>${batches.reduce((n, x) => n + (x.review?.rows || 0), 0)}</strong></div><div class="kpi"><span>پێویستی بە پشکنین</span><strong>${batches.reduce((n, x) => n + (x.review?.unreviewed || 0) + (x.review?.needs_mapping || 0), 0)}</strong></div><div class="kpi"><span>Approved</span><strong>${batches.filter((x) => x.import_status === 'approved').length}</strong></div></div>${profile ? `<section class="card gc-excel-profile"><div class="card-head"><div><h3>${esc(profile.workbook_type || 'Workbook profile')}</h3><small class="muted">${profile.sheet_count || 0} sheets · ${profile.total_rows || 0} parsed rows · ${profile.total_formulas || 0} formulas</small></div></div><div class="gc-excel-sheet-grid">${(profile.sheets || []).map((sheet) => `<div class="gc-excel-sheet"><b>${esc(sheet.name)}</b><span>${esc(sheet.category)} · ${sheet.rows || 0} rows</span><small>${esc((sheet.header || []).slice(0, 4).join(' · '))}</small></div>`).join('')}</div></section>` : ''}<section class="card gc-excel-workspace"><div class="card-head"><div><h3>Batch ـەکان</h3><small class="muted">هەر batch ـێک source hash و audit trail ـی خۆی هەیە.</small></div></div><div class="table-wrap"><table class="table"><thead><tr><th>File</th><th>Status</th><th>Rows</th><th>Review</th><th>Created</th><th></th></tr></thead><tbody>${batches.map((b) => `<tr class="${b.id === active ? 'gc-excel-active' : ''}"><td><b>${esc(b.source_filename)}</b><small class="mono">${esc(String(b.source_sha256).slice(0, 16))}…</small></td><td><span class="pill ${b.import_status === 'approved' ? 'mint' : b.import_status === 'rejected' ? 'red' : 'warn'}">${esc(b.import_status)}</span></td><td class="mono">${b.review?.rows || 0}</td><td>${b.review?.accepted || 0} accepted · ${b.review?.unreviewed || 0} pending · ${b.review?.needs_mapping || 0} mapping</td><td>${esc(new Date(b.created_at).toLocaleString('ku-IQ'))}</td><td><button class="btn tiny" data-excel-batch="${esc(b.id)}">بینین</button></td></tr>`).join('') || '<tr><td colspan="6"><div class="empty">هێشتا هیچ Excel batch ـێک نییە.</div></td></tr>'}</tbody></table></div></section><div id="gcExcelRows"></div>`;
      document.getElementById('gcExcelRefresh').onclick = render;
      document.querySelectorAll('[data-excel-batch]').forEach((button) => button.onclick = () => { window.gcExcelActiveBatch = button.dataset.excelBatch; render(); });
      document.getElementById('gcExcelFile').onchange = upload;
      if (active) await renderRows(active);
    } catch (error) { view.innerHTML = `<div class="empty"><strong style="color:var(--red)">Excel service error</strong><div>${esc(error.message)}</div><button class="btn" id="gcExcelRetry">دووبارە هەوڵدان</button></div>`; document.getElementById('gcExcelRetry').onclick = render; }
  };
  const upload = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (file.size > 25 * 1024 * 1024) return alert('Excel فایلەکە نابێت لە 25MB زیاتر بێت.');
    const parsed = rowsFromWorkbook(file); if (!parsed.rows.length) return alert('هیچ row ـێکی بەکارهێنراو نەدۆزرایەوە.');
    const button = document.querySelector('.gc-excel-upload'); if (button) button.classList.add('is-loading');
    try { const batch = await post('upload_batch', { source_filename: file.name, source_size_bytes: file.size, source_sha256: await hash(file), rows: parsed.rows, workbook_profile: parsed.profile }); window.gcExcelActiveBatch = batch.batch.id; await render(); }
    catch (error) { alert(error.message); if (button) button.classList.remove('is-loading'); }
  };
  const renderRows = async (batchId) => {
    const host = document.getElementById('gcExcelRows'); if (!host) return;
    const { rows } = await api(`?kind=rows&batch_id=${encodeURIComponent(batchId)}`);
    const accepted = rows.filter((x) => x.review_status === 'accepted').length;
    const pending = rows.filter((x) => ['unreviewed', 'needs_mapping'].includes(x.review_status)).length;
    host.innerHTML = `<section class="card gc-excel-rows"><div class="card-head"><div><h3>Row review</h3><small class="muted">${rows.length} rows · ${accepted} accepted · ${pending} pending</small></div><div class="actions"><button class="btn" id="gcExcelReject">ڕەتکردنەوەی batch</button><button class="btn primary" id="gcExcelApprove" ${pending ? 'disabled title="هەموو row ـەکان پشکنین بکە"' : ''}>پەسەندکردنی batch</button></div></div><div class="table-wrap"><table class="table"><thead><tr><th>Source</th><th>Category</th><th>Raw preview</th><th>Warnings</th><th>Status</th><th>Decision</th></tr></thead><tbody>${rows.slice(0, 500).map((row) => `<tr><td class="mono">${esc(row.source_sheet)}:${row.source_row}</td><td>${esc(row.source_category)}</td><td class="gc-excel-preview">${esc((row.raw_values || []).filter((v) => v !== null && v !== '').slice(0, 5).join(' · '))}</td><td>${(row.warnings || []).map((w) => `<span class="pill red">${esc(w)}</span>`).join(' ') || '<span class="muted">—</span>'}</td><td><span class="pill ${statusClass(row.review_status)}">${esc(statusLabel(row.review_status))}</span></td><td class="gc-excel-decisions"><button class="btn tiny" data-row-status="accepted" data-row-id="${row.id}">پەسەند</button><button class="btn tiny" data-row-status="needs_mapping" data-row-id="${row.id}">Mapping</button><button class="btn tiny" data-row-status="rejected" data-row-id="${row.id}">ڕەت</button></td></tr>`).join('') || '<tr><td colspan="6"><div class="empty">row ـێک نییە.</div></td></tr>'}</tbody></table></div></section>`;
    document.querySelectorAll('[data-row-status]').forEach((button) => button.onclick = async () => { button.disabled = true; try { await post('review_row', { id: button.dataset.rowId, review_status: button.dataset.rowStatus }); await render(); } catch (error) { alert(error.message); button.disabled = false; } });
    document.getElementById('gcExcelApprove').onclick = async () => { if (!confirm('ئەم batch ـە پەسەند بکرێت؟')) return; try { await post('approve_batch', { batch_id: batchId }); await render(); } catch (error) { alert(error.message); } };
    document.getElementById('gcExcelReject').onclick = async () => { if (!confirm('ئەم batch ـە ڕەت بکرێتەوە؟')) return; try { await post('reject_batch', { batch_id: batchId }); await render(); } catch (error) { alert(error.message); } };
  };
  window.gcStaffExcelRender = render;
})();

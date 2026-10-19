/* Globall Cloud — authenticated shipment request workflow */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const form = $('customerRequestForm');
  if (!form) return;
  const modeSelect = $('requestMode');
  const weightInput = $('requestWeight');
  const volumeWrap = $('requestVolumeWrap');
  const volumeInput = $('requestVolume');
  const syncModeFields = () => {
    const isSea = modeSelect?.value === 'sea';
    if (weightInput) weightInput.required = !isSea;
    if (volumeInput) {
      volumeInput.required = isSea;
      volumeInput.setAttribute('aria-required', String(isSea));
    }
    if (volumeWrap) volumeWrap.hidden = !isSea;
    if (!isSea && volumeInput) volumeInput.value = '';
  };
  modeSelect?.addEventListener('change', syncModeFields);
  syncModeFields();
  const cargoHasBattery = (value) => /battery|batteries|lithium|power\s?bank|باتری|پاتری/i.test(String(value || ''));
  const cargoHasLiquid = (value) => /liquid|perfume|fragrance|shampoo|\bgel\b|\boil\b|شلە|شلەمەنی|عەتری|پەرفیوم/i.test(String(value || ''));
  const cargoIsMedical = (value) => /medical|medicine|medication|surgical|clinic|hospital|پزیشک|دەرمان|نەشتەرگەری/i.test(String(value || ''));
  const readCompliance = () => {
    const product = $('requestProductType')?.value || '';
    const description = $('requestDescription')?.value || '';
    const battery = Boolean($('requestHasBattery')?.checked) || cargoHasBattery(product + ' ' + description);
    const liquid = Boolean($('requestHasLiquid')?.checked) || cargoHasLiquid(product + ' ' + description);
    const medical = Boolean($('requestMedicalDevice')?.checked) || cargoIsMedical(product + ' ' + description);
    const needsMsds = battery || liquid;
    const wrapper = $('requestMsdsWrap');
    const file = $('requestMsdsDocument');
    if (wrapper) wrapper.hidden = !needsMsds;
    if (file) file.required = needsMsds;
    return { productType: product, battery, liquid, medical, needsMsds, msdsFile: file?.files?.[0] || null };
  };
  $('requestProductType')?.addEventListener('change', readCompliance);
  $('requestHasBattery')?.addEventListener('change', readCompliance);
  $('requestHasLiquid')?.addEventListener('change', readCompliance);
  $('requestMedicalDevice')?.addEventListener('change', readCompliance);
  $('requestDescription')?.addEventListener('input', readCompliance);
  readCompliance();

  const setStatus = (message, kind = '') => {
    const node = $('requestMessage');
    if (node) { node.textContent = message; node.className = `form-message ${kind}`; }
  };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const renderHistory = (items) => {
    const root = $('requestHistory');
    if (!root) return;
    if (!items.length) { root.innerHTML = '<div class="empty-line">هێشتا داواکارییەکت نییە.</div>'; return; }
    root.innerHTML = items.slice(0, 8).map((item) => {
      const isSea = String(item.transport_mode || 'air').toLowerCase() === 'sea';
      const measure = isSea
        ? `${escapeHtml(item.volume_cbm ?? '—')} CBM${item.weight_kg != null ? ` · ${escapeHtml(item.weight_kg)} kg` : ''}`
        : `${escapeHtml(item.weight_kg ?? '—')} kg`;
      return `<article class="item"><div class="row"><strong>${escapeHtml(item.origin_key || '—')} → ${escapeHtml(item.dest_key || '—')}</strong><span class="pill">${escapeHtml(item.status || 'pending')}</span></div><small class="muted">${escapeHtml(item.transport_mode || 'air')} · ${measure} · ${item.created_at ? new Date(item.created_at).toLocaleString() : '—'}</small></article>`;
    }).join('');
  };
  const submit = async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const sessionResult = await window.sb?.auth?.getSession?.();
    const session = sessionResult?.data?.session;
    const token = session?.access_token;
    const userId = session?.user?.id;
    if (!token) { setStatus('تکایە سەرەتا login بکە بۆ ناردنی داواکاری.', 'error'); $('loginBtn')?.click(); return; }
    const mode = modeSelect?.value || 'air';
    const readOptionalNumber = (id) => {
      const raw = String($(id)?.value ?? '').trim();
      if (!raw) return null;
      const number = Number(raw);
      return Number.isFinite(number) ? number : Number.NaN;
    };
    const weight = readOptionalNumber('requestWeight');
    const volume = readOptionalNumber('requestVolume');
    const items = readOptionalNumber('requestItems');
    const description = $('requestDescription')?.value.trim() || '';
    const compliance = readCompliance();
    if (compliance.medical) {
      setStatus('ئامێر و کەلوپەلی پزیشکی بە هیچ شێوەیەک وەرناگیرێت.', 'error');
      $('requestProductType')?.focus();
      return;
    }
    const weightValid = mode === 'sea'
      ? (weight === null || (Number.isFinite(weight) && weight > 0))
      : (Number.isFinite(weight) && weight > 0);
    const volumeValid = mode === 'sea'
      ? Number.isFinite(volume) && volume > 0
      : (volume === null || (Number.isFinite(volume) && volume >= 0));
    const itemsValid = items === null || (Number.isInteger(items) && items > 0);
    if (!description || !weightValid || !volumeValid || !itemsValid) {
      setStatus(mode === 'sea'
        ? 'بۆ بارە دەریاییەکان قەبارەی CBM پڕبکەرەوە؛ کێش ئارەزوومەندانەیە. ژمارەی کاڵاش دەبێت ژمارەیەکی تەواو بێت.'
        : 'وەسفی کاڵا و کێشی زیاتر لە سفر پڕبکەرەوە؛ ژمارەی کاڵاش دەبێت ژمارەیەکی تەواو بێت.', 'error');
      return;
    }
    const imageFile = $('requestImage')?.files?.[0] || null;
    const msdsFile = compliance.msdsFile;
    if (compliance.needsMsds && !msdsFile) {
      setStatus('بۆ کاڵای باتری‌دار یان شلەمەنی، فایلێکی MSDS پێویستە. بێ بەڵگە داواکاری قبوڵ ناکرێت.', 'error');
      $('requestMsdsDocument')?.focus();
      return;
    }
    const msdsMimeToExtension = {
      'application/pdf':'pdf', 'image/jpeg':'jpg', 'image/jpg':'jpg',
      'image/png':'png', 'image/webp':'webp'
    };
    const msdsExtensionByName = String(msdsFile?.name || '').toLowerCase().match(/\\.([a-z0-9]+)$/)?.[1] || '';
    const msdsMime = String(msdsFile?.type || '').split(';')[0].trim().toLowerCase();
    const msdsExtension = msdsMimeToExtension[msdsMime] || (['pdf','jpg','jpeg','png','webp'].includes(msdsExtensionByName) ? msdsExtensionByName : '');
    const normalizedMsdsMime = msdsExtension === 'pdf' ? 'application/pdf' : msdsExtension === 'png' ? 'image/png' : msdsExtension === 'webp' ? 'image/webp' : msdsExtension ? 'image/jpeg' : '';
    if (msdsFile && (msdsFile.size <= 0 || msdsFile.size > 10 * 1024 * 1024 || !msdsExtension)) {
      setStatus('فایلی MSDS دەبێت PDF/JPG/PNG/WebP و کەمتر لە 10MB بێت.', 'error');
      return;
    }
    const maxImageBytes = 10 * 1024 * 1024;
    const extensionByMime = {
      'image/jpeg':'jpg', 'image/jpg':'jpg', 'image/pjpeg':'jpg',
      'image/png':'png', 'image/webp':'webp', 'image/avif':'avif',
      'image/gif':'gif', 'image/heic':'heic', 'image/heif':'heif'
    };
    const mimeByExtension = {
      jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', webp:'image/webp',
      avif:'image/avif', gif:'image/gif', heic:'image/heic', heif:'image/heif'
    };
    const detectedMime = String(imageFile?.type || '').toLowerCase();
    const detectedExtension = String(imageFile?.name || '').toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || '';
    const imageExtension = detectedMime ? extensionByMime[detectedMime] : detectedExtension;
    if (imageFile && imageFile.size > maxImageBytes) {
      setStatus('قەبارەی وێنە نابێت لە 10MB زیاتر بێت.', 'error');
      return;
    }
    if (imageFile && (!imageExtension || !mimeByExtension[imageExtension] || imageFile.size <= 0)) {
      setStatus('تەنها وێنەی JPEG، PNG، WebP، AVIF، GIF، HEIC یان HEIF وەردەگیرێت.', 'error');
      return;
    }
    if ((imageFile || msdsFile) && !userId) {
      setStatus('هەژماری کڕیار پشتڕاست نەکراوەتەوە؛ تکایە دووبارە login بکە.', 'error');
      return;
    }
    if (button) { button.disabled = true; button.textContent = 'داواکاری دەنێردرێت…'; }
    setStatus('داواکارییەکەت بە شێوەی پارێزراو دەنێردرێت…');
    let uploadedPath = null;
    let uploadedMsdsPath = null;
    let responseStatus = null;
    let submissionStarted = false;
    const country = $('requestCountry')?.value || 'china';
    try {
      if (imageFile) {
        setStatus('وێنەی کاڵا بە شێوەی تایبەت بار دەکرێت…');
        const storage = window.sb?.storage?.from?.('customer-request-photos');
        if (!storage) throw new Error('خزمەتی بارکردنی وێنە بەردەست نییە.');
        const randomId = window.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
          const random = Math.floor(Math.random() * 16);
          return (char === 'x' ? random : ((random & 3) | 8)).toString(16);
        });
        const desiredPath = `${userId}/${randomId}.${imageExtension}`;
        const upload = await storage.upload(desiredPath, imageFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: detectedMime || mimeByExtension[imageExtension]
        });
        if (upload.error) throw new Error('بارکردنی وێنە سەرکەوتوو نەبوو. تکایە وێنەیەکی تر هەڵبژێرە.');
        uploadedPath = upload.data?.path || desiredPath;
      }
      if (msdsFile) {
        setStatus('بڕوانامەی MSDS بە شێوەی private بار دەکرێت…');
        const storage = window.sb?.storage?.from?.('customer-msds-documents');
        if (!storage) throw new Error('خزمەتی بارکردنی فایلێکی MSDS بەردەست نییە.');
        const randomId = window.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
          const random = Math.floor(Math.random() * 16);
          return (char === 'x' ? random : ((random & 3) | 8)).toString(16);
        });
        const desiredPath = `${userId}/${randomId}.${msdsExtension}`;
        const upload = await storage.upload(desiredPath, msdsFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: normalizedMsdsMime
        });
        if (upload.error) throw new Error('بارکردنی بڕوانامەی MSDS سەرکەوتوو نەبوو.');
        uploadedMsdsPath = upload.data?.path || desiredPath;
      }
      submissionStarted = true;
      const response = await fetch('https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/customer-self', { method: 'POST', headers: { Authorization: `Bearer ${token}`, apikey: 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda', 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'request_quote', data: { request_type: 'shipment', origin_key: country, cargo_country: country, product_type: compliance.productType, cargo_description: description, cargo_image_path: uploadedPath, has_battery: compliance.battery, has_liquid: compliance.liquid, medical_device: compliance.medical, msds_provided: Boolean(uploadedMsdsPath), msds_document_path: uploadedMsdsPath, dest_key: 'Erbil', transport_mode: mode, weight_kg: weight, volume_cbm: volume, items_count: items, service_level: 'standard', incoterm: 'EXW', notes: description } }), cache: 'no-store' });
      responseStatus = response.status;
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'ناردنی داواکاری سەرکەوتوو نەبوو.');
      setStatus('داواکارییەکەت نێردرا؛ تیمەکەمان پاش پشکنین وەڵامت دەداتەوە.', 'success');
      renderHistory([{ origin_key: country, dest_key: 'Erbil', transport_mode: mode, weight_kg: weight, volume_cbm: volume, status: 'pending', created_at: new Date().toISOString() }, ...((window.__customerQuotes || []).filter((x) => x?.id))]);
      form.reset();
      syncModeFields();
      readCompliance();
    } catch (error) {
      const shouldCleanUploads = !submissionStarted || (responseStatus !== null && responseStatus >= 400 && responseStatus < 500);
      if (shouldCleanUploads && uploadedPath) {
        try {
          const cleanup = await window.sb?.storage?.from?.('customer-request-photos')?.remove?.([uploadedPath]);
          if (cleanup?.error) console.warn('Could not remove rejected customer photo upload.', cleanup.error);
        } catch (cleanupError) { console.warn('Could not remove rejected customer photo upload.', cleanupError); }
      }
      if (shouldCleanUploads && uploadedMsdsPath) {
        try {
          const cleanup = await window.sb?.storage?.from?.('customer-msds-documents')?.remove?.([uploadedMsdsPath]);
          if (cleanup?.error) console.warn('Could not remove rejected MSDS upload.', cleanup.error);
        } catch (cleanupError) { console.warn('Could not remove rejected MSDS upload.', cleanupError); }
      }
      setStatus(error.message || 'هەڵەیەک ڕوویدا.', 'error');
    }
    finally { if (button) { button.disabled = false; button.innerHTML = '<span data-dash-icon="send"></span>ناردنی داواکاری'; } }
  };
  form.addEventListener('submit', submit);
  window.addEventListener('gc:customer-loaded', (event) => renderHistory(event.detail?.quotes || window.__customerQuotes || []));
})();

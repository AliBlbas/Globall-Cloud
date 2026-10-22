(() => {
'use strict';
const $ = id => document.getElementById(id);
const setText = (id, value) => {
  const node = $(id);
  if (node) node.textContent = value == null || value === '' ? '—' : String(value);
};
const fmt = value => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ku-IQ', {dateStyle:'medium', timeStyle:'short'});
};
async function load() {
  const overall = $('overall');
  if (!overall) return;
  const dot = overall.querySelector('.dot');
  overall.dataset.state = 'checking';
  if (dot) dot.className = 'dot warn';
  setText('overallText', 'پشکنین دەکرێت…');
  try {
    const response = await fetch('/api/ready?status=' + Date.now(), {
      cache: 'no-store',
      headers: {Accept:'application/json', 'Cache-Control':'no-cache'}
    });
    const data = await response.json();
    const edgeOk = data?.edge?.ok === true;
    const supabaseOk = data?.supabase?.ok === true;
    const healthy = response.ok && data?.ok === true && data?.status === 'ready' && edgeOk && supabaseOk;
    const state = healthy ? 'ok' : (response.status === 503 || data?.status === 'degraded') ? 'degraded' : 'down';
    overall.dataset.state = state;
    if (dot) dot.className = 'dot ' + (state === 'ok' ? 'good' : state === 'degraded' ? 'warn' : 'bad');
    setText('overallText', state === 'ok' ? 'هەموو پشکنینە سەرەکییەکان باشن' : state === 'degraded' ? 'بەشێک لە خزمەتگوزارییەکان کێشەیان هەیە' : 'پشکنینی تەندروستی سەرکەوتوو نەبوو');
    setText('edge', edgeOk ? 'چالاک' : 'ناچالاک');
    setText('supabase', supabaseOk ? 'چالاک' : 'کێشە هەیە');
    setText('supabaseHttp', data?.supabase?.status ? 'HTTP ' + data.supabase.status : '—');
    setText('latency', Number.isFinite(data?.total_ms) ? data.total_ms + ' ms' : '—');
    setText('service', data?.service || 'Globall Cloud');
    setText('version', data?.commit ? String(data.commit).slice(0, 12) : '—');
    setText('release', [data?.branch, data?.status].filter(Boolean).join(' · ') || '—');
    setText('timestamp', fmt(data?.timestamp));
    setText('checked', 'کۆتا پشکنین: ' + fmt(new Date().toISOString()));
  } catch (_) {
    overall.dataset.state = 'down';
    if (dot) dot.className = 'dot bad';
    setText('overallText', 'نەتوانرا پەیوەندی بە API ـی تەندروستی بکرێت');
    setText('edge', 'نەپشکنرا');
    setText('supabase', 'نەپشکنرا');
    setText('supabaseHttp', '—');
    setText('latency', '—');
    setText('service', 'Globall Cloud');
    setText('release', '—');
    setText('version', '—');
    setText('timestamp', '—');
    setText('checked', 'هەڵە لە وەرگرتنی داتای تەندروستی');
  }
}
$('refresh')?.addEventListener('click', load);
load();
setInterval(load, 60000);
})();

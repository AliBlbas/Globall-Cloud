(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = { section: 'overview', domain: 'globall-cloud.pages.dev', refreshed: false, requestId: 0, status: 'checking', payload: null };
  const chartData = { visits: [24, 27, 26, 33, 38, 45], unique: [17, 19, 20, 24, 29, 34] };
  const toast = (message) => { const node = $('#toast'); node.textContent = message; node.classList.add('show'); window.clearTimeout(toast.timer); toast.timer = window.setTimeout(() => node.classList.remove('show'), 2600); };
  const sectionMeta = {
    overview: ['Overview', 'Understand your <em>growth.</em>', 'A clear view of visits, engagement and acquisition across your digital presence.'],
    acquisition: ['Acquisition', 'Turn traffic into <em>momentum.</em>', 'See which channels bring qualified visitors to your website.'],
    audience: ['Audience', 'Know who is <em>showing up.</em>', 'Understand where your audience is and how they engage.'],
    pages: ['Top pages', 'Make every page <em>count.</em>', 'Find the pages that attract and retain your audience.'],
    technology: ['Technology', 'Design for the <em>real world.</em>', 'Optimize the experience for the devices your audience uses.']
  };
  const analyticsEndpoint = '/functions/v1/website-analytics';
  function setDataStatus(status, message) { state.status = status; const note = $('#dataNote'); if (note) { note.textContent = status === 'live' ? '● Live SimilarWeb data' : status === 'unavailable' ? '● Estimated benchmark data' : status === 'loading' ? '● Loading live data…' : message || '● Analytics data unavailable'; note.dataset.status = status; } }
  function normalizeDomain(value) { return String(value || '').trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase(); }
  async function loadLiveData() {
    const requestId = ++state.requestId; const domain = normalizeDomain($('#domainInput').value) || state.domain; state.domain = domain; setDataStatus('loading');
    try {
      const params = new URLSearchParams({ domain, country: $('#countrySelect').value || 'world' });
      const response = await fetch(`${analyticsEndpoint}?${params}`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (requestId !== state.requestId) return;
      if (!response.ok || payload.status === 'error') throw new Error(payload.error || `Analytics request failed (${response.status})`);
      state.payload = payload;
      if (payload.status === 'live') { setDataStatus('live'); applyLivePayload(payload); toast(`Live analytics loaded for ${domain}`); }
      else { setDataStatus('unavailable', '● Estimated benchmark data'); toast(payload.error || 'Live provider is not configured yet'); }
    } catch (error) { if (requestId !== state.requestId) return; setDataStatus('unavailable', '● Estimated benchmark data'); toast(error.message || 'Live analytics unavailable — showing benchmark view'); }
  }
  function applyLivePayload(payload) {
    const visitValues = (payload.visits || []).map((x) => Number(x.value)).filter(Number.isFinite); const uniqueValues = (payload.uniqueVisitors || []).map((x) => Number(x.value)).filter(Number.isFinite);
    if (visitValues.length > 1) { chartData.visits = visitValues.slice(-6).map((value) => Math.max(1, Math.round(value / 1000))); chartData.unique = (uniqueValues.length ? uniqueValues : chartData.visits.map((value) => value * .68)).slice(-6).map((value) => Math.max(1, Math.round(value / 1000))); renderChart(); }
    const total = visitValues.reduce((sum, value) => sum + value, 0); const unique = uniqueValues.reduce((sum, value) => sum + value, 0); const totalNode = $('#totalVisits'); if (totalNode && total) totalNode.textContent = `${(total / 1000).toFixed(total > 100000 ? 1 : 0)}K`; const donutTotal = $('.donut strong'); if (donutTotal && total) donutTotal.textContent = `${(total / 1000).toFixed(1)}K`; if (payload.updatedAt) $('.updated').textContent = `Live sync · ${new Date(payload.updatedAt).toLocaleString()}`; if (unique && $('.kpi-card:nth-child(2) > strong')) $('.kpi-card:nth-child(2) > strong').textContent = `${(unique / 1000).toFixed(1)}K`;
  }
  function renderChart() {
    const width = 760; const height = 270; const max = 50;
    const point = (value, index) => `${Math.round((index / (chartData.visits.length - 1)) * width)},${height - Math.round((value / max) * (height - 20))}`;
    const visits = chartData.visits.map(point).join(' '); const unique = chartData.unique.map(point).join(' ');
    const area = `M0,${height} L${visits.replaceAll(' ', ' L')} L${width},${height} Z`;
    $('#trafficLine').setAttribute('d', `M${visits}`); $('#uniqueLine').setAttribute('d', `M${unique}`); $('#trafficArea').setAttribute('d', area);
    const dots = $('#chartDots'); dots.replaceChildren(); chartData.visits.forEach((value, index) => { const [cx, cy] = point(value, index).split(','); const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); circle.setAttribute('cx', cx); circle.setAttribute('cy', cy); circle.setAttribute('r', index === chartData.visits.length - 1 ? '4.5' : '3'); circle.setAttribute('fill', '#28d5e7'); circle.setAttribute('stroke', '#0d1d31'); circle.setAttribute('stroke-width', '2'); dots.append(circle); });
  }
  function setSection(section) {
    state.section = section; const meta = sectionMeta[section] || sectionMeta.overview;
    $$('.nav-link').forEach((button) => button.classList.toggle('active', button.dataset.section === section));
    $$('.analytics-section').forEach((panel) => panel.classList.toggle('active', panel.dataset.content === section));
    $('#crumbSection').textContent = meta[0]; $('#pageTitle').innerHTML = meta[1]; $('#pageSubtitle').textContent = meta[2];
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function bindNavigation() {
    $('#sideNav').addEventListener('click', (event) => { const button = event.target.closest('[data-section]'); if (!button) return; setSection(button.dataset.section); $('#sideNav').closest('.sidebar').classList.remove('open'); });
    $$('[data-jump]').forEach((button) => button.addEventListener('click', () => setSection(button.dataset.jump)));
    $('#menuBtn').addEventListener('click', () => $('.sidebar').classList.toggle('open'));
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') $('.sidebar').classList.remove('open'); const shortcuts = { '1': 'overview', '2': 'acquisition', '3': 'audience', '4': 'pages', '5': 'technology' }; if ((event.metaKey || event.ctrlKey) && shortcuts[event.key]) { event.preventDefault(); setSection(shortcuts[event.key]); } });
  }
  function bindControls() {
    $('#analyzeBtn').addEventListener('click', () => { state.domain = normalizeDomain($('#domainInput').value) || 'globall-cloud.pages.dev'; toast(`Analyzing ${state.domain}…`); loadLiveData(); });
    $('#refreshBtn').addEventListener('click', async (event) => { const button = event.currentTarget; button.disabled = true; button.querySelector('span').textContent = '…'; await loadLiveData(); state.refreshed = true; button.disabled = false; button.querySelector('span').textContent = '↻'; });
    $('#rangeSelect').addEventListener('change', (event) => { toast(`Period changed to ${event.target.options[event.target.selectedIndex].text}`); loadLiveData(); });
    $('#countrySelect').addEventListener('change', (event) => { toast(`Market filter: ${event.target.options[event.target.selectedIndex].text}`); loadLiveData(); });
    $('#exportBtn').addEventListener('click', () => downloadReport('globall-cloud-traffic-report.csv'));
    $('#pageExport').addEventListener('click', () => downloadReport('globall-cloud-top-pages.csv'));
    $('#copyInsight').addEventListener('click', async () => { const text = 'Mobile visitors grew 31.6% and now represent 68% of Globall Cloud traffic. Prioritize mobile quote and tracking flows.'; try { await navigator.clipboard.writeText(text); toast('Insight copied to clipboard'); } catch { toast('Insight ready to copy'); } });
    $('#helpBtn').addEventListener('click', () => toast('Choose a section from the sidebar to explore your traffic.'));
    $('#notifyBtn').addEventListener('click', () => toast('No new alerts — your data connection is healthy.'));
    $('#channelSort').addEventListener('click', () => toast('Channels sorted by visits'));
    $('#pageSearch').addEventListener('input', (event) => { const query = event.target.value.toLowerCase(); $$('tbody tr', $('#pagesTable')).forEach((row) => { row.hidden = !row.textContent.toLowerCase().includes(query); }); });
  }
  function downloadReport(filename) { const csv = 'Metric,Value,Period\nTotal visits,184600,Last 6 months\nUnique visitors,126200,Last 6 months\nBounce rate,38.7%,Last 6 months\nMobile share,68.4%,Last 6 months\n'; const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); toast('Report downloaded'); }
  renderChart(); bindNavigation(); bindControls(); loadLiveData();
})();

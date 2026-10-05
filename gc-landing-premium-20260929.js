/* Premium landing transport studio. */
(() => {
  const data = {
    air: { label:'AIR · ACTIVE RATE CATALOG', title:'بۆ بارە پەلەکان، ڕێگای ئاسمانی هەڵبژێرە.', text:'نرخی Dubai Air بە دانەی کاڵا حیساب دەکرێت؛ جۆری کاڵا و ژمارەی دانە بنووسە بۆ خەمڵاندن و quote ـی کۆتایی پشتڕاست بکەرەوە.', quote:'Quote', catalog:'Active rates', image:'/assets/gc-air-freight-hero-1440.webp' },
    sea: { label:'SEA · CBM RATE', title:'بۆ بارە قورسەکان، حەجم بە CBM بنووسە.', text:'نرخی Sea بە CBM هەژمار دەکرێت. وردەکاری بارەکەت بنێرە تا ستاف نرخ و پڕۆسەی کۆتایی پشتڕاست بکاتەوە.', quote:'CBM', catalog:'Active rates', image:'/assets/gc-sea-freight-hero-1440.webp' },
    land: { label:'LAND · WEIGHT & PRODUCT', title:'نرخی Land بە کێش و جۆری کاڵا دەگۆڕێت.', text:'نرخی Dubai Land لە کاتالۆگی چالاکەوە وەردەگیرێت؛ نرخی تایبەتی Shein تەنها بۆ بارەکانی زیاتر لە ١٠٠ کیلۆیە.', quote:'Quote', catalog:'Active rates', image:'/assets/gc-land-freight-hero-1440.webp' }
  };
  const boot = () => {
    const root = document.getElementById('gcTransportStudio'); if (!root) return;
    const setMode = (mode, sync = false) => {
      const d = data[mode] || data.air;
      const stage = root.querySelector('.gc-studio-stage');
      if (stage) stage.dataset.studioActive = mode;
      root.querySelectorAll('[data-studio-mode]').forEach((button) => { const active = button.dataset.studioMode === mode; button.classList.toggle('active', active); button.setAttribute('aria-selected', active ? 'true' : 'false'); });
      const set = (id, value) => { const element = document.getElementById(id); if (element) element.textContent = value; };
      set('gcStudioModeLabel', d.label); set('gcStudioTitle', d.title); set('gcStudioText', d.text); set('gcStudioEta', d.quote); set('gcStudioCoverage', d.catalog);
      const image = document.getElementById('gcStudioImage'); if (image) { image.src = d.image; image.alt = `${mode} freight visual`; }
      if (sync) { const rate = document.querySelector(`[data-rate-mode="${mode}"]`); rate?.click(); document.getElementById('gcRateExplorer')?.scrollIntoView({behavior:'smooth',block:'center'}); }
    };
    root.querySelectorAll('[data-studio-mode]').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.studioMode)));
    root.querySelector('[data-studio-sync]')?.addEventListener('click', () => { const active = root.querySelector('[data-studio-mode].active')?.dataset.studioMode || 'air'; setMode(active, true); });
    document.querySelectorAll('.gc-trust-card.gc-transport-card').forEach((card) => card.addEventListener('click', () => { const label = card.textContent.toLowerCase(); setMode(label.includes('sea') ? 'sea' : label.includes('land') ? 'land' : 'air'); root.scrollIntoView({behavior:'smooth',block:'center'}); }));
    setMode('air');
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
})();

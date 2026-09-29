/* Premium landing transport studio. */
(() => {
  const data = {
    air: { label:'AIR · PRIORITY LANE', title:'بارە پەلەدارەکەت لە چەند ڕۆژێکدا دەگات.', text:'بۆ کاڵای کەم‌قەبارە و time-sensitive، Air Freight ڕێگایەکی خێرا و بەدواداچوون‌پێکراوە لە چین و دوبەی بۆ هەولێر.', eta:'٢–٥', coverage:'٣', image:'/assets/gc-air-freight-hero.png' },
    sea: { label:'SEA · OCEAN VALUE', title:'بۆ بارە قورسەکان، تێچووی زیرەک هەڵبژێرە.', text:'Sea Freight بۆ بارە قورس و کۆکراوەکانە؛ بە capacity ـی زیاتر، route ـی ڕوون و پشتیوانی تا کۆتایی.', eta:'٢٠–٣٥', coverage:'٤', image:'/assets/gc-sea-freight-hero.png' },
    land: { label:'LAND · FINAL MILE', title:'لە hub ـەوە تا دەرگای کڕیار.', text:'Land Freight هەموو ئەو پەیوەندییەیە کە shipment ـەکەت لە دوبەی و هەولێر بە شێوەیەکی منظم دەگەیەنێت.', eta:'٣–٧', coverage:'٥', image:'/assets/gc-land-freight-hero.png' }
  };
  const boot = () => {
    const root = document.getElementById('gcTransportStudio'); if (!root) return;
    const setMode = (mode, sync = false) => {
      const d = data[mode] || data.air;
      root.querySelector('.gc-studio-stage').dataset.studioActive = mode;
      root.querySelectorAll('[data-studio-mode]').forEach(b => { const active = b.dataset.studioMode === mode; b.classList.toggle('active', active); b.setAttribute('aria-selected', active ? 'true' : 'false'); });
      const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
      set('gcStudioModeLabel', d.label); set('gcStudioTitle', d.title); set('gcStudioText', d.text); set('gcStudioEta', d.eta); set('gcStudioCoverage', d.coverage);
      const image = document.getElementById('gcStudioImage'); if (image) { image.src = d.image; image.alt = `${mode} freight route`; }
      if (sync) { const rate = document.querySelector(`[data-rate-mode="${mode}"]`); rate?.click(); document.getElementById('gcRateExplorer')?.scrollIntoView({behavior:'smooth',block:'center'}); }
    };
    root.querySelectorAll('[data-studio-mode]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.studioMode)));
    root.querySelector('[data-studio-sync]')?.addEventListener('click', () => { const active = root.querySelector('[data-studio-mode].active')?.dataset.studioMode || 'air'; setMode(active, true); });
    document.querySelectorAll('.gc-trust-card.gc-transport-card').forEach(card => card.addEventListener('click', () => { const label = card.textContent.toLowerCase(); setMode(label.includes('sea') ? 'sea' : label.includes('land') ? 'land' : 'air'); root.scrollIntoView({behavior:'smooth',block:'center'}); }));
    setMode('air');
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
})();

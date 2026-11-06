(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const API = 'https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/website-analytics';
  const KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
  const compact = (v) => num(v).toLocaleString('en-US',{notation:'compact',maximumFractionDigits:1});
  const demo = {status:'estimated',source:'Operational preview',period:{start:'2026-06',end:'2026-11'},visits:[{date:'2026-06',value:640},{date:'2026-07',value:810},{date:'2026-08',value:960},{date:'2026-09',value:1180},{date:'2026-10',value:1430},{date:'2026-11',value:1610}],uniqueVisitors:[{value:1090}],bounceRate:[{value:42.6}],trafficSources:[{channel:'Direct',share:42},{channel:'Organic Search',share:28},{channel:'Social Media',share:18},{channel:'Referrals',share:12}],countries:[]};

  function metric(label, value, detail) { return `<article class="gv-metric"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(detail)}</small></article>`; }
  function render(data) {
    const visits = Array.isArray(data.visits) && data.visits.length ? data.visits.slice(-8) : demo.visits;
    const unique = data.uniqueVisitors?.[data.uniqueVisitors.length - 1]?.value ?? demo.uniqueVisitors[0].value;
    const bounce = data.bounceRate?.[data.bounceRate.length - 1]?.value ?? demo.bounceRate[0].value;
    const sources = Array.isArray(data.trafficSources) && data.trafficSources.length ? data.trafficSources.slice(0,6) : demo.trafficSources;
    const max = Math.max(...visits.map(x => num(x.value)), 1);
    $('#analyticsCards').innerHTML = metric('کۆی سەردان',compact(visits.reduce((a,x)=>a+num(x.value),0)),'Visits · monthly') + metric('سەردانکەری تاک',compact(unique),'Unique visitors') + metric('Bounce rate',`${num(bounce).toFixed(1)}%`,'Engagement signal') + metric('سەرچاوەی سەرەکی',sources[0]?.channel || 'Direct',`${num(sources[0]?.share).toFixed(1)}% share`);
    $('#periodLabel').textContent = `${data.period?.start || visits[0]?.date || '—'} → ${data.period?.end || visits.at(-1)?.date || '—'}`;
    $('#visitsChart').innerHTML = visits.map(x => `<div class="gv-bar-wrap" title="${esc(x.date)} · ${compact(x.value)}"><div class="gv-bar" style="height:${Math.max(5,num(x.value)/max*100)}%"></div><small>${esc(String(x.date||'').slice(5))}</small></div>`).join('');
    $('#sourcesList').innerHTML = sources.map(x => `<div class="gv-source"><div class="gv-source-label"><span>${esc(x.channel || x.name || 'Other')}</span><b>${num(x.share).toFixed(1)}%</b></div><div class="gv-source-track"><i style="width:${Math.min(100,num(x.share))}%"></i></div></div>`).join('');
  }
  async function loadAnalytics(event) {
    event?.preventDefault();
    const domain = $('#domainInput').value.trim().replace(/^https?:\/\//,'').replace(/\/.*$/,'');
    const state=$('#analyticsState'), message=$('#analyticsMessage');
    state.innerHTML='<i></i> بارکردن...'; message.textContent='داتا لە provider ـەوە وەردەگیرێت...';
    try {
      const response=await fetch(`${API}?domain=${encodeURIComponent(domain)}`,{headers:{apikey:KEY,Accept:'application/json'},cache:'no-store'});
      const data=await response.json();
      if(!response.ok || data.status==='error') throw new Error(data.error || `Analytics ${response.status}`);
      render(data); state.innerHTML=`<i></i> ${data.status==='live'?'Live · SimilarWeb':'Estimated preview'}`; message.textContent=data.status==='live'?'داتا بە سەرکەوتوویی نوێکرایەوە.':'Provider داتای تەواوی نەدا؛ preview ـی operational نیشان دەدرێت.';
    } catch(error) { render(demo); state.innerHTML='<i></i> Preview mode'; message.textContent=`Live provider بەردەست نییە؛ preview نیشان درا. ${error.message || ''}`; }
  }
  $('#analyticsForm')?.addEventListener('submit',loadAnalytics); loadAnalytics();

  const synth=window.speechSynthesis; let utterance=null;
  const localeMap={ckb:['ckb','ku','ar'],ar:['ar'],en:['en']};
  function chooseVoice(lang){ const voices=synth?.getVoices?.()||[]; const wanted=localeMap[lang]||['en']; return voices.find(v=>wanted.some(x=>v.lang.toLowerCase().startsWith(x))) || voices.find(v=>v.lang.toLowerCase().startsWith(lang)) || voices[0]; }
  function setVoiceValues(){ $('#voiceRateValue').textContent=`${$('#voiceRate').value}×`; $('#voicePitchValue').textContent=Number($('#voicePitch').value).toFixed(1); }
  $('#voiceRate')?.addEventListener('input',setVoiceValues); $('#voicePitch')?.addEventListener('input',setVoiceValues); setVoiceValues();
  $('#speakBtn')?.addEventListener('click',()=>{ if(!synth){$('#voiceMessage').textContent='ئەم browser ـە TTS پشتگیری ناکات.';return;} synth.cancel(); const lang=$('#voiceLanguage').value; utterance=new SpeechSynthesisUtterance($('#voiceText').value); utterance.lang=lang==='ckb'?'ku':lang; utterance.rate=Number($('#voiceRate').value); utterance.pitch=Number($('#voicePitch').value); const voice=chooseVoice(lang); if(voice) utterance.voice=voice; utterance.onstart=()=>$('#voiceMessage').textContent='دەنگەکە دەخوێندرێتەوە...'; utterance.onend=()=>$('#voiceMessage').textContent='تەواو بوو.'; utterance.onerror=()=>$('#voiceMessage').textContent='خوێندنەوەی دەنگ سەرکەوتوو نەبوو.'; synth.speak(utterance); });
  $('#pauseBtn')?.addEventListener('click',()=>{if(synth?.speaking){synth.paused?synth.resume():synth.pause();$('#voiceMessage').textContent=synth.paused?'وەستێنراوە.':'بەردەوامە...';}});
  $('#stopBtn')?.addEventListener('click',()=>{synth?.cancel();$('#voiceMessage').textContent='کۆتایی بە voice preview هێنرا.';});
  synth?.addEventListener?.('voiceschanged',()=>{});
})();

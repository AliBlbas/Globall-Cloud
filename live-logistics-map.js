/* Globall Cloud — real logistics map
 * Leaflet + OpenStreetMap + OSRM road routing.
 * Uses live shipment coordinates/events when available, with a production-safe
 * China -> Dubai -> Erbil fallback corridor when no shipment is selected.
 */
(function () {
  'use strict';

  const LEAFLET_JS = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
  const LEAFLET_CSS = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
  const OSRM = 'https://router.project-osrm.org/route/v1/driving/';
  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const ROUTE = {
    china: { lat: 23.1291, lng: 113.2644, label: 'چین · گوانگژۆ' },
    dubai: { lat: 25.2048, lng: 55.2708, label: 'دوبەی · هەڵگری بار' },
    erbil: { lat: 36.1911, lng: 44.0092, label: 'هەولێر · عێراق' },
  };

  function loadCss() {
    if (document.querySelector('link[data-gc-leaflet]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = LEAFLET_CSS; link.dataset.gcLeaflet = '1';
    document.head.appendChild(link);
  }
  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    loadCss();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = LEAFLET_JS; script.async = true;
      script.onload = () => resolve(window.L); script.onerror = reject; document.head.appendChild(script);
    });
  }
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
  }
  function greatCircle(a, b, steps = 80) {
    const toRad = (n) => n * Math.PI / 180, toDeg = (n) => n * 180 / Math.PI;
    const φ1 = toRad(a.lat), λ1 = toRad(a.lng), φ2 = toRad(b.lat), λ2 = toRad(b.lng);
    const d = 2 * Math.asin(Math.sqrt(Math.sin((φ2-φ1)/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin((λ2-λ1)/2)**2));
    if (!d) return [[a.lat, a.lng], [b.lat, b.lng]];
    const points = [];
    for (let i=0; i<=steps; i++) {
      const f=i/steps, A=Math.sin((1-f)*d)/Math.sin(d), B=Math.sin(f*d)/Math.sin(d);
      const x=A*Math.cos(φ1)*Math.cos(λ1)+B*Math.cos(φ2)*Math.cos(λ2);
      const y=A*Math.cos(φ1)*Math.sin(λ1)+B*Math.cos(φ2)*Math.sin(λ2);
      const z=A*Math.sin(φ1)+B*Math.sin(φ2);
      points.push([toDeg(Math.atan2(z, Math.sqrt(x*x+y*y))), toDeg(Math.atan2(y,x))]);
    }
    return points;
  }
  async function roadRoute(a,b){
    try{
      const res=await fetch(`${OSRM}${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson&steps=false`,{headers:{accept:'application/json'}});
      if(!res.ok) throw new Error('routing service unavailable');
      const geometry=(await res.json())?.routes?.[0]?.geometry?.coordinates;
      if(!Array.isArray(geometry)||geometry.length<2) throw new Error('no road geometry');
      return geometry.map(([lng,lat])=>[lat,lng]);
    }catch(_){ return greatCircle(a,b,60); }
  }
  function markerIcon(L,mode){
    const emoji=mode==='current'?'✈':mode==='hub'?'◇':'●';
    const cls=mode==='current'?'gc-marker-current':mode==='hub'?'gc-marker-hub':'gc-marker-node';
    return L.divIcon({className:'',html:`<div class="${cls}">${emoji}</div>`,iconSize:[34,34],iconAnchor:[17,17]});
  }
  async function fetchShipment(id){
    if(!id) return null;
    try{
      const headers={accept:'application/json'};
      const bearer=window.sb?.auth ? (await window.sb.auth.getSession())?.data?.session?.access_token : null;
      if(bearer) headers.authorization=`Bearer ${bearer}`;
      const res=await fetch(`${SUPABASE_URL}/functions/v1/public-track?id=${encodeURIComponent(id)}`,{headers,cache:'no-store'});
      if(!res.ok) return null;
      const payload=await res.json();
      return payload?.shipment ? payload : null;
    }catch(_){ return null; }
  }
  function coordsFromShipment(shipment){
    const origin=shipment?.origin_lat!=null&&shipment?.origin_lng!=null?{lat:Number(shipment.origin_lat),lng:Number(shipment.origin_lng),label:shipment.origin_key||ROUTE.china.label}:ROUTE.china;
    const dest=shipment?.dest_lat!=null&&shipment?.dest_lng!=null?{lat:Number(shipment.dest_lat),lng:Number(shipment.dest_lng),label:shipment.dest_key||ROUTE.erbil.label}:ROUTE.erbil;
    const current=shipment?.current_lat!=null&&shipment?.current_lng!=null?{lat:Number(shipment.current_lat),lng:Number(shipment.current_lng),label:shipment.current_location_label||'بار لە ڕێگادایە'}:null;
    return {origin,dest,current};
  }
  function setInfo(root, shipment, origin, dest, current){
    const info=root.querySelector('.gc-map-info b'); const sub=root.querySelector('.gc-map-info small');
    if(info) info.textContent=`${origin.label} → ${dest.label}`;
    if(sub){ const eta=shipment?.eta?new Date(shipment.eta):null; sub.textContent=eta&&!Number.isNaN(eta.valueOf())?`ETA · ${eta.toLocaleDateString('ckb-IQ')}`:`شوێنی ئێستا · ${current?.label||'لە ڕێگادایە'}`; }
  }
  async function initRouteMap(root,payload){
    const L=await loadLeaflet(); if(!root||root.dataset.mapReady==='1') return;
    root.dataset.mapReady='1';
    const shipment=payload?.shipment||payload||null;
    root.innerHTML='<div class="gc-map" aria-label="نەخشەی ڕاستەقینەی گەیاندنی بار"></div><div class="gc-map-overlay"><div class="gc-map-live"><span class="gc-live-dot"></span><span>LIVE TRACKING</span></div><div class="gc-map-info"><b>China → Dubai → Erbil</b><small>نەخشەی ڕاستەقینەی مسیر</small></div></div><div class="gc-map-legend"><span><i class="gc-leg-dot gc-leg-current"></i> شوێنی ئێستا</span><span><i class="gc-leg-line"></i> ڕێگا</span><span><i class="gc-leg-hub"></i> هاب</span></div>';
    const map=L.map(root.querySelector('.gc-map'),{zoomControl:false,attributionControl:true,scrollWheelZoom:false,dragging:true,tap:true,minZoom:2,maxZoom:16});
    L.control.zoom({position:'bottomright'}).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors',detectRetina:true}).addTo(map);

    const {origin,dest,current}=coordsFromShipment(shipment); const addMarker=(point,mode)=>{const m=L.marker([point.lat,point.lng],{icon:markerIcon(L,mode),keyboard:false}).addTo(map);m.bindTooltip(esc(point.label),{direction:'top',offset:[0,-14],className:'gc-map-tooltip',opacity:.96});return m;};
    addMarker(origin,'node'); addMarker(ROUTE.dubai,'hub'); addMarker(dest,'node');
    const leg1=greatCircle(origin,ROUTE.dubai,90); const leg2=await roadRoute(ROUTE.dubai,dest);
    L.polyline(leg1,{color:'#39e4f1',weight:3,opacity:.82,dashArray:'7 8'}).addTo(map);
    L.polyline(leg2,{color:'#ffc15c',weight:4,opacity:.88,lineCap:'round',lineJoin:'round'}).addTo(map);

    let currentMarker;
    if(current) currentMarker=addMarker(current,'current');
    else {
      const idx=Math.max(0,Math.min(5,Number(shipment?.current_step_index??2))); const t=idx/5;
      const fallback=idx<3?leg1[Math.floor(t*(leg1.length-1))]:leg2[Math.floor(((t-.4)/.6)*(leg2.length-1))]||leg2[Math.floor(leg2.length/2)];
      if(fallback) currentMarker=addMarker({lat:fallback[0],lng:fallback[1],label:'شوێنی پێشبینیکراوی بار'},'current');
    }

    // Public event markers provide a visual history and photo-ready timeline source.
    const events=Array.isArray(payload?.events)?payload.events:[];
    for(const ev of events){
      const lat=Number(ev.lat),lng=Number(ev.lng); if(!Number.isFinite(lat)||!Number.isFinite(lng)) continue;
      const m=addMarker({lat,lng,label:ev.title||ev.location_label||ev.status_key},'node');
      const date=ev.occurred_at?new Date(ev.occurred_at):null;
      m.bindPopup(`<b>${esc(ev.title||ev.status_key||'Tracking event')}</b><br><span>${esc(ev.location_label||'')}</span>${date&&!Number.isNaN(date.valueOf())?`<br><small>${esc(date.toLocaleString('ckb-IQ'))}</small>`:''}`);
    }

    map.fitBounds([origin,ROUTE.dubai,dest].map(p=>[p.lat,p.lng]),{padding:[22,22]}); setTimeout(()=>map.invalidateSize(),250); setInfo(root,shipment,origin,dest,current);

    const sb=window.sb||window.supabase;
    if(sb&&shipment?.id){
      const channel=sb.channel(`gc-public-map-${shipment.id}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'shipments',filter:`id=eq.${shipment.id}`},payload=>{
        const p=payload?.new||{},lat=Number(p.current_lat),lng=Number(p.current_lng);
        if(Number.isFinite(lat)&&Number.isFinite(lng)){if(!currentMarker)currentMarker=addMarker({lat,lng,label:p.current_location_label||'شوێنی ئێستا'},'current');else currentMarker.setLatLng([lat,lng]);currentMarker.setTooltipContent(esc(p.current_location_label||'شوێنی ئێستا'));}
        const info=root.querySelector('.gc-map-info small'); if(info)info.textContent=p.eta?`ETA · ${new Date(p.eta).toLocaleDateString('ckb-IQ')}`:'نوێکراوەتەوە بە Realtime';
      }).subscribe(); root._gcChannel=channel;
    }
  }
  async function boot(){
    const roots=Array.from(document.querySelectorAll('.route-map')); if(!roots.length)return;
    const id=new URLSearchParams(location.search).get('tracking')||localStorage.getItem('gc-last-tracking-id')||'';
    const payload=id?await fetchShipment(id):null;
    for(const root of roots){try{await initRouteMap(root,payload);}catch(error){root.classList.add('gc-map-fallback');root.innerHTML='<div class="gc-map-error"><b>نەخشەکە بەردەست نەبوو</b><small>دواتر هەوڵبدەوە؛ داتا و شوێنی بار پارێزراون.</small></div>';console.error('Globall Cloud live map:',error);}}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

#!/usr/bin/env node
/* Read-only public homepage mobile test. Supabase requests are held while the first viewport is measured. */
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const site=(process.env.GC_SITE_URL||'https://globall-cloud.pages.dev').replace(/\/$/,'');
const root=process.env.PLAYWRIGHT_PACKAGE;
if(!root)throw new Error('PLAYWRIGHT_PACKAGE is required');
const {chromium,webkit}=await import(pathToFileURL(resolve(root,'index.mjs')).href);
const failures=[];
for(const engine of [{name:'Chromium',type:chromium},{name:'WebKit',type:webkit}]){
  const browser=await engine.type.launch({headless:true,args:engine.name==='Chromium'?['--no-sandbox','--disable-dev-shm-usage']:[]});
  try{
    const context=await browser.newContext({viewport:{width:375,height:812},screen:{width:375,height:812},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
    const page=await context.newPage(), pageErrors=[], assetErrors=[];
    let paused=0,release;
    const gate=new Promise(resolveGate=>{release=resolveGate});
    page.on('pageerror',e=>pageErrors.push(String(e?.stack||e).slice(0,700)));
    page.on('response',r=>{try{const u=new URL(r.url());if(u.origin===site&&r.status()>=400&&/\.(js|css)(\?|$)/i.test(u.pathname+u.search))assetErrors.push({url:r.url(),status:r.status()})}catch{}});
    await page.route('https://ahslifnthiwfkmaswjno.supabase.co/**',async route=>{paused++;await gate;try{await route.abort()}catch{}});
    let navigationError='';
    try{
      await page.goto(site+'/?mobile-visual-smoke=20261125',{waitUntil:'domcontentloaded',timeout:45000});
      await page.waitForFunction(()=>typeof window.route==='function'&&document.querySelectorAll('#gcApp .gc-transport-studio .gc-studio-tab').length===3,undefined,{timeout:20000});
      await page.waitForFunction(()=>{const x=document.querySelector('link[data-gc-public-customer-elite="gc-public-customer-elite-4"]');return !!(x&&x.sheet)},undefined,{timeout:12000});
    }catch(e){navigationError=String(e?.message||e).slice(0,800)}
    const state=await page.evaluate(()=>{
      const visible=e=>{if(!e)return false;const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>.05&&r.width>0&&r.height>0};
      const tabs=[...document.querySelectorAll('#gcApp .gc-transport-studio .gc-studio-tab')].map(t=>{
        const copy=t.querySelector(':scope > span:nth-of-type(3)'),b=copy?.querySelector('b'),small=copy?.querySelector('small');
        return {title:b?.textContent.trim()||'',description:small?.textContent.trim()||'',titleVisible:visible(b),descriptionVisible:visible(small),titleFont:b?getComputedStyle(b).fontSize:'',descriptionFont:small?getComputedStyle(small).fontSize:''};
      });
      const cards=[...document.querySelectorAll('#gcApp .gc-launchpad-card')].map(c=>{
        const b=c.querySelector('.gc-launchpad-card-copy b'),small=c.querySelector('.gc-launchpad-card-copy small');
        return {title:b?.textContent.trim()||'',description:small?.textContent.trim()||'',titleVisible:visible(b),descriptionVisible:visible(small)};
      });
      const guard=document.querySelector('link[data-gc-public-customer-elite="gc-public-customer-elite-4"]');
      return {language:document.documentElement.lang,direction:document.documentElement.dir,homepageVisible:visible(document.querySelector('#gcApp')),guardLoaded:!!(guard&&guard.sheet),tabs,cards,viewportWidth:document.documentElement.clientWidth,overflow:Math.max(0,Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-document.documentElement.clientWidth)};
    });
    release();
    const expected=['Air Freight','Sea Freight','Land Freight'];
    const routePass=expected.every(x=>state.tabs.some(t=>t.title===x))&&state.tabs.every(t=>t.titleVisible&&t.descriptionVisible&&parseFloat(t.titleFont)>=10&&parseFloat(t.descriptionFont)>=9);
    const cardsPass=state.cards.length>=3&&state.cards.every(c=>c.titleVisible&&c.descriptionVisible);
    const ok=state.language==='ckb'&&state.direction==='rtl'&&state.homepageVisible&&state.guardLoaded&&routePass&&cardsPass&&state.overflow<=2&&!navigationError&&!pageErrors.length&&!assetErrors.length;
    console.log(JSON.stringify({engine:engine.name,ok,supabaseRequestsPaused:paused,state,navigationError,pageErrors,assetErrors},null,2));
    if(!ok){failures.push(engine.name);try{await page.screenshot({path:`public-home-mobile-failure-${engine.name}.png`,fullPage:true})}catch{}}
    await context.close();
  }finally{await browser.close()}
}
if(failures.length){console.error('Public mobile UI failed in: '+failures.join(', '));process.exit(1)}
console.log('PASS public homepage route labels, descriptions and quick actions on Chromium/WebKit at 375px.');

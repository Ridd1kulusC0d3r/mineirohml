const { chromium } = require('playwright');
(async()=>{
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const base='http://localhost:8765/';
const p = await b.newPage({viewport:{width:1440,height:900}});
const errs=[]; p.on('console',m=>{if(m.type()==='error'&&!/ERR_TUNNEL|fonts\.g/.test(m.text()))errs.push(m.text())}); p.on('pageerror',e=>errs.push('PAGEERR '+e));
p.on('requestfailed',r=>{ if(!/fonts\.g/.test(r.url())) errs.push('REQFAIL '+r.url())});
const pages=['index.html','docs/index.html','docs/instalacao.html','docs/primeiro-scan.html','docs/presets.html','docs/intelligence-view.html','docs/grafo.html','docs/exportacao-diff.html','docs/fluxo-do-analista.html','docs/fluxos.html','docs/como-decide.html','docs/detectores.html','docs/api-seguranca.html','docs/faq.html','docs/uso-responsavel.html','docs/glossario.html','docs/solucao-de-problemas.html','404.html'];
const seen=new Set();
for(const u of pages){ const r=await p.goto(base+u); if(r.status()!==200) errs.push('HTTP '+r.status()+' '+u);
  const links=await p.$$eval('a[href]',as=>as.map(a=>a.getAttribute('href')).filter(h=>h&&!/^(https?:|#|data:|mailto)/.test(h)));
  for(const l of links){ const abs=new URL(l,base+u).pathname.slice(1); if(!seen.has(abs)){seen.add(abs); const rr=await p.request.get(base+abs); if(rr.status()!==200) errs.push('BROKEN '+l+' from '+u)}}
  const sw=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth); if(sw) errs.push('H-SCROLL '+u);
}
// docs: busca, fluxo, tema
await p.goto(base+'docs/fluxos.html'); await p.waitForSelector('.fn');
await p.click('[data-flow="preset"]'); await p.click('.walk'); await p.waitForTimeout(1200);
await p.screenshot({path:'/tmp/d-fluxos.png'});
await p.goto(base+'docs/instalacao.html'); await p.fill('#q','soft'); await p.waitForTimeout(600);
await p.screenshot({path:'/tmp/d-busca.png'});
console.log('search results', await p.$$eval('#results li',l=>l.length));
await p.click('[data-theme-toggle]'); await p.screenshot({path:'/tmp/d-tema.png'});
await p.goto(base+'docs/presets.html'); await p.screenshot({path:'/tmp/d-presets.png',fullPage:true});
// guia
await p.goto(base+'index.html'); await p.waitForTimeout(800);
await p.click('[data-go="3"]'); await p.click('#scan'); await p.waitForTimeout(3800);
await p.click('[data-go="4"]'); await p.click('[data-sv="real"]'); await p.waitForTimeout(3200);
await p.screenshot({path:'/tmp/i-c4.png'});
await p.click('.fn',{timeout:3000}).catch(()=>{});
await p.setViewportSize({width:390,height:844}); await p.goto(base+'docs/intelligence-view.html'); await p.waitForTimeout(500); await p.screenshot({path:'/tmp/d-mobile.png',fullPage:false});
console.log('errs',errs);
await b.close();})();

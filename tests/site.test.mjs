import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';

const CA='0x60555Ab88a0CAaf893Ab284C1332c9D0A05Af222';
const pair='0x9b5e262cf9bb04869ab40b19af91d2dc85761722';
const valid={token:{address:CA,chain:'base',pairToken:pair,chainState:{pairSymbol:'NOCK',pairDecimals:16},rewardsPair:'73269344452608057111',updatedAt:'2026-09-13T07:01:49.043Z'}};
let moduleId=0;
const fresh=async()=>(await import('../dist/server/index.js?test='+moduleId++)).default;

test('page, referenced assets, MIME types and method handling',async()=>{
 const app=await fresh();
 const response=await app.fetch(new Request('https://test.invalid/'));
 assert.equal(response.status,200);
 const html=await response.text();
 assert.ok(html.includes(CA));assert.ok(!html.includes('meme-card'));
 assert.ok(html.includes('The trading tax.'));
 assert.ok(html.includes('Holders receive that tax automatically as'));
 assert.ok(html.includes('https://basestonk.io/tokens/'+CA));
 assert.ok(html.includes('https://x.com/zkat_nock'));
 assert.ok(!html.includes('href="/flywheel"'));assert.ok(!html.includes('The cat is the'));
 for(const [,path] of html.matchAll(/(?:src|href)="(\/[^\"]*)"/g)){
  const r=await app.fetch(new Request('https://test.invalid'+path));
  assert.equal(r.status,200,path);assert.ok((await r.arrayBuffer()).byteLength>0);
  if(path.endsWith('.webp'))assert.equal(r.headers.get('Content-Type'),'image/webp');
 }
 assert.equal((await app.fetch(new Request('https://test.invalid/absent'))).status,404);
 assert.equal((await app.fetch(new Request('https://test.invalid/',{method:'POST'}))).status,405);
 assert.equal(await (await app.fetch(new Request('https://test.invalid/',{method:'HEAD'}))).text(),'');
 assert.ok(existsSync('licenses/Inter-OFL.txt'));assert.ok(existsSync('licenses/Outfit-OFL.txt'));
 const flywheel=await app.fetch(new Request('https://test.invalid/flywheel'));
 assert.equal(flywheel.status,200);
 const note=await flywheel.text();
 assert.ok(note.includes('The cat is the'));assert.ok(note.includes('noindex'));assert.ok(note.includes('https://x.com/zkat_nock'));
 assert.ok(note.includes('You cannot buy $ZKAT without buying NOCK'));
 assert.equal((await app.fetch(new Request('https://test.invalid/flywheel/'))).status,200);
 assert.equal(await (await app.fetch(new Request('https://test.invalid/flywheel',{method:'HEAD'}))).text(),'');
});

test('server validates reward identity, preserves precision and caches successful responses',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async url=>{calls++;assert.ok(url.includes(CA));return Response.json(valid)};
 try{
  const app=await fresh();
  const req=()=>new Request('https://test.invalid/api/rewards');
  const responses=await Promise.all([app.fetch(req()),app.fetch(req())]);
  const data=await responses[0].json();
  assert.equal(data.totalRaw,valid.token.rewardsPair);assert.equal(data.decimals,16);assert.equal(data.symbol,'NOCK');assert.equal(calls,1);
  await app.fetch(req());assert.equal(calls,1);
  globalThis.fetch=async()=>Response.json({...valid,token:{...valid.token,pairToken:'0x0000000000000000000000000000000000000000'}});
  const invalid=await (await fresh()).fetch(req());assert.equal(invalid.status,503);assert.deepEqual(await invalid.json(),{error:'Rewards temporarily unavailable'});
  globalThis.fetch=async()=>{throw new Error('offline')};
  assert.equal((await (await fresh()).fetch(req())).status,503);
 }finally{globalThis.fetch=original}
});

test('only new observed increases trigger extra drips, including smallest units',async()=>{
 const elements=new Map();const el=id=>{if(!elements.has(id))elements.set(id,{textContent:'',dataset:{},addEventListener(){}});return elements.get(id)};
 const events=[];let next;
 const context=vm.createContext({document:{hidden:false,getElementById:el,querySelector:el,addEventListener(){}},window:{dispatchEvent:e=>{if(e.type==='zkat:reward')events.push(e)}},navigator:{},CustomEvent:class{constructor(type,data={}){this.type=type;this.detail=data.detail}},AbortSignal,setTimeout:()=>1,clearTimeout(){},setInterval(){},fetch:async()=>{if(next instanceof Error)throw next;return{ok:true,json:async()=>next}},Date,BigInt});
 vm.runInContext(readFileSync('public/app.js','utf8').replace('\nrefresh();','\n'),context);
 const base={contract:CA,symbol:'NOCK',decimals:16,updatedAt:valid.token.updatedAt};
 const refresh=()=>vm.runInContext('refresh()',context);
 for(const raw of ['1000000000000000000','1000000000000000000','1000000000000000001','999999999999999999','1000000000000000001']){next={...base,totalRaw:raw};await refresh()}
 assert.equal(events.length,1);assert.equal(events[0].type,'zkat:reward');assert.equal(events[0].detail.raw,'1');
 assert.equal(el('total').textContent,'100.00');assert.equal(el('connection').dataset.state,'live');
 next=new Error('offline');await refresh();assert.equal(events.length,1);assert.equal(el('connection').dataset.state,'offline');assert.equal(el('total').textContent,'100.00');
 next={...base,totalRaw:'2000000000000000000',updatedAt:'2026-09-12T07:01:49Z'};await refresh();assert.equal(events.length,1);
 next={...base,totalRaw:'1000000000000000002'};await refresh();assert.equal(events.length,2);assert.equal(el('connection').dataset.state,'live');
});

test('vesting records validate independently from rewards and use token decimals',async()=>{
 const original=globalThis.fetch;
 const creator='0x1111111111111111111111111111111111111111';
 const vault='0x2222222222222222222222222222222222222222';
 const state={...valid.token.chainState,block:123,vault,beneficiary:creator,vesting:{schedules:[{total:'100000000000000000000',released:'1000000000000000000',start:1789255717,duration:2592000,cliff:0}]}};
 let fixture={token:{...valid.token,generation:'v6',creator,chainState:state}};
 globalThis.fetch=async()=>Response.json(fixture);
 try{
  const request=()=>new Request('https://test.invalid/api/rewards');
  const data=await (await (await fresh()).fetch(request())).json();
  assert.equal(data.devLock.status,'reported');assert.equal(data.devLock.decimals,18);assert.equal(data.decimals,16);assert.equal(data.devLock.schedules[0].end,1791847717);
  fixture={token:{...fixture.token,chainState:{...state,vesting:{schedules:[{...state.vesting.schedules[0],released:'99999999999999999999999'}]}}}};
  const bad=await (await fresh()).fetch(request());assert.equal(bad.status,200);assert.equal((await bad.json()).devLock.status,'unavailable');
  fixture={token:{...fixture.token,chainState:{...state,vault:null,vesting:{schedules:[]}}}};
  assert.equal((await (await (await fresh()).fetch(request())).json()).devLock.status,'none');
 }finally{globalThis.fetch=original}
});

test('tax rates and ZKAT payouts validate independently from NOCK rewards',async()=>{
 const original=globalThis.fetch;
 const request=()=>new Request('https://test.invalid/api/rewards');
 try{
  globalThis.fetch=async()=>Response.json({token:{...valid.token,buyTaxBps:100,sellTaxBps:100,rewardsToken:'12891106253369609548515358'}});
  const data=await (await (await fresh()).fetch(request())).json();
  assert.equal(data.tax.status,'reported');assert.equal(data.tax.buyBps,100);assert.equal(data.tax.sellBps,100);
  assert.equal(data.tax.tokenRewards.symbol,'ZKAT');assert.equal(data.tax.tokenRewards.decimals,18);
  assert.equal(data.tax.tokenRewards.totalRaw,'12891106253369609548515358');assert.equal(data.symbol,'NOCK');assert.equal(data.decimals,16);
  globalThis.fetch=async()=>Response.json({token:{...valid.token,buyTaxBps:100,sellTaxBps:100,rewardsToken:'nope'}});
  const noToken=await (await (await fresh()).fetch(request())).json();
  assert.equal(noToken.tax.status,'reported');assert.equal(noToken.tax.tokenRewards,null);assert.equal(noToken.totalRaw,valid.token.rewardsPair);
  globalThis.fetch=async()=>Response.json({token:{...valid.token,buyTaxBps:-1,sellTaxBps:100}});
  const bad=await (await (await fresh()).fetch(request())).json();
  assert.equal(bad.tax.status,'unavailable');assert.equal(bad.totalRaw,valid.token.rewardsPair);
 }finally{globalThis.fetch=original}
});

test('tax UI fills live rates, ZKAT totals, and stale/unavailable states',()=>{
 const elements=new Map();
 const el=id=>{if(!elements.has(id))elements.set(id,{textContent:'',dataset:{},addEventListener(){}});return elements.get(id)};
 const events=[];let next;
 const context=vm.createContext({document:{hidden:false,getElementById:el,querySelector:el,addEventListener(){}},window:{dispatchEvent:e=>{if(e.type==='zkat:reward')events.push(e)}},navigator:{},CustomEvent:class{constructor(type,data={}){this.type=type;this.detail=data.detail}},AbortSignal,setTimeout:()=>1,clearTimeout(){},setInterval(){},fetch:async()=>{if(next instanceof Error)throw next;return{ok:true,json:async()=>next}},Date,BigInt});
 vm.runInContext(readFileSync('public/app.js','utf8').replace('\nrefresh();','\n'),context);
 const refresh=()=>vm.runInContext('refresh()',context);
 return (async()=>{
  next={contract:CA,symbol:'NOCK',decimals:16,totalRaw:'1000000000000000000',updatedAt:valid.token.updatedAt,tax:{status:'reported',buyBps:100,sellBps:100,tokenRewards:{symbol:'ZKAT',decimals:18,totalRaw:'12891106253369609548515358'}}};
  await refresh();
  assert.equal(el('tax-state').textContent,'LIVE TAX');assert.equal(el('tax-buy').textContent,'1%');assert.equal(el('tax-sell').textContent,'1%');
  assert.equal(el('tax-nock').textContent,'100.00');assert.equal(el('tax-zkat').textContent,'12,891,106.25');assert.equal(el('total').textContent,'100.00');assert.equal(events.length,0);
  next={...next,tax:{status:'reported',buyBps:100,sellBps:100,tokenRewards:{symbol:'ZKAT',decimals:18,totalRaw:'22891106253369609548515358'}}};
  await refresh();
  assert.equal(events.length,0);assert.equal(el('tax-nock').textContent,'100.00');assert.equal(el('tax-zkat').textContent,'22,891,106.25');
  next=new Error('offline');await refresh();
  assert.equal(el('tax-state').textContent,'STALE DATA');assert.equal(el('tax-nock').textContent,'100.00');assert.equal(el('tax-zkat').textContent,'22,891,106.25');
  next={contract:CA,symbol:'NOCK',decimals:16,totalRaw:'1000000000000000000',updatedAt:'2026-09-13T08:01:49.043Z',tax:{status:'unavailable'}};
  await refresh();
  assert.equal(el('tax-state').textContent,'UNAVAILABLE');assert.equal(el('tax-buy').textContent,'—');assert.equal(el('tax-nock').textContent,'—');assert.equal(el('total').textContent,'100.00');
 })();
});

test('vesting UI distinguishes active, ended, unavailable and stale states',()=>{
 const elements=new Map(),handlers=new Map();
 const node=()=>({textContent:'',hidden:false,style:{},children:[],parts:new Map(),append(v){this.children.push(v)},replaceChildren(){this.children=[]},setAttribute(){},querySelector(k){if(!this.parts.has(k))this.parts.set(k,node());return this.parts.get(k)}});
 const el=id=>{if(!elements.has(id))elements.set(id,node());return elements.get(id)};
 const context=vm.createContext({document:{getElementById:el,createElement:node},window:{addEventListener:(type,fn)=>handlers.set(type,fn)},Date,BigInt});
 vm.runInContext(readFileSync('public/locks.js','utf8'),context);
 const v={status:'reported',decimals:18,creator:'0x1111111111111111111111111111111111111111',vault:'0x2222222222222222222222222222222222222222',beneficiary:'0x1111111111111111111111111111111111111111',block:123,schedules:[{totalRaw:'100000000000000000000',releasedRaw:'1000000000000000000',start:1789255717,duration:2592000,cliff:0,end:1791847717}]};
 const emit=(devLock,time)=>handlers.get('zkat:snapshot')({detail:{devLock,updatedAt:new Date(time*1000).toISOString()}});
 emit(v,1789256317);assert.equal(el('lock-state').textContent,'VESTING ACTIVE');assert.equal(el('lock-content').hidden,false);assert.equal(el('lock-allocation').textContent,'100.00');assert.equal(el('lock-released').textContent,'1.00');assert.equal(el('dev-wallet').href,'https://basescan.org/address/'+v.creator);
 handlers.get('zkat:offline')();assert.equal(el('lock-state').textContent,'STALE DATA');assert.equal(el('lock-content').hidden,false);
 emit(v,1791847718);assert.equal(el('lock-state').textContent,'SCHEDULE ENDED');
 emit({status:'unavailable'},1791847718);assert.equal(el('lock-state').textContent,'UNAVAILABLE');assert.equal(el('lock-content').hidden,true);
});

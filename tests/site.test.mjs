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
 for(const [,path] of html.matchAll(/(?:src|href)="(\/[^\"]*)"/g)){
  const r=await app.fetch(new Request('https://test.invalid'+path));
  assert.equal(r.status,200,path);assert.ok((await r.arrayBuffer()).byteLength>0);
  if(path.endsWith('.webp'))assert.equal(r.headers.get('Content-Type'),'image/webp');
 }
 assert.equal((await app.fetch(new Request('https://test.invalid/absent'))).status,404);
 assert.equal((await app.fetch(new Request('https://test.invalid/',{method:'POST'}))).status,405);
 assert.equal(await (await app.fetch(new Request('https://test.invalid/',{method:'HEAD'}))).text(),'');
 assert.ok(existsSync('licenses/Inter-OFL.txt'));assert.ok(existsSync('licenses/Outfit-OFL.txt'));
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
 const context=vm.createContext({document:{hidden:false,getElementById:el,querySelector:el,addEventListener(){}},window:{dispatchEvent:e=>events.push(e)},navigator:{},CustomEvent:class{constructor(type,data){this.type=type;this.detail=data.detail}},AbortSignal,setTimeout:()=>1,clearTimeout(){},setInterval(){},fetch:async()=>{if(next instanceof Error)throw next;return{ok:true,json:async()=>next}},Date,BigInt});
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

// The build embeds the small page and its image. No database or account is needed.
const CONTRACT = '0x60555Ab88a0CAaf893Ab284C1332c9D0A05Af222';
const NOCK = '0x9b5e262cf9bb04869ab40b19af91d2dc85761722';
const SOURCE = 'https://api.basestonk.io/api/launchpad/tokens/' + CONTRACT + '?chain=base';
let cached = null;
let inFlight = null;
function readDevLock(token) {
  // BaseStonk v6 launch tokens use 18 decimals; NOCK reward decimals are separate.
  const address = value => typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value) && !/^0x0{40}$/.test(value);
  const raw = value => typeof value === 'string' && /^\d{1,100}$/.test(value);
  const seconds = value => Number.isSafeInteger(value) && value >= 0 && value <= 100000000000;
  try {
    const state = token.chainState, vesting = state?.vesting;
    if (token.generation !== 'v6' || !address(token.creator) || !state || !vesting || !Array.isArray(vesting.schedules) || vesting.schedules.length > 128) throw new Error('Missing vesting data');
    if (state.vault === null && vesting.schedules.length === 0) return {status:'none',creator:token.creator};
    if (!address(state.vault) || !address(state.beneficiary) || !vesting.schedules.length) throw new Error('Missing vault');
    const schedules = vesting.schedules.map(s => {
      if (!raw(s.total) || !raw(s.released) || BigInt(s.released) > BigInt(s.total) || !seconds(s.start) || !seconds(s.duration) || !seconds(s.cliff) || !seconds(s.start+s.duration)) throw new Error('Invalid schedule');
      return {totalRaw:s.total,releasedRaw:s.released,start:s.start,duration:s.duration,cliff:s.cliff,end:s.start+s.duration};
    });
    return {status:'reported',creator:token.creator,vault:state.vault,beneficiary:state.beneficiary,decimals:18,schedules,block:Number.isSafeInteger(state.block)?state.block:null};
  } catch { return {status:'unavailable'}; }
}
function readTax(token) {
  // Buy/sell tax is immutable after launch. ZKAT holder payouts use 18 token decimals.
  const bps = value => Number.isInteger(value) && value >= 0 && value <= 1000;
  try {
    if (!bps(token.buyTaxBps) || !bps(token.sellTaxBps)) throw new Error('Missing tax');
    let tokenRewards = null;
    if (typeof token.rewardsToken === 'string' && /^\d{1,100}$/.test(token.rewardsToken)) {
      tokenRewards = {symbol:'ZKAT',totalRaw:token.rewardsToken,decimals:18};
    }
    return {status:'reported',buyBps:token.buyTaxBps,sellBps:token.sellTaxBps,tokenRewards};
  } catch { return {status:'unavailable'}; }
}
async function readRewards() {
  if (cached && Date.now() - cached.time < 10000) return cached.value;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const response = await fetch(SOURCE, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('Upstream unavailable');
    const { token } = await response.json();
    const decimals = token?.chainState?.pairDecimals;
    if (token?.address?.toLowerCase() !== CONTRACT.toLowerCase() || token.chain !== 'base' || token.pairToken?.toLowerCase() !== NOCK || token.chainState?.pairSymbol !== 'NOCK' || typeof token.rewardsPair !== 'string' || !/^\d+$/.test(token.rewardsPair) || !Number.isInteger(decimals) || decimals < 0 || decimals > 36 || !Number.isFinite(Date.parse(token.updatedAt))) throw new Error('Unverified rewards data');
    // BaseStonk's token page maps rewardsPair / rewardsToken to "Paid to holders".
    // This reports those platform metrics, not a separate audit of individual wallet receipts.
    const value = { contract: CONTRACT, symbol: 'NOCK', totalRaw: token.rewardsPair, decimals, updatedAt: token.updatedAt, source: 'BaseStonk', devLock:readDevLock(token), tax:readTax(token) };
    cached = { time: Date.now(), value };
    return value;
  })();
  try { return await inFlight; } finally { inFlight = null; }
}
export default {
  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed', {status:405,headers:{Allow:'GET, HEAD'}});
    if (path === '/api/rewards') {
      try { return Response.json(await readRewards(), {headers:{'Cache-Control':'no-store'}}); }
      catch { return Response.json({error:'Rewards temporarily unavailable'}, {status:503,headers:{'Cache-Control':'no-store'}}); }
    }
    const assetKey = path === '/' ? '/index.html' : (path === '/flywheel' || path === '/flywheel/' ? '/flywheel.html' : path);
    const asset = ASSETS[assetKey];
    if (!asset) return new Response('Not found', {status:404});
    const headers = { 'Content-Type':asset.type,'Cache-Control':/\.(png|webp|jpeg)$/.test(path)?'public, max-age=86400':'public, max-age=60','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin' };
    return new Response(request.method === 'HEAD' ? null : Uint8Array.from(atob(asset.data), c=>c.charCodeAt(0)), {headers});
  }
};

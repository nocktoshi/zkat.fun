// The build embeds the small page and its image. No database or account is needed.
const CONTRACT = '0x60555Ab88a0CAaf893Ab284C1332c9D0A05Af222';
const NOCK = '0x9b5e262cf9bb04869ab40b19af91d2dc85761722';
const SOURCE = 'https://api.basestonk.io/api/launchpad/tokens/' + CONTRACT + '?chain=base';
let cached = null;
let inFlight = null;
async function readRewards() {
  if (cached && Date.now() - cached.time < 10000) return cached.value;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const response = await fetch(SOURCE, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('Upstream unavailable');
    const { token } = await response.json();
    const decimals = token?.chainState?.pairDecimals;
    if (token?.address?.toLowerCase() !== CONTRACT.toLowerCase() || token.chain !== 'base' || token.pairToken?.toLowerCase() !== NOCK || token.chainState?.pairSymbol !== 'NOCK' || typeof token.rewardsPair !== 'string' || !/^\d+$/.test(token.rewardsPair) || !Number.isInteger(decimals) || decimals < 0 || decimals > 36 || !Number.isFinite(Date.parse(token.updatedAt))) throw new Error('Unverified rewards data');
    // BaseStonk's token page maps rewardsPair to "Paid to holders".
    // This reports that platform metric, not a separate audit of individual wallet receipts.
    const value = { contract: CONTRACT, symbol: 'NOCK', totalRaw: token.rewardsPair, decimals, updatedAt: token.updatedAt, source: 'BaseStonk' };
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
    const asset = ASSETS[path === '/' ? '/index.html' : path];
    if (!asset) return new Response('Not found', {status:404});
    const headers = { 'Content-Type':asset.type,'Cache-Control':/\.(png|webp|jpeg)$/.test(path)?'public, max-age=86400':'public, max-age=60','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin' };
    return new Response(request.method === 'HEAD' ? null : Uint8Array.from(atob(asset.data), c=>c.charCodeAt(0)), {headers});
  }
};

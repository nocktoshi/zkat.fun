const CA = '0x60555Ab88a0CAaf893Ab284C1332c9D0A05Af222';
const total = document.getElementById('total');
const status = document.getElementById('status');
let lastSuccess = null;
let previous = null;
let rewardTimer;
let loading = false;
let copyTimer;
function formatUnits(raw, decimals) {
  const digits = BigInt(raw).toString().padStart(decimals + 1, '0');
  const integer = decimals ? digits.slice(0, -decimals) : digits;
  const fraction = decimals ? digits.slice(-decimals).slice(0, 2).padEnd(2, '0') : '00';
  return BigInt(integer).toLocaleString('en-US') + '.' + fraction;
}
function formatBps(bps) {
  return (bps / 100).toLocaleString('en-US', { maximumFractionDigits: 2 }) + '%';
}
function renderTax(data, stale) {
  const state = document.getElementById('tax-state');
  const updated = document.getElementById('tax-updated');
  const tax = data?.tax;
  if (stale) {
    state.textContent = lastSuccess ? 'STALE DATA' : 'UNAVAILABLE';
    return;
  }
  if (tax?.status !== 'reported' || !Number.isInteger(tax.buyBps) || !Number.isInteger(tax.sellBps) || tax.buyBps < 0 || tax.buyBps > 1000 || tax.sellBps < 0 || tax.sellBps > 1000) {
    state.textContent = 'UNAVAILABLE';
    document.getElementById('tax-buy').textContent = '—';
    document.getElementById('tax-sell').textContent = '—';
    document.getElementById('tax-nock').textContent = '—';
    document.getElementById('tax-zkat').textContent = '—';
    updated.textContent = 'Tax rates unavailable';
    return;
  }
  document.getElementById('tax-buy').textContent = formatBps(tax.buyBps);
  document.getElementById('tax-sell').textContent = formatBps(tax.sellBps);
  document.getElementById('tax-nock').textContent = formatUnits(data.totalRaw, data.decimals);
  const paid = tax.tokenRewards;
  document.getElementById('tax-zkat').textContent = paid?.symbol === 'ZKAT' && paid.decimals === 18 && /^\d+$/.test(paid.totalRaw) ? formatUnits(paid.totalRaw, 18) : '—';
  state.textContent = 'LIVE TAX';
  updated.textContent = 'Source updated ' + lastSuccess.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}
async function refresh() {
  if (loading || document.hidden) return;
  loading = true;
  try {
    const response = await fetch('/api/rewards', { signal: AbortSignal.timeout(15000), cache: 'no-store' });
    if (!response.ok) throw new Error('Rewards unavailable');
    const data = await response.json();
    if (data.contract.toLowerCase() !== CA.toLowerCase() || data.symbol !== 'NOCK' || !/^\d+$/.test(data.totalRaw) || !Number.isInteger(data.decimals) || data.decimals < 0 || data.decimals > 36 || !Number.isFinite(Date.parse(data.updatedAt))) throw new Error('Invalid rewards');
    const updated = Date.parse(data.updatedAt);
    if (lastSuccess && updated < lastSuccess.getTime()) throw new Error('Older rewards snapshot');
    const current = BigInt(data.totalRaw);
    if (previous && previous.decimals === data.decimals && current > previous.raw) {
      const delta = current - previous.raw;
      window.dispatchEvent(new CustomEvent('zkat:reward', { detail: { raw: delta.toString(), decimals: data.decimals } }));
      const eventLabel = document.getElementById('reward-event');
      const amount = formatUnits(delta.toString(), data.decimals);
      eventLabel.textContent = (amount === '0.00' ? '<0.01' : '+' + amount) + ' NOCK just dripped';
      clearTimeout(rewardTimer);
      rewardTimer = setTimeout(() => { eventLabel.textContent = ''; }, 8000);
    }
    // A temporary lower snapshot must not trigger the same rewards again on recovery.
    if (!previous || previous.decimals !== data.decimals || current > previous.raw) {
      previous = { raw: current, decimals: data.decimals };
    }
    total.textContent = formatUnits(data.totalRaw, data.decimals);
    lastSuccess = new Date(data.updatedAt);
    status.textContent = 'BaseStonk · checking every 15s';
    status.title = 'Rewards total reported by BaseStonk. Updated ' + lastSuccess.toLocaleString();
    window.dispatchEvent(new CustomEvent('zkat:snapshot', {detail:data}));
    document.getElementById('connection').dataset.state = 'live';
    document.querySelector('#connection span').textContent = 'LIVE REWARDS';
    renderTax(data, false);
  } catch {
    window.dispatchEvent(new CustomEvent('zkat:offline'));
    document.getElementById('connection').dataset.state = 'offline';
    document.querySelector('#connection span').textContent = 'RECONNECTING';
    status.textContent = lastSuccess ? 'Last updated ' + lastSuccess.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'Rewards temporarily unavailable';
    renderTax(null, true);
  } finally { loading = false; }
}
document.getElementById('copy').addEventListener('click', async () => {
  const label = document.getElementById('copy-status');
  try {
    await navigator.clipboard.writeText(CA);
    label.textContent = 'Contract address copied';
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(document.querySelector('.address'));
    selection.removeAllRanges(); selection.addRange(range);
    label.textContent = 'Address selected · hold to copy';
  }
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => { label.textContent = ''; }, 3000);
});
refresh();
setInterval(refresh, 15000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });

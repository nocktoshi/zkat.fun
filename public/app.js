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
    document.getElementById('connection').dataset.state = 'live';
    document.querySelector('#connection span').textContent = 'LIVE REWARDS';
  } catch {
    document.getElementById('connection').dataset.state = 'offline';
    document.querySelector('#connection span').textContent = 'RECONNECTING';
    status.textContent = lastSuccess ? 'Last updated ' + lastSuccess.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'Rewards temporarily unavailable';
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

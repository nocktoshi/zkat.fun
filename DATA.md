# Live NOCK rewards

## Exact source

`https://api.basestonk.io/api/launchpad/tokens/0x60555Ab88a0CAaf893Ab284C1332c9D0A05Af222?chain=base`

- ZKat contract: `0x60555Ab88a0CAaf893Ab284C1332c9D0A05Af222`
- Required chain: `base`
- Required NOCK pair token: `0x9b5e262cf9bb04869ab40b19af91d2dc85761722`
- Required pair symbol: `NOCK`
- Total field: `token.rewardsPair`
- Decimal field: `token.chainState.pairDecimals` (observed as **16**, not 18)
- Source timestamp: `token.updatedAt`

This is BaseStonk's reported cumulative rewards paid to holders, not the pool's available balance, liquidity, APY, or a separate wallet-receipt audit. The page's cat pool is a visual metaphor. The site does not mine NOCK, generate rewards, distribute funds, or sign transactions.

The Worker validates the contract, chain, pair token, symbol, nonnegative integer amount, decimal precision, and timestamp. The browser uses BigInt and string formatting to show two decimals; event detection uses full precision. Do not replace this with floating-point arithmetic.

The client checks every 15 seconds while visible and immediately on returning to the page. The Worker caches successful results for up to 10 seconds per isolate and merges overlapping upstream requests. BaseStonk may update its own data less frequently, so this is polling, not a transaction-by-transaction subscription.

The first valid response establishes a baseline. A later positive increase triggers one stronger drop and splash plus an increment label. Several rewards between polls can produce one aggregated event. A lower snapshot does not reset the event high-water mark within the current page session. Older source timestamps, network errors, and unchanged totals do not produce events.

On failure the API returns 503 with an error, never invented zero. The client retains the last valid amount, labels its source time, and shows RECONNECTING. No key is required for the current public feed. If BaseStonk changes its schema or access policy, update the adapter against the actual replacement documentation. Do not silently relabel transfer sums from an explorer as the same metric.

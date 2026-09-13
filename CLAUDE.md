# Claude: launch the completed $ZKat site

The user approved this design. Your job is to run, verify, and launch the supplied site, not redesign it. Start with README.md, DATA.md, and PRIVACY.md.

1. Run `npm test` on Node 22+. Then run `npm start` and check the page on desktop and a phone viewport. Check the clipboard button, the expandable “Why the name?” section, and the live-data state.
2. Keep the current title, cat, blue overflow, single centered rewards pool, typography, sourced Nockchain copy, and contract. Do not restore optional memes or introduce wallets, trading, tracking, fake stats, or new branding.
3. Use the included Cloudflare Worker configuration when the owner has authorized an available Cloudflare account. Otherwise the supplied Node server can run on their authorized Node host. Ask for only the missing hosting/domain access needed to complete launch; do not create paid services without their authorization.
4. Ensure `/api/rewards` works on the same origin and the hosting provider can reach BaseStonk. Diagnose failures without substituting demo numbers. Hosting success alone does not verify the data feed.
5. Preserve the exact contract and NOCK pairing validation. Poll every 15 seconds while visible. Each observed increase triggers one extra drip/splash; no fabricated reward events. Keep the initial response as a baseline.
6. Follow PRIVACY.md: the owner wants to remain publicly pseudonymous. Use `$ZKat` or `Zero Knowledge Cat` for any needed public authorship. Do not insert their name, email, profile handles, account URLs, or identifying source paths into code, metadata, Git commits, documentation, or the site. Use a project-only Git identity if creating a new public repository; do not apply identity changes globally. Do not include account credentials or deployment outputs in public commits.
7. Retain official source links and quote attribution. Describe Nockchain as the inspiration and Base as the deployment chain. Privacy is part of the inspiration; do not promise anonymous transfers or imply the memecoin runs natively on Nockchain.
8. Verify production assets, the rewards response or honest outage state, and the host's terminal deployment status. Give the owner the working URL and concise final-domain instructions, if any remain.

## Existing behavior

The visual liquid flows continuously. The extra drop and splash are tied to a strictly positive increase in the server-reported total. Baseline loads, unchanged totals, errors, stale snapshots, and temporary downward corrections do not trigger fake rewards. Multiple payouts between checks are aggregated into one observed increase. Motion respects the visitor's reduced-motion setting.

No wallet seed, private key, deployer key, or signing action is required to host this read-only website.

## Latest approved additions

Keep the highlighted full contract address and Copy CA action immediately above the pool. Keep the live dev-buy vesting panel directly below it, including creator/vault/beneficiary links, dates, released amount, source timestamp, and honest unavailable/stale states. A public wallet address is intentionally displayed at the owner’s request; do not add the owner’s real-world name or personal contact details. Preserve separate ZKAT (18) and NOCK reward (16 from the source) decimal handling. Do not call this an entire-wallet lock or an LP lock.

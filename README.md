# $ZKat — Claude launch package

This is the completed website, ready for Claude to launch. It includes the approved design, local fonts and artwork, animated pool, live NOCK rewards endpoint, portable hosting files, and checks. No ChatGPT account or original project is required.

**Give Claude the whole ZIP and tell it: “Read CLAUDE.md and launch this completed site. Preserve its design and the owner-privacy requirements.”**

## Run it

Use Node.js 22 or newer. There are no application dependencies to install.

```sh
npm start
```

Open `http://localhost:3000`. `npm start` builds first. The ZIP also includes the compiled Worker. Opening `public/index.html` directly cannot provide the live server endpoint.

```sh
npm test
```

Tests cover public assets, real-data validation, error handling, and reward-trigger behavior using synthetic fixtures only in the test process. No sample values appear in the production site.

## Launch with Cloudflare Workers

The application is already a Cloudflare-compatible Worker. `wrangler.jsonc` supplies its entry point, name, and compatibility date. Use a hosting account authorized by the owner; the account or domain may need to be connected during launch.

```sh
npx wrangler@4 login
npm run deploy:cloudflare
```

Cloudflare tooling is fetched when this command runs; it is not an application runtime dependency. The name `zkat-rewards` may need changing if occupied in the chosen account. Set up the final domain through that account. Do not reuse a personal profile name in a public URL.

## Launch on another Node host

Use a Node 22+ web service with build command `npm run build` and start command `npm start`. The server binds to `0.0.0.0` and the host's `PORT` variable (3000 by default). The host must allow outgoing HTTPS to `api.basestonk.io`. Serve the frontend and `/api/rewards` from the same origin. A static-only host cannot run the live rewards API.

## What stays locked

- $ZKAT / Zero Knowledge Cat; NOCK-inspired memecoin on Base.
- Contract: `0x60555Ab88a0CAaf893Ab284C1332c9D0A05Af222`.
- One central overflowing blue cat pool; no meme gallery.
- Near-black, muted gold, white, and blue. Modern layout with early-2000s computer-room artwork.
- Local Outfit/Inter fonts and gold italic quotes.
- Live reward checks, accurate integer math, copyable contract, graceful outage display, reduced-motion support.
- Nockchain explanation and attributed source quote. Never claim transfers are anonymous or that this is an official Nockchain product.

## Files

- `public/`: exact active webpage, scripts, fonts, icon, pool artwork.
- `worker.js`: API and asset request handling.
- `build.mjs`: bundles public assets and server into `dist/server/index.js`.
- `server.mjs`: dependency-free Node adapter for local or non-Cloudflare hosting.
- `dist/server/index.js`: ready-built Cloudflare Worker.
- `wrangler.jsonc`: Cloudflare deployment configuration.
- `tests/`: deterministic checks; not served publicly.
- `CLAUDE.md`: launch instructions and owner-privacy requirements.
- `DATA.md`: rewards semantics and limitations.
- `PRIVACY.md`: identity-preservation requirements and practical limits.
- `SOURCES.md`, `licenses/`: source references and font licenses.
- `optional-art/`: earlier images and memes for future use, not served or used in the approved layout. Personal JPEG metadata has been removed without changing pixels.
- `MANIFEST.sha256`: file checksums for this package, excluding the manifest itself.

The former hosting identifiers, repository history, account URL, and account credentials are deliberately absent. This package does not redeploy or alter the existing live site.

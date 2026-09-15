# Owner privacy — handoff requirement

The owner prefers to remain publicly pseudonymous. This is a requirement for the launch operator, not a claim that the website or token creates blockchain anonymity.

## Already applied to this package

- No owner name, personal email, account-specific site URL, original hosting/project IDs, Git history, local home/workspace paths, tokens, or credentials are included.
- Optional JPEG reference images have their EXIF, IPTC/Photoshop, and comment metadata stripped without recompressing pixels.
- The live page has no owner biography or attribution; no analytics, ad scripts, wallet connection, or visitor accounts were added.
- Fonts and active art are hosted locally. Browser rewards requests go to the site's own endpoint; the server contacts BaseStonk.
- The Node adapter does not write access logs containing visitor IPs.

## Preserve during launch

Use the project identity `$ZKat` in public-facing authorship, repository identity, contact labels, and domain naming. Keep hosting credentials in the host's secret configuration, never in code or an archive. If publishing a repository, review public commit author fields and do not import an unrelated repository's history. Do not publish screenshots of the hosting account or account-specific administration links.

If the owner chooses a custom domain, choose available registration privacy and use a project contact address where permitted. Hosting providers and registrars may still require identifying account or billing details. Do not falsify required account information or promise that those providers cannot identify the operator.

## Limits

The contract address is intentionally public. On-chain deployment/funding history, existing social posts, prior hosting URLs, domain records, and previously published files can connect a project to its creator. Removing information from this new package cannot erase prior publications. Infrastructure providers may retain IP, access, billing, or account logs independently of the application. This package is an identity-minimized public handoff, not a guarantee of anonymity.

The owner has explicitly requested public developer-wallet and vesting-vault transparency on the site. The live feed now supplies those on-chain addresses and the beneficiary address. The owner has also requested the project X account `https://x.com/zkat_nock` on the site. Preserve this requested functionality while keeping real-world identity and personal contact details out of the site and handoff.

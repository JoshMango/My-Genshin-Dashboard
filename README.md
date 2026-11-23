# My Genshin Dashboard

A Genshin Impact fan dashboard for inspecting public showcases, planning teams, and comparing builds.

## Local development

Use Node.js 22 or 24 and pnpm. Run `pnpm install --frozen-lockfile`, then `pnpm dev` and open `http://localhost:3000`.

- `pnpm lint` checks source code.
- `pnpm format:check` checks formatting.
- `pnpm typecheck` checks TypeScript.
- `pnpm test` runs Vitest.
- `pnpm build` verifies a production build.
- For browser tests, install Chromium with `pnpm exec playwright install chromium`, then run `pnpm test:e2e`.

## Roster and Team Discovery

Import a public UID showcase, upload a GOOD inventory, or add builds by hand. Rotate new characters into your in-game showcase and reimport the same UID to keep earlier builds. GOOD and manual entry cover characters outside the showcase. Roster, saved team, and theme backups are available as separate JSON exports.

In **Teams → Discover**, choose a playstyle and reaction, then search your full roster. Discovery uses a browser worker and ranks lineups by reaction potential, role coverage, resonance, buffs, energy and build investment. Review the score breakdown, open a result in Builder, or start a gcsim run. Saved teams can open directly in Compare.

## Vercel deployment

1. Push the desired branch to GitHub and import the repository into a [Vercel Hobby project](https://vercel.com/docs/plans/hobby). Select the Next.js framework preset and the repository root. Use Node.js 22.
2. Add the [Upstash Redis integration](https://vercel.com/marketplace/upstash) and link a Redis database. In the project's environment variables, confirm `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are present for the environments that will accept UID lookups.
3. Enable access to [Vercel system environment variables](https://vercel.com/docs/environment-variables/system-environment-variables). Set `ENABLE_EXPERIMENTAL_COREPACK=1` to install the pnpm version pinned in `package.json`. Keep the default Next.js build command. [Vercel build configuration](https://vercel.com/docs/builds/configure-a-build)
4. Set `ENKA_CONTACT_URL` to a working public contact link for the app. The [example environment file](.env.example) defaults to the repository issue tracker. Add credentials only through Vercel or an ignored local `.env.local`.
5. From the deployment, test a public showcase and the same UID again to check cache reuse. Verify that a private or empty showcase gives a next step, then test both a Phase A estimate and a supported gcsim lineup in Compare. [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)

The UID proxy uses Redis on Vercel and returns a service message when the shared store is unavailable. Local development can leave both Redis values empty to use a bounded in-memory cache. Cache entries expire at Enka's TTL, and rate-limit counters expire after one minute. [Upstash Redis REST API](https://upstash.com/docs/redis/features/restapi)

## Sources and tooling

- [Enka.Network API usage](https://github.com/EnkaNetwork/API-docs/blob/master/api.md), [Genshin fields and icons](https://github.com/EnkaNetwork/API-docs/blob/master/docs/gi/api.md), and [static catalog](https://github.com/EnkaNetwork/API-docs/tree/master/store/gi)
- [Genshin Optimizer GOOD format](https://github.com/frzyc/genshin-optimizer/tree/master/libs/gi/good) and [MIT license](https://github.com/frzyc/genshin-optimizer/blob/master/LICENSE)
- [gcsim configuration](https://docs.gcsim.app/guides/understanding_config_files/) and [gcsim repository](https://github.com/genshinsim/gcsim)
- [Akasha.cv](https://akasha.cv/) provides external leaderboards for showcase characters.
- [Next.js](https://nextjs.org/docs/app/getting-started/installation), [Tailwind CSS](https://tailwindcss.com/docs/installation/framework-guides/nextjs), [ESLint](https://nextjs.org/docs/app/api-reference/config/eslint), and [Prettier](https://prettier.io/docs/install)
- [Vitest](https://nextjs.org/docs/app/guides/testing/vitest) and [Playwright](https://playwright.dev/docs/intro)

This fan project is unaffiliated with and unendorsed by HoYoverse. Genshin Impact assets belong to HoYoverse.

Supplemental English descriptions are loaded on demand from [genshin-db](https://github.com/theBowja/genshin-db). Enka.Network hosts artwork and equipment icons, and [Paimon.moe](https://github.com/MadeBaruna/paimon-moe) hosts element icons. Static data URLs use pinned revisions so a catalog update can be verified before it ships.

Artifact verdict entries backed by [KeqingMains character guides](https://keqingmains.com/) link to their sources and describe when to use each set. Character pages without a verified guide entry display the dashboard's build suggestions as starting points.

Roster cards open a compact drawer. Existing direct character pages at `/character/[id]` can open a self-contained glTF 2.0 `.glb` model up to 35 MiB. Choose **Load 3D model** in Details / Stats. Files are remembered per character in this browser, and splash art remains available. The viewer is provided by [Google model-viewer](https://modelviewer.dev/docs/).

## Phase A damage estimates

The in-browser Web Worker applies average critical hits, enemy DEF/RES, damage bonus, talent-level scaling, a single eligible reaction trigger, and the selected rotation template. The comparison uses generic hit coefficients, interpolated reaction level scaling, and user-controlled uptime and buff assumptions. It models one target with uniform resistance and leaves energy, exact multipliers, special mechanics, weapon passives, and aura timing outside the estimate. The effectiveness score measures role and reaction coverage on a 0–100 scale.

- [Damage, CRIT, DEF, and RES](https://library.keqingmains.com/combat-mechanics/damage/damage-formula)
- [Amplifying reactions](https://library.keqingmains.com/combat-mechanics/elemental-effects/amplifying-reactions), [additive reactions](https://library.keqingmains.com/combat-mechanics/elemental-effects/additive-reactions), and [transformative reactions](https://library.keqingmains.com/combat-mechanics/elemental-effects/transformative-reactions)

## Phase B rotation simulation

Compare generates a gcsim config from the chosen team's levels, talents, constellations, weapons, artifact stats and active sets. Edit the rotation before running, or use **Simulate** on a Discover result to run the generated rotation. The worker loads the 8.8 MiB compressed engine on demand and reports mean team and per-character DPS over 20 iterations. The templates are starting rotations. The pinned engine has limited character and equipment coverage, and Compare displays an error when a build cannot run. Phase A remains available for dashboard builds. [gcsim config guide](https://docs.gcsim.app/guides/understanding_config_files/)

Both engines use the `SimulationEngine` interface. The bundled WASM is built from the MIT-licensed gcsim `v2.47.2` tag using Go `1.27.0`. To rebuild, use that checkout and Go version, set `GOOS=js` and `GOARCH=wasm`, and run `go build -trimpath -ldflags="-s -w" -o engine.wasm ./cmd/wasm`. Gzip the output to `public/gcsim/engine.wasm.gz`, and copy `lib/wasm/wasm_exec.js` from the matching Go distribution. Keep the gcsim and Go licenses alongside the assets. If updating the pinned engine, regenerate `data/gcsim-keys.json` from the upstream character, weapon and set name tables and retest the browser run. [gcsim v2.47.2](https://github.com/genshinsim/gcsim/releases/tag/v2.47.2) · [Go downloads](https://go.dev/dl/)

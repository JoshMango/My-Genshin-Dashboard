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

## Vercel deployment

1. Push the desired branch to GitHub and import the repository into a [Vercel Hobby project](https://vercel.com/docs/plans/hobby). Select the Next.js framework preset and the repository root. Use Node.js 22.
2. Add the [Upstash Redis integration](https://vercel.com/marketplace/upstash) and link a Redis database. In the project's environment variables, confirm `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are present for the environments that will accept UID lookups.
3. Enable access to [Vercel system environment variables](https://vercel.com/docs/environment-variables/system-environment-variables). Set `ENABLE_EXPERIMENTAL_COREPACK=1` to install the pnpm version pinned in `package.json`. Keep the default Next.js build command. [Vercel build configuration](https://vercel.com/docs/builds/configure-a-build)
4. Set `ENKA_CONTACT_URL` to a working public contact link for the app. The [example environment file](.env.example) defaults to the repository issue tracker. Add credentials only through Vercel or an ignored local `.env.local`.
5. From the deployment, test a public showcase and the same UID again to check cache reuse. Verify that a private or empty showcase gives a next step, and that Compare returns an estimate using the browser worker. [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)

The UID proxy uses Redis on Vercel and returns a service message when the shared store is unavailable. Local development can leave both Redis values empty to use a bounded in-memory cache. Cache entries expire at Enka's TTL, and rate-limit counters expire after one minute. [Upstash Redis REST API](https://upstash.com/docs/redis/features/restapi)

## Sources and tooling

- [Enka.Network API usage](https://github.com/EnkaNetwork/API-docs/blob/master/api.md), [Genshin fields and icons](https://github.com/EnkaNetwork/API-docs/blob/master/docs/gi/api.md), and [static catalog](https://github.com/EnkaNetwork/API-docs/tree/master/store/gi)
- [Genshin Optimizer GOOD format](https://github.com/frzyc/genshin-optimizer/tree/master/libs/gi/good) and [MIT license](https://github.com/frzyc/genshin-optimizer/blob/master/LICENSE)
- [gcsim configuration](https://docs.gcsim.app/guides/understanding_config_files/) and [gcsim repository](https://github.com/genshinsim/gcsim)
- [Next.js](https://nextjs.org/docs/app/getting-started/installation), [Tailwind CSS](https://tailwindcss.com/docs/installation/framework-guides/nextjs), [ESLint](https://nextjs.org/docs/app/api-reference/config/eslint), and [Prettier](https://prettier.io/docs/install)
- [Vitest](https://nextjs.org/docs/app/guides/testing/vitest) and [Playwright](https://playwright.dev/docs/intro)

This fan project is unaffiliated with and unendorsed by HoYoverse. Genshin Impact assets belong to HoYoverse.

Supplemental English descriptions are loaded on demand from [genshin-db](https://github.com/theBowja/genshin-db). Enka.Network hosts artwork and equipment icons, and [Paimon.moe](https://github.com/MadeBaruna/paimon-moe) hosts element icons. Static data URLs use pinned revisions so a catalog update can be verified before it ships.

Artifact verdict entries backed by [KeqingMains character guides](https://keqingmains.com/) link to their sources and describe when to use each set. Character pages without a verified guide entry display the dashboard's build suggestions as starting points.

Every character page can open a self-contained glTF 2.0 `.glb` model up to 35 MiB. Choose **Load 3D model** in Details / Stats. Files are remembered per character in this browser, and splash art remains available. The viewer is provided by [Google model-viewer](https://modelviewer.dev/docs/).

## Phase A damage estimates

The in-browser Web Worker applies average critical hits, enemy DEF/RES, damage bonus, talent-level scaling, a single eligible reaction trigger, and the selected rotation template. The comparison uses generic hit coefficients, interpolated reaction level scaling, and user-controlled uptime and buff assumptions. It models one target with uniform resistance and leaves energy, exact multipliers, special mechanics, weapon passives, and aura timing outside the estimate. The effectiveness score measures role and reaction coverage on a 0–100 scale.

- [Damage, CRIT, DEF, and RES](https://library.keqingmains.com/combat-mechanics/damage/damage-formula)
- [Amplifying reactions](https://library.keqingmains.com/combat-mechanics/elemental-effects/amplifying-reactions), [additive reactions](https://library.keqingmains.com/combat-mechanics/elemental-effects/additive-reactions), and [transformative reactions](https://library.keqingmains.com/combat-mechanics/elemental-effects/transformative-reactions)

## Planned Phase B

The simulator boundary is `SimulationEngine`. gcsim can build a browser WASM artifact. Before integrating it, verify its version-specific unit coverage, configuration, worker load time, and licensing. Upstream documents the transition from MIT through v2.47.2 to AGPLv3 for newer releases. If an embedded browser build is unsuitable, exporting a gcsim configuration for the official web app is a browser-side alternative. [WASM build task](https://github.com/genshinsim/gcsim/blob/main/Taskfile.yml) · [Licensing history](https://github.com/genshinsim/gcsim/blob/main/CONTRIBUTING.md)

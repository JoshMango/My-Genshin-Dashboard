# My Genshin Dashboard

A Genshin Impact fan dashboard for inspecting public showcases, planning teams, and comparing builds.

## Local development

Use Node.js 22 or 24 and pnpm. Run `pnpm install --frozen-lockfile`, then `pnpm dev` and open `http://localhost:3000`.

- `pnpm lint` checks source code.
- `pnpm format:check` checks formatting.
- `pnpm typecheck` checks TypeScript.
- `pnpm test` runs Vitest.
- `pnpm build` verifies a production build.
- For browser tests, install Chromium with `pnpm exec playwright install chromium`, then run `ppnpm test:e2e`.

## Sources and tooling

- [Enka.Network API usage](https://github.com/EnkaNetwork/API-docs/blob/master/api.md), [Genshin fields and icons](https://github.com/EnkaNetwork/API-docs/blob/master/docs/gi/api.md), and [static catalog](https://github.com/EnkaNetwork/API-docs/tree/master/store/gi)
- [Genshin Optimizer GOOD format](https://github.com/frzyc/genshin-optimizer/tree/master/libs/gi/good) and [MIT license](https://github.com/frzyc/genshin-optimizer/blob/master/LICENSE)
- [gcsim configuration](https://docs.gcsim.app/guides/understanding_config_files/) and [gcsim repository](https://github.com/genshinsim/gcsim)
- [Next.js](https://nextjs.org/docs/app/getting-started/installation), [Tailwind CSS](https://tailwindcss.com/docs/installation/framework-guides/nextjs), [ESLint](https://nextjs.org/docs/app/api-reference/config/eslint), and [Prettier](https://prettier.io/docs/install)
- [Vitest](https://nextjs.org/docs/app/guides/testing/vitest) and [Playwright](https://playwright.dev/docs/intro)

This fan project is unaffiliated with and unendorsed by HoYoverse. Genshin Impact assets belong to HoYoverse.

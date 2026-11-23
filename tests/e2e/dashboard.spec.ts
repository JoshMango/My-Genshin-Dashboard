import { expect, test, type Page } from "@playwright/test";

const avatar = (id: number, element: string, hash: number, dex: string) => ({
  [id]: {
    Element: element,
    NameTextMapHash: hash,
    SideIconName: `/ui/UI_AvatarIcon_Side_${dex}.png`,
    QualityType: "QUALITY_ORANGE",
    WeaponType: "WEAPON_SWORD_ONE_HAND",
    SkillOrder: [11, 12, 13],
    Skills: {},
    Consts: [],
    BaseProps: { "1": 1000, "4": 400, "20": 0.05, "22": 0.5 },
  },
});
const data: Record<string, unknown> = {
  "avatars.json": {
    ...avatar(10000002, "Ice", 1, "Ayaka"),
    ...avatar(10000003, "Wind", 2, "Qin"),
    ...avatar(10000032, "Fire", 3, "Bennett"),
  },
  "weapons.json": {},
  "relics.json": { Items: {}, Sets: {} },
  "locs.json": { en: { "1": "Kamisato Ayaka", "2": "Jean", "3": "Bennett" } },
  "namecards.json": {},
  "affixes.json": {},
  "curves.json": {},
  "relic_levels.json": {},
};

async function stubCatalog(page: Page) {
  await page.route("https://raw.githubusercontent.com/**", async (route) => {
    const file =
      new URL(route.request().url()).pathname.split("/").at(-1) ?? "";
    await route.fulfill({
      json: data[file] ?? {},
      headers: { "access-control-allow-origin": "*" },
    });
  });
  await page.route("https://enka.network/ui/**", (route) =>
    route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2ioAAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
}

test("imports a showcase, navigates character tabs, saves a team, and calculates a worker estimate", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await stubCatalog(page);
  await page.route("**/api/enka/618285856", (route) =>
    route.fulfill({
      json: {
        ttl: 60,
        playerInfo: { nickname: "Traveler Example", level: 60 },
        avatarInfoList: [
          {
            avatarId: 10000002,
            propMap: { "4001": { val: "90" } },
            fightPropMap: { "2001": 2200, "20": 0.7, "22": 1.5 },
            skillLevelMap: { "11": 8, "12": 8, "13": 9 },
          },
          {
            avatarId: 10000003,
            propMap: { "4001": { val: "90" } },
            fightPropMap: { "2001": 1150 },
          },
        ],
      },
    }),
  );
  await page.goto("/");
  await page.getByLabel("Genshin UID").fill("618285856");
  await page.getByRole("button", { name: "Import showcase" }).click();
  await expect(page.getByText("Traveler Example")).toBeVisible();
  await page.getByRole("link", { name: /Kamisato Ayaka/ }).click();
  await expect(
    page.getByRole("heading", { name: "Kamisato Ayaka" }),
  ).toBeVisible();
  const stats = page.getByRole("tab", { name: "Details / Stats" });
  await stats.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Artifacts" })).toBeFocused();
  await expect(page.getByRole("heading", { name: "Flower" })).toBeVisible();
  await page.getByRole("tab", { name: "Talents" }).click();
  await expect(page.getByText("Elemental Burst · Lv. 9")).toBeVisible();
  await page.getByRole("link", { name: "Team builder", exact: true }).click();
  await page.getByRole("button", { name: "Choose slot 1" }).click();
  await page.getByRole("button", { name: /Kamisato Ayaka/ }).click();
  await expect(
    page.getByRole("heading", { name: "Slot recommendations" }),
  ).toBeVisible();
  await page.getByLabel("Team name").fill("Freeze test");
  await page.getByRole("button", { name: "Save team" }).click();
  await expect(page.getByText("Saved Freeze test.")).toBeVisible();
  await page.getByRole("link", { name: "Compare", exact: true }).click();
  await expect(page.getByText(/estimated DPS/).first()).toBeVisible();
  const dps = page.getByRole("progressbar", {
    name: "Baseline estimated team DPS",
  });
  await expect(dps).toBeVisible();
  expect(Number(await dps.getAttribute("value"))).toBeGreaterThan(0);
  await page
    .getByRole("combobox", { name: "Slot 2", exact: true })
    .selectOption("10000003");
  await expect(
    page.getByRole("progressbar", { name: "Jean damage share" }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("combobox", { name: "Baseline team" })
    .selectOption({ label: "Freeze test" });
  await expect(
    page
      .getByRole("progressbar", { name: "Kamisato Ayaka damage share" })
      .first(),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("handles empty and rate-limited showcases, and persists accessible themes", async ({
  page,
}) => {
  await stubCatalog(page);
  await page.route("**/api/enka/618285856", (route) =>
    route.fulfill({ json: { ttl: 30, playerInfo: { nickname: "Empty" } } }),
  );
  await page.route("**/api/enka/618285857", (route) =>
    route.fulfill({
      status: 429,
      json: { message: "Enka is busy. Wait a minute before trying again." },
    }),
  );
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.getByLabel("Genshin UID").fill("618285856");
  await page.getByRole("button", { name: "Import showcase" }).click();
  await expect(page.getByText("No public showcase builds")).toBeVisible();
  await page.getByLabel("Genshin UID").fill("618285857");
  await page.getByRole("button", { name: "Import showcase" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Enka is busy" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByLabel("Background").selectOption("Liyue");
  await page.getByLabel("Animations").uncheck();
  await page.reload();
  await expect(page.getByLabel("Background")).toHaveValue("Liyue");
  await expect(page.getByLabel("Animations")).not.toBeChecked();
  await expect(page.getByRole("link", { name: "Privacy" })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
});

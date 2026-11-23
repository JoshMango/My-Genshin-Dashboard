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
    ...avatar(10000073, "Grass", 6, "Nahida"),
    ...avatar(10000025, "Water", 7, "Xingqiu"),
    ...avatar(10000065, "Electric", 8, "Shinobu"),
  },
  "weapons.json": {},
  "relics.json": {
    Items: {
      1: {
        Rarity: 5,
        EquipType: 0,
        Icon: "/ui/UI_RelicIcon_14001_4.png",
        SetId: 14001,
      },
    },
    Sets: { 14001: { Name: "4", AddProps: {} } },
  },
  "locs.json": {
    en: {
      "1": "Kamisato Ayaka",
      "2": "Jean",
      "3": "Bennett",
      "4": "Blizzard Strayer",
      "5": "Snowswept Memory",
      "6": "Nahida",
      "7": "Xingqiu",
      "8": "Kuki Shinobu",
      "9": "Favonius Sword",
      "10": "Favonius Codex",
    },
  },
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
        playerInfo: {
          nickname: "Traveler Example",
          level: 60,
          signature: "See you in Teyvat.",
        },
        avatarInfoList: [
          {
            avatarId: 10000002,
            propMap: { "4001": { val: "90" } },
            fightPropMap: { "2001": 2200, "20": 0.7, "22": 1.5 },
            skillLevelMap: { "11": 8, "12": 8, "13": 9 },
            equipList: [
              {
                itemId: 1,
                reliquary: { level: 21 },
                flat: {
                  nameTextMapHash: "5",
                  setNameTextMapHash: "4",
                  rankLevel: 5,
                  equipType: "EQUIP_BRACER",
                  icon: "UI_RelicIcon_14001_4",
                  reliquaryMainstat: {
                    mainPropId: "FIGHT_PROP_HP",
                    statValue: 4780,
                  },
                  reliquarySubstats: [
                    { appendPropId: "FIGHT_PROP_CRITICAL", statValue: 9.3 },
                  ],
                },
              },
            ],
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
  const links = page.getByRole("navigation", { name: "Profile links" });
  await expect(links).toHaveCount(0);
  await page
    .getByRole("button", { name: "Learn how to import your full roster" })
    .click();
  await expect(
    page.getByRole("heading", { name: "What is a GOOD file?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Inventory Kamera" }),
  ).toHaveAttribute("href", /Inventory_Kamera/);
  await expect(
    page.getByRole("button", { name: "Upload GOOD file" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Enka UID" }).click();
  await page.getByLabel("Genshin UID").fill("618285856");
  await page.getByRole("button", { name: "Search Account" }).click();
  await expect(page.getByText("Traveler Example")).toBeVisible();
  await expect(page.getByText("Bio: See you in Teyvat.")).toBeVisible();
  await expect(
    links.getByRole("link", { name: "Leaderboards on Akasha.cv" }),
  ).toHaveAttribute("href", "https://akasha.cv/profile/618285856");
  await expect(
    links.getByRole("link", { name: "View public characters on Enka" }),
  ).toHaveAttribute("href", "https://enka.network/u/618285856/");
  if (
    await page.evaluate(
      () => matchMedia("(hover: hover) and (pointer: fine)").matches,
    )
  ) {
    const enka = links.getByRole("link", {
      name: "View public characters on Enka",
    });
    await enka.hover();
    await expect(enka).toHaveCSS("translate", "0px -3px");
  }
  await page.getByRole("button", { name: /Kamisato Ayaka/ }).click();
  await expect(
    page
      .getByRole("dialog", { name: /Kamisato Ayaka/ })
      .getByRole("heading", { name: "Kamisato Ayaka" }),
  ).toBeVisible();
  const drawer = page.getByRole("dialog", { name: /Kamisato Ayaka/ });
  await expect(drawer).toBeVisible();
  const art = drawer.getByRole("img", { name: "Kamisato Ayaka splash art" });
  await expect(art).toHaveAttribute("src", /UI_Gacha_AvatarImg_Ayaka\.png$/);
  await expect(drawer.locator(".drawer-art")).toHaveAttribute(
    "data-rarity",
    "5",
  );
  expect(
    await drawer.evaluate((element) => {
      const art = element.querySelector(".drawer-art")?.getBoundingClientRect();
      const details = element
        .querySelector('[role="tablist"]')
        ?.getBoundingClientRect();
      if (!art || !details) return false;
      return matchMedia("(min-width: 50rem)").matches
        ? art.right < details.left
        : art.bottom < details.top;
    }),
  ).toBe(true);
  await expect(art).toHaveCSS("animation-name", "character-art-float");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(art).toHaveCSS("animation-name", "none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator(".combat-stat[data-essential] dt")).toHaveText([
    "ATKEssential",
    "CRIT RateEssential",
    "CRIT DMGEssential",
  ]);
  const stats = page.getByRole("tab", { name: "Details / Stats" });
  await stats.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Artifacts" })).toBeFocused();
  await expect(page.getByRole("heading", { name: "Flower" })).toBeVisible();
  const flower = page
    .locator(".artifact-grid article")
    .filter({ has: page.getByRole("heading", { name: "Flower" }) });
  await expect(flower.getByText("Snowswept Memory")).toBeVisible();
  await expect(flower.getByText("9.3%")).toBeVisible();
  await expect(flower.locator("img")).toHaveAttribute(
    "src",
    /UI_RelicIcon_14001_4/,
  );
  await page.getByRole("tab", { name: "Talents" }).click();
  await expect(page.getByText("Elemental Burst · Lv. 9")).toBeVisible();
  await page.getByRole("button", { name: "Close details" }).click();
  await page.getByRole("link", { name: "Teams", exact: true }).click();
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
  const ripple = () =>
    page
      .locator(".hero-orbit")
      .evaluate((orbit) => getComputedStyle(orbit, "::before").animationName);
  await expect.poll(ripple).toBe("roster-ripple");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(ripple).toBe("none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.getByLabel("Genshin UID").fill("618285856");
  await page.getByRole("button", { name: "Search Account" }).click();
  await expect(page.getByText("No public showcase builds")).toBeVisible();
  await page.getByLabel("Genshin UID").fill("618285857");
  await page.getByRole("button", { name: "Search Account" }).click();
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
  await page.getByRole("link", { name: "Roster", exact: true }).click();
  await expect.poll(ripple).toBe("none");
});

function sampleGlb() {
  const vertices = Buffer.alloc(36);
  [-1, -1, 0, 1, -1, 0, 0, 1, 0].forEach((value, index) =>
    vertices.writeFloatLE(value, index * 4),
  );
  const json = JSON.stringify({
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    buffers: [{ byteLength: vertices.length }],
    bufferViews: [{ buffer: 0, byteLength: vertices.length, target: 34962 }],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: "VEC3",
        min: [-1, -1, 0],
        max: [1, 1, 0],
      },
    ],
  });
  const padded = Buffer.from(json.padEnd(Math.ceil(json.length / 4) * 4));
  const header = Buffer.alloc(20);
  header.write("glTF");
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + padded.length + vertices.length, 8);
  header.writeUInt32LE(padded.length, 12);
  header.write("JSON", 16);
  const binary = Buffer.alloc(8);
  binary.writeUInt32LE(vertices.length);
  binary.write("BIN", 4);
  return Buffer.concat([header, padded, binary, vertices]);
}

test("opens, remembers, and removes a character's local 3D model", async ({
  page,
}, testInfo) => {
  await stubCatalog(page);
  await page.route("**/api/enka/618285856", (route) =>
    route.fulfill({
      json: {
        playerInfo: { nickname: "Example" },
        avatarInfoList: [{ avatarId: 10000002 }],
      },
    }),
  );
  await page.goto("/");
  await page.getByLabel("Genshin UID").fill("618285856");
  await page.getByRole("button", { name: "Search Account" }).click();
  await page.getByRole("button", { name: /Kamisato Ayaka/ }).waitFor();
  await page.goto("/character/10000002");
  await page.getByLabel("Load 3D model").setInputFiles({
    name: "bad.glb",
    mimeType: "model/gltf-binary",
    buffer: Buffer.from("bad model"),
  });
  await expect(page.getByText("Choose a GLB model file.")).toBeVisible();
  await page.getByLabel("Load 3D model").setInputFiles({
    name: "example.glb",
    mimeType: "model/gltf-binary",
    buffer: sampleGlb(),
  });
  const viewer = page.locator("model-viewer");
  await expect(viewer).toHaveAttribute("camera-controls", "");
  await expect
    .poll(() =>
      viewer.evaluate(
        (element) => (element as HTMLElement & { loaded: boolean }).loaded,
      ),
    )
    .toBe(true);
  if (testInfo.project.name === "desktop") {
    const orbit = () =>
      viewer.evaluate(
        (element) =>
          (
            element as HTMLElement & { getCameraOrbit: () => { theta: number } }
          ).getCameraOrbit().theta,
      );
    const initial = await orbit();
    await viewer.scrollIntoViewIfNeeded();
    const box = (await viewer.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2, {
      steps: 12,
    });
    await page.mouse.up();
    await expect
      .poll(async () => Math.abs((await orbit()) - initial))
      .toBeGreaterThan(0.1);
  }
  await page.getByRole("button", { name: "Splash art" }).click();
  await expect(page.getByRole("img", { name: "Kamisato Ayaka" })).toBeVisible();
  await page.getByRole("tab", { name: "Artifacts" }).click();
  await page.getByRole("tab", { name: "Details / Stats" }).click();
  await expect(viewer).toHaveAttribute("src", /^blob:/);
  await page.getByRole("button", { name: "Remove model" }).click();
  await expect(viewer).toHaveCount(0);
  await expect(page.getByText("Local model removed.")).toBeVisible();
});

test("keeps shared page content inside the device with landscape gutters", async ({
  page,
}) => {
  await stubCatalog(page);
  for (const size of [
    { width: 320, height: 740 },
    { width: 844, height: 390 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(size);
    for (const path of [
      "/",
      "/teams",
      "/compare",
      "/settings",
      "/about",
      "/privacy",
    ]) {
      await page.goto(path);
      const layout = await page.locator("main").evaluate((main) => {
        const box = main.getBoundingClientRect();
        return {
          left: box.left,
          right: window.innerWidth - box.right,
          overflow: document.documentElement.scrollWidth - window.innerWidth,
        };
      });
      expect(layout.overflow, path).toBeLessThanOrEqual(0);
      if (size.width > size.height) {
        expect(layout.left, path).toBeGreaterThanOrEqual(16);
        expect(layout.right, path).toBeGreaterThanOrEqual(16);
      }
    }
  }
});

test("discovers a Hyperbloom team from the owned roster and sends it to Compare", async ({
  page,
}) => {
  await stubCatalog(page);
  await page.route("**/api/enka/618285856", (route) =>
    route.fulfill({
      json: {
        playerInfo: { nickname: "Discovery example" },
        avatarInfoList: [10000073, 10000025, 10000065, 10000032].map(
          (avatarId) => ({
            avatarId,
            propMap: { "4001": { val: "90" } },
            fightPropMap: { "2001": 1600, "28": 150 },
            equipList: [
              {
                itemId: avatarId === 10000073 ? 14401 : 11401,
                weapon: { level: 90, promoteLevel: 6 },
                flat: {
                  nameTextMapHash: avatarId === 10000073 ? "10" : "9",
                  rankLevel: 4,
                },
              },
            ],
          }),
        ),
      },
    }),
  );
  await page.goto("/");
  await page.getByLabel("Genshin UID").fill("618285856");
  await page.getByRole("button", { name: "Search Account" }).click();
  await expect(
    page.getByRole("link", { name: "Leaderboards on Akasha.cv" }),
  ).toHaveAttribute("href", "https://akasha.cv/profile/618285856");
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Nahida.*Showcase/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Teams", exact: true }).click();
  await page.getByRole("link", { name: "Discover", exact: true }).click();
  await expect(
    page
      .getByRole("combobox", { name: "Must include" })
      .locator('option[value="10000065"]'),
  ).toHaveCount(1);
  await page
    .getByRole("combobox", { name: "Playstyle" })
    .selectOption("Reaction team");
  await page
    .getByRole("combobox", { name: "Reaction", exact: true })
    .selectOption("Hyperbloom");
  await page
    .getByRole("combobox", { name: "Must include" })
    .selectOption("10000065");
  await page.getByRole("button", { name: "Find teams" }).click();
  await expect(
    page.getByText("1 valid combinations scored.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("Supports Hyperbloom", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save team" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved Nahida" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Simulate", exact: true }).click();
  await expect(page).toHaveURL(/\/compare\?simulate=1$/);
  await expect(
    page
      .getByRole("progressbar", { name: "Kuki Shinobu damage share" })
      .first(),
  ).toBeVisible();
  await expect(page.getByText(/simulated team DPS/)).toBeVisible({
    timeout: 45_000,
  });
  await expect(
    page.getByText(/^[1-9][\d,]* simulated team DPS$/),
  ).toBeVisible();
  await page.getByRole("link", { name: "Teams", exact: true }).click();
  await page.getByRole("link", { name: "Open in Compare" }).click();
  await expect(page).toHaveURL(/\/compare\?team=/);
  await expect(
    page.getByRole("combobox", { name: "Baseline team" }),
  ).not.toHaveValue("");
});

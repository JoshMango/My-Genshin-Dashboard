import { afterEach, expect, it, vi } from "vitest";
import { showcase, validUid } from "@/lib/enka/proxy";
import { normalizeCharacter, normalizeProfile } from "@/lib/enka/normalize";
import type { Catalog } from "@/lib/enka/catalog";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("accepts 9- or 10-digit UIDs and rejects paths, leading zeroes, and other lengths", () => {
  expect(validUid("612345678")).toBe(true);
  expect(validUid("1801234567")).toBe(true);
  for (const uid of [
    "012345678",
    "12345678",
    "1e8000000",
    "../625000000",
    "12345678901",
  ]) {
    expect(validUid(uid)).toBe(false);
  }
});

it("caches an Enka response by UID for the returned TTL and drops owner metadata", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    Response.json({
      ttl: 60,
      playerInfo: { nickname: "Example" },
      owner: { username: "private-to-this-payload" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  const req = new Request("http://localhost/api/enka/612345678");
  expect((await showcase(req, "612345678")).status).toBe(200);
  const result = await showcase(req, "612345678");
  expect(await result.json()).toEqual({
    ttl: 60,
    playerInfo: { nickname: "Example" },
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][1].headers["User-Agent"]).toMatch(
    /MyGenshinDashboard.*https:\/\//,
  );
});

it("preserves available builds when player profile fields are placeholders", () => {
  const catalog: Catalog = {
    avatars: {
      "10000002": {
        Element: "Ice",
        NameTextMapHash: 1,
        SkillOrder: [2, 3, 4],
        ProudMap: { 3: 10 },
      },
    },
    loc: { "1": "Kamisato Ayaka" },
    weapons: {},
    relics: { Items: {}, Sets: {} },
    namecards: {},
    affixes: {},
    curves: {},
    relicLevels: {},
  };
  const result = normalizeProfile(
    "612345678",
    {
      profileUnavailable: true,
      playerInfo: { nickname: "???" },
      avatarInfoList: [
        {
          avatarId: 10000002,
          fightPropMap: { "4": 300, "2001": 1700, "20": 0.42 },
          skillLevelMap: { "3": 8 },
          proudSkillExtraLevelMap: { "10": 3 },
        },
      ],
    },
    catalog,
  );
  expect(result.nickname).toBeUndefined();
  expect(result.characters[0]).toMatchObject({
    name: "Kamisato Ayaka",
    element: "Cryo",
    base: { atk: 300 },
    stats: { atk: 1700, critRate_: 42 },
  });
  expect(result.characters[0].talents[1]).toMatchObject({ level: 8, bonus: 3 });
});

it("resolves the equipped namecard and current or legacy profile avatar independently", () => {
  const catalog: Catalog = {
    avatars: { 10000002: { SideIconName: "UI_AvatarIcon_Side_Ayaka" } },
    namecards: { 210166: { Icon: "/ui/UI_NameCardPic_Linette_P.jpg" } },
    loc: {},
    weapons: {},
    relics: { Items: {}, Sets: {} },
    affixes: {},
    curves: {},
    relicLevels: {},
  };
  const playerInfo = {
    namecardId: 210166,
    profilePicture: { avatarId: 10000002 },
  };
  const modern = normalizeProfile(
    "612345678",
    { playerInfo: { ...playerInfo, profilePicture: { id: 4500 } } },
    catalog,
    { 4500: { IconPath: "/ui/UI_AvatarIcon_Shenhe_Circle.png" } },
  );
  expect(modern).toMatchObject({
    namecard: "https://enka.network/ui/UI_NameCardPic_Linette_P.jpg",
    avatar: "https://enka.network/ui/UI_AvatarIcon_Shenhe_Circle.png",
  });
  expect(normalizeProfile("612345678", { playerInfo }, catalog).avatar).toBe(
    "https://enka.network/ui/UI_AvatarIcon_Ayaka.png",
  );
});

it("imports current showcase artifacts and legacy stat values with their original units", () => {
  const catalog: Catalog = {
    avatars: {},
    weapons: {},
    relics: { Items: {}, Sets: { 15038: { Name: "42", AddProps: {} } } },
    loc: { "42": "Obsidian Codex", "43": "Reckoning of the Xenogenic" },
    namecards: {},
    affixes: { 501221: { PropType: 22, Efficiency: 0.7, Value: 0.054 } },
    curves: {},
    relicLevels: {},
  };
  const character = normalizeCharacter(
    {
      avatarId: 10000106,
      equipList: [
        {
          itemId: 1,
          reliquary: { level: 21, appendPropIdList: [501221] },
          flat: {
            nameTextMapHash: "43",
            setNameTextMapHash: "unavailable",
            setId: 15038,
            equipType: "EQUIP_BRACER",
            rankLevel: 5,
            icon: "UI_RelicIcon_15038_4",
            reliquaryMainstat: { mainPropId: "FIGHT_PROP_HP", statValue: 4780 },
            reliquarySubstats: [
              { appendPropId: "FIGHT_PROP_CRITICAL_HURT", statValue: 5.4 },
              { appendPropID: "FIGHT_PROP_CRITICAL", propValue: 3.1 },
            ],
          },
        },
        {
          itemId: 2,
          weapon: { level: 90 },
          flat: {
            weaponStats: [
              { mainPropId: "FIGHT_PROP_BASE_ATTACK", statValue: 741 },
              { appendPropID: "FIGHT_PROP_CRITICAL", propValue: 11 },
            ],
          },
        },
      ],
    },
    catalog,
  );

  expect(character.artifacts).toEqual([
    expect.objectContaining({
      slot: "Flower",
      name: "Reckoning of the Xenogenic",
      setId: "15038",
      setName: "Obsidian Codex",
      level: 20,
      icon: "https://enka.network/ui/UI_RelicIcon_15038_4.png",
      main: { key: "hp", value: 4780 },
      substats: [
        { key: "critDMG_", value: 5.4, rolls: [0.7] },
        { key: "critRate_", value: 3.1 },
      ],
    }),
  ]);
  expect(character.weapon?.stats).toEqual([
    { key: "atk", value: 741 },
    { key: "critRate_", value: 11 },
  ]);
});

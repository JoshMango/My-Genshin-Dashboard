import { afterEach, expect, it, vi } from "vitest";
import { showcase, validUid } from "@/lib/enka/proxy";
import { normalizeProfile } from "@/lib/enka/normalize";
import type { Catalog } from "@/lib/enka/catalog";

afterEach(() => vi.unstubAllGlobals());

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

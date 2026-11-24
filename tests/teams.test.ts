import { expect, it } from "vitest";
import {
  blankTeam,
  parseTeams,
  placeCharacter,
  teamInfo,
  type Team,
} from "@/lib/teams";
import type { Character } from "@/lib/model";
import { normalizeGood, parseGood } from "@/lib/good";
import type { Catalog } from "@/lib/enka/catalog";

function build(
  id: string,
  name: string,
  element: Character["element"],
): Character {
  return {
    id,
    name,
    element,
    rarity: 4,
    level: 90,
    ascension: 6,
    constellation: 0,
    talents: [],
    constellations: [],
    base: {},
    stats: {},
    artifacts: [],
    source: "preview",
  };
}

it("detects reactions, required roles and resonance from the team setup", () => {
  const team = [
    build("1", "Nahida", "Dendro"),
    build("2", "Xingqiu", "Hydro"),
    build("3", "Kuki Shinobu", "Electro"),
    build("4", "Yelan", "Hydro"),
  ];
  expect(teamInfo(team)).toMatchObject({
    resonance: ["Hydro"],
    missing: ["carry"],
  });
  expect(teamInfo(team).reactions).toContain("Hyperbloom");
  expect(teamInfo(team.slice(0, 3)).resonance).toEqual([]);
});

it("moves a character already in a slot and validates imported saved teams", () => {
  const first = build("1", "Nahida", "Dendro");
  const next = build("2", "Xingqiu", "Hydro");
  const team: Team = {
    ...blankTeam,
    id: "test",
    name: "Test",
    slots: [first, next, null, null],
  };
  expect(placeCharacter(team, 1, first).slots).toEqual([
    next,
    first,
    null,
    null,
  ]);
  expect(parseTeams([team])).toEqual([team]);
  expect(
    parseTeams([{ ...team, slots: [first, first, null, null] }]),
  ).toBeUndefined();
});

it("round trips a GOOD inventory and calculates artifact main stats", () => {
  const catalog: Catalog = {
    avatars: {
      "2": {
        Element: "Ice",
        QualityType: "QUALITY_ORANGE",
        NameTextMapHash: 1,
        BaseProps: { "1": 1000, "4": 50 },
      },
    },
    weapons: {},
    relics: {
      Items: {
        "100": { Rarity: 5, EquipType: 0, Icon: "/ui/relic.png", SetId: 99 },
      },
      Sets: { "99": { Name: "2", AddProps: {} } },
    },
    loc: { "1": "Kamisato Ayaka", "2": "Blizzard Strayer" },
    affixes: {},
    namecards: {},
    curves: {},
    relicLevels: { "5": { "21": { "2": 4780 } } },
  };
  const scanner = parseGood({
    format: "GOOD",
    version: 3,
    source: "Test scanner",
    characters: [
      {
        key: "KamisatoAyaka",
        level: 90,
        ascension: 6,
        constellation: 0,
        talent: { auto: 6, skill: 9, burst: 9 },
      },
    ],
    artifacts: [
      {
        setKey: "BlizzardStrayer",
        slotKey: "flower",
        mainStatKey: "hp",
        level: 20,
        rarity: 5,
        location: "KamisatoAyaka",
        lock: true,
        substats: [{ key: "critRate_", value: 7.8 }],
      },
    ],
  });
  expect(scanner).toBeDefined();
  expect(parseGood(JSON.parse(JSON.stringify(scanner)))).toEqual(scanner);
  const result = normalizeGood(scanner!, catalog);
  expect(result.characters[0].stats).toMatchObject({
    hp: 5780,
    critRate_: 12.8,
  });
  expect(result.artifacts[0]).toMatchObject({
    icon: "https://enka.network/ui/relic.png",
    lock: true,
  });
});

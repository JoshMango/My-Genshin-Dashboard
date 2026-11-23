import { expect, it } from "vitest";
import type { Character, Weapon } from "@/lib/model";
import { estimator, resistanceMultiplier, templates } from "@/lib/sim/estimate";
import { swapGear } from "@/lib/sim/gear";
import { blankTeam, type Team } from "@/lib/teams";

const unit = (
  id: string,
  name: string,
  element: Character["element"],
  atk: number,
  eleMas: number,
): Character => ({
  id,
  name,
  element,
  rarity: 4,
  level: 90,
  ascension: 6,
  constellation: 0,
  source: "manual",
  base: { atk: 500 },
  stats: { atk, eleMas, critRate_: 50, critDMG_: 100 },
  artifacts: [],
  constellations: [],
  talents: [],
});

it("adds level and EM-based damage to a compatible reaction trigger and divides total damage by time", async () => {
  const slots = [
    unit("1", "Nahida", "Dendro", 1000, 700),
    unit("2", "Xingqiu", "Hydro", 1500, 100),
    unit("3", "Kuki Shinobu", "Electro", 900, 900),
    null,
  ];
  const team: Team = {
    ...blankTeam,
    goal: { archetype: "Reaction team", reaction: "Hyperbloom" },
    slots,
  };
  const rotation = templates["Reaction team"];
  const result = await estimator.simulate({ team, rotation });
  const zero = await estimator.simulate({
    team,
    rotation: { ...rotation, reactionHits: 0 },
  });
  expect(result.dps).toBeGreaterThan(zero.dps);
  expect(result.dps).toBeCloseTo(result.total / rotation.seconds);
  expect(result.trigger).toBe("Kuki Shinobu");
  expect(result.characters[0].reaction).toBe(0);
  expect(
    result.characters.reduce((sum, character) => sum + character.share, 0),
  ).toBeCloseTo(100);
});

it("accounts for weapon base ATK and percentage bonuses once", () => {
  const weapon = (id: string, attack: number): Weapon => ({
    id,
    name: id,
    rarity: 4,
    level: 90,
    ascension: 6,
    refinement: 1,
    stats: [{ key: "atk", value: attack }],
  });
  const character = {
    ...unit("7", "Bennett", "Pyro", 750, 0),
    weapon: weapon("1", 300),
    stats: { atk: 750, atk_: 50 },
  };
  const result = swapGear(character, weapon("2", 500), []);
  expect(result.base.atk).toBe(700);
  expect(result.stats.atk).toBe(1050);
  expect(resistanceMultiplier(-0.2)).toBeCloseTo(1.1);
  expect(resistanceMultiplier(0.75)).toBeCloseTo(0.25);
});

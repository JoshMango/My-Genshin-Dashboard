import { expect, it } from "vitest";
import type { Artifact, Character } from "@/lib/model";
import {
  artifactScore,
  artifactUpgrades,
  recommendBuild,
} from "@/lib/recommend/artifacts";
import { blankTeam, type Team } from "@/lib/teams";
import {
  combatStatLayout,
  essentialCombatStats,
} from "@/lib/recommend/combat-stats";

it("changes a Hyperbloom trigger to EM main stats and finds better inventory pieces", () => {
  const weak: Artifact = {
    id: "weak",
    slot: "Sands",
    setName: "Tenacity of the Millelith",
    rarity: 5,
    level: 20,
    main: { key: "hp_", value: 46.6 },
    substats: [{ key: "critDMG_", value: 20 }],
  };
  const better: Artifact = {
    ...weak,
    id: "better",
    setName: "Gilded Dreams",
    main: { key: "eleMas", value: 187 },
    substats: [{ key: "enerRech_", value: 19.4 }],
  };
  const character = {
    name: "Kuki Shinobu",
    element: "Electro",
    id: "1",
    stats: {},
    artifacts: [weak],
  } as Character;
  const team: Team = {
    ...blankTeam,
    goal: { archetype: "Reaction team", reaction: "Hyperbloom" },
  };
  const profile = recommendBuild(character, team);
  expect(profile).toMatchObject({
    role: "trigger",
    main: { Sands: ["eleMas", "enerRech_"], Goblet: ["eleMas"] },
  });
  expect(artifactScore(better, profile)).toBeGreaterThan(
    artifactScore(weak, profile),
  );
  expect(
    artifactUpgrades(character, [weak, better], profile)[0].artifact.id,
  ).toBe("better");
});

it("highlights the character's actual scaling and uses guide-backed signature sets", () => {
  const furina = { name: "Furina", element: "Hydro", stats: {} } as Character;
  const mavuika = { name: "Mavuika", element: "Pyro", stats: {} } as Character;
  expect(essentialCombatStats(furina)).toEqual(["hp", "critRate_", "critDMG_"]);
  expect(essentialCombatStats(mavuika)).toEqual([
    "atk",
    "critRate_",
    "critDMG_",
  ]);
  expect(combatStatLayout(mavuika)).toMatchObject({
    left: ["hp", "atk", "def", "eleMas", "enerRech_"],
    right: ["critRate_", "critDMG_", "pyro_dmg_"],
  });
  expect(combatStatLayout({ name: "Eula", element: "Cryo" }).right.at(-1)).toBe(
    "physical_dmg_",
  );
  expect(recommendBuild(furina, blankTeam).sets[0]).toBe("Golden Troupe");
  expect(recommendBuild(mavuika, blankTeam)).toMatchObject({
    sets: expect.arrayContaining([
      "Obsidian Codex",
      "Scroll of the Hero of Cinder City",
    ]),
    er: [],
    guideUrl: "https://keqingmains.com/q/mavuika-quickguide/",
  });
  const raiden = {
    name: "Raiden Shogun",
    element: "Electro",
    stats: {},
  } as Character;
  expect(
    recommendBuild(raiden, {
      ...blankTeam,
      goal: { archetype: "Reaction team", reaction: "Hyperbloom" },
    }).sets[0],
  ).toBe("Flower of Paradise Lost");
});

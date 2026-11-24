import { expect, it } from "vitest";
import type { Artifact, Character } from "@/lib/model";
import {
  artifactScore,
  artifactUpgrades,
  recommendBuild,
} from "@/lib/recommend/artifacts";
import { blankTeam, type Team } from "@/lib/teams";

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

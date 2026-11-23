import data from "@/data/build-profiles.json";
import archetypeData from "@/data/archetypes.json";
import type { Artifact, Character, Slot, StatKey, Stats } from "@/lib/model";
import { characterRoles, type Role, type Team } from "@/lib/teams";

type LayoutStat = StatKey | "element";
type Profile = {
  sets: string[];
  sands: LayoutStat[];
  goblet: LayoutStat[];
  circlet: LayoutStat[];
  weights: Stats;
  er: number[];
  em: number[];
  crit: number[];
};
type ProfileName = Role | "trigger";
type Override = Partial<Profile> & { profile: ProfileName };
const profiles = data.profiles as Record<ProfileName, Profile>;
const overrides = data.characters as Record<string, Override>;
const triggerReactions = [
  "Bloom",
  "Hyperbloom",
  "Burgeon",
  "Swirl",
  "Overloaded",
  "Electro-Charged",
  "Burning",
  "Superconduct",
];
const maxRoll: Stats = {
  hp: 299,
  hp_: 5.83,
  atk: 19.45,
  atk_: 5.83,
  def: 23.15,
  def_: 7.29,
  eleMas: 23.31,
  enerRech_: 6.48,
  critRate_: 3.89,
  critDMG_: 7.77,
};
export type BuildProfile = Omit<Profile, "sands" | "goblet" | "circlet"> & {
  role: ProfileName;
  main: Record<Slot, StatKey[]>;
  priority: StatKey[];
};

export function recommendBuild(character: Character, team: Team): BuildProfile {
  const goal = team.goal;
  const reaction = archetypeData.reactions[goal.reaction];
  const known = Object.hasOwn(overrides, character.name)
    ? overrides[character.name]
    : undefined;
  const role = characterRoles(character);
  const isTrigger =
    goal.archetype === "Reaction team" &&
    triggerReactions.includes(goal.reaction) &&
    !!character.element &&
    reaction.triggers.includes(character.element) &&
    (role.includes("enabler") ||
      role.includes("offField") ||
      role.includes("carry"));
  const chosen: ProfileName = isTrigger
    ? "trigger"
    : (known?.profile ?? role[0] ?? "carry");
  const profile =
    isTrigger || !known ? profiles[chosen] : { ...profiles[chosen], ...known };
  const hasBattery = team.slots.some(
    (member) =>
      member &&
      member.id !== character.id &&
      member.element === character.element &&
      !!member.element,
  );
  const er = profile.er.map((value) =>
    Math.max(100, value - (hasBattery ? 15 : 0)),
  );
  const weights = { ...profile.weights };
  if ((character.stats.enerRech_ ?? 100) >= er[0] && weights.enerRech_)
    weights.enerRech_ *= 0.6;
  if (
    goal.archetype !== "Hypercarry" &&
    ["Vaporize", "Melt", "Spread", "Aggravate", "Quicken"].includes(
      goal.reaction,
    ) &&
    character.element &&
    reaction.triggers.includes(character.element) &&
    (role.includes("carry") || role.includes("offField"))
  ) {
    weights.eleMas = Math.max(weights.eleMas ?? 0, 0.75);
  }
  const element = character.element
    ? (`${character.element.toLowerCase()}_dmg_` as StatKey)
    : "physical_dmg_";
  const mainStats = (items: LayoutStat[]): StatKey[] =>
    items.map((key) => (key === "element" ? element : key));
  const sets =
    isTrigger && goal.reaction === "Swirl"
      ? ["Viridescent Venerer"]
      : isTrigger && !["Bloom", "Hyperbloom", "Burgeon"].includes(goal.reaction)
        ? ["Gilded Dreams", "Thundering Fury", "Wanderer's Troupe"]
        : profile.sets;
  return {
    ...profile,
    sets,
    role: chosen,
    er,
    weights,
    main: {
      Flower: ["hp"],
      Plume: ["atk"],
      Sands: mainStats(profile.sands),
      Goblet: mainStats(profile.goblet),
      Circlet: mainStats(profile.circlet),
    },
    priority: (Object.entries(weights) as [StatKey, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key]) => key),
  };
}

export function artifactScore(artifact: Artifact, profile: BuildProfile) {
  const main = profile.main[artifact.slot].indexOf(artifact.main.key);
  const mainPoints = main === 0 ? 40 : main > 0 ? 31 : 0;
  const setPoints = profile.sets.includes(artifact.setName) ? 10 : 0;
  const weightedRolls = artifact.substats.reduce((sum, stat) => {
    const weight = profile.weights[stat.key] ?? 0;
    const equivalent =
      stat.rolls?.reduce((rolls, quality) => rolls + quality, 0) ??
      stat.value / (maxRoll[stat.key] ?? Number.POSITIVE_INFINITY);
    return sum + equivalent * weight;
  }, 0);
  return Math.round(mainPoints + setPoints + Math.min(50, weightedRolls * 7));
}

export function artifactUpgrades(
  character: Character,
  inventory: Artifact[],
  profile: BuildProfile,
) {
  const ranked = new Map<Slot, { artifact: Artifact; delta: number }>();
  const equipped = new Map(
    character.artifacts.map((artifact) => [artifact.slot, artifact]),
  );
  for (const artifact of inventory) {
    const old = equipped.get(artifact.slot);
    if (old?.id === artifact.id) continue;
    const delta =
      artifactScore(artifact, profile) -
      (old ? artifactScore(old, profile) : 0);
    if (delta > (ranked.get(artifact.slot)?.delta ?? 0))
      ranked.set(artifact.slot, { artifact, delta });
  }
  return [...ranked.values()].sort((a, b) => b.delta - a.delta);
}

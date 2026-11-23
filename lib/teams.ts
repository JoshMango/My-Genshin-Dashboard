import rolesByName from "@/data/roles.json";
import { characterGroup, isCharacter, record } from "./builds";
import { elements, type Character, type Element } from "./model";

export const roles = {
  carry: "Main DPS",
  offField: "Sub-DPS",
  buffer: "Buffer",
  sustain: "Healer / Shielder",
  enabler: "Enabler",
} as const;
export type Role = keyof typeof roles;
export type Archetype = "Hypercarry" | "Reaction team" | "Hybrid";
export type Goal = { archetype: Archetype; reaction: Reaction };
export const reactions = {
  Vaporize: [["Hydro", "Pyro"]],
  Melt: [["Cryo", "Pyro"]],
  Quicken: [["Dendro", "Electro"]],
  Spread: [["Dendro", "Electro"]],
  Aggravate: [["Dendro", "Electro"]],
  Bloom: [["Dendro", "Hydro"]],
  Hyperbloom: [["Dendro", "Hydro", "Electro"]],
  Burgeon: [["Dendro", "Hydro", "Pyro"]],
  Burning: [["Dendro", "Pyro"]],
  Overloaded: [["Electro", "Pyro"]],
  "Electro-Charged": [["Electro", "Hydro"]],
  Superconduct: [["Cryo", "Electro"]],
  Freeze: [["Cryo", "Hydro"]],
  Swirl: [
    ["Anemo", "Cryo"],
    ["Anemo", "Electro"],
    ["Anemo", "Hydro"],
    ["Anemo", "Pyro"],
  ],
  Crystallize: [
    ["Geo", "Cryo"],
    ["Geo", "Electro"],
    ["Geo", "Hydro"],
    ["Geo", "Pyro"],
  ],
} satisfies Record<string, Element[][]>;
export type Reaction = keyof typeof reactions;
export const archetypes: Archetype[] = [
  "Hypercarry",
  "Reaction team",
  "Hybrid",
];
export const defaultGoal: Goal = { archetype: "Hybrid", reaction: "Vaporize" };
export type Team = {
  id: string;
  name: string;
  goal: Goal;
  slots: (Character | null)[];
};
export const blankTeam: Team = {
  id: "",
  name: "",
  goal: defaultGoal,
  slots: [null, null, null, null],
};

export function characterRoles(character: Character): Role[] {
  const table: Partial<Record<string, Role[]>> = rolesByName as Partial<
    Record<string, Role[]>
  >;
  return Object.hasOwn(table, character.name)
    ? (table[character.name] ?? [])
    : [];
}

export function teamInfo(slots: Team["slots"]) {
  const lineup = slots.filter((item): item is Character => !!item);
  const active = new Set(lineup.flatMap((item) => item.element ?? []));
  const roleSet = new Set(lineup.flatMap(characterRoles));
  const resonance =
    lineup.length === 4
      ? [
          ...elements.filter(
            (element) =>
              lineup.filter((item) => item.element === element).length >= 2,
          ),
          ...(active.size === 4 ? ["Protective Canopy"] : []),
        ]
      : [];
  return {
    resonance,
    covered: [...roleSet],
    missing: (Object.keys(roles) as Role[]).filter(
      (role) => !roleSet.has(role),
    ),
    reactions: (Object.keys(reactions) as Reaction[]).filter((reaction) =>
      reactions[reaction].some((group) =>
        group.every((element) => active.has(element)),
      ),
    ),
  };
}

export function isGoal(value: unknown): value is Goal {
  return (
    record(value) &&
    archetypes.some((name) => name === value.archetype) &&
    typeof value.reaction === "string" &&
    Object.hasOwn(reactions, value.reaction)
  );
}

export function parseTeams(data: unknown): Team[] | undefined {
  if (!Array.isArray(data) || data.length > 100) return;
  return data.every(
    (team) =>
      record(team) &&
      typeof team.id === "string" &&
      team.id.length > 0 &&
      team.id.length <= 80 &&
      typeof team.name === "string" &&
      team.name.trim().length > 0 &&
      team.name.length <= 60 &&
      isGoal(team.goal) &&
      Array.isArray(team.slots) &&
      team.slots.length === 4 &&
      team.slots.every((entry) => entry === null || isCharacter(entry)) &&
      new Set(
        team.slots.filter(isCharacter).map((entry) => characterGroup(entry.id)),
      ).size === team.slots.filter(isCharacter).length,
  ) && new Set(data.map((team) => team.id)).size === data.length
    ? (data as Team[])
    : undefined;
}

export function placeCharacter(
  team: Team,
  slot: number,
  build: Character | null,
): Team {
  const index = build
    ? team.slots.findIndex(
        (entry) =>
          entry && characterGroup(entry.id) === characterGroup(build.id),
      )
    : -1;
  return {
    ...team,
    slots: team.slots.map((entry, position) =>
      position === slot ? build : position === index ? team.slots[slot] : entry,
    ),
  };
}

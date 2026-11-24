import archetypes from "@/data/archetypes.json";
import overrides from "@/data/character-tags.json";
import { characterGroup } from "@/lib/builds";
import { elements, type Character, type Element } from "@/lib/model";
import {
  characterRoles,
  reactions,
  roles,
  type Goal,
  type Reaction,
  type Role,
} from "@/lib/teams";

export type CharacterTags = {
  element?: Element;
  applications: Reaction[];
  roles: Role[];
  field: "on" | "off" | "flex";
  buffs: string[];
  energy: "none" | "low" | "medium" | "high";
};
type TagOverride = Partial<Omit<CharacterTags, "element" | "applications">>;
const tagsByName: Record<string, TagOverride> = overrides as Record<
  string,
  TagOverride
>;
const roleNames = Object.keys(roles) as Role[];
const bit = (index: number) => (index < 0 ? 0 : 1 << index);
const elementBit = (element?: Element) =>
  element ? bit(elements.indexOf(element)) : 0;
const roleBit = (role: Role) => bit(roleNames.indexOf(role));
const damage = roleBit("carry") | roleBit("offField");
const buffs = [
  ...new Set(Object.values(tagsByName).flatMap((tag) => tag.buffs ?? [])),
];

export function characterTags(character: Character): CharacterTags {
  const tag = Object.hasOwn(tagsByName, character.name)
    ? tagsByName[character.name]
    : {};
  const assigned = characterRoles(character);
  return {
    element: character.element,
    applications: (Object.keys(reactions) as Reaction[]).filter(
      (reaction) =>
        character.element &&
        archetypes.reactions[reaction].triggers.includes(character.element),
    ),
    roles: assigned,
    field:
      tag.field ??
      (assigned.includes("carry")
        ? assigned.includes("offField")
          ? "flex"
          : "on"
        : "off"),
    buffs: tag.buffs ?? [],
    energy:
      tag.energy ??
      (assigned.includes("offField") || assigned.includes("buffer")
        ? "medium"
        : "low"),
  };
}

export type DiscoveryRequest = {
  owned: Character[];
  previews: Character[];
  goal: Goal;
  mustInclude: string;
  exclude: string;
  allowUnowned: boolean;
  limit: number;
};
type Breakdown = {
  reaction: number;
  roles: number;
  resonance: number;
  buffs: number;
  investment: number;
  energy: number;
  overlap: number;
};
export type DiscoveryResult = {
  ids: string[];
  score: number;
  breakdown: Breakdown;
  missing: Role[];
  reason: string;
  surprising: boolean;
  unowned?: string;
};
export type DiscoveryResponse = {
  results: DiscoveryResult[];
  evaluated: number;
};

const commonCores = [
  ["Bennett", "Xiangling", "Xingqiu"],
  ["Bennett", "Xiangling", "Tartaglia"],
  ["Nahida", "Xingqiu", "Kuki Shinobu"],
  ["Furina", "Neuvillette", "Kaedehara Kazuha"],
  ["Kamisato Ayaka", "Shenhe", "Sangonomiya Kokomi"],
  ["Mavuika", "Xilonen", "Citlali"],
  ["Alhaitham", "Nahida", "Kuki Shinobu"],
  ["Skirk", "Escoffier", "Furina"],
  ["Bennett", "Furina", "Xianyun"],
  ["Fischl", "Nahida", "Keqing"],
];

function buildInvestment(character: Character) {
  const weapon = character.weapon ? (character.weapon.level / 90) * 3 : 0;
  const artifacts = character.artifacts.reduce(
    (sum, item) => sum + (item.level / 20) * 0.55 + item.substats.length * 0.09,
    0,
  );
  return Math.min(
    5,
    character.level / 90 +
      weapon * 0.55 +
      artifacts * 0.6 +
      character.constellation * 0.15,
  );
}

function count(mask: number) {
  let total = 0;
  while (mask) {
    mask &= mask - 1;
    total++;
  }
  return total;
}

export function discover(input: DiscoveryRequest): DiscoveryResponse {
  const { goal, mustInclude, exclude, allowUnowned } = input;
  const requestedGroup = exclude ? characterGroup(exclude) : "";
  const owned = input.owned.filter(
    (character) => character.source !== "preview",
  );
  const ownedGroups = new Set(
    owned.map((character) => characterGroup(character.id)),
  );
  const candidates = [
    ...owned,
    ...(allowUnowned
      ? input.previews.filter(
          (character) => !ownedGroups.has(characterGroup(character.id)),
        )
      : []),
  ].filter((character) => characterGroup(character.id) !== requestedGroup);
  if (candidates.length > 240)
    throw new Error(
      "This roster is too large to search. Remove duplicate entries from the import.",
    );
  const units = Array.from(
    new Map(candidates.map((character) => [character.id, character])).values(),
    (character) => {
      const tags = characterTags(character);
      return {
        character,
        group: characterGroup(character.id),
        element: elementBit(tags.element),
        roles: tags.roles.reduce((mask, role) => mask | roleBit(role), 0),
        on: Number(tags.field === "on"),
        buffs: tags.buffs.reduce(
          (mask, buff) => mask | bit(buffs.indexOf(buff)),
          0,
        ),
        buffCount: tags.buffs.length,
        trigger: Number(
          tags.applications.includes(goal.reaction) &&
            (tags.roles.includes("enabler") ||
              tags.roles.includes("offField") ||
              tags.roles.includes("carry")),
        ),
        unowned: Number(!ownedGroups.has(characterGroup(character.id))),
        energy:
          tags.energy === "high" && (character.stats.enerRech_ ?? 100) < 150
            ? 1
            : 0,
        investment: ownedGroups.has(characterGroup(character.id))
          ? buildInvestment(character)
          : 0,
      };
    },
  );
  const goalRule = archetypes.goals[goal.archetype];
  const masks = reactions[goal.reaction].map((list) =>
    list.reduce((mask, element) => mask | elementBit(element), 0),
  );
  const coveredPoints = Array.from(
    { length: 1 << roleNames.length },
    (_, mask) =>
      roleNames.reduce(
        (sum, role) =>
          sum + (mask & roleBit(role) ? goalRule.roleWeights[role] : 0),
        0,
      ),
  );
  const target = mustInclude
    ? units.findIndex(({ character }) => character.id === mustInclude)
    : -1;
  if (mustInclude && target < 0) return { results: [], evaluated: 0 };
  const limit = Math.min(25, Math.max(1, input.limit || 10));
  const results: DiscoveryResult[] = [];
  let evaluated = 0;
  for (let i = 0; i < units.length - 3; i++) {
    const a = units[i];
    if (target >= 0 && i > target) break;
    for (let j = i + 1; j < units.length - 2; j++) {
      const b = units[j];
      if (a.group === b.group || a.unowned + b.unowned > 1) continue;
      for (let k = j + 1; k < units.length - 1; k++) {
        const c = units[k];
        if (
          c.group === a.group ||
          c.group === b.group ||
          a.unowned + b.unowned + c.unowned > 1
        )
          continue;
        for (let l = k + 1; l < units.length; l++) {
          if (
            target >= 0 &&
            target !== i &&
            target !== j &&
            target !== k &&
            target !== l
          )
            continue;
          const d = units[l];
          if (
            d.group === a.group ||
            d.group === b.group ||
            d.group === c.group ||
            a.unowned + b.unowned + c.unowned + d.unowned > 1
          )
            continue;

          const roleMask = a.roles | b.roles | c.roles | d.roles;
          const fieldCount = a.on + b.on + c.on + d.on;
          if (
            !(roleMask & damage) ||
            fieldCount > 2 ||
            (goal.archetype === "Hypercarry" &&
              (!(roleMask & roleBit("carry")) || fieldCount > 1))
          )
            continue;
          const elementMask = a.element | b.element | c.element | d.element;
          const compatible = masks.some(
            (mask) => (elementMask & mask) === mask,
          );
          const triggerCount = a.trigger + b.trigger + c.trigger + d.trigger;
          if (
            goal.archetype === "Reaction team" &&
            (!compatible || !triggerCount)
          )
            continue;

          evaluated++;
          const resonance = count(elementMask) < 4 ? 4 : 2;
          const reaction =
            goal.archetype === "Hypercarry" || !compatible || !triggerCount
              ? 0
              : goalRule.fullReaction + Math.min(3, triggerCount) * 2;
          const coverage = Math.round(coveredPoints[roleMask] * 0.55);
          const buffCount = count(a.buffs | b.buffs | c.buffs | d.buffs);
          const buffPoints = Math.min(10, buffCount * 2);
          const overlap =
            Math.max(
              0,
              a.buffCount +
                b.buffCount +
                c.buffCount +
                d.buffCount -
                buffCount -
                1,
            ) +
            Math.max(0, fieldCount - 1) * goalRule.extraCarryPenalty;
          const investment = Math.round(
            a.investment + b.investment + c.investment + d.investment,
          );
          const energy =
            count(elementMask) < 4
              ? 3
              : 1 - (a.energy + b.energy + c.energy + d.energy);
          const score = Math.max(
            0,
            Math.min(
              100,
              reaction +
                coverage +
                resonance +
                buffPoints +
                investment +
                energy -
                overlap,
            ),
          );
          if (results.length === limit && score <= results[limit - 1].score)
            continue;

          const lineup = [a, b, c, d];
          const names = lineup.map(({ character }) => character.name);
          const missing = roleNames.filter(
            (role) => !(roleMask & roleBit(role)),
          );
          const known = commonCores.some((core) =>
            core.every((name) => names.includes(name)),
          );
          const result: DiscoveryResult = {
            ids: lineup.map(({ character }) => character.id),
            score,
            missing,
            breakdown: {
              reaction,
              roles: coverage,
              resonance,
              buffs: buffPoints,
              investment,
              energy,
              overlap,
            },
            surprising: !known,
            reason: reaction
              ? `Supports ${goal.reaction} with ${triggerCount} eligible reaction source${triggerCount === 1 ? "" : "s"}.`
              : `Covers ${roleNames.length - missing.length} roles with ${investment}/20 build investment.`,
            unowned: lineup.find((unit) => unit.unowned)?.character.id,
          };
          const position = results.findIndex((entry) => entry.score < score);
          results.splice(position < 0 ? results.length : position, 0, result);
          if (results.length > limit) results.pop();
        }
      }
    }
  }
  return { results, evaluated };
}

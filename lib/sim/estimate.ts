import archetypes from "@/data/archetypes.json";
import rotations from "@/data/rotations.json";
import type { Character, StatKey } from "@/lib/model";
import { effectiveness } from "@/lib/recommend/team";
import {
  characterRoles,
  teamInfo,
  type Archetype,
  type Reaction,
  type Team,
} from "@/lib/teams";

export type Rotation = {
  seconds: number;
  enemyLevel: number;
  resistance: number;
  uptime: number;
  buff: number;
  normalHits: number;
  skillHits: number;
  burstHits: number;
  reactionHits: number;
};
export const templates: Record<Archetype, Rotation> = rotations;
export type DamageShare = {
  id: string;
  name: string;
  normal: number;
  skill: number;
  burst: number;
  reaction: number;
  total: number;
  share: number;
};
export type SimulationResult = {
  dps: number;
  total: number;
  characters: DamageShare[];
  effectiveness: number;
  trigger?: string;
};
export type SimulationRequest = { team: Team; rotation: Rotation };
export interface SimulationEngine<
  Request = SimulationRequest,
  Result = SimulationResult,
> {
  simulate(request: Request): Result | Promise<Result>;
}

const transform: Partial<Record<Reaction, number>> = {
  Bloom: 2,
  Hyperbloom: 3,
  Burgeon: 3,
  Overloaded: 2.75,
  "Electro-Charged": 2,
  Superconduct: 1.5,
  Swirl: 0.6,
  Burning: 0.25,
};
const anchors = [
  0, 34.14, 80.58, 136.29, 207.38, 323.6, 492.88, 765.64, 1077.44, 1446.85,
  1674.81,
];
const hpScalers = new Set([
  "Neuvillette",
  "Yelan",
  "Furina",
  "Mualani",
  "Sangonomiya Kokomi",
  "Sigewinne",
]);
const defScalers = new Set([
  "Arataki Itto",
  "Noelle",
  "Albedo",
  "Chiori",
  "Xilonen",
  "Kachina",
]);

const clamp = (value: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.max(min, Math.min(value, max)) : min;

export function resistanceMultiplier(resistance: number) {
  return resistance < 0
    ? 1 - resistance / 2
    : resistance < 0.75
      ? 1 - resistance
      : 1 / (4 * resistance + 1);
}

function levelMultiplier(level: number) {
  const bounded = clamp(level, 1, 100) / 10;
  const floor = Math.floor(bounded);
  return (
    anchors[floor] +
    ((anchors[floor + 1] ?? anchors[floor]) - anchors[floor]) *
      (bounded - floor)
  );
}

function talentMultiplier(character: Character, index: number) {
  const talent = character.talents[index];
  const level = (talent?.level ?? 8) + (talent?.bonus ?? 0);
  return 1 + 0.09 * (clamp(level, 1, 15) - 1);
}

function directDamage(character: Character, rotation: Rotation) {
  const tags = characterRoles(character);
  const carry = tags.includes("carry");
  const offField = tags.includes("offField");
  const scale = hpScalers.has(character.name)
    ? (character.stats.hp ?? 0) * 0.055
    : defScalers.has(character.name)
      ? (character.stats.def ?? 0) * 1.1
      : (character.stats.atk ?? 0);
  const level = clamp(character.level, 1, 100);
  const defense =
    (level + 100) / (level + clamp(rotation.enemyLevel, 1, 200) + 200);
  const resistance = resistanceMultiplier(
    clamp(rotation.resistance, -100, 200) / 100,
  );
  const crit =
    1 +
    clamp((character.stats.critRate_ ?? 5) / 100, 0, 1) *
      Math.max(0, (character.stats.critDMG_ ?? 50) / 100);
  const bonus = character.element
    ? (`${character.element.toLowerCase()}_dmg_` as StatKey)
    : "physical_dmg_";
  const scalar =
    scale *
    defense *
    resistance *
    crit *
    Math.max(
      0,
      1 + ((character.stats[bonus] ?? 0) + clamp(rotation.buff, 0, 400)) / 100,
    );
  return {
    normal:
      scalar *
      0.68 *
      talentMultiplier(character, 0) *
      clamp(rotation.normalHits, 0, 100) *
      (carry ? 1 : 0.12),
    skill:
      scalar *
      1.2 *
      talentMultiplier(character, 1) *
      clamp(rotation.skillHits, 0, 100) *
      (carry || offField ? 1 : 0.52),
    burst:
      scalar *
      1.55 *
      talentMultiplier(character, 2) *
      clamp(rotation.burstHits, 0, 100) *
      (carry || offField ? 1 : 0.58),
  };
}

export const estimator: SimulationEngine = {
  simulate({ team, rotation }) {
    const lineup = team.slots.filter(
      (character): character is Character => !!character,
    );
    const reaction = team.goal.reaction;
    const rule = archetypes.reactions[reaction];
    const enabling =
      team.goal.archetype !== "Hypercarry" &&
      teamInfo(team.slots).reactions.includes(reaction);
    const elemental = lineup.filter(
      (character) =>
        character.element && rule.triggers.includes(character.element),
    );
    const trigger = enabling
      ? elemental.sort((a, b) => {
          if (transform[reaction])
            return (b.stats.eleMas ?? 0) - (a.stats.eleMas ?? 0);
          return (
            Number(characterRoles(b).includes("carry")) -
              Number(characterRoles(a).includes("carry")) ||
            (b.stats.atk ?? 0) - (a.stats.atk ?? 0)
          );
        })[0]
      : undefined;
    const uptime = clamp(rotation.uptime, 0, 100) / 100;
    const results = lineup.map((character) => {
      const direct = directDamage(character, rotation);
      const em = clamp(character.stats.eleMas ?? 0, 0, 10_000);
      const hits = clamp(rotation.reactionHits, 0, 100);
      let extra = 0;
      if (trigger === character) {
        const level = levelMultiplier(character.level);
        const res = resistanceMultiplier(
          clamp(rotation.resistance, -100, 200) / 100,
        );
        const effect = transform[reaction];
        const directTotal = direct.normal + direct.skill + direct.burst;
        const totalHits = Math.max(
          1,
          rotation.normalHits + rotation.skillHits + rotation.burstHits,
        );
        const directEvents = Math.min(hits, totalHits);
        if (effect)
          extra = effect * level * (1 + (16 * em) / (2000 + em)) * res * hits;
        else if (reaction === "Vaporize" || reaction === "Melt") {
          const forward =
            reaction === "Vaporize"
              ? character.element === "Hydro"
              : character.element === "Pyro";
          extra =
            (directTotal / totalHits) *
            ((forward ? 2 : 1.5) * (1 + (2.78 * em) / (1400 + em)) - 1) *
            directEvents;
        } else if (["Quicken", "Spread", "Aggravate"].includes(reaction)) {
          const crit =
            1 +
            clamp((character.stats.critRate_ ?? 5) / 100, 0, 1) *
              Math.max(0, (character.stats.critDMG_ ?? 50) / 100);
          const levelValue = clamp(character.level, 1, 100);
          const defense =
            (levelValue + 100) /
            (levelValue + clamp(rotation.enemyLevel, 1, 200) + 200);
          const stat =
            character.element === "Dendro" ? "dendro_dmg_" : "electro_dmg_";
          const bonus =
            1 +
            ((character.stats[stat] ?? 0) + clamp(rotation.buff, 0, 400)) / 100;
          extra =
            (character.element === "Dendro" ? 1.25 : 1.15) *
            level *
            (1 + (5 * em) / (1200 + em)) *
            res *
            defense *
            crit *
            bonus *
            directEvents;
        }
      }
      const normal = direct.normal * uptime;
      const skill = direct.skill * uptime;
      const burst = direct.burst * uptime;
      const reactionDamage = extra * uptime;
      return {
        id: character.id,
        name: character.name,
        normal,
        skill,
        burst,
        reaction: reactionDamage,
        total: normal + skill + burst + reactionDamage,
        share: 0,
      };
    });
    const total = results.reduce((sum, result) => sum + result.total, 0);
    return {
      total,
      dps: total / clamp(rotation.seconds, 1, 180),
      effectiveness: effectiveness(team),
      characters: results.map((result) => ({
        ...result,
        share: total ? (result.total / total) * 100 : 0,
      })),
      trigger: trigger?.name,
    };
  },
};

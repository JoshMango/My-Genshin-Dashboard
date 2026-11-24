import config from "@/data/archetypes.json";
import { characterGroup } from "@/lib/builds";
import type { Character } from "@/lib/model";
import {
  characterRoles,
  roles,
  teamInfo,
  type Role,
  type Team,
} from "@/lib/teams";

export function effectiveness(team: {
  goal: Team["goal"];
  slots: (Candidate | null)[];
}) {
  const lineup = team.slots.filter((item) => item !== null);
  const summary = teamInfo(team.slots);
  const goal = config.goals[team.goal.archetype];
  const reaction = config.reactions[team.goal.reaction];
  const elements = new Set(lineup.map((character) => character.element));
  const progress = Math.max(
    ...reaction.elements.map(
      (group) =>
        group.filter((element) => elements.has(element as Character["element"]))
          .length,
    ),
  );
  const carries = lineup.filter((character) =>
    characterRoles(character).includes("carry"),
  ).length;
  const specialists = lineup.filter((character) =>
    reaction.preferred.includes(character.name),
  ).length;
  const resonance = summary.resonance.length > 0 ? 4 : 0;
  const coverage = summary.covered.reduce(
    (sum, role) => sum + goal.roleWeights[role],
    0,
  );
  const reactionScore =
    team.goal.archetype === "Hypercarry"
      ? 0
      : progress * goal.element +
        (summary.reactions.includes(team.goal.reaction)
          ? goal.fullReaction
          : 0) +
        Math.min(3, specialists) * 2;
  return Math.max(
    0,
    Math.min(
      100,
      coverage +
        reactionScore +
        resonance -
        Math.max(0, carries - 1) * goal.extraCarryPenalty,
    ),
  );
}

export type Candidate = Pick<Character, "id" | "name" | "element" | "icon">;
export type Suggestion = {
  candidate: Candidate;
  delta: number;
  reason: string;
};

export function suggest(
  team: Team,
  slot: number,
  candidates: Candidate[],
): Suggestion[] {
  const current = effectiveness(team);
  const starting = teamInfo(team.slots);
  const hadReaction = starting.reactions.includes(team.goal.reaction);
  const occupied = new Set(
    team.slots.flatMap((entry) => (entry ? characterGroup(entry.id) : [])),
  );
  const wanted = config.reactions[team.goal.reaction];
  const targetElements = new Set(wanted.elements.flat());
  return candidates
    .flatMap((candidate) => {
      if (occupied.has(characterGroup(candidate.id))) return [];
      // The ranking uses identity and roles. Gear enters the calculation on the Compare page.
      const next = {
        ...team,
        slots: team.slots.map((entry, index) =>
          index === slot ? candidate : entry,
        ),
      };
      const summary = teamInfo(next.slots);
      const added = summary.covered.filter(
        (role) => !starting.covered.includes(role),
      );
      const completions =
        team.goal.archetype !== "Hypercarry" &&
        !hadReaction &&
        summary.reactions.includes(team.goal.reaction);
      const roleReason = (found: Role[]) =>
        found.map((role) => roles[role]).join(" and ");
      const reason = completions
        ? `Completes the ${team.goal.reaction} elements.`
        : added.length
          ? `Adds ${roleReason(added)} coverage.`
          : summary.resonance.length > starting.resonance.length
            ? `Activates ${summary.resonance.join(" and ")} resonance.`
            : team.goal.archetype !== "Hypercarry" &&
                candidate.element &&
                targetElements.has(candidate.element)
              ? `Adds ${candidate.element} application for ${team.goal.reaction}.`
              : "Fits the open slot without adding a missing role.";
      return [{ candidate, reason, delta: effectiveness(next) - current }];
    })
    .sort(
      (a, b) =>
        b.delta - a.delta ||
        Number(wanted.preferred.includes(b.candidate.name)) -
          Number(wanted.preferred.includes(a.candidate.name)) ||
        a.candidate.name.localeCompare(b.candidate.name),
    );
}

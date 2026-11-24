import { expect, it } from "vitest";
import type { Character } from "@/lib/model";
import { suggest } from "@/lib/recommend/team";
import { blankTeam, type Team } from "@/lib/teams";

it("prioritizes the missing reaction element and excludes characters already in the lineup", () => {
  const nahida = { id: "1", name: "Nahida", element: "Dendro" } as Character;
  const xingqiu = { id: "2", name: "Xingqiu", element: "Hydro" } as Character;
  const team: Team = {
    ...blankTeam,
    goal: { archetype: "Reaction team", reaction: "Hyperbloom" },
    slots: [nahida, xingqiu, null, null],
  };
  const results = suggest(team, 2, [
    nahida,
    { id: "3", name: "Jean", element: "Anemo" },
    { id: "4", name: "Kuki Shinobu", element: "Electro" },
  ]);
  expect(results.map((result) => result.candidate.name)).toEqual([
    "Kuki Shinobu",
    "Jean",
  ]);
  expect(results[0]).toMatchObject({
    reason: "Completes the Hyperbloom elements.",
  });
  expect(results[0].delta).toBeGreaterThan(0);
});

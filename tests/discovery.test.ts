import { expect, it } from "vitest";
import { discover, type DiscoveryRequest } from "@/lib/recommend/discovery";
import type { Character, Element } from "@/lib/model";

function build(
  id: string,
  name: string,
  element: Element,
  source: Character["source"] = "good",
): Character {
  return {
    id,
    name,
    element,
    source,
    rarity: 5,
    level: 90,
    ascension: 6,
    constellation: 2,
    talents: [],
    constellations: [],
    artifacts: [],
    base: {},
    stats: { enerRech_: 180 },
  };
}
const nahida = build("1", "Nahida", "Dendro");
const xingqiu = build("2", "Xingqiu", "Hydro");
const jean = build("3", "Jean", "Anemo");
const bennett = build("4", "Bennett", "Pyro");
const kuki = build("5", "Kuki Shinobu", "Electro", "preview");
const fischl = build("6", "Fischl", "Electro", "preview");
const request: DiscoveryRequest = {
  owned: [nahida, xingqiu, jean, bennett],
  previews: [kuki, fischl],
  goal: { archetype: "Reaction team", reaction: "Hyperbloom" },
  allowUnowned: true,
  mustInclude: "",
  exclude: "",
  limit: 10,
};

it("uses owned builds and at most one catalog character to complete a target reaction", () => {
  expect(discover({ ...request, allowUnowned: false }).results).toEqual([]);
  const { results } = discover(request);
  expect(results.length).toBeGreaterThan(0);
  for (const result of results) {
    expect(result.ids).toEqual(expect.arrayContaining(["1", "2"]));
    expect(result.ids.filter((id) => id === "5" || id === "6")).toHaveLength(1);
    expect(result.breakdown.reaction).toBeGreaterThan(0);
  }
  expect(
    discover({ ...request, mustInclude: "5", exclude: "5" }).results,
  ).toHaveLength(0);
  expect(
    discover({ ...request, mustInclude: "5", exclude: "3" }).results[0].ids,
  ).toEqual(["1", "2", "4", "5"]);
});

it("prunes duplicate variants and bounds the returned list during full enumeration", () => {
  const owned = Array.from({ length: 40 }, (_, index) =>
    build(
      `${index + 20}`,
      index % 4 ? "Fischl" : "Mavuika",
      index % 4 ? "Electro" : "Pyro",
    ),
  );
  const result = discover({
    ...request,
    owned: [...owned, { ...owned[0], id: "20-1" }],
    previews: [],
    goal: { archetype: "Hybrid", reaction: "Overloaded" },
    limit: 5,
  });
  expect(result.evaluated).toBeGreaterThan(85_000);
  expect(result.results).toHaveLength(5);
  expect(
    result.results.every(
      ({ ids }) => !(ids.includes("20") && ids.includes("20-1")),
    ),
  ).toBe(true);
});

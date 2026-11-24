import { expect, it } from "vitest";
import {
  emptyRoster,
  mergedCharacters,
  parseRoster,
  withShowcase,
} from "@/lib/roster";
import type { Character } from "@/lib/model";

function model(id: string, source: Character["source"]): Character {
  return {
    id,
    source,
    name: id,
    level: 90,
    rarity: 5,
    ascension: 6,
    constellation: 0,
    talents: [],
    constellations: [],
    artifacts: [],
    stats: {},
    base: {},
  };
}

it("retains rotated showcase builds, honors owned data over previews, and switches UIDs cleanly", () => {
  const initial = {
    ...emptyRoster,
    imported: [model("1", "good")],
    manual: [model("1", "preview")],
  };
  const first = withShowcase(initial, {
    uid: "612345678",
    characters: [model("1", "showcase")],
  });
  const rotated = withShowcase(first, {
    uid: "612345678",
    characters: [model("2", "showcase")],
  });
  expect(
    mergedCharacters(parseRoster(JSON.parse(JSON.stringify(rotated)))!),
  ).toEqual([model("1", "showcase"), model("2", "showcase")]);
  const other = withShowcase(rotated, { uid: "612345679", characters: [] });
  expect(mergedCharacters(other)).toEqual([model("1", "good")]);
});

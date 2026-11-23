import type { Character, Slot } from "@/lib/model";

const base =
  "https://raw.githubusercontent.com/theBowja/genshin-db/8e5badd60b5d894284ccc927a56c9683529d2592/src/data/English";
type Text = { name?: string; description?: string };
type Talents = { combat1?: Text; combat2?: Text; combat3?: Text };
type Refinement = { description?: string; values?: string[] } | string[];
type WeaponText = {
  id?: number;
  effectName?: string;
  effectTemplateRaw?: string;
  r1?: Refinement;
  r2?: Refinement;
  r3?: Refinement;
  r4?: Refinement;
  r5?: Refinement;
};
export const artifactPieceFields: Record<
  Slot,
  "flower" | "plume" | "sands" | "goblet" | "circlet"
> = {
  Flower: "flower",
  Plume: "plume",
  Sands: "sands",
  Goblet: "goblet",
  Circlet: "circlet",
};
type SetText = { effect2Pc?: string; effect4Pc?: string } & Partial<
  Record<(typeof artifactPieceFields)[Slot], Text>
>;

const pending = new Map<string, Promise<unknown>>();

export function gameDataKey(name: string) {
  return name
    .normalize("NFD")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function get<T>(category: string, name: string): Promise<T | undefined> {
  const key = gameDataKey(name);
  if (!key) return Promise.resolve(undefined);
  const url = `${base}/${category}/${key}.json`;
  if (!pending.has(url)) {
    pending.set(
      url,
      fetch(url, { signal: AbortSignal.timeout(6_000) })
        .then((response) => {
          if (response.status === 404) return undefined;
          if (!response.ok) throw new Error("Description unavailable");
          return response.json();
        })
        .catch(() => {
          pending.delete(url);
          return undefined;
        }),
    );
  }
  return pending.get(url) as Promise<T | undefined>;
}

export async function loadDescriptions(character: Character) {
  const sourceName =
    character.name === "Traveler" && character.element
      ? `Traveler ${character.element}`
      : character.name;
  const sets = [
    ...new Set(character.artifacts.map((artifact) => artifact.setName)),
  ];
  const [talent, constellation, weapon, setInfo] = await Promise.all([
    get<Talents>("talents", sourceName),
    get<Record<string, Text>>("constellations", sourceName),
    character.weapon && get<WeaponText>("weapons", character.weapon.name),
    Promise.all(
      sets.map(
        async (name) => [name, await get<SetText>("artifacts", name)] as const,
      ),
    ),
  ]);
  const rank = character.weapon?.refinement ?? 1;
  const refinement = weapon?.[`r${rank}` as "r1"];
  const values = Array.isArray(refinement)
    ? refinement
    : (refinement?.values ?? []);
  const effect =
    (!Array.isArray(refinement) && refinement?.description) ||
    weapon?.effectTemplateRaw?.replace(
      /\{(\d+)\}/g,
      (token, index: string) => values[Number(index)] ?? token,
    );
  return {
    talents: [talent?.combat1, talent?.combat2, talent?.combat3],
    constellations: Array.from(
      { length: 6 },
      (_, index) => constellation?.[`c${index + 1}`],
    ),
    weaponName: weapon?.effectName,
    weaponText: effect?.replace(/<[^>]+>/g, "").replace(/\\n/g, "\n"),
    sets: Object.fromEntries(setInfo),
  };
}

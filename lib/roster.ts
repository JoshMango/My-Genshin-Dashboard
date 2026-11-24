import { isCharacter, record } from "./builds";
import { parseGood, type Good } from "./good";
import type { Character, Profile } from "./model";

export type Roster = {
  manual: Character[];
  imported: Character[];
  good?: Good;
  profile?: Profile;
};
export const emptyRoster: Roster = { manual: [], imported: [] };
const isList = (value: unknown): value is Character[] =>
  Array.isArray(value) && value.length <= 500 && value.every(isCharacter);

function isProfile(value: unknown): value is Profile {
  return (
    record(value) &&
    typeof value.uid === "string" &&
    /^[1-9]\d{8,9}$/.test(value.uid) &&
    (value.nickname === undefined || typeof value.nickname === "string") &&
    (value.signature === undefined || typeof value.signature === "string") &&
    (value.namecard === undefined || typeof value.namecard === "string") &&
    (value.rank === undefined ||
      (typeof value.rank === "number" && Number.isFinite(value.rank))) &&
    isList(value.characters) &&
    value.characters.every((character) => character.source === "showcase")
  );
}

export function parseRoster(value: unknown): Roster | undefined {
  if (
    !record(value) ||
    !isList(value.manual) ||
    !isList(value.imported) ||
    (value.good !== undefined && !parseGood(value.good)) ||
    (value.profile !== undefined && !isProfile(value.profile))
  )
    return;
  return value as Roster;
}

function mergeById(...lists: Character[][]) {
  return [
    ...new Map(
      lists.flat().map((character) => [character.id, character]),
    ).values(),
  ];
}

export function withShowcase(roster: Roster, profile: Profile): Roster {
  return {
    ...roster,
    profile: {
      ...profile,
      characters:
        roster.profile?.uid === profile.uid
          ? mergeById(roster.profile.characters, profile.characters)
          : profile.characters,
    },
  };
}

export function mergedCharacters(roster: Roster) {
  return mergeById(
    roster.manual.filter((character) => character.source === "preview"),
    roster.imported,
    roster.profile?.characters ?? [],
    roster.manual.filter((character) => character.source !== "preview"),
  );
}

export function mergeRosterBackup(current: Roster, incoming: Roster): Roster {
  const roster = {
    ...current,
    manual: mergeById(current.manual, incoming.manual),
    imported: mergeById(current.imported, incoming.imported),
    good: incoming.good ?? current.good,
  };
  return incoming.profile ? withShowcase(roster, incoming.profile) : roster;
}

"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useBrowserState } from "@/lib/browser-state";
import { isCharacter, record } from "@/lib/builds";
import { parseGood, type Good } from "@/lib/good";
import type { Character, Profile } from "@/lib/model";
import { blankTeam, parseTeams, type Team } from "@/lib/teams";

type LocalRoster = { manual: Character[]; imported: Character[]; good?: Good };
const emptyRoster: LocalRoster = { manual: [], imported: [] };
const noTeams: Team[] = [];
const parseRoster = (value: unknown): LocalRoster | undefined => {
  if (
    !record(value) ||
    !Array.isArray(value.manual) ||
    !value.manual.every(isCharacter) ||
    !Array.isArray(value.imported) ||
    !value.imported.every(isCharacter) ||
    (value.good !== undefined && !parseGood(value.good))
  )
    return;
  return value as LocalRoster;
};

type Dashboard = {
  profile?: Profile;
  setProfile: (profile: Profile) => void;
  characters: Character[];
  good?: Good;
  importGood: (data: Good, imported: Character[]) => boolean;
  addManual: (character: Character) => boolean;
  draft: Team;
  setDraft: (team: Team) => void;
  saved: Team[];
  setSaved: (teams: Team[]) => boolean;
};
const DashboardContext = createContext<Dashboard | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [profile, updateProfile] = useState<Profile>();
  const [draft, setDraft] = useState(blankTeam);
  const [saved, setSaved] = useBrowserState(
    "genshin.teams.v1",
    noTeams,
    parseTeams,
  );
  const [roster, setRoster] = useBrowserState(
    "genshin.roster.v1",
    emptyRoster,
    parseRoster,
  );
  const characters = [
    ...new Map(
      [
        ...roster.imported,
        ...(profile?.characters ?? []),
        ...roster.manual,
      ].map((entry) => [entry.id, entry]),
    ).values(),
  ];
  return (
    <DashboardContext.Provider
      value={{
        profile,
        setProfile: (next) =>
          updateProfile((previous) =>
            previous?.uid === next.uid
              ? {
                  ...next,
                  characters: [
                    ...new Map(
                      [...previous.characters, ...next.characters].map(
                        (entry) => [entry.id, entry],
                      ),
                    ).values(),
                  ],
                }
              : next,
          ),
        characters,
        good: roster.good,
        importGood: (good, imported) =>
          setRoster({ ...roster, good, imported }),
        addManual: (character) =>
          setRoster({
            ...roster,
            manual: [
              ...roster.manual.filter((entry) => entry.id !== character.id),
              character,
            ],
          }),
        draft,
        setDraft,
        saved,
        setSaved,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const dashboard = useContext(DashboardContext);
  if (!dashboard) throw new Error("DashboardProvider is required.");
  return dashboard;
}

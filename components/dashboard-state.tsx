"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useBrowserState } from "@/lib/browser-state";
import type { Good } from "@/lib/good";
import type { Character, Profile } from "@/lib/model";
import {
  emptyRoster,
  mergeRosterBackup,
  mergedCharacters,
  parseRoster,
  withShowcase,
  type Roster,
} from "@/lib/roster";
import { blankTeam, parseTeams, type Team } from "@/lib/teams";

const noTeams: Team[] = [];

type WhatIf = { original: Character; variant: Character; team?: Team };

type Dashboard = {
  whatIf?: WhatIf;
  setWhatIf: (build: WhatIf) => void;
  profile?: Profile;
  setProfile: (profile: Profile) => boolean;
  roster: Roster;
  importRoster: (incoming: Roster) => boolean;
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
  const [whatIf, setWhatIf] = useState<Dashboard["whatIf"]>();
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
  return (
    <DashboardContext.Provider
      value={{
        whatIf,
        setWhatIf,
        profile: roster.profile,
        setProfile: (next) =>
          setRoster((previous) => withShowcase(previous, next)),
        characters: mergedCharacters(roster),
        roster,
        importRoster: (incoming) => {
          return setRoster((previous) => {
            const merged = parseRoster(mergeRosterBackup(previous, incoming));
            if (!merged) throw new Error("Roster is too large.");
            return merged;
          });
        },
        good: roster.good,
        importGood: (good, imported) =>
          setRoster((previous) => ({ ...previous, good, imported })),
        addManual: (character) =>
          setRoster((previous) => ({
            ...previous,
            manual: [
              ...previous.manual.filter((entry) => entry.id !== character.id),
              character,
            ],
          })),
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

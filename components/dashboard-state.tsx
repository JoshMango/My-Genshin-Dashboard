"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Character, Profile } from "@/lib/model";

type Dashboard = {
  profile?: Profile;
  setProfile: (profile: Profile) => void;
  characters: Character[];
};

const DashboardContext = createContext<Dashboard | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>();
  return (
    <DashboardContext.Provider
      value={{ profile, setProfile, characters: profile?.characters ?? [] }}
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

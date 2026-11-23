"use client";

import { useState, type FormEvent } from "react";
import { loadCatalog } from "@/lib/enka/catalog";
import { normalizeProfile } from "@/lib/enka/normalize";
import type { EnkaResponse } from "@/lib/enka/types";
import { CharacterCard } from "./character-card";
import { useDashboard } from "./dashboard-state";
import { GameIcon } from "./game-icon";
import { InventoryImport } from "./inventory-import";
import { ManualBuild } from "./manual-build";

export function ProfileScreen() {
  const { profile, setProfile, characters } = useDashboard();
  const [uid, setUid] = useState(profile?.uid ?? "");
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState("");

  async function lookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = uid.trim();
    if (!/^[1-9]\d{8,9}$/.test(value)) {
      setFailure("Enter the 9- or 10-digit UID shown in Genshin Impact.");
      return;
    }
    setFailure("");
    setPending(true);
    try {
      const response = await fetch(`/api/enka/${value}`, {
        signal: AbortSignal.timeout(18_000),
      });
      const data = (await response.json()) as EnkaResponse & {
        message?: string;
      };
      if (!response.ok)
        throw new Error(
          data.message ?? "Showcase lookup failed. Try again shortly.",
        );
      setProfile(normalizeProfile(value, data, await loadCatalog()));
    } catch (error) {
      setFailure(
        error instanceof Error && error.name === "Error"
          ? error.message
          : "The showcase could not load. Check your connection and try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <section className="hero panel profile-hero">
        <div className="hero-orbit" aria-hidden="true">
          <span>✦</span>
        </div>
        <div className="hero-content">
          <h1>
            My Genshin
            <br />
            Dashboard
          </h1>
          <p>Explore your showcase, plan reaction teams, and compare builds.</p>
          <form className="uid-form" onSubmit={lookup}>
            <label htmlFor="uid">Genshin UID</label>
            <div className="input-row">
              <input
                id="uid"
                value={uid}
                onChange={(event) => setUid(event.target.value)}
                inputMode="numeric"
                maxLength={10}
                placeholder="Enter your UID"
                required
                disabled={pending}
                aria-describedby="showcase-hint"
              />
              <button type="submit" disabled={pending}>
                {pending ? "Importing…" : "Import showcase"}
              </button>
            </div>
          </form>
          {failure && (
            <p className="error" role="alert">
              {failure}
            </p>
          )}
        </div>
      </section>
      <div className="import-grid section-space">
        <InventoryImport />
        <ManualBuild />
      </div>

      <section
        className="section-space"
        aria-labelledby="roster-heading"
        aria-busy={pending}
      >
        <div className="section-heading">
          <h2 id="roster-heading">Character roster</h2>
          {!!characters.length && (
            <span className="muted">{characters.length} characters</span>
          )}
        </div>
        {pending && (
          <div
            className="roster-grid"
            role="status"
            aria-label="Loading showcase"
          >
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="panel skeleton" aria-hidden="true" />
            ))}
          </div>
        )}
        {!pending && profile && (
          <div className="panel player-card">
            {profile.namecard && (
              <GameIcon src={profile.namecard} alt="" size={84} />
            )}
            <div>
              <h3>{profile.nickname || `UID ${profile.uid}`}</h3>
              <p className="muted">
                {profile.rank !== undefined
                  ? `Adventure Rank ${profile.rank} · `
                  : ""}
                UID {profile.uid}
              </p>
              {profile.signature && <p>{profile.signature}</p>}
            </div>
          </div>
        )}
        {!pending &&
          (characters.length > 0 ? (
            <div className="roster-grid">
              {characters.map((character) => (
                <CharacterCard key={character.id} character={character} />
              ))}
            </div>
          ) : (
            <div className="panel empty-roster">
              <span className="empty-symbol" aria-hidden="true">
                ◇
              </span>
              <div>
                <h3>
                  {profile
                    ? "No public showcase builds"
                    : "Import your first showcase"}
                </h3>
                <p className="muted" id="showcase-hint">
                  In Genshin Impact, open your profile, add characters to the
                  Character Showcase, and enable Show Character Details. Rotate
                  characters into those slots to import more builds.
                </p>
              </div>
            </div>
          ))}
        {(pending || characters.length > 0) && (
          <p className="muted" id="showcase-hint">
            Only your public showcase is imported. Rotate characters in-game to
            load additional builds.
          </p>
        )}
      </section>
    </>
  );
}

"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { saveJson } from "@/lib/browser-state";
import { loadCatalog } from "@/lib/enka/catalog";
import { normalizeProfile } from "@/lib/enka/normalize";
import type { EnkaResponse } from "@/lib/enka/types";
import { elements } from "@/lib/model";
import { parseRoster } from "@/lib/roster";
import { ActionIcon } from "./action-icon";
import { CharacterCard } from "./character-card";
import { useDashboard } from "./dashboard-state";
import { GameIcon } from "./game-icon";
import { InventoryImport } from "./inventory-import";
import { ManualBuild } from "./manual-build";

const importTabs = [
  ["Enka UID", "id"],
  ["Upload GOOD file", "upload"],
  ["Add manually", "edit"],
] as const;

export function ProfileScreen() {
  const { profile, setProfile, characters, roster, importRoster } =
    useDashboard();
  const [uid, setUid] = useState<string>();
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState("");
  const [tab, setTab] = useState(0);
  const goodTab = useRef<HTMLButtonElement>(null);
  const [element, setElement] = useState("");
  const [rarity, setRarity] = useState("");
  const [source, setSource] = useState("");
  const [needsBuild, setNeedsBuild] = useState(false);
  const [backupNotice, setBackupNotice] = useState("");
  const visible = characters.filter(
    (character) =>
      (!element || character.element === element) &&
      (!rarity || String(character.rarity) === rarity) &&
      (!source ||
        (source === "imported"
          ? character.source === "good" || character.source === "manual"
          : character.source === source)) &&
      (!needsBuild || !character.weapon || character.artifacts.length < 5),
  );

  async function lookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = (uid ?? profile?.uid ?? "").trim();
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
      if (!setProfile(normalizeProfile(value, data, await loadCatalog()))) {
        throw new Error(
          "Browser storage is unavailable or full. Your previous roster is still available.",
        );
      }
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

  async function uploadBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error();
      const backup: unknown = JSON.parse(await file.text());
      const incoming =
        typeof backup === "object" &&
        backup &&
        "version" in backup &&
        backup.version === 1 &&
        "roster" in backup &&
        parseRoster(backup.roster);
      if (!incoming) throw new Error();
      setBackupNotice(
        importRoster(incoming)
          ? "Roster backup merged."
          : "This browser could not store the merged roster.",
      );
    } catch {
      setBackupNotice(
        "Choose a valid dashboard roster JSON backup under 5 MB.",
      );
    }
  }

  return (
    <div className="roster-home">
      <section className="hero panel profile-hero">
        <div className="hero-orbit" aria-hidden="true" />
        <span className="roster-emblem" aria-hidden="true">
          ✦
        </span>
        <h1>Character roster</h1>
        {profile ? (
          <div className="player-card">
            {profile.namecard && (
              <GameIcon src={profile.namecard} alt="" size={84} />
            )}
            <div>
              <h2>{profile.nickname || `UID ${profile.uid}`}</h2>
              <p className="muted">
                {profile.rank !== undefined
                  ? `Adventure Rank ${profile.rank} · `
                  : ""}
                UID {profile.uid}
              </p>
              {profile.signature && (
                <p className="profile-bio">
                  <strong>Bio:</strong> <span>{profile.signature}</span>
                </p>
              )}
              {!profile.characters.length && (
                <p className="muted">No public showcase builds</p>
              )}
            </div>
          </div>
        ) : (
          <p>Import your characters, find new teams, and compare builds.</p>
        )}
        {profile && (
          <nav className="profile-links" aria-label="Profile links">
            <a
              className="button profile-link"
              href={`https://akasha.cv/profile/${profile.uid}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Leaderboards cover showcase characters only."
            >
              <ActionIcon name="trophy" />
              <span>Leaderboards on Akasha.cv</span>
              <ActionIcon name="external" />
            </a>
            <a
              className="button profile-link quiet"
              href={`https://enka.network/u/${profile.uid}/`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ActionIcon name="people" />
              <span>View public characters on Enka</span>
              <ActionIcon name="external" />
            </a>
          </nav>
        )}
      </section>
      <section
        className="section-space panel stack roster-import"
        aria-labelledby="import-heading"
      >
        <h2 id="import-heading">Add to roster</h2>
        <div className="input-row" aria-label="Import method">
          {importTabs.map(([label, icon], index) => (
            <button
              key={label}
              ref={index === 1 ? goodTab : undefined}
              type="button"
              aria-pressed={tab === index}
              className={tab === index ? "" : "quiet"}
              onClick={() => setTab(index)}
            >
              <ActionIcon name={icon} /> {label}
            </button>
          ))}
        </div>
        {tab === 0 && (
          <>
            <form className="stack roster-uid" onSubmit={lookup}>
              <label htmlFor="uid" className="control-label">
                <ActionIcon name="id" /> Genshin UID
              </label>
              <div className="input-row">
                <input
                  id="uid"
                  value={uid ?? profile?.uid ?? ""}
                  onChange={(event) => setUid(event.target.value)}
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Enter your UID"
                  required
                  disabled={pending}
                  aria-describedby="showcase-hint"
                />
                <button type="submit" disabled={pending}>
                  <ActionIcon name="search" />
                  {pending ? "Searching…" : "Search Account"}
                </button>
              </div>
            </form>
            <p className="muted" id="showcase-hint">
              Enable Show Character Details in your in-game Character Showcase.
              A UID import only includes characters in your showcase. Rotate
              characters and reimport the same UID to keep their builds
              together.
            </p>
            <button
              type="button"
              className="quiet"
              onClick={() => {
                setTab(1);
                goodTab.current?.focus();
              }}
            >
              <ActionIcon name="info" /> Learn how to import your full roster
            </button>
            {failure && (
              <p className="error" role="alert">
                {failure}
              </p>
            )}
          </>
        )}
        {tab === 1 && <InventoryImport />}
        {tab === 2 && <ManualBuild />}
      </section>

      <section
        className="section-space"
        aria-labelledby="roster-heading"
        aria-busy={pending}
      >
        <div className="section-heading">
          <h2 id="roster-heading">Characters</h2>
          <span className="muted">
            {visible.length} of {characters.length} characters
          </span>
        </div>
        {characters.length > 0 && (
          <div className="panel settings-grid roster-filters">
            <label>
              <span className="control-label">
                <ActionIcon name="element" /> Element
              </span>
              <select
                value={element}
                onChange={(event) => setElement(event.target.value)}
              >
                <option value="">All elements</option>
                {elements.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="control-label">
                <ActionIcon name="star" /> Rarity
              </span>
              <select
                value={rarity}
                onChange={(event) => setRarity(event.target.value)}
              >
                <option value="">All rarities</option>
                <option value="4">4-star</option>
                <option value="5">5-star</option>
              </select>
            </label>
            <label>
              <span className="control-label">
                <ActionIcon name="layers" /> Source
              </span>
              <select
                value={source}
                onChange={(event) => setSource(event.target.value)}
              >
                <option value="">All sources</option>
                <option value="showcase">Showcase</option>
                <option value="imported">Imported</option>
                <option value="preview">Not owned</option>
              </select>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={needsBuild}
                onChange={(event) => setNeedsBuild(event.target.checked)}
              />{" "}
              <span className="control-label">
                <ActionIcon name="edit" /> Needs build
              </span>
            </label>
          </div>
        )}
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
        {visible.length > 0 ? (
          <div className="roster-grid">
            {visible.map((character) => (
              <CharacterCard key={character.id} character={character} />
            ))}
          </div>
        ) : (
          !pending && (
            <p className="panel muted">
              {characters.length
                ? "No characters match these filters."
                : "Add a showcase, upload GOOD JSON, or create a manual build to start your roster."}
            </p>
          )
        )}
      </section>
      <details className="section-space panel">
        <summary>
          <strong className="control-label">
            <ActionIcon name="archive" /> Roster backup
          </strong>
        </summary>
        <div className="input-row section-space">
          <button
            type="button"
            className="quiet"
            onClick={() =>
              saveJson("genshin-roster.json", { version: 1, roster })
            }
          >
            <ActionIcon name="download" /> Export roster
          </button>
        </div>
        <label className="file-upload">
          <span className="control-label">
            <ActionIcon name="upload" /> Import roster JSON
          </span>
          <input
            type="file"
            accept=".json,application/json"
            onChange={uploadBackup}
          />
        </label>
        <p role="status">{backupNotice}</p>
      </details>
    </div>
  );
}

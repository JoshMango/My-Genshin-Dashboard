"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { saveJson } from "@/lib/browser-state";
import { loadCatalog } from "@/lib/enka/catalog";
import { normalizeGood, parseGood } from "@/lib/good";
import { useDashboard } from "./dashboard-state";

export function InventoryImport() {
  const { good, importGood } = useDashboard();
  const [json, setJson] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function submit(raw: string) {
    setNotice("");
    setBusy(true);
    try {
      if (raw.length > 2_000_000)
        throw new Error("Choose a JSON file under 2 MB.");
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error("This file does not contain valid JSON.");
      }
      const good = parseGood(parsed);
      if (!good)
        throw new Error(
          "Choose a valid GOOD v1–v3 export from your scanner or Genshin Optimizer.",
        );
      const catalog = await loadCatalog();
      const result = normalizeGood(good, catalog);
      if (!importGood(good, result.characters))
        throw new Error(
          "Browser storage is unavailable or full. Your previous import is still available.",
        );
      setNotice(
        `Imported ${result.characters.length} characters and ${result.artifacts.length} artifacts.${result.unmatched ? ` ${result.unmatched} character entries had no catalog match.` : ""}`,
      );
      setJson("");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "The inventory could not be imported.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 2_000_000) {
      setNotice("Choose a JSON file under 2 MB.");
      return;
    }
    try {
      await submit(await file.text());
    } catch {
      setNotice("This browser could not read the file.");
    }
  }

  function paste(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(json);
  }

  return (
    <details className="panel import-panel">
      <summary>
        <strong>GOOD inventory</strong>
      </summary>
      <p className="muted">
        Import characters, weapons, and artifacts from a scanner or Genshin
        Optimizer.
      </p>
      <label className="file-upload">
        Upload GOOD JSON{" "}
        <input
          type="file"
          accept=".json,application/json"
          onChange={upload}
          disabled={busy}
        />
      </label>
      <form onSubmit={paste} className="stack">
        <label className="field">
          Paste GOOD JSON
          <textarea
            rows={4}
            value={json}
            maxLength={2_000_000}
            onChange={(event) => setJson(event.target.value)}
          />
        </label>
        <div className="input-row">
          <button disabled={busy || !json.trim()}>
            {busy ? "Importing…" : "Import JSON"}
          </button>
          {good && (
            <button
              type="button"
              className="quiet"
              onClick={() => saveJson("genshin-inventory.good.json", good)}
            >
              Export GOOD
            </button>
          )}
        </div>
      </form>
      {good && (
        <p className="muted">
          {good.artifacts?.length ?? 0} artifacts · {good.weapons?.length ?? 0}{" "}
          weapons in the imported inventory
        </p>
      )}
      <p role="status">{notice}</p>
    </details>
  );
}

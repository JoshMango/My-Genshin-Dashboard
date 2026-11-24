"use client";

import { useState, type ChangeEvent } from "react";
import { saveJson } from "@/lib/browser-state";
import { defaultTheme, parseTheme, presets, type Theme } from "@/lib/theme";
import { useTheme } from "./theme-controller";

export function ThemeSettings() {
  const [theme, save] = useTheme();
  const [notice, setNotice] = useState("");
  function update(patch: Partial<Theme>) {
    setNotice(
      save({ ...theme, ...patch })
        ? ""
        : "This browser could not save the theme.",
    );
  }

  async function importTheme(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > 64_000) throw new Error();
      const validated = parseTheme(JSON.parse(await file.text()));
      if (!validated) throw new Error();
      setNotice(
        save(validated)
          ? "Theme imported."
          : "This browser could not save the theme.",
      );
    } catch {
      setNotice("This file does not contain a valid dashboard theme.");
    }
  }

  return (
    <>
      <h1>Settings</h1>
      <div className="workbench-grid theme-workbench">
        <section className="panel settings-panel">
          <h2>Appearance</h2>
          <div className="settings-grid">
            <label>
              Background{" "}
              <select
                value={theme.preset}
                onChange={(event) =>
                  update({ preset: event.target.value as Theme["preset"] })
                }
              >
                {Object.keys(presets).map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            <label>
              Accent color{" "}
              <input
                type="color"
                value={theme.accent}
                onChange={(event) => update({ accent: event.target.value })}
              />
            </label>
            <label>
              Card style{" "}
              <select
                value={theme.cards}
                onChange={(event) =>
                  update({ cards: event.target.value as Theme["cards"] })
                }
              >
                <option>Rounded</option>
                <option>Trimmed</option>
              </select>
            </label>
            <label>
              Font size <strong>{theme.fontSize}%</strong>
              <input
                type="range"
                min={90}
                max={125}
                step={5}
                value={theme.fontSize}
                onChange={(event) =>
                  update({ fontSize: Number(event.target.value) })
                }
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={theme.animations}
                onChange={(event) =>
                  update({ animations: event.target.checked })
                }
              />{" "}
              Animations
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={theme.elementAccent}
                onChange={(event) =>
                  update({ elementAccent: event.target.checked })
                }
              />{" "}
              Element-based accents
            </label>
          </div>
        </section>
        <section className="panel settings-panel">
          <h2>Theme file</h2>
          <div className="input-row">
            <button
              type="button"
              onClick={() => saveJson("genshin-theme.json", theme)}
            >
              Export theme
            </button>
            <button
              className="quiet"
              type="button"
              onClick={() =>
                setNotice(
                  save(defaultTheme)
                    ? "Default theme restored."
                    : "This browser could not save the theme.",
                )
              }
            >
              Reset theme
            </button>
          </div>
          <label className="file-upload">
            Import theme{" "}
            <input
              type="file"
              accept=".json,application/json"
              onChange={importTheme}
            />
          </label>
          <p role="status">{notice}</p>
        </section>
      </div>
    </>
  );
}

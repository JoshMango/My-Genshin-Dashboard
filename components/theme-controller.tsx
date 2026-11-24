"use client";

import { useEffect } from "react";
import { useBrowserState } from "@/lib/browser-state";
import { accentInk, defaultTheme, parseTheme, presets } from "@/lib/theme";

export function useTheme() {
  return useBrowserState("genshin.theme.v1", defaultTheme, parseTheme);
}

export function ThemeController() {
  const [theme] = useTheme();
  useEffect(() => {
    const root = document.documentElement;
    const palette = presets[theme.preset];
    const variables = {
      "--page": palette.page,
      "--panel": palette.panel,
      "--panel-deep": palette.deep,
      "--glow": palette.glow,
      "--ink": palette.ink,
      "--muted": palette.muted,
      "--line": palette.line,
      "--control-accent": theme.accent,
      "--accent-ink": accentInk(theme.accent),
      "--font-scale": `${theme.fontSize}%`,
      "--radius": theme.cards === "Rounded" ? "1.15rem" : ".35rem",
      "--accent":
        theme.accent === defaultTheme.accent && theme.preset === "Light"
          ? "#6b460f"
          : theme.accent,
    };
    for (const [key, value] of Object.entries(variables))
      root.style.setProperty(key, value);
    root.style.colorScheme = theme.preset === "Light" ? "light" : "dark";
    root.dataset.motion = theme.animations ? "on" : "off";
    root.dataset.elementAccent = String(theme.elementAccent);
  }, [theme]);
  return null;
}

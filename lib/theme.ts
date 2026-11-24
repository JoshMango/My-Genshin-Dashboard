import presets from "@/data/themes.json";

export { presets };
export type Theme = {
  preset: keyof typeof presets;
  accent: string;
  cards: "Rounded" | "Trimmed";
  fontSize: number;
  animations: boolean;
  elementAccent: boolean;
};
export const defaultTheme: Theme = {
  preset: "Dark",
  accent: "#e5bf79",
  cards: "Rounded",
  fontSize: 100,
  animations: true,
  elementAccent: false,
};

export function parseTheme(input: unknown): Theme | undefined {
  if (!input || typeof input !== "object") return;
  const theme = input as Partial<Theme>;
  if (
    !theme.preset ||
    !Object.hasOwn(presets, theme.preset) ||
    typeof theme.accent !== "string" ||
    !/^#[0-9a-f]{6}$/i.test(theme.accent) ||
    (theme.cards !== "Rounded" && theme.cards !== "Trimmed") ||
    typeof theme.fontSize !== "number" ||
    !Number.isInteger(theme.fontSize) ||
    theme.fontSize < 90 ||
    theme.fontSize > 125 ||
    typeof theme.animations !== "boolean" ||
    typeof theme.elementAccent !== "boolean"
  )
    return;
  return {
    preset: theme.preset,
    accent: theme.accent,
    cards: theme.cards,
    fontSize: theme.fontSize,
    animations: theme.animations,
    elementAccent: theme.elementAccent,
  };
}

export function accentInk(color: string) {
  const channels = color
    .slice(1)
    .match(/../g)
    ?.map((channel) => {
      const value = Number.parseInt(channel, 16) / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    }) ?? [1, 1, 1];
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2] >
    0.179
    ? "#000000"
    : "#ffffff";
}

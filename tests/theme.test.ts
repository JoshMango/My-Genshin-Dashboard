import { expect, it } from "vitest";
import { accentInk, defaultTheme, parseTheme } from "@/lib/theme";

it("accepts the exported theme and rejects CSS, unsupported presets, and invalid sizes", () => {
  expect(parseTheme(JSON.parse(JSON.stringify(defaultTheme)))).toEqual(
    defaultTheme,
  );
  for (const changed of [
    { accent: "url(https://example.com)" },
    { preset: "__proto__" },
    { fontSize: 200 },
  ]) {
    expect(parseTheme({ ...defaultTheme, ...changed })).toBeUndefined();
  }
  expect(accentInk("#000000")).toBe("#ffffff");
  expect(accentInk("#ffffff")).toBe("#000000");
});

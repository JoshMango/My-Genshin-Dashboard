"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

export function useBrowserState<T>(
  key: string,
  fallback: T,
  parse: (input: unknown) => T | undefined,
) {
  const event = `genshin:storage:${key}`;
  const subscribe = useCallback(
    (notify: () => void) => {
      window.addEventListener(event, notify);
      window.addEventListener("storage", notify);
      return () => {
        window.removeEventListener(event, notify);
        window.removeEventListener("storage", notify);
      };
    },
    [event],
  );
  const read = useCallback(() => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }, [key]);
  const raw = useSyncExternalStore(subscribe, read, () => null);
  const value = useMemo(() => {
    if (!raw) return fallback;
    try {
      return parse(JSON.parse(raw)) ?? fallback;
    } catch {
      return fallback;
    }
  }, [raw, fallback, parse]);
  const write = useCallback(
    (value: T) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        window.dispatchEvent(new Event(event));
        return true;
      } catch {
        return false;
      }
    },
    [key, event],
  );
  return [value, write] as const;
}

export function saveJson(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

"use client";

import { useEffect, useState } from "react";
import { loadCatalog, type Catalog } from "@/lib/enka/catalog";

export function useCatalog(enabled = true) {
  const [catalog, setCatalog] = useState<Catalog>();
  const [failure, setFailure] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void loadCatalog()
      .then((result) => {
        if (!cancelled) setCatalog(result);
      })
      .catch(() => {
        if (!cancelled) setFailure("The game catalog could not load.");
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, attempt]);
  return {
    catalog,
    failure,
    retry: () => {
      setFailure("");
      setAttempt(attempt + 1);
    },
  };
}

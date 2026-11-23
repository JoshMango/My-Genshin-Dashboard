"use client";

import { useEffect, useState } from "react";
import { ActionIcon } from "./action-icon";

export function GoodImportTip({ openGuide }: { openGuide: () => void }) {
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!visible || paused) return;
    const timer = window.setTimeout(() => setVisible(false), 10_000);
    return () => window.clearTimeout(timer);
  }, [visible, paused]);

  if (!visible) return null;
  return (
    <aside
      className="panel good-import-tip"
      aria-label="GOOD import tip"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={(event) =>
        setPaused(event.currentTarget.contains(document.activeElement))
      }
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) =>
        setPaused(
          event.currentTarget.contains(event.relatedTarget) ||
            event.currentTarget.matches(":hover"),
        )
      }
    >
      <div className="good-tip-copy" role="status">
        <ActionIcon name="upload" />
        <div>
          <h2>Build teams with your full roster</h2>
          <p>
            Upload a Genshin GOOD export to use more of your characters,
            weapons, and artifacts in Team Discovery.
          </p>
        </div>
      </div>
      <div className="input-row">
        <button
          type="button"
          onClick={() => {
            openGuide();
            setVisible(false);
          }}
        >
          Open GOOD import <ActionIcon name="upload" />
        </button>
        <button
          className="quiet"
          type="button"
          onClick={() => setVisible(false)}
        >
          Dismiss
        </button>
      </div>
    </aside>
  );
}

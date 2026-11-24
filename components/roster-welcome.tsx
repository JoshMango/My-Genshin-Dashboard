"use client";

import { useEffect, useRef } from "react";
import { ActionIcon } from "./action-icon";

// Returning to Roster in the same document keeps the welcome dismissed.
let shownOnThisVisit = false;

export function RosterWelcome({
  openGuide,
  onDismiss,
}: {
  openGuide: () => void;
  onDismiss: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element || shownOnThisVisit) return;
    element.showModal();
    shownOnThisVisit = true;
  }, []);

  return (
    <dialog
      ref={dialog}
      className="panel roster-welcome"
      aria-labelledby="roster-welcome-title"
      aria-describedby="roster-welcome-purpose roster-welcome-import"
      onClose={(event) => {
        if (event.currentTarget.returnValue !== "upload") onDismiss();
      }}
    >
      <span className="roster-emblem" aria-hidden="true">
        ✦
      </span>
      <h2 id="roster-welcome-title">Welcome to Genshin Dashboard</h2>
      <p id="roster-welcome-purpose">
        To get personalized team recommendations, discover new synergies, and
        explore team compositions using your complete roster.
      </p>
      <p id="roster-welcome-import" className="muted">
        Upload a &apos;GOOD&apos; file to add your entire character inventory,
        including characters outside your public showcase.
      </p>
      <div className="input-row">
        <button
          type="button"
          onClick={() => {
            dialog.current?.close("upload");
            openGuide();
          }}
        >
          <ActionIcon name="upload" /> Upload GOOD file
        </button>
        <button
          className="quiet"
          type="button"
          autoFocus
          onClick={() => dialog.current?.close()}
        >
          Got it
        </button>
      </div>
    </dialog>
  );
}

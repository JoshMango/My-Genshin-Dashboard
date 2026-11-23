"use client";

import { useId, useState } from "react";
import { formatStat, statLabels, type Weapon } from "@/lib/model";
import { ActionIcon } from "./action-icon";
import { GameIcon } from "./game-icon";
import { RarityStars } from "./rarity-stars";

export function WeaponCard({
  weapon,
  passiveName,
  passive,
  loading,
  compact,
}: {
  weapon: Weapon;
  passiveName?: string;
  passive?: string;
  loading: boolean;
  compact: boolean;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const summary = (
    <>
      <span className="equipment-art">
        <GameIcon src={weapon.icon} alt="" size={compact ? 88 : 72} />
        <RarityStars rarity={weapon.rarity} />
      </span>
      <span className="weapon-caption">
        <strong>{weapon.name}</strong>
        <span className="muted">
          Lv. {weapon.level} · R{weapon.refinement}
        </span>
      </span>
    </>
  );
  const details = (
    <>
      {passiveName && <strong>{passiveName}</strong>}
      {passive ? (
        <p className="description">{passive}</p>
      ) : (
        <p className="muted">
          {loading
            ? "Loading weapon passive…"
            : "No passive description available."}
        </p>
      )}
      {weapon.stats.length > 0 && (
        <ul className="stat-list">
          {weapon.stats.map((stat) => (
            <li key={stat.key}>
              <span>{statLabels[stat.key]}</span>
              <strong>{formatStat(stat)}</strong>
            </li>
          ))}
        </ul>
      )}
    </>
  );

  return compact ? (
    <div
      className="weapon-disclosure"
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setOpen(false);
      }}
    >
      <button
        type="button"
        className="quiet weapon-trigger"
        data-rarity={weapon.rarity}
        aria-expanded={open}
        aria-controls={panelId}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") setOpen(true);
        }}
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible")) setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            event.preventDefault();
            setOpen(false);
          }
        }}
      >
        {summary}
        <ActionIcon name="info" />
      </button>
      <div id={panelId} className="panel weapon-passive" hidden={!open}>
        {details}
      </div>
    </div>
  ) : (
    <section className="section-space panel">
      <h2>Weapon</h2>
      <article className="gear-card">
        <div className="item-heading">{summary}</div>
        {details}
      </article>
    </section>
  );
}

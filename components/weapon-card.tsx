"use client";

import { useEffect, useId, useState } from "react";
import { catalogWeapon } from "@/lib/builds";
import { loadCatalog } from "@/lib/enka/catalog";
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
  const [recovered, setRecovered] = useState<{
    weapon: Weapon;
    stats: Weapon["stats"];
  }>();
  useEffect(() => {
    const hasBaseAttack = weapon.stats.some((stat) => stat.key === "atk");
    const hasMainStat = weapon.stats.some((stat) => stat.key !== "atk");
    if (hasBaseAttack && (weapon.rarity < 3 || hasMainStat)) return;

    let cancelled = false;
    void loadCatalog()
      .then((catalog) => {
        if (cancelled) return;
        const catalogStats = catalogWeapon(
          weapon.id,
          weapon.level,
          weapon.ascension,
          weapon.refinement,
          catalog,
        )?.stats;
        if (catalogStats) {
          setRecovered({
            weapon,
            stats: [
              ...weapon.stats,
              ...catalogStats.filter(
                (stat) => !weapon.stats.some((saved) => saved.key === stat.key),
              ),
            ],
          });
        }
      })
      .catch(() => {
        // Keep the saved stats and passive available if the catalog is offline.
      });
    return () => {
      cancelled = true;
    };
  }, [weapon]);

  const stats = recovered?.weapon === weapon ? recovered.stats : weapon.stats;
  const baseAttack = stats.find((stat) => stat.key === "atk");
  const mainStats = stats.filter((stat) => stat.key !== "atk");
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
      <dl className="weapon-stats">
        <div>
          <dt>Base ATK</dt>
          <dd>{baseAttack ? formatStat(baseAttack) : "—"}</dd>
        </div>
        {mainStats.map((stat) => (
          <div key={stat.key}>
            <dt>{statLabels[stat.key]}</dt>
            <dd>{formatStat(stat)}</dd>
          </div>
        ))}
      </dl>
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
        className="quiet weapon-trigger weapon-rarity"
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

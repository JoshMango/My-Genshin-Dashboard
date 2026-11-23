import {
  formatStat,
  statLabels,
  type Character,
  type StatKey,
} from "@/lib/model";
import {
  combatStatLayout,
  essentialCombatStats,
} from "@/lib/recommend/combat-stats";

export function CombatStats({ character }: { character: Character }) {
  const { left, right, secondary, extra } = combatStatLayout(character);
  const essentials = essentialCombatStats(character);

  function row(key: StatKey) {
    const value = character.stats[key];
    const base = character.base[key];
    const core = essentials.includes(key);
    return (
      <div key={key} className="combat-stat" data-essential={core || undefined}>
        <dt>
          {statLabels[key]}
          {core && <span className="core-stat">Essential</span>}
        </dt>
        <dd>
          {value === undefined ? "—" : formatStat({ key, value })}
          {base !== undefined && value !== undefined && (
            <small>
              Base {formatStat({ key, value: base })} · Bonus{" "}
              {formatStat({ key, value: value - base })}
            </small>
          )}
        </dd>
      </div>
    );
  }

  return (
    <section className="character-stats">
      <h2>Combat stats</h2>
      <div className="combat-stats">
        <dl className="stat-column">
          {left.map(row)}
          {extra && row(extra)}
        </dl>
        <div className="stat-column">
          <dl className="stat-column">{right.map(row)}</dl>
          <div className="damage-breakdown">
            <h3>Other DMG bonuses</h3>
            <dl>
              {secondary.map((key) => (
                <div key={key}>
                  <dt>{statLabels[key]}</dt>
                  <dd>
                    {formatStat({ key, value: character.stats[key] ?? 0 })}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}

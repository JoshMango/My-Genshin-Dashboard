import { formatStat, statLabels, type Artifact, type Slot } from "@/lib/model";
import { GameIcon } from "./game-icon";
import { RarityStars } from "./rarity-stars";

export function ArtifactSlot({
  slot,
  artifact,
  name,
}: {
  slot: Slot;
  artifact?: Artifact;
  name?: string;
}) {
  return (
    <article className="gear-card" data-rarity={artifact?.rarity}>
      <div className="item-heading">
        <span className="equipment-art">
          <GameIcon src={artifact?.icon} alt="" size={56} />
          {artifact && <RarityStars rarity={artifact.rarity} />}
        </span>
        <div>
          <h3>{slot}</h3>
          {(artifact?.name || name) && (
            <p className="artifact-piece-name">{artifact?.name || name}</p>
          )}
          <p className="muted">
            {artifact
              ? `${artifact.setName} · +${artifact.level}`
              : "Empty slot"}
          </p>
        </div>
      </div>
      {artifact && (
        <>
          <p className="main-stat">
            {statLabels[artifact.main.key]}{" "}
            <strong>{formatStat(artifact.main)}</strong>
          </p>
          <ul className="stat-list">
            {artifact.substats.map((stat) => (
              <li key={stat.key}>
                <span>{statLabels[stat.key]}</span>{" "}
                <strong>{formatStat(stat)}</strong>
                {stat.rolls?.length && (
                  <span
                    className="rolls"
                    aria-label={`Roll quality: ${stat.rolls.map((roll) => Math.round(roll * 100) + "%").join(", ")}`}
                  >
                    {stat.rolls.map((roll, index) => (
                      <i
                        key={index}
                        aria-hidden="true"
                        data-high={roll >= 0.89}
                      />
                    ))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}

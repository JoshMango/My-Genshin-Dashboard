import { ActionIcon } from "./action-icon";

export function RarityStars({ rarity }: { rarity: number }) {
  if (rarity < 1 || rarity > 5) return null;
  return (
    <span
      className="rarity-stars"
      role="img"
      aria-label={`${rarity}-star rarity`}
    >
      {Array.from({ length: rarity }, (_, index) => (
        <ActionIcon key={index} name="star" />
      ))}
    </span>
  );
}

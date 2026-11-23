"use client";

import Image from "next/image";
import { useState } from "react";
import type { Element } from "@/lib/model";

export function GameIcon({
  src,
  alt,
  size = 48,
  className = "",
  eager = false,
}: {
  src?: string;
  alt: string;
  size?: number;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState<string>();
  const allowed =
    src &&
    /^https:\/\/enka\.network\/ui\/[A-Za-z0-9_]+\.(png|jpg|webp)$/i.test(src);
  return allowed && src !== failed ? (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className}
      unoptimized
      loading={eager ? "eager" : "lazy"}
      onError={() => setFailed(src)}
    />
  ) : (
    <span
      className={`icon-placeholder ${className}`}
      style={{ width: size, height: size }}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={!alt || undefined}
    >
      ◇
    </span>
  );
}

const marks: Record<Element, string> = {
  Pyro: "♨",
  Hydro: "◈",
  Electro: "ϟ",
  Cryo: "❄",
  Dendro: "✿",
  Anemo: "꩜",
  Geo: "❖",
};

export function ElementBadge({ element }: { element?: Element }) {
  if (!element) return null;
  return (
    <span className="element-badge" data-element={element}>
      <span aria-hidden="true">{marks[element]}</span> {element}
    </span>
  );
}

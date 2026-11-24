"use client";

import Image from "next/image";
import { useState } from "react";
import type { Element } from "@/lib/model";

const elementAssets =
  "https://raw.githubusercontent.com/MadeBaruna/paimon-moe/4b873a6decad0384665084c69e9927a9fa266555/static/images/elements/";

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
    typeof src === "string" &&
    (/^https:\/\/enka\.network\/ui\/[A-Za-z0-9_]+\.(png|jpg|webp)$/i.test(
      src,
    ) ||
      (src.startsWith(elementAssets) &&
        /^(pyro|hydro|electro|cryo|dendro|anemo|geo)\.png$/.test(
          src.slice(elementAssets.length),
        )));
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

export function ElementBadge({ element }: { element?: Element }) {
  if (!element) return null;
  return (
    <span className="element-badge" data-element={element}>
      <GameIcon
        src={`${elementAssets}${element.toLowerCase()}.png`}
        alt=""
        size={20}
      />{" "}
      {element}
    </span>
  );
}

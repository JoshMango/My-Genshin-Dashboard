"use client";

import Image from "next/image";
import { useState } from "react";
import type { Element } from "@/lib/model";

const elementAssets =
  "https://raw.githubusercontent.com/MadeBaruna/paimon-moe/4b873a6decad0384665084c69e9927a9fa266555/static/images/elements/";

export function GameIcon({
  src,
  fallbackSrc,
  alt,
  size = 48,
  className = "",
  eager = false,
}: {
  src?: string;
  fallbackSrc?: string;
  alt: string;
  size?: number;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const source = src && !failed.includes(src) ? src : fallbackSrc;
  const allowed =
    typeof source === "string" &&
    (/^https:\/\/enka\.network\/ui\/[A-Za-z0-9_]+\.(png|jpg|webp)$/i.test(
      source,
    ) ||
      (source.startsWith(elementAssets) &&
        /^(pyro|hydro|electro|cryo|dendro|anemo|geo)\.png$/.test(
          source.slice(elementAssets.length),
        )));
  return allowed && !failed.includes(source) ? (
    <Image
      src={source}
      alt={alt}
      width={size}
      height={size}
      className={className}
      unoptimized
      loading={eager ? "eager" : "lazy"}
      onError={() => setFailed((previous) => [...previous, source])}
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

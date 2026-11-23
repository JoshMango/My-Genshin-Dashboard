import { createHash } from "node:crypto";
import { isIP } from "node:net";
import type { EnkaResponse } from "./types";

const memory = new Map<string, { value: string; expires: number }>();
const upstream = "https://enka.network/api/uid";
const namespace = "my-genshin:v1";
const defaultContact =
  "https://github.com/JoshMango/My-Genshin-Dashboard/issues";
const maxPerMinute = 15;
const prune = () => {
  for (const [key, item] of memory)
    if (item.expires <= Date.now()) memory.delete(key);
  while (memory.size >= 1_000) {
    const first = memory.keys().next().value;
    if (first === undefined) break;
    memory.delete(first);
  }
};

async function redis<T>(command: (string | number)[]): Promise<T> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Redis is not configured.");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(2500),
  });
  if (!response.ok) throw new Error("Redis is unavailable.");
  const data = (await response.json()) as { result: T; error?: string };
  if (data.error) throw new Error("Redis command failed.");
  return data.result;
}

export function validUid(uid: string) {
  return /^[1-9]\d{8,9}$/.test(uid);
}

function error(code: string, message: string, status: number, retry?: number) {
  return Response.json(
    { code, message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...(retry ? { "Retry-After": String(retry) } : {}),
      },
    },
  );
}

function upstreamError(status: number, code?: string, retry?: number) {
  if (status === 429)
    return error(
      "enka_rate_limit",
      "Enka is busy. Wait a minute before trying again.",
      429,
      retry ?? 60,
    );
  if (status === 404 && code === "profile_unavailable")
    return error(
      code,
      "The game did not return this profile. Check showcase visibility or import a build manually.",
      404,
    );
  if (status === 404)
    return error(
      "not_found",
      "No player found. Check the UID shown in the game.",
      404,
    );
  if (status === 400)
    return error(
      "wrong_uid",
      "Enka could not recognize this UID. Check the digits in the game.",
      400,
    );
  if (status === 424)
    return error(
      "maintenance",
      "Showcase lookup is unavailable during game maintenance. Try again later.",
      503,
    );
  if (status === 504)
    return error(
      "upstream_timeout",
      "The showcase took too long to load. Try again in a minute.",
      504,
    );
  return error(
    "upstream_error",
    "Enka could not load the showcase. Try again later or import a build manually.",
    502,
  );
}

function memorySet(key: string, value: string, ttl: number) {
  memory.set(key, { value, expires: Date.now() + ttl * 1_000 });
}

export async function showcase(
  request: Request,
  uid: string,
): Promise<Response> {
  if (!validUid(uid))
    return error(
      "invalid_uid",
      "Enter a Genshin UID with 9 or 10 digits.",
      400,
    );
  const hosted = process.env.VERCEL === "1";
  const shared = Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
  if (hosted && !shared)
    return error(
      "unconfigured",
      "Public showcase lookup is temporarily unavailable.",
      503,
    );
  const rawIp = hosted
    ? (request.headers.get("x-vercel-forwarded-for") ?? "")
    : "";
  const ip = isIP(rawIp) ? rawIp : "local";
  const bucket = Math.floor(Date.now() / 60_000);
  const hash = createHash("sha256").update(`${bucket}:${ip}`).digest("hex");
  const rateKey = `${namespace}:rate:${hash}`;
  const cacheKey = `${namespace}:uid:${uid}`;
  const lease = `${cacheKey}:fetch`;
  const cooldown = `${namespace}:cooldown`;
  try {
    if (!shared) prune();
    const get = (key: string) =>
      shared
        ? redis<string | null>(["GET", key])
        : Promise.resolve(memory.get(key)?.value);
    const set = (key: string, value: string, ttl: number) =>
      shared
        ? redis(["SET", key, value, "EX", ttl])
        : memorySet(key, value, ttl);

    const rate = shared
      ? await redis<number>([
          "EVAL",
          "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end; return n",
          1,
          rateKey,
        ])
      : Number(memory.get(rateKey)?.value ?? 0) + 1;
    if (!shared) memorySet(rateKey, String(rate), 60);
    if (rate > maxPerMinute)
      return error(
        "rate_limit",
        "Too many lookups. Try again in a minute.",
        429,
        60,
      );

    const existing = await get(cacheKey);
    if (existing)
      return new Response(existing, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      });
    if (await get(cooldown)) return upstreamError(429);
    // This short lease coalesces concurrent cache misses without overwriting another worker's lease.
    const locked = shared
      ? await redis<string | null>(["SET", lease, "1", "EX", 10, "NX"])
      : !memory.has(lease);
    if (!locked)
      return error(
        "loading",
        "A showcase refresh is already running. Try again in a few seconds.",
        503,
        3,
      );
    if (!shared) memorySet(lease, "1", 10);

    const signal = AbortSignal.timeout(7_000);
    let response: Response;
    let data: EnkaResponse & { code?: string };
    try {
      response = await fetch(`${upstream}/${uid}/`, {
        headers: {
          "User-Agent": `MyGenshinDashboard/0.1 (+${process.env.ENKA_CONTACT_URL || defaultContact})`,
          Accept: "application/json",
        },
        cache: "no-store",
        redirect: "error",
        signal,
      });
      data = await response.json().catch(() => ({}));
    } catch {
      return upstreamError(signal.aborted ? 504 : 502);
    }
    if (signal.aborted) return upstreamError(504);
    if (!response.ok) {
      const retry = Number(response.headers.get("Retry-After"));
      if (response.status === 429) {
        const delay = Number.isSafeInteger(retry) && retry > 0 ? retry : 60;
        await set(cooldown, "1", delay);
        return upstreamError(429, data?.code, delay);
      }
      return upstreamError(response.status, data?.code);
    }
    if (!data?.playerInfo && !Array.isArray(data?.avatarInfoList))
      return upstreamError(502);

    const payload: EnkaResponse = {
      ttl: data.ttl,
      profileUnavailable: data.profileUnavailable,
      playerInfo: data.playerInfo,
      avatarInfoList: Array.isArray(data.avatarInfoList)
        ? data.avatarInfoList
        : undefined,
    };
    const body = JSON.stringify(payload);
    if (Number.isSafeInteger(payload.ttl) && payload.ttl! > 0)
      await set(cacheKey, body, payload.ttl!);
    return new Response(body, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return error(
      "service_unavailable",
      "Showcase lookup is temporarily unavailable. Try again shortly.",
      503,
    );
  }
}

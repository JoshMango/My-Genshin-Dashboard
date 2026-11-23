import { afterEach, expect, it, vi } from "vitest";
import { showcase } from "@/lib/enka/proxy";

const uid = "612345679";
const request = new Request(`https://dashboard.example/api/enka/${uid}`, {
  headers: { "x-vercel-forwarded-for": "198.51.100.15" },
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("fails closed on Vercel when shared Redis is not configured", async () => {
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", undefined);
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", undefined);
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  expect((await showcase(request, uid)).status).toBe(503);
  expect(fetchMock).not.toHaveBeenCalled();
});

it("uses shared rate counters, a fetch lease, and Enka's exact TTL on Vercel", async () => {
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
  const commands: (string | number)[][] = [];
  const store = new Map();
  let count = 0;
  let upstream = 0;
  const fetchMock = vi.fn(async (url: string, options: RequestInit) => {
    if (url.startsWith("https://enka.network/")) {
      upstream++;
      return Response.json({ ttl: 41, playerInfo: { nickname: "Test" } });
    }
    expect(options.headers).toMatchObject({
      authorization: "Bearer test-token",
    });
    const args = JSON.parse(options.body as string) as (string | number)[];
    commands.push(args);
    if (args[0] === "EVAL") return Response.json({ result: ++count });
    if (args[0] === "SET") {
      store.set(args[1], args[2]);
      return Response.json({ result: "OK" });
    }
    return Response.json({ result: store.get(args[1]) ?? null });
  });
  vi.stubGlobal("fetch", fetchMock);
  expect((await showcase(request, uid)).status).toBe(200);
  expect((await showcase(request, uid)).status).toBe(200);
  expect(upstream).toBe(1);
  expect(commands).toContainEqual([
    "SET",
    `my-genshin:v1:uid:${uid}:fetch`,
    "1",
    "EX",
    10,
    "NX",
  ]);
  expect(commands).toContainEqual([
    "SET",
    `my-genshin:v1:uid:${uid}`,
    '{"ttl":41,"playerInfo":{"nickname":"Test"}}',
    "EX",
    41,
  ]);
  expect(commands[0][3]).toMatch(/^my-genshin:v1:rate:[a-f0-9]{64}$/);
  count = 15;
  expect((await showcase(request, uid)).status).toBe(429);
  expect(upstream).toBe(1);
});

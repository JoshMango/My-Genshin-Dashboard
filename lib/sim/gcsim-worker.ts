import type { SimulationEngine } from "./estimate";

type GcsimRequest = { config: string; names: string[] };
type Result = { dps: number; perCharacter: number[]; iterations: number };
type Runtime = {
  importScripts(...urls: string[]): void;
  Go: new () => {
    importObject: WebAssembly.Imports;
    run(instance: WebAssembly.Instance): Promise<void>;
  };
  validateConfig(config: string): string;
  initializeWorker(config: string): string | null;
  initializeAggregator(config: string): string;
  simulate(): Uint8Array | string;
  aggregate(result: Uint8Array): string | null;
  flush(): string;
};
const runtime = self as unknown as Runtime;

const engine: SimulationEngine<GcsimRequest, Result> = {
  async simulate({ config, names }) {
    if (config.length > 30_000)
      throw new Error("The gcsim config is too long.");
    runtime.importScripts("/gcsim/wasm_exec.js");
    const go = new runtime.Go();
    const compressed = await fetch("/gcsim/engine.wasm.gz");
    if (!compressed.ok || !compressed.body)
      throw new Error("The gcsim engine could not load.");
    const wasm = compressed.body.pipeThrough(new DecompressionStream("gzip"));
    const { instance } = await WebAssembly.instantiateStreaming(
      new Response(wasm, { headers: { "Content-Type": "application/wasm" } }),
      go.importObject,
    );
    void go.run(instance);
    const validation = readJson(runtime.validateConfig(config));
    if (
      Array.isArray(validation.error_msgs) &&
      validation.error_msgs.length > 0
    ) {
      throw new Error(validation.error_msgs.join(" ").slice(0, 350));
    }
    if (
      !Array.isArray(validation.characters) ||
      validation.characters.length !== names.length
    ) {
      throw new Error(
        "Keep the generated character declarations when editing the rotation.",
      );
    }
    readJson(runtime.initializeWorker(config));
    readJson(runtime.initializeAggregator(config));
    const iterations = 20;
    for (let index = 0; index < iterations; index++) {
      const sample = runtime.simulate();
      if (typeof sample === "string") {
        readJson(sample);
        throw new Error("gcsim did not return an iteration.");
      }
      readJson(runtime.aggregate(sample));
    }
    const { stats } = readJson(runtime.flush());
    const measured = stats as
      | { dps?: { mean?: number }; character_dps?: { mean?: number }[] }
      | undefined;
    const perCharacter = measured?.character_dps?.map(
      (entry) => entry.mean ?? 0,
    );
    if (
      typeof measured?.dps?.mean !== "number" ||
      perCharacter?.length !== names.length
    )
      throw new Error("gcsim did not return a complete damage summary.");
    return { dps: measured.dps.mean, perCharacter, iterations };
  },
};

function readJson(value: string | null): Record<string, unknown> {
  if (!value) return {};
  const data = JSON.parse(value);
  if (typeof data === "string") throw new Error(data.slice(0, 350));
  if (data?.error) throw new Error(String(data.error).slice(0, 350));
  return data ?? {};
}
self.addEventListener(
  "message",
  async ({ data }: MessageEvent<GcsimRequest>) => {
    try {
      self.postMessage({ result: await engine.simulate(data) });
    } catch (error) {
      self.postMessage({
        error:
          error instanceof Error
            ? error.message
            : "gcsim could not complete this rotation.",
      });
    }
  },
);

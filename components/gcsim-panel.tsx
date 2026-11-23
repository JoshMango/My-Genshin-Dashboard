"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildGcsimConfig } from "@/lib/sim/gcsim-config";
import type { Rotation } from "@/lib/sim/estimate";
import type { Team } from "@/lib/teams";

type Output =
  | { result: { dps: number; perCharacter: number[]; iterations: number } }
  | { error: string };
const format = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });

export function GcsimPanel({
  baseline,
  variant,
  rotation,
  auto,
}: {
  baseline: Team;
  variant: Team;
  rotation: Rotation;
  auto: boolean;
}) {
  const [side, setSide] = useState("baseline");
  const [edited, setEdited] = useState<string>();
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<{ config: string; output: Output }>();
  const team = side === "baseline" ? baseline : variant;
  const job = useRef<{
    worker: Worker;
    timeout: ReturnType<typeof setTimeout>;
  } | null>(null);
  const autoRan = useRef(false);
  const prepared = useMemo(() => {
    try {
      const { config, names } = buildGcsimConfig(team, rotation);
      const start = config.indexOf("while 1");
      return {
        header: config.slice(0, start),
        actions: config.slice(start),
        names,
      };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "This lineup could not be prepared.",
      };
    }
  }, [team, rotation]);

  useEffect(
    () => () => {
      if (job.current) {
        job.current.worker.terminate();
        clearTimeout(job.current.timeout);
      }
    },
    [],
  );

  const stop = useCallback(() => {
    if (job.current) {
      job.current.worker.terminate();
      clearTimeout(job.current.timeout);
      job.current = null;
    }
    setRunning(false);
  }, []);

  const start = useCallback(
    (config: string, names: string[]) => {
      stop();
      setRun(undefined);
      try {
        const worker = new Worker(
          new URL("../lib/sim/gcsim-worker.ts", import.meta.url),
        );
        const finish = (value: Output) => {
          if (job.current?.worker !== worker) return;
          stop();
          setRun({ config, output: value });
        };
        job.current = {
          worker,
          timeout: setTimeout(
            () =>
              finish({
                error: "gcsim timed out. Shorten or simplify the rotation.",
              }),
            60_000,
          ),
        };
        worker.onmessage = ({ data }: MessageEvent<Output>) => finish(data);
        worker.onerror = () =>
          finish({ error: "This browser could not run gcsim." });
        setRunning(true);
        worker.postMessage({ config, names });
      } catch {
        stop();
        setRun({
          config,
          output: { error: "This browser could not start the gcsim worker." },
        });
      }
    },
    [stop],
  );

  useEffect(() => {
    if (!auto || autoRan.current || "error" in prepared) return;
    const timer = setTimeout(() => {
      autoRan.current = true;
      start(prepared.header + prepared.actions, prepared.names);
    }, 0);
    return () => clearTimeout(timer);
  }, [auto, prepared, start]);

  const config =
    "error" in prepared
      ? undefined
      : prepared.header + (edited ?? prepared.actions);
  const output = config === run?.config ? run?.output : undefined;
  const result = output && "result" in output ? output.result : undefined;
  return (
    <section className="section-space panel stack">
      <h2>gcsim rotation simulation</h2>
      <p className="muted">
        gcsim runs 20 iterations in your browser. Check the generated rotation
        before comparing teams. Catalog previews use their listed weapon and
        artifact pieces.
      </p>
      <label className="field narrow-field">
        Lineup
        <select
          value={side}
          onChange={(event) => {
            stop();
            setSide(event.target.value);
            setEdited(undefined);
            setRun(undefined);
          }}
        >
          <option value="baseline">Baseline</option>
          <option value="variant">Variant</option>
        </select>
      </label>
      {"error" in prepared ? (
        <p className="muted">{prepared.error}</p>
      ) : (
        <>
          <label className="field">
            gcsim rotation script
            <textarea
              rows={7}
              maxLength={20_000}
              value={edited ?? prepared.actions}
              onChange={(event) => setEdited(event.target.value)}
            />
          </label>
          <div className="input-row">
            <button
              type="button"
              disabled={running}
              onClick={() =>
                start(
                  prepared.header + (edited ?? prepared.actions),
                  prepared.names,
                )
              }
            >
              Run gcsim
            </button>
            {running && (
              <button className="quiet" type="button" onClick={stop}>
                Cancel simulation
              </button>
            )}
          </div>
          {running && (
            <p role="status">Loading the engine and simulating the rotation…</p>
          )}
          {result && (
            <>
              <p role="status">
                <strong>{format.format(result.dps)} simulated team DPS</strong>{" "}
                · {result.iterations} iterations
              </p>
              <dl className="team-feedback">
                {prepared.names.map((name, index) => (
                  <div key={index}>
                    <dt>{name}</dt>
                    <dd>{format.format(result.perCharacter[index])} DPS</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </>
      )}
      {output && "error" in output && (
        <p role="alert" className="error">
          {output.error}
        </p>
      )}
    </section>
  );
}

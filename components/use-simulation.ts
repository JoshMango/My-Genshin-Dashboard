"use client";

import { useEffect, useRef, useState } from "react";
import type { SimulationRequest, SimulationResult } from "@/lib/sim/estimate";

type Snapshot = {
  requests: SimulationRequest[];
  results?: SimulationResult[];
  error?: string;
};

export function useSimulation(requests: SimulationRequest[]) {
  const worker = useRef<Worker | null>(null);
  const sequence = useRef(0);
  const [state, setState] = useState<Snapshot>();

  useEffect(() => {
    try {
      const instance = new Worker(
        new URL("../lib/sim/worker.ts", import.meta.url),
      );
      worker.current = instance;
      return () => {
        worker.current = null;
        instance.terminate();
      };
    } catch {
      worker.current = null;
    }
  }, []);

  useEffect(() => {
    const instance = worker.current;
    const id = ++sequence.current;
    if (!instance) {
      const timer = setTimeout(() =>
        setState({
          requests,
          error: "This browser could not start the simulation worker.",
        }),
      );
      return () => clearTimeout(timer);
    }
    const onMessage = (
      event: MessageEvent<{
        id: number;
        results?: SimulationResult[];
        error?: string;
      }>,
    ) => {
      if (event.data.id === id)
        setState({
          requests,
          results: event.data.results,
          error: event.data.error,
        });
    };
    const onError = () =>
      setState({ requests, error: "The simulation worker could not load." });
    instance.addEventListener("message", onMessage);
    instance.addEventListener("error", onError);
    const timer = setTimeout(() => instance.postMessage({ id, requests }), 100);
    return () => {
      clearTimeout(timer);
      instance.removeEventListener("message", onMessage);
      instance.removeEventListener("error", onError);
    };
  }, [requests]);

  return state?.requests === requests ? state : undefined;
}

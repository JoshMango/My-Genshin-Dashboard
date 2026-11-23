import { estimator, type SimulationRequest } from "./estimate";

type Job = { id: number; requests: SimulationRequest[] };

self.addEventListener("message", async ({ data }: MessageEvent<Job>) => {
  try {
    const results = await Promise.all(
      data.requests.map((request) => estimator.simulate(request)),
    );
    self.postMessage({ id: data.id, results });
  } catch {
    self.postMessage({
      id: data.id,
      error: "The damage estimates could not be calculated.",
    });
  }
});

import { discover, type DiscoveryRequest } from "./discovery";

self.addEventListener("message", ({ data }: MessageEvent<DiscoveryRequest>) => {
  try {
    self.postMessage(discover(data));
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "Team search failed.",
    });
  }
});

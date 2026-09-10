import {
  compactResult,
  runExperiment,
  type ExperimentConfig,
} from "./experiments";

self.onmessage = (
  event: MessageEvent<{ type: "run"; config: ExperimentConfig; index: number }>,
) => {
  if (event.data.type !== "run") return;
  try {
    const { config, index } = event.data;
    self.postMessage({
      type: "result",
      result: compactResult(runExperiment(config)),
      index,
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

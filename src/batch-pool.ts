import type { BatchResult, ExperimentConfig } from "./experiments";

type BatchWorker = Pick<
  Worker,
  "onmessage" | "onerror" | "postMessage" | "terminate"
>;
interface BatchOptions {
  concurrency: number;
  onResult: (result: BatchResult, index: number) => void;
  onDone: () => void;
  onPaused?: () => void;
  onError: (message: string) => void;
}
export interface BatchController {
  cancel: () => void;
  pause: () => void;
  resume: () => void;
}

export function startBatch(
  configs: ExperimentConfig[],
  options: BatchOptions,
  workerFactory: () => BatchWorker = () =>
    new Worker(new URL("./batch.worker.ts", import.meta.url), {
      type: "module",
    }),
): BatchController {
  const workers: BatchWorker[] = [];
  const idle = new Set<BatchWorker>();
  let stopped = false;
  let paused = false;
  let pauseNotified = false;
  let next = 0;
  let completed = 0;
  let active = 0;
  const cancel = () => {
    if (stopped) return;
    stopped = true;
    workers.forEach((worker) => worker.terminate());
  };
  const notifyPaused = () => {
    if (paused && active === 0 && !pauseNotified) {
      pauseNotified = true;
      options.onPaused?.();
    }
  };
  const dispatch = (worker: BatchWorker) => {
    idle.delete(worker);
    if (stopped || paused || next === configs.length) {
      idle.add(worker);
      notifyPaused();
      return;
    }
    const index = next++;
    active++;
    worker.postMessage({ type: "run", config: configs[index], index });
  };
  const controller: BatchController = {
    cancel,
    pause() {
      if (stopped || paused) return;
      paused = true;
      pauseNotified = false;
      notifyPaused();
    },
    resume() {
      if (stopped || !paused) return;
      paused = false;
      for (const worker of [...idle]) dispatch(worker);
    },
  };
  const fail = (message: string) => {
    if (stopped) return;
    cancel();
    options.onError(message);
  };
  if (!configs.length) {
    cancel();
    options.onDone();
    return controller;
  }
  const concurrency = Number.isFinite(options.concurrency)
    ? Math.max(1, Math.floor(options.concurrency))
    : 1;
  try {
    for (let i = 0; i < Math.min(concurrency, configs.length); i++) {
      const worker = workerFactory();
      workers.push(worker);
      worker.onmessage = ({ data }) => {
        if (stopped) return;
        if (data.type === "error") {
          fail(data.message);
          return;
        }
        if (data.type !== "result") return;
        active--;
        options.onResult(data.result, data.index);
        if (stopped) return;
        if (++completed === configs.length) {
          cancel();
          options.onDone();
        } else {
          try {
            dispatch(worker);
          } catch (error) {
            fail(error instanceof Error ? error.message : String(error));
          }
        }
      };
      worker.onerror = (event) => fail(event.message || "Batch worker failed.");
      dispatch(worker);
    }
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  return controller;
}

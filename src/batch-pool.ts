import type { BatchResult, ExperimentConfig } from "./experiments";

type BatchWorker = Pick<
  Worker,
  "onmessage" | "onerror" | "postMessage" | "terminate"
>;
interface BatchOptions {
  concurrency: number;
  onResult: (result: BatchResult, index: number) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

export function startBatch(
  configs: ExperimentConfig[],
  options: BatchOptions,
  workerFactory: () => BatchWorker = () =>
    new Worker(new URL("./batch.worker.ts", import.meta.url), {
      type: "module",
    }),
): () => void {
  const workers: BatchWorker[] = [];
  let stopped = false;
  let next = 0;
  let completed = 0;
  const cancel = () => {
    if (stopped) return;
    stopped = true;
    workers.forEach((worker) => worker.terminate());
  };
  const fail = (message: string) => {
    if (stopped) return;
    cancel();
    options.onError(message);
  };
  if (!configs.length) {
    cancel();
    options.onDone();
    return cancel;
  }
  const concurrency = Number.isFinite(options.concurrency)
    ? Math.max(1, Math.floor(options.concurrency))
    : 1;
  try {
    for (let i = 0; i < Math.min(concurrency, configs.length); i++) {
      const worker = workerFactory();
      workers.push(worker);
      const dispatch = () => {
        if (stopped || next === configs.length) return;
        const index = next++;
        worker.postMessage({ type: "run", config: configs[index], index });
      };
      worker.onmessage = ({ data }) => {
        if (stopped) return;
        if (data.type === "error") {
          fail(data.message);
          return;
        }
        if (data.type !== "result") return;
        options.onResult(data.result, data.index);
        if (stopped) return;
        if (++completed === configs.length) {
          cancel();
          options.onDone();
        } else {
          try {
            dispatch();
          } catch (error) {
            fail(error instanceof Error ? error.message : String(error));
          }
        }
      };
      worker.onerror = (event) => fail(event.message || "Batch worker failed.");
      dispatch();
    }
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  return cancel;
}

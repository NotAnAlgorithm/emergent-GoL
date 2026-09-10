import { describe, expect, it, vi } from "vitest";
import { startBatch } from "./batch-pool";
import {
  compactResult,
  runExperiment,
  type ExperimentConfig,
} from "./experiments";

const config: ExperimentConfig = {
  rule: "B3/S23",
  width: 4,
  height: 4,
  boundary: "wrap",
  density: 0.3,
  initialSeed: 42,
  noiseSeed: 99,
  noiseProbability: 0,
  generations: 2,
};
class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  finish() {
    const { config, index } = this.postMessage.mock.lastCall![0];
    this.onmessage?.({
      data: {
        type: "result",
        result: compactResult(runExperiment(config)),
        index,
      },
    } as MessageEvent);
  }
}
function batch(count: number, concurrency: number) {
  const workers: FakeWorker[] = [];
  const options = {
    concurrency,
    onResult: vi.fn(),
    onDone: vi.fn(),
    onPaused: vi.fn(),
    onError: vi.fn(),
  };
  const configs = Array.from({ length: count }, (_, initialSeed) => ({
    ...config,
    initialSeed,
  }));
  const controller = startBatch(configs, options, () => {
    const worker = new FakeWorker();
    workers.push(worker);
    return worker;
  });
  return { workers, options, controller, configs };
}
describe("batch pool", () => {
  it("bounds workers and dispatches the next job to the first free worker", () => {
    const { workers, options, configs } = batch(4, 2);
    expect(workers).toHaveLength(2);
    expect(workers[0].postMessage).toHaveBeenCalledWith({
      type: "run",
      config: configs[0],
      index: 0,
    });
    workers[1].finish();
    expect(workers[1].postMessage.mock.lastCall![0].index).toBe(2);
    workers[1].finish();
    workers[0].finish();
    expect(options.onDone).not.toHaveBeenCalled();
    workers[1].finish();
    expect(options.onResult.mock.calls.map((call) => call[1])).toEqual([
      1, 2, 0, 3,
    ]);
    expect(options.onResult.mock.calls[0][0]).toEqual(
      compactResult(runExperiment(configs[1])),
    );
    expect(options.onDone).toHaveBeenCalledOnce();
    expect(
      workers.every((worker) => worker.terminate.mock.calls.length === 1),
    ).toBe(true);
    workers[1].finish();
    expect(options.onResult).toHaveBeenCalledTimes(4);
  });
  it("caps workers at the job count and normalizes invalid concurrency", () => {
    expect(batch(2, 8).workers).toHaveLength(2);
    expect(batch(2, 0).workers).toHaveLength(1);
    expect(batch(2, NaN).workers).toHaveLength(1);
  });
  it("cancels every worker and ignores late results", () => {
    const { workers, options, controller } = batch(3, 2);
    controller.cancel();
    controller.cancel();
    workers.forEach((worker) => worker.finish());
    expect(options.onResult).not.toHaveBeenCalled();
    expect(options.onDone).not.toHaveBeenCalled();
    expect(
      workers.every((worker) => worker.terminate.mock.calls.length === 1),
    ).toBe(true);
  });
  it("pauses after active jobs and resumes remaining work", () => {
    const { workers, options, controller } = batch(5, 2);
    controller.pause();
    workers.forEach((worker) => worker.finish());
    expect(options.onResult).toHaveBeenCalledTimes(2);
    expect(options.onPaused).toHaveBeenCalledOnce();
    expect(
      workers.map((worker) => worker.postMessage.mock.calls.length),
    ).toEqual([1, 1]);
    controller.resume();
    expect(
      workers.map((worker) => worker.postMessage.mock.calls.length),
    ).toEqual([2, 2]);
    workers[0].finish();
    workers[1].finish();
    workers[0].finish();
    expect(options.onDone).toHaveBeenCalledOnce();
  });
  it.each(["message", "event"])("cleans up on a worker error %s", (kind) => {
    const { workers, options } = batch(3, 2);
    if (kind === "message")
      workers[0].onmessage?.({
        data: { type: "error", message: "Failed" },
      } as MessageEvent);
    else workers[0].onerror?.({ message: "Failed" } as ErrorEvent);
    workers[1].finish();
    expect(options.onError).toHaveBeenCalledExactlyOnceWith("Failed");
    expect(options.onResult).not.toHaveBeenCalled();
    expect(options.onDone).not.toHaveBeenCalled();
    expect(
      workers.every((worker) => worker.terminate.mock.calls.length === 1),
    ).toBe(true);
  });
  it("cleans up when worker creation fails", () => {
    const worker = new FakeWorker();
    const onError = vi.fn();
    let created = 0;
    startBatch(
      [config, config],
      { concurrency: 2, onResult: vi.fn(), onDone: vi.fn(), onError },
      () => {
        if (created++) throw new Error("Unavailable");
        return worker;
      },
    );
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledExactlyOnceWith("Unavailable");
  });
  it("completes an empty batch without creating workers", () => {
    const { workers, options } = batch(0, 2);
    expect(workers).toHaveLength(0);
    expect(options.onDone).toHaveBeenCalledOnce();
  });
});

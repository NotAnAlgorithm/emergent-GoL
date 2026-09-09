import { runExperiment, type ExperimentConfig } from './experiments';

self.onmessage = (event: MessageEvent<{ type: 'start'; configs: ExperimentConfig[] }>) => {
  if (event.data.type !== 'start') return;
  try {
    const { configs } = event.data;
    for (let index = 0; index < configs.length; index++) {
      self.postMessage({ type: 'result', result: runExperiment(configs[index]), index, total: configs.length });
    }
    self.postMessage({ type: 'done' });
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};

export interface Env {
  DRK_SESSION: KVNamespace;
  KV_QUIZA_QUESTION: KVNamespace;
  WORKER_ENV: string;
}

export class QuestionNotFoundError extends Error {}
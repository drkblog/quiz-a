export interface Env {
  KV_QUIZA_QUESTION: KVNamespace;
  WORKER_ENV: string;
}

export class QuestionNotFoundError extends Error {}
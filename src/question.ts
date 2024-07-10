import { Env, QuestionNotFoundError } from "./quiza";

export interface QuizaQuestion {
  question: string;
  options: string[];
  answer: number;
}

export async function retrieveQuestion(env: Env, key:number): Promise<QuizaQuestion> {
  const jsonText: string | null = await env.KV_QUIZA_QUESTION.get(`${key}`);
  if (jsonText === null) {
    throw new QuestionNotFoundError(`Question not found for key: ${key}`);
  }
  return JSON.parse(jsonText);
}
import { Env } from "./quiza";
import { QuizaQuestion, retrieveQuestion } from "./question";
import { PublicSessionData } from "drksession";
import { parseCookies } from "./cookies/cookies";

const QUIZA_COOKIE = 'quizA-1';

export interface AnswerResult {
  isCorrect: boolean,
  correctIndex: number,
  user: string | undefined
}

export class QuizaState {
  key: number;
  correct: number;
  total: number;

  constructor(key: number, correct: number, total: number) {
    this.key = key;
    this.correct = correct;
    this.total = total;
  }

  async check(env: Env, answer: number, sessionData: PublicSessionData | null): Promise<AnswerResult> {
    const quizQuestion: QuizaQuestion = await retrieveQuestion(env, this.key);
    this.total++;
    this.key++;
    const result: AnswerResult = {
      isCorrect: (answer === quizQuestion.answer),
      correctIndex: quizQuestion.answer,
      user: sessionData?.displayName
    };
    if (result.isCorrect) {
      this.correct++;
    }
    return result;
  }
}

export function retrieveState(env: Env, cookieHeader: string) {
  const cookies = parseCookies(cookieHeader);
  return retrieveQuizaCookieIfExists(env, cookies);
}

export function createQuizaCookie(state: QuizaState, domain: string): string {
  const cookieName = QUIZA_COOKIE;
  const maxAge = 3600 * 24; // Cookie will expire in 24 hours
  const path = "/";
  const secure = true;
  const httpOnly = true;

  const jsonText: string = JSON.stringify(state);
  return `${cookieName}=${encodeURIComponent(jsonText)}; Max-Age=${maxAge}; Path=${path}; Domain=${domain}; ${secure ? 'Secure;' : ''} ${httpOnly ? 'HttpOnly;' : ''}; SameSite=None`;
}

function retrieveQuizaCookieIfExists(env: Env, cookies: { [key: string]: string }): QuizaState {
  if (cookies[QUIZA_COOKIE] == null) {
    return new QuizaState(1, 0, 0);
  }
  const { key, correct, total } = JSON.parse(cookies[QUIZA_COOKIE]);
  return new QuizaState(key, correct, total);;
}

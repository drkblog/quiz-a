import { Env, QuestionNotFoundError } from "./quiza";
import { QuizaQuestion, retrieveQuestion } from "./question";
import { QuizaState, AnswerResult, createQuizaCookie, retrieveState } from "./state";
import { SessionManager, CorsHelper, HTTP_CODE, SessionManagerConfiguration, DefaultKvAdapter, PublicSessionData, InvalidKeyError, SessionNotFoundError } from "drksession";
import { parseCookies } from "./cookies/cookies";
import { R } from "vitest/dist/reporters-LqC_WI4d.js";

const JSON_UTF8 = "application/json; charset=utf-8";

interface QuizaClientState {
  completed: boolean;
  question: string | null;
  options: string[] | null;
  correct: number;
  total: number;
}

const DRK_SESSION_COOKIE_NAME = 'drkbugs_session';
const DRK_SESSION_TTL = 24 * 3600;
const VALID_DOMAINS = [
  'drk.com.ar',
  'service.drk.com.ar',
  'www.drk.com.ar',
  'drkbugs.com',
  'www.drkbugs.com',
  'drk.ar',
  'www.drk.ar'
];
const corsHelper = new CorsHelper({
  validOrigins: VALID_DOMAINS,
  allowedHeaders: "*",
  allowedMethods: "GET,HEAD,PUT,OPTIONS"
});

export default {
	async fetch(request, env, ctx): Promise<Response> {

    const sessionManager: SessionManager = createSessionManager(env);

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return corsHelper.createCorsAwareResponse(request, "");
    }

    // Cookies
    const cookieHeader: string = request.headers.get('Cookie') || '';
    const state: QuizaState = retrieveState(env, cookieHeader);


    if (request.method === 'PUT') {
      const answer: number = getAnswerIndexFromUrl(request);
      const sessionData = await getSessionPublicData(env, cookieHeader, sessionManager);
      const answerResult: AnswerResult = await state.check(env, answer, sessionData);
      return corsHelper.createCorsAwareResponse(request, JSON.stringify(answerResult), HTTP_CODE.HTTP_OK, JSON_UTF8, createQuizaCookie(state, getWorkerDomain(env.WORKER_ENV)));
    } else {
      try {
        const quizQuestion: QuizaQuestion = await retrieveQuestion(env, state.key);
        const response: QuizaClientState = {
          completed: false,
          question: quizQuestion.question,
          options: quizQuestion.options,
          correct: state.correct,
          total: state.total
        }
        return corsHelper.createCorsAwareResponse(request, JSON.stringify(response), HTTP_CODE.HTTP_OK, JSON_UTF8, createQuizaCookie(state, getWorkerDomain(env.WORKER_ENV)));
      } catch (error) {
        if (error instanceof QuestionNotFoundError) {
          const response: QuizaClientState = {
            completed: true,
            question: null,
            options: null,
            correct: state.correct,
            total: state.total
          }
          return corsHelper.createCorsAwareResponse(request, JSON.stringify(response), HTTP_CODE.HTTP_OK);
        } else {
          console.error('Error retrieving from KV:', error);
          return corsHelper.createCorsAwareResponse(request, 'Internal Server Error', HTTP_CODE.HTTP_INTERNAL_SERVER_ERROR);
        }
      }
    }
	},
} satisfies ExportedHandler<Env>;

function getAnswerIndexFromUrl(request: Request): number {
  const url = new URL(request.url);
  const pattern = new URLPattern({ pathname: '/:index' });
  const match = pattern.exec(url);
  if (match) {
    return parseInt(match.pathname.groups.index);
  }
  throw new Error(`Invalid URL: ${request.url}`);
}

function getWorkerDomain(workerEnvironment: string) {
  return (workerEnvironment === 'local') ? '127.0.0.1' : 'quiz-a.drkbugs.workers.dev';
}

// Session
function createSessionManager(env: Env): SessionManager {
  const sessionManagerConfiguration: SessionManagerConfiguration = {
    sessionKv: new DefaultKvAdapter(env.DRK_SESSION),
    sessionTtl: DRK_SESSION_TTL
  };
  return new SessionManager(sessionManagerConfiguration);
}

export function getSessionPublicData(env: Env, cookieHeader: string, sessionManager: SessionManager): Promise<PublicSessionData | null> {
  try {
  const cookies: Record<string, string> = parseCookies(cookieHeader);
  if (cookies[DRK_SESSION_COOKIE_NAME] == null) {
    return Promise.resolve(null);
  }

  Object.keys(cookies).forEach(key => console.debug(`${key}: ${cookies[key]}`));
  console.debug(`cookies[DRK_SESSION_COOKIE_NAME]: ${cookies[DRK_SESSION_COOKIE_NAME]}`);
  return sessionManager.getPublicSessionData(cookies[DRK_SESSION_COOKIE_NAME]);
  } catch (error) {
    if (error instanceof InvalidKeyError || error instanceof SessionNotFoundError) {
      console.log('Session not found');
      }
    return Promise.resolve(null);
  }
}

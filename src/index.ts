import { Env, QuestionNotFoundError } from "./quiza";
import { QuizaQuestion, retrieveQuestion } from "./question";
import { QuizaState, AnswerResult, createQuizaCookie, retrieveState } from "./state";

const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;
const HTTP_SERVER_ERROR = 500;


interface QuizaClientState {
  completed: boolean;
  question: string | null;
  options: string[] | null;
  correct: number;
  total: number;
}

export default {
	async fetch(request, env, ctx): Promise<Response> {

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return corsAwareResponse(env, "");
    }

    // Cookies
    const cookieHeader: string = request.headers.get('Cookie') || '';
    const state: QuizaState = retrieveState(env, cookieHeader);

    if (request.method === 'PUT') {
      const answer: number = getAnswerIndexFromUrl(request);
      const answerResult: AnswerResult = await state.check(env, answer);
      return corsAwareResponse(env, JSON.stringify(answerResult), HTTP_OK, createQuizaCookie(state, getWorkerDomain(env.WORKER_ENV)));
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
        return corsAwareResponse(env, JSON.stringify(response), HTTP_OK, createQuizaCookie(state, getWorkerDomain(env.WORKER_ENV)));
      } catch (error) {
        if (error instanceof QuestionNotFoundError) {
          const response: QuizaClientState = {
            completed: true,
            question: null,
            options: null,
            correct: state.correct,
            total: state.total
          }
          return corsAwareResponse(env, JSON.stringify(response), HTTP_OK);
        } else {
          console.error('Error retrieving from KV:', error);
          return corsAwareResponse(env, 'Internal Server Error', HTTP_SERVER_ERROR);
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

function corsAwareResponse(
  env: Env,
  body?: BodyInit, 
  status: number = HTTP_OK,
  cookie: string = ''
): Response {
  const originHeader = {
    'Access-Control-Allow-Origin': (env.WORKER_ENV === 'local') ? 'http://localhost:1313' : 'https://drk.com.ar',
    'Access-Control-Allow-Methods': 'GET,HEAD,PUT,OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Credentials': 'true'
  };
  const headers = {
    ...originHeader,
    'Content-Type': 'application/json',
    'Vary': 'Origin',
    'Set-Cookie': cookie
  };
  return new Response(body, {
    status: status,
    headers: headers
  });
}

function getWorkerDomain(workerEnvironment: string) {
  return (workerEnvironment === 'local') ? '127.0.0.1' : 'quiz-a.drkbugs.workers.dev';
}
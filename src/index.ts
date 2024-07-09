import { QuizaCookie, createQuizaCookie, retrieveState } from "./cookie";

const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;
const HTTP_SERVER_ERROR = 500;

export interface Env {
  KV_QUIZA_QUESTION: KVNamespace;
  WORKER_ENV: string;
}

interface QuizaQuestion {
  question: string;
  options: string[];
  answer: number;
}

interface QuizaResponse {
  completed: boolean;
  question: QuizaQuestion | null;
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
    const state = retrieveState(cookieHeader);

    if (request.method === 'PUT') {
      state.key++;
      state.total++;
      if (isCorrect(request)) {
        state.correct++;
      }
      return corsAwareResponse(env, "", HTTP_OK, createQuizaCookie(state, getWorkerDomain(env.WORKER_ENV)));
    } else {
      try {
        const jsonText: string | null = await env.KV_QUIZA_QUESTION.get(`${state.key}`);
        if (jsonText === null) {
          const response: QuizaResponse = {
            completed: true,
            question: null,
            correct: state.correct,
            total: state.total
          }
          return corsAwareResponse(env, JSON.stringify(response), HTTP_OK);
        }
        const quizQuestion: QuizaQuestion = JSON.parse(jsonText);
        const response: QuizaResponse = {
          completed: false,
          question: quizQuestion,
          correct: state.correct,
          total: state.total
        }
        return corsAwareResponse(env, JSON.stringify(response), HTTP_OK, createQuizaCookie(state, getWorkerDomain(env.WORKER_ENV)));
      } catch (error) {
        console.error('Error retrieving from KV:', error);
        return corsAwareResponse(env, 'Internal Server Error', HTTP_SERVER_ERROR);
      }
    }
	},
} satisfies ExportedHandler<Env>;

function isCorrect(request: Request): boolean {
  const url = new URL(request.url);
  const pattern = new URLPattern({ pathname: '/:result' });
  const match = pattern.exec(url);
  if (match) {
    const result = match.pathname.groups.result;
    return result === 'correct';
  }
  return false;
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
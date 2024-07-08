const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;
const HTTP_SERVER_ERROR = 500;
const QUIZA_COOKIE = 'quizA';

export interface Env {
  KV_QUIZA_QUESTION: KVNamespace;
  WORKER_ENV: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
}

export default {
	async fetch(request, env, ctx): Promise<Response> {

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return corsAwareResponse(env, "");
    }

    // Cookies
    const cookieHeader = request.headers.get('Cookie') || '';
    const cookies = parseCookies(cookieHeader);
    const previousKey = (cookies[QUIZA_COOKIE] != null) ? cookies[QUIZA_COOKIE] : '0';

    const key = parseInt(previousKey) + 1;
    try {
      // Attempt to get the value from KV
      const value = await env.KV_QUIZA_QUESTION.get(`${key}`);

      if (value === null) {
        return corsAwareResponse(env, 'Key not found', HTTP_NOT_FOUND);
      }

      const quizQuestion: QuizQuestion = JSON.parse(value);

      return corsAwareResponse(env, JSON.stringify(quizQuestion, null, 2), HTTP_OK, getCookie(key));
    } catch (error) {
      console.error('Error retrieving from KV:', error);
      return corsAwareResponse(env, 'Internal Server Error', HTTP_SERVER_ERROR);
    }
	},
} satisfies ExportedHandler<Env>;

function corsAwareResponse(
  env: Env,
  body?: BodyInit, 
  status: number = HTTP_OK,
  cookie: string = ''
): Response {
  const originHeader = (env.WORKER_ENV === 'local') ? {
    'Access-Control-Allow-Origin': 'http://localhost:1313',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Credentials': 'true'
  } : {
    'Access-Control-Allow-Origin': 'https://drk.com.ar',
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

function getCookie(value: number): string {
  const cookieName = QUIZA_COOKIE;
  const maxAge = 3600; // Cookie will expire in 1 hour (3600 seconds)
  const path = "/";
  const domain = "quiz-a.drkbugs.workers.dev";
  const secure = true; // Use secure if over HTTPS
  const httpOnly = true; // Prevent client-side JavaScript from accessing the cookie

  return `${cookieName}=${value}; Max-Age=${maxAge}; Path=${path}; Domain=${domain}; ${secure ? 'Secure;' : ''} ${httpOnly ? 'HttpOnly;' : ''}; SameSite=None`;
}

function parseCookies(cookieHeader: string): { [key: string]: string } {
  const cookies: { [key: string]: string } = {};
  const pairs = cookieHeader.split(/;\s*/);
  
  pairs.forEach(pair => {
    const [name, value] = pair.split('=');
    if (name && value) {
      cookies[decodeURIComponent(name.trim())] = decodeURIComponent(value.trim());
    }
  });

  return cookies;
}
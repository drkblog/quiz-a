const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;
const HTTP_SERVER_ERROR = 500;

const originHeader = {
  'Access-Control-Allow-Origin': 'https://www.drk.com.ar'
};
const corsHeaders = {
  ...originHeader,
  'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
  'Access-Control-Max-Age': '86400',
};


export interface Env {
  KV_QUIZA_QUESTION: KVNamespace;
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
      return corsAwareResponse("");
    }

    const key = '1';

    try {
      // Attempt to get the value from KV
      const value = await env.KV_QUIZA_QUESTION.get(key);

      if (value === null) {
        return corsAwareResponse('Key not found', HTTP_NOT_FOUND);
      }

      const quizQuestion: QuizQuestion = JSON.parse(value);

      return corsAwareResponse(JSON.stringify(quizQuestion, null, 2));
    } catch (error) {
      console.error('Error retrieving from KV:', error);
      return corsAwareResponse('Internal Server Error', HTTP_SERVER_ERROR);
    }
	},
} satisfies ExportedHandler<Env>;

function corsAwareResponse(body?: BodyInit, status: number = HTTP_OK): Response {
  return new Response(body, {
    status: status,
    headers: {
      ...originHeader,
      'Content-Type': 'application/json',
      'Vary': 'Origin'
    }
  });
}

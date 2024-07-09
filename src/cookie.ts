const QUIZA_COOKIE = 'quizA-1';

export interface QuizaCookie {
    key: number,
    correct: number,
    total: number
}

export function retrieveState(cookieHeader: string) {
  const cookies = parseCookies(cookieHeader);
  return retrieveQuizaCookieIfExists(cookies);
}


export function createQuizaCookie(state: QuizaCookie, domain: string): string {
  const cookieName = QUIZA_COOKIE;
  const maxAge = 3600 * 24; // Cookie will expire in 24 hours
  const path = "/";
  const secure = true;
  const httpOnly = true;

  const jsonText: string = JSON.stringify(state);
  return `${cookieName}=${encodeURIComponent(jsonText)}; Max-Age=${maxAge}; Path=${path}; Domain=${domain}; ${secure ? 'Secure;' : ''} ${httpOnly ? 'HttpOnly;' : ''}; SameSite=None`;
}

function retrieveQuizaCookieIfExists(cookies: { [key: string]: string }): QuizaCookie {
  if (cookies[QUIZA_COOKIE] == null) {
    return { key: 1, correct: 0, total: 0 };
  }
  const jsonText = cookies[QUIZA_COOKIE];
  return JSON.parse(jsonText);
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

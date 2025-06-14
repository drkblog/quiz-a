export function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  const pairs = cookieHeader.split(/;\s*/);

  pairs.forEach(pair => {
    const [name, value] = pair.split('=');
    if (name && value) {
      cookies[decodeURIComponent(name.trim())] = decodeURIComponent(value.trim());
    }
  });

  return cookies;
}

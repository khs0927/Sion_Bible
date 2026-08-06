export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      const origin = env.SION_API_ORIGIN || 'https://sion-bible.vercel.app';
      const upstream = new URL(`${url.pathname}${url.search}`, origin);
      const headers = new Headers(request.headers);
      headers.set('host', upstream.host);
      headers.set('x-forwarded-host', url.host);
      headers.set('x-forwarded-proto', url.protocol.replace(':', ''));

      return fetch(new Request(upstream, {
        method: request.method,
        headers,
        body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
        redirect: 'follow',
      }));
    }

    return env.ASSETS.fetch(request);
  },
};

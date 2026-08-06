const API_ORIGIN = 'https://sion-bible.vercel.app';

export async function onRequest(context) {
  const incomingUrl = new URL(context.request.url);
  const pathParts = context.params.path;
  const apiPath = Array.isArray(pathParts) ? pathParts.join('/') : String(pathParts || '');
  const targetUrl = new URL(`/api/${apiPath}`, API_ORIGIN);
  targetUrl.search = incomingUrl.search;

  const headers = new Headers(context.request.headers);
  headers.delete('host');
  headers.set('x-forwarded-host', incomingUrl.host);
  headers.set('x-sion-proxy', 'cloudflare-pages');

  const init = {
    method: context.request.method,
    headers,
    redirect: 'manual',
  };

  if (!['GET', 'HEAD'].includes(context.request.method)) {
    init.body = context.request.body;
  }

  try {
    const upstream = await fetch(targetUrl, init);
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.set('x-sion-api-origin', 'vercel');
    responseHeaders.set('cache-control', 'no-store');

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return Response.json({
      ok: false,
      error: 'Cloudflare API proxy could not reach the current backend.',
      detail: error instanceof Error ? error.message : String(error),
    }, {
      status: 502,
      headers: { 'cache-control': 'no-store' },
    });
  }
}

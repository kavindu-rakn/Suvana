/** Account HTML only. Authentication and all writes stay in Communicate. */
export async function proxyAccountPage(
  request: Request,
  page: 'login' | 'register',
  origin = process.env.SUVANA_ORIGIN || 'https://suvana.help',
  upstreamOrigin = 'https://suvana-communicate.vercel.app',
): Promise<Response> {
  if (!['GET', 'HEAD'].includes(request.method)) {
    return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } })
  }
  const upstream = new URL(`/communicate/${page}`, upstreamOrigin)
  upstream.search = new URL(request.url).search
  const headers = new Headers()
  for (const key of ['accept', 'accept-language', 'cookie', 'rsc',
    'next-router-state-tree', 'next-router-prefetch', 'next-url']) {
    const value = request.headers.get(key)
    if (value) headers.set(key, value)
  }
  // Vercel normalizes Host/x-forwarded-host at the external origin. Supply
  // an explicit routing marker instead; this is NOT an authentication secret.
  headers.set('x-suvana-account-origin', new URL(origin).origin)
  const response = await fetch(upstream, {
    method: request.method, headers, redirect: 'manual', cache: 'no-store',
    signal: request.signal,
  })
  const responseHeaders = new Headers(response.headers)
  // fetch decodes the body. These upstream transport headers no longer apply.
  for (const key of ['content-encoding', 'content-length', 'transfer-encoding']) {
    responseHeaders.delete(key)
  }
  responseHeaders.set('cache-control', 'private, no-store')
  responseHeaders.set('cdn-cache-control', 'no-store')
  responseHeaders.set('vercel-cdn-cache-control', 'no-store')
  return new Response(request.method === 'HEAD' ? null : response.body, {
    status: response.status, headers: responseHeaders,
  })
}

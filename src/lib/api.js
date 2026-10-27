// Cliente de la API PHP. Envía la cookie de sesión y el token CSRF en cada cambio de datos.
const BASE = new URL('api/', window.location.href.split('#')[0])

let csrf = null
let onUnauthorized = () => {}

export class ApiError extends Error {
  constructor(status, message, campos) {
    super(message)
    this.status = status
    this.campos = campos || {}
  }
}

export function setCsrf(token) {
  csrf = token
}

export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

export async function api(path, { method = 'GET', body, query } = {}) {
  const url = new URL(path.replace(/^\//, ''), BASE)
  Object.entries(query || {}).forEach(([k, v]) => v !== '' && v != null && url.searchParams.set(k, v))
  let res
  try {
    res = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'No hay conexión con el servidor. Revisá la red e intentá de nuevo.')
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401 && path !== '/auth/login') onUnauthorized()
    throw new ApiError(res.status, data?.error || `Error ${res.status}`, data?.campos)
  }
  return data
}

export const get = (path, query) => api(path, { query })
export const post = (path, body = {}) => api(path, { method: 'POST', body })
export const put = (path, body) => api(path, { method: 'PUT', body })

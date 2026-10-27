// Fechas y textos para mostrar. La API devuelve 'YYYY-MM-DD' o 'YYYY-MM-DD HH:MM:SS' en hora local.
const parse = (s) => (s ? new Date(s.length <= 10 ? `${s}T00:00:00` : s.replace(' ', 'T')) : null)

export const fecha = (s) =>
  s ? parse(s).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export const fechaHora = (s) =>
  s ? parse(s).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

export function haceCuanto(s) {
  if (!s) return '—'
  const min = Math.round((Date.now() - parse(s)) / 60000)
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  return d === 1 ? 'ayer' : d < 30 ? `hace ${d} días` : fecha(s)
}

/** Texto para el vencimiento de un préstamo o mantenimiento. */
export function vence(s) {
  if (!s) return '—'
  const dias = Math.ceil((parse(s) - Date.now()) / 86400000)
  if (s.length > 10) {
    const h = Math.round((parse(s) - Date.now()) / 3600000)
    if (h < 0) return `vencido hace ${Math.abs(h) < 48 ? `${Math.abs(h)} h` : `${Math.round(Math.abs(h) / 24)} días`}`
    return h < 48 ? `en ${h} h` : `en ${dias} días`
  }
  if (dias < 0) return `vencido hace ${Math.abs(dias)} día${dias === -1 ? '' : 's'}`
  return dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`
}

export const iniciales = (nombre = '') =>
  nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()

/** Valor para <input type="datetime-local">. */
export function localInput(date) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`
}

export const hoyISO = () => localInput(new Date()).slice(0, 10)

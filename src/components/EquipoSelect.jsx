import { PISOS, TIPOS } from '../lib/labels.js'

/** <select> de equipos agrupados por planta y sector. */
export function EquipoSelect({ equipos, placeholder = 'Elegí un equipo', ...props }) {
  const grupos = new Map()
  for (const e of equipos || []) {
    const g = e.sector ? `${PISOS[e.piso]} · ${e.sector}` : TIPOS[e.tipo]
    if (!grupos.has(g)) grupos.set(g, [])
    grupos.get(g).push(e)
  }
  return (
    <select className="select" {...props}>
      <option value="">{equipos ? placeholder : 'Cargando equipos…'}</option>
      {[...grupos].map(([g, list]) => (
        <optgroup key={g} label={g}>
          {list.map((e) => (
            <option key={e.id} value={e.id}>
              {e.codigo} — {TIPOS[e.tipo]} {e.marca} {e.modelo}{e.asignado_nombre ? ` (${e.asignado_nombre})` : ''}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

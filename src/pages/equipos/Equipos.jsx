import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Download, Monitor, Plus, Search, X } from 'lucide-react'
import { useAuth } from '../../auth.jsx'
import { get } from '../../lib/api.js'
import { useResource } from '../../lib/useResource.js'
import { fecha, vence } from '../../lib/format.js'
import { ESTADO_EQUIPO, PISOS, TIPOS } from '../../lib/labels.js'
import { exportarXlsx } from '../../lib/exportar.js'
import { Button, Empty, LoadError, PageHeader, Pill, Skeleton } from '../../components/ui.jsx'
import { DataTable } from '../../components/DataTable.jsx'
import { EquipoDetalle } from './EquipoDetalle.jsx'
import { EquipoForm } from './EquipoForm.jsx'

const FILTROS = ['q', 'piso', 'sector_id', 'tipo', 'estado']

export default function Equipos() {
  const { esStaff } = useAuth()
  const [params, setParams] = useSearchParams()
  const [nuevo, setNuevo] = useState(false)
  const { data, error, loading, reload } = useResource(() => get('/equipos', { incluir_baja: 1 }))
  const sectores = useResource(() => (esStaff ? get('/sectores') : Promise.resolve([])))
  const f = Object.fromEntries(FILTROS.map((k) => [k, params.get(k) || '']))
  const ver = params.get('ver')

  const setFiltro = (k, v) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    if (k === 'piso') next.delete('sector_id')
    setParams(next, { replace: true })
  }
  const abrir = (id) => setFiltro('ver', id)

  const rows = useMemo(() => {
    const term = f.q.trim().toLowerCase()
    return (data || []).filter((e) =>
      (f.estado ? e.estado === f.estado : e.estado !== 'baja') &&
      (!f.piso || String(e.piso) === f.piso) && (!f.sector_id || String(e.sector_id) === f.sector_id) &&
      (!f.tipo || e.tipo === f.tipo) &&
      (!term || `${e.codigo} ${e.marca} ${e.modelo} ${e.nro_serie} ${e.ip} ${e.asignado_nombre} ${e.sector}`.toLowerCase().includes(term)))
  }, [data, f.q, f.piso, f.sector_id, f.tipo, f.estado])

  const filtrando = FILTROS.some((k) => f[k])
  const columns = [
    {
      key: 'codigo', label: 'Equipo', render: (e) => (
        <>
          <div className="cell-main">{e.codigo}</div>
          <div className="cell-sub">{TIPOS[e.tipo]} · {e.marca} {e.modelo}</div>
        </>
      ),
    },
    { key: 'sector', label: 'Ubicación', render: (e) => <>{e.sector}<div className="cell-sub">{PISOS[e.piso]}</div></>, sort: (e) => `${e.piso}${e.sector}` },
    { key: 'asignado_nombre', label: 'Asignado a', render: (e) => e.asignado_nombre || <span className="faint">—</span> },
    { key: 'ip', label: 'IP', render: (e) => <span className="mono">{e.ip || '—'}</span> },
    { key: 'proximo_mantenimiento', label: 'Mantenimiento', render: (e) => <MantCell e={e} /> },
    {
      key: 'estado', label: 'Estado', render: (e) => (
        <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
          <Pill value={e.estado} map={ESTADO_EQUIPO} />
          {e.incidencias_abiertas > 0 && e.estado !== 'en_reparacion' && <Pill tone="warn">{e.incidencias_abiertas} falla{e.incidencias_abiertas > 1 ? 's' : ''}</Pill>}
        </span>
      ),
    },
  ]

  const exportar = () =>
    exportarXlsx('equipos-firulais', 'Equipos', [
      ['Código', (e) => e.codigo], ['Tipo', (e) => TIPOS[e.tipo]], ['Marca', (e) => e.marca], ['Modelo', (e) => e.modelo],
      ['N.º de serie', (e) => e.nro_serie], ['Planta', (e) => PISOS[e.piso]], ['Sector / oficina', (e) => e.sector],
      ['Asignado a', (e) => e.asignado_nombre], ['IP', (e) => e.ip], ['Año de fabricación', (e) => e.anio_fabricacion],
      ['Estado', (e) => ESTADO_EQUIPO[e.estado][0]], ['Último mantenimiento', (e) => e.ultimo_mantenimiento],
      ['Próximo mantenimiento', (e) => e.proximo_mantenimiento], ['Observaciones', (e) => e.observaciones],
    ], rows)

  const sectoresPiso = (sectores.data || []).filter((s) => !f.piso || String(s.piso) === f.piso)
  return (
    <>
      <PageHeader
        title={esStaff ? 'Equipos' : 'Mis equipos'}
        description={esStaff ? 'Inventario del edificio por planta y oficina, con el estado y el mantenimiento de cada equipo.' : 'Los equipos que tenés asignados.'}
      >
        {esStaff && <Button icon={Download} onClick={exportar} disabled={!rows.length}>Exportar Excel</Button>}
        {esStaff && <Button variant="primary" icon={Plus} onClick={() => setNuevo(true)}>Nuevo equipo</Button>}
      </PageHeader>
      {esStaff && (
        <div className="toolbar">
          <div className="grow">
            <Search size={16} aria-hidden="true" />
            <input className="input" type="search" placeholder="Código, modelo, serie, IP o persona" value={f.q} onChange={(e) => setFiltro('q', e.target.value)} aria-label="Buscar equipos" />
          </div>
          <select className="select" value={f.piso} onChange={(e) => setFiltro('piso', e.target.value)} aria-label="Planta">
            <option value="">Todas las plantas</option>
            {PISOS.map((p, i) => <option key={p} value={i}>{p}</option>)}
          </select>
          <select className="select" value={f.sector_id} onChange={(e) => setFiltro('sector_id', e.target.value)} aria-label="Sector">
            <option value="">Todos los sectores</option>
            {sectoresPiso.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
          <select className="select" value={f.tipo} onChange={(e) => setFiltro('tipo', e.target.value)} aria-label="Tipo">
            <option value="">Todos los tipos</option>
            {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="select" value={f.estado} onChange={(e) => setFiltro('estado', e.target.value)} aria-label="Estado">
            <option value="">En servicio</option>
            {Object.entries(ESTADO_EQUIPO).map(([k, [v]]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {filtrando && <Button variant="ghost" icon={X} onClick={() => setParams({}, { replace: true })}>Limpiar filtros</Button>}
        </div>
      )}
      <section className="panel">
        {error ? <LoadError error={error} onRetry={reload} /> : loading && !data ? <Skeleton /> : (
          <DataTable
            caption="Equipos"
            columns={columns}
            rows={rows}
            onRowClick={(e) => abrir(e.id)}
            pageSize={20}
            empty={<Empty icon={Monitor} title={filtrando ? 'Ningún equipo coincide con los filtros' : 'Todavía no hay equipos cargados'} action={filtrando && <Button onClick={() => setParams({})}>Limpiar filtros</Button>} />}
          />
        )}
      </section>
      {ver && <EquipoDetalle id={ver} onClose={() => abrir(null)} onChange={reload} />}
      {nuevo && <EquipoForm onClose={() => setNuevo(false)} onSaved={(e) => { setNuevo(false); reload(); abrir(e.id) }} />}
    </>
  )
}

function MantCell({ e }) {
  if (!e.proximo_mantenimiento) return <span className="faint">Sin plan</span>
  const dias = Math.ceil((new Date(`${e.proximo_mantenimiento}T00:00`) - Date.now()) / 86400000)
  const tono = dias < 0 ? 'var(--danger)' : dias <= 30 ? 'var(--warn)' : undefined
  return (
    <span title={`Último: ${fecha(e.ultimo_mantenimiento)}`}>
      <span style={{ color: tono, fontWeight: tono ? 600 : undefined }}>{vence(e.proximo_mantenimiento)}</span>
      <div className="cell-sub">{fecha(e.proximo_mantenimiento)}</div>
    </span>
  )
}

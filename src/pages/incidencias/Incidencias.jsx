import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { LifeBuoy, Plus, Search } from 'lucide-react'
import { useAuth } from '../../auth.jsx'
import { get } from '../../lib/api.js'
import { useResource } from '../../lib/useResource.js'
import { fechaHora, haceCuanto } from '../../lib/format.js'
import { COMPONENTES, ESTADO_INCIDENCIA, PRIORIDAD } from '../../lib/labels.js'
import { Button, Empty, LoadError, PageHeader, Pill, Skeleton, Tabs } from '../../components/ui.jsx'
import { DataTable } from '../../components/DataTable.jsx'
import { useShell } from '../../components/AppShell.jsx'
import { IncidenciaDetalle } from './IncidenciaDetalle.jsx'

const EN_CURSO = ['en_reparacion', 'esperando_repuesto']
const FINAL = ['resuelta', 'cerrada']

export default function Incidencias() {
  const { usuario, esStaff } = useAuth()
  const { reportarFalla } = useShell()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState('pendientes')
  const [prioridad, setPrioridad] = useState('')
  const [q, setQ] = useState('')
  const { data, error, loading, reload } = useResource(() => get('/incidencias'))
  const ver = params.get('ver')

  const tabs = useMemo(() => {
    const all = data || []
    const defs = [
      ['pendientes', 'Pendientes', (i) => !FINAL.includes(i.estado)],
      ...(esStaff ? [
        ['sin_asignar', 'Sin asignar', (i) => i.estado === 'abierta' && !i.asignado_a],
        ['mias', 'Asignadas a mí', (i) => i.asignado_a === usuario.id && !FINAL.includes(i.estado)],
      ] : []),
      ['en_curso', 'En reparación', (i) => EN_CURSO.includes(i.estado)],
      ['resueltas', 'Resueltas', (i) => FINAL.includes(i.estado)],
      ['todas', 'Todas', () => true],
    ]
    return defs.map(([value, label, fn]) => ({ value, label, fn, count: all.filter(fn).length }))
  }, [data, esStaff, usuario.id])

  const rows = useMemo(() => {
    const fn = tabs.find((t) => t.value === tab)?.fn || (() => true)
    const term = q.trim().toLowerCase()
    return (data || []).filter((i) =>
      fn(i) && (!prioridad || i.prioridad === prioridad) &&
      (!term || `${i.titulo} ${i.equipo_codigo} ${i.reportado_nombre} ${i.sector} #${i.id}`.toLowerCase().includes(term)))
  }, [data, tabs, tab, prioridad, q])

  const abrir = (id) => setParams(id ? { ver: id } : {})
  const columns = [
    { key: 'prioridad', label: 'Prioridad', render: (i) => <Pill value={i.prioridad} map={PRIORIDAD} />, sort: (i) => ['critica', 'alta', 'media', 'baja'].indexOf(i.prioridad) },
    {
      key: 'titulo', label: 'Falla', render: (i) => (
        <>
          <div className="cell-main">{i.titulo}</div>
          <div className="cell-sub">#{i.id} · {i.equipo_codigo} · {COMPONENTES[i.componente]}</div>
        </>
      ),
    },
    { key: 'sector', label: 'Sector', render: (i) => <span className="muted">{i.sector}</span> },
    { key: 'estado', label: 'Estado', render: (i) => <Pill value={i.estado} map={ESTADO_INCIDENCIA} /> },
    { key: 'asignado_nombre', label: 'Técnico', render: (i) => i.asignado_nombre || <span className="faint">Sin asignar</span> },
    { key: 'creada', label: 'Reportada', render: (i) => <span title={fechaHora(i.creada)}>{haceCuanto(i.creada)}<div className="cell-sub">{i.reportado_nombre}</div></span> },
  ]

  return (
    <>
      <PageHeader
        title="Incidencias"
        description={esStaff ? 'Fallas reportadas en el edificio: tomalas, cambiá su estado y registrá los repuestos usados.' : 'Las fallas que reportaste y en qué estado están.'}
      >
        <Button variant="primary" icon={Plus} onClick={reportarFalla}>Reportar falla</Button>
      </PageHeader>
      <div className="toolbar">
        <Tabs tabs={tabs} value={tab} onChange={setTab} label="Filtrar por estado" />
        <div className="grow">
          <Search size={16} aria-hidden="true" />
          <input className="input" type="search" placeholder="Buscar por falla, equipo o persona" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar incidencias" />
        </div>
        <select className="select" value={prioridad} onChange={(e) => setPrioridad(e.target.value)} aria-label="Filtrar por prioridad">
          <option value="">Todas las prioridades</option>
          {Object.entries(PRIORIDAD).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <section className="panel">
        {error ? <LoadError error={error} onRetry={reload} /> : loading && !data ? <Skeleton /> : (
          <DataTable
            caption="Incidencias"
            columns={columns}
            rows={rows}
            onRowClick={(i) => abrir(i.id)}
            empty={<Empty icon={LifeBuoy} title="No hay incidencias en esta vista">{q || prioridad ? 'Probá con otros filtros.' : 'Cuando alguien reporte una falla va a aparecer acá.'}</Empty>}
          />
        )}
      </section>
      {ver && <IncidenciaDetalle id={ver} onClose={() => abrir(null)} onChange={reload} />}
    </>
  )
}

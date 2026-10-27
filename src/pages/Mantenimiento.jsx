import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { CalendarCheck, Download, Search, Wrench } from 'lucide-react'
import { get, post } from '../lib/api.js'
import { useResource } from '../lib/useResource.js'
import { required, useForm } from '../lib/useForm.js'
import { fecha, hoyISO, vence } from '../lib/format.js'
import { PISOS, TIPOS } from '../lib/labels.js'
import { exportarXlsx } from '../lib/exportar.js'
import { Button, Choices, Empty, Field, LoadError, PageHeader, Skeleton, Tabs } from '../components/ui.jsx'
import { DataTable } from '../components/DataTable.jsx'
import { Modal } from '../components/Modal.jsx'
import { useToast } from '../components/Toast.jsx'
import { useShell } from '../components/AppShell.jsx'

const TAREAS = {
  pc: 'Limpieza interna, control de temperatura y coolers, actualización de SO, drivers y antivirus, revisión del disco',
  impresora: 'Limpieza de rodillos y bandejas, control de tóner, actualización de firmware',
  servidor: 'Revisión de logs y discos RAID, actualizaciones de seguridad, prueba de copias de seguridad, limpieza',
  red: 'Limpieza, revisión de conexiones y patch cords, actualización de firmware, respaldo de configuración',
}
const tareasPara = (tipo) => TAREAS[['switch', 'router', 'access_point'].includes(tipo) ? 'red' : tipo] || TAREAS.pc

export default function Mantenimiento() {
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState('vencidos')
  const [q, setQ] = useState('')
  const [piso, setPiso] = useState('')
  const [rev, setRev] = useState(0)
  const { data, error, loading, reload } = useResource(() => get('/mantenimientos/plan'))
  const ver = params.get('ver')

  const tabs = useMemo(() => {
    const all = data || []
    const defs = [
      ['vencidos', 'Vencidos', (e) => e.dias_restantes !== null && e.dias_restantes < 0],
      ['proximos', 'Próximos 30 días', (e) => e.dias_restantes !== null && e.dias_restantes >= 0 && e.dias_restantes <= 30],
      ['al_dia', 'Al día', (e) => e.dias_restantes > 30],
      ['todos', 'Todos', () => true],
    ]
    return defs.map(([value, label, fn]) => ({ value, label, fn, count: all.filter(fn).length }))
  }, [data])

  const rows = useMemo(() => {
    const fn = tabs.find((t) => t.value === tab).fn
    const term = q.trim().toLowerCase()
    return (data || []).filter((e) => fn(e) && (!piso || String(e.piso) === piso) &&
      (!term || `${e.codigo} ${e.modelo} ${e.sector} ${e.asignado_nombre}`.toLowerCase().includes(term)))
  }, [data, tabs, tab, q, piso])

  const columns = [
    { key: 'codigo', label: 'Equipo', render: (e) => <><div className="cell-main">{e.codigo}</div><div className="cell-sub">{TIPOS[e.tipo]} · {e.marca} {e.modelo}</div></> },
    { key: 'sector', label: 'Ubicación', render: (e) => <>{e.sector}<div className="cell-sub">{PISOS[e.piso]}</div></>, sort: (e) => `${e.piso}${e.sector}` },
    { key: 'anio_fabricacion', label: 'Fabricación', render: (e) => e.anio_fabricacion || '—' },
    { key: 'ultimo_mantenimiento', label: 'Último', render: (e) => fecha(e.ultimo_mantenimiento) },
    {
      key: 'dias_restantes', label: 'Próximo', sort: (e) => e.dias_restantes ?? 9999, render: (e) => {
        const tone = e.dias_restantes < 0 ? 'var(--danger)' : e.dias_restantes <= 30 ? 'var(--warn)' : undefined
        return <><span style={{ color: tone, fontWeight: tone ? 600 : undefined }}>{vence(e.proximo_mantenimiento)}</span><div className="cell-sub">{fecha(e.proximo_mantenimiento)}</div></>
      },
    },
    { key: 'accion', label: '', sort: false, align: 'right', render: (e) => <Button size="sm" icon={Wrench} onClick={() => setParams({ ver: e.id })}>Registrar</Button> },
  ]

  const exportar = () =>
    exportarXlsx('plan-mantenimiento-firulais', 'Mantenimiento', [
      ['Planta', (e) => PISOS[e.piso]], ['Sector / oficina', (e) => e.sector], ['Código', (e) => e.codigo],
      ['Tipo', (e) => TIPOS[e.tipo]], ['Marca y modelo', (e) => `${e.marca} ${e.modelo}`], ['Usuario', (e) => e.asignado_nombre],
      ['Año de fabricación', (e) => e.anio_fabricacion], ['Último mantenimiento', (e) => e.ultimo_mantenimiento],
      ['Próximo mantenimiento', (e) => e.proximo_mantenimiento], ['Días restantes', (e) => e.dias_restantes],
      ['Observaciones', (e) => e.observaciones],
    ], [...(data || [])].sort((a, b) => a.piso - b.piso || a.sector.localeCompare(b.sector) || a.codigo.localeCompare(b.codigo)))

  const equipo = data?.find((e) => String(e.id) === ver)
  return (
    <>
      <PageHeader title="Mantenimiento preventivo" description="Cada PC e impresora se revisa cada 6 meses; servidores y equipos de red, cada 3.">
        <Button icon={Download} onClick={exportar} disabled={!data}>Exportar planilla</Button>
      </PageHeader>
      <div className="toolbar">
        <Tabs tabs={tabs} value={tab} onChange={setTab} label="Filtrar por vencimiento" />
        <div className="grow">
          <Search size={16} aria-hidden="true" />
          <input className="input" type="search" placeholder="Buscar equipo, sector o persona" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
        </div>
        <select className="select" value={piso} onChange={(e) => setPiso(e.target.value)} aria-label="Planta">
          <option value="">Todas las plantas</option>
          {PISOS.map((p, i) => <option key={p} value={i}>{p}</option>)}
        </select>
      </div>
      <section className="panel">
        {error ? <LoadError error={error} onRetry={reload} /> : loading && !data ? <Skeleton /> : (
          <DataTable
            caption="Plan de mantenimiento"
            columns={columns}
            rows={rows}
            pageSize={20}
            empty={<Empty icon={CalendarCheck} title={tab === 'vencidos' ? 'No hay mantenimientos vencidos' : 'No hay equipos en esta vista'}>{tab === 'vencidos' && 'Todo el parque está al día.'}</Empty>}
          />
        )}
      </section>
      <Historial rev={rev} />
      {ver && equipo && <RegistrarMantenimiento equipo={equipo} onClose={() => setParams({})} onSaved={() => { setParams({}); reload(); setRev(rev + 1) }} />}
    </>
  )
}

function Historial({ rev }) {
  const { data } = useResource(() => get('/mantenimientos'), rev)
  if (!data?.length) return null
  return (
    <section className="panel">
      <div className="panel-head"><h2>Últimos registros</h2></div>
      <DataTable
        caption="Últimos mantenimientos registrados"
        rows={data}
        pageSize={8}
        columns={[
          { key: 'fecha', label: 'Fecha', render: (m) => fecha(m.fecha) },
          { key: 'equipo_codigo', label: 'Equipo', render: (m) => <span className="cell-main">{m.equipo_codigo}</span> },
          { key: 'tipo', label: 'Tipo', render: (m) => (m.tipo === 'preventivo' ? 'Preventivo' : 'Correctivo') },
          { key: 'tareas', label: 'Tareas', render: (m) => <span className="muted">{m.tareas}</span> },
          { key: 'tecnico', label: 'Técnico' },
        ]}
      />
    </section>
  )
}

function RegistrarMantenimiento({ equipo, onClose, onSaved }) {
  const notify = useToast()
  const { refreshBadges } = useShell()
  const f = useForm({ fecha: hoyISO(), tipo: 'preventivo', tareas: tareasPara(equipo.tipo), observaciones: '', proximo: '' })
  const guardar = () =>
    f.submit(
      async (v) => {
        const res = await post('/mantenimientos', { ...v, equipo_id: equipo.id, proximo: v.proximo || undefined })
        notify(`Mantenimiento de ${equipo.codigo} registrado. Próximo: ${fecha(res.proximo_mantenimiento)}.`)
        refreshBadges()
        onSaved()
      },
      (v) => required(v, { fecha: 'Ingresá la fecha.', tareas: 'Detallá las tareas realizadas.' }),
    )
  return (
    <Modal
      title={`Registrar mantenimiento · ${equipo.codigo}`}
      description={`${TIPOS[equipo.tipo]} ${equipo.marca} ${equipo.modelo} · ${equipo.sector} · último: ${fecha(equipo.ultimo_mantenimiento)}`}
      onClose={onClose}
      onSubmit={guardar}
      footer={<><Button onClick={onClose}>Cancelar</Button><Button type="submit" variant="primary" icon={CalendarCheck} loading={f.busy}>Registrar mantenimiento</Button></>}
    >
      {f.message && <div className="form-error" role="alert">{f.message}</div>}
      <Choices name="tipo" value={f.values.tipo} onChange={(v) => f.set('tipo', v)} options={[
        { value: 'preventivo', label: 'Preventivo', description: 'Revisión programada' },
        { value: 'correctivo', label: 'Correctivo', description: 'Reparación de una falla' },
      ]} />
      <div className="form-grid">
        <Field label="Fecha" required error={f.errors.fecha}>{(id) => <input id={id} type="date" className="input" max={hoyISO()} {...f.bind('fecha')} data-autofocus />}</Field>
        <Field label="Próximo mantenimiento" error={f.errors.proximo} hint="Vacío: se calcula según el tipo de equipo.">{(id) => <input id={id} type="date" className="input" {...f.bind('proximo')} />}</Field>
        <Field label="Tareas realizadas" required error={f.errors.tareas} className="span-2">{(id) => <textarea id={id} className="textarea" maxLength={500} {...f.bind('tareas')} />}</Field>
        <Field label="Observaciones" error={f.errors.observaciones} className="span-2">{(id) => <textarea id={id} className="textarea" style={{ minHeight: 64 }} maxLength={500} {...f.bind('observaciones')} placeholder="Estado general, piezas a cambiar a futuro…" />}</Field>
      </div>
    </Modal>
  )
}

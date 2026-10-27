import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ArrowLeftRight, Check, Plus, Search, Undo2, X } from 'lucide-react'
import { useAuth } from '../../auth.jsx'
import { get, post } from '../../lib/api.js'
import { useResource } from '../../lib/useResource.js'
import { required, useForm } from '../../lib/useForm.js'
import { fechaHora, localInput, vence } from '../../lib/format.js'
import { ESTADO_PRESTAMO, TIPOS, prestamoEstado } from '../../lib/labels.js'
import { Button, Empty, Field, LoadError, PageHeader, Pill, Skeleton, Tabs } from '../../components/ui.jsx'
import { DataTable } from '../../components/DataTable.jsx'
import { Confirm, Modal } from '../../components/Modal.jsx'
import { EquipoSelect } from '../../components/EquipoSelect.jsx'
import { useToast } from '../../components/Toast.jsx'
import { useShell } from '../../components/AppShell.jsx'

export default function Prestamos() {
  const { usuario, esStaff } = useAuth()
  const notify = useToast()
  const { refreshBadges } = useShell()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [accion, setAccion] = useState(null) // { tipo, prestamo }
  const { data, error, loading, reload } = useResource(() => get('/prestamos'))
  const tab = params.get('estado') || 'todos'
  const nuevo = params.get('nuevo') === '1'

  const tabs = useMemo(() => {
    const all = (data || []).map((p) => ({ ...p, _estado: prestamoEstado(p) }))
    return [
      ['todos', 'Todos', () => true],
      ['pendiente', 'Pendientes', (p) => p.estado === 'pendiente'],
      ['activo', 'Activos', (p) => p.estado === 'activo'],
      ['demorado', 'Demorados', (p) => p._estado === 'demorado'],
      ['devuelto', 'Devueltos', (p) => p.estado === 'devuelto'],
      ['rechazado', 'Rechazados', (p) => p.estado === 'rechazado'],
    ].map(([value, label, fn]) => ({ value, label, fn, count: all.filter(fn).length, all }))
  }, [data])

  const actual = tabs.find((t) => t.value === tab) || tabs[0]
  const rows = (actual.all || []).filter((p) => actual.fn(p) &&
    (!q.trim() || `${p.equipo_codigo} ${p.solicitante_nombre} ${p.motivo} ${p.destino}`.toLowerCase().includes(q.trim().toLowerCase())))

  const listo = (msg) => {
    notify(msg)
    reload()
    refreshBadges()
  }

  const columns = [
    { key: 'equipo_codigo', label: 'Equipo', render: (p) => <><div className="cell-main">{p.equipo_codigo}</div><div className="cell-sub">{TIPOS[p.equipo_tipo]} · {p.equipo_marca} {p.equipo_modelo}</div></> },
    { key: 'solicitante_nombre', label: 'Pedido por', render: (p) => <>{p.solicitante_nombre}<div className="cell-sub">{p.solicitante_sector}</div></> },
    { key: 'motivo', label: 'Motivo y destino', sort: false, render: (p) => <>{p.motivo}<div className="cell-sub">{p.destino || '—'}</div></> },
    {
      key: 'fecha_limite', label: 'Devolución', render: (p) => p.estado === 'devuelto'
        ? <>{fechaHora(p.fecha_devolucion)}<div className="cell-sub">devuelto</div></>
        : p.estado === 'rechazado' ? <span className="faint">{p.observaciones || '—'}</span>
          : <><span style={{ color: p._estado === 'demorado' ? 'var(--danger)' : undefined, fontWeight: p._estado === 'demorado' ? 600 : undefined }}>{vence(p.fecha_limite)}</span><div className="cell-sub">{fechaHora(p.fecha_limite)}</div></>,
    },
    { key: '_estado', label: 'Estado', render: (p) => <Pill value={p._estado} map={ESTADO_PRESTAMO} /> },
    {
      key: 'acciones', label: '', sort: false, align: 'right', render: (p) => (
        <div className="row-actions">
          {esStaff && p.estado === 'pendiente' && <>
            <Button size="sm" variant="primary" icon={Check} onClick={() => setAccion({ tipo: 'aprobar', p })}>Entregar</Button>
            <Button size="sm" icon={X} onClick={() => setAccion({ tipo: 'rechazar', p })} aria-label={`Rechazar préstamo de ${p.equipo_codigo}`} />
          </>}
          {esStaff && p.estado === 'activo' && <Button size="sm" icon={Undo2} onClick={() => setAccion({ tipo: 'devolver', p })}>Registrar devolución</Button>}
          {!esStaff && p.estado === 'pendiente' && p.solicitante_id === usuario.id && <Button size="sm" onClick={() => setAccion({ tipo: 'cancelar', p })}>Cancelar</Button>}
        </div>
      ),
    },
  ]

  const a = accion?.p
  return (
    <>
      <PageHeader
        title="Préstamos"
        description={esStaff ? 'Notebooks, proyectores y otros equipos del depósito de Sistemas.' : 'Pedí una notebook o un proyector del depósito de Sistemas y seguí tus préstamos.'}
      >
        <Button variant="primary" icon={Plus} onClick={() => setParams({ ...(tab !== 'todos' && { estado: tab }), nuevo: '1' })}>
          {esStaff ? 'Nuevo préstamo' : 'Pedir préstamo'}
        </Button>
      </PageHeader>
      <div className="toolbar">
        <Tabs tabs={tabs} value={actual.value} onChange={(v) => setParams(v === 'todos' ? {} : { estado: v })} label="Filtrar por estado" />
        <div className="grow">
          <Search size={16} aria-hidden="true" />
          <input className="input" type="search" placeholder="Equipo, persona o motivo" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar préstamos" />
        </div>
      </div>
      <section className="panel">
        {error ? <LoadError error={error} onRetry={reload} /> : loading && !data ? <Skeleton /> : (
          <DataTable caption="Préstamos" columns={columns} rows={rows}
            empty={<Empty icon={ArrowLeftRight} title="No hay préstamos en esta vista" />} />
        )}
      </section>

      {nuevo && <NuevoPrestamo onClose={() => setParams(tab === 'todos' ? {} : { estado: tab })} onSaved={(p) => {
        setParams(tab === 'todos' ? {} : { estado: tab })
        listo(p.estado === 'activo' ? `${p.equipo_codigo} entregado a ${p.solicitante_nombre}.` : 'Solicitud enviada. Sistemas te avisa cuando esté lista para retirar.')
      }} />}
      {accion?.tipo === 'aprobar' && (
        <Confirm title={`Entregar ${a.equipo_codigo}`} confirmLabel="Entregar" onClose={() => setAccion(null)}
          onConfirm={async () => { await post(`/prestamos/${a.id}/aprobar`); listo(`${a.equipo_codigo} entregado a ${a.solicitante_nombre}.`) }}>
          Se registra la entrega a {a.solicitante_nombre} ahora; tiene que devolverlo {vence(a.fecha_limite)} ({fechaHora(a.fecha_limite)}).
        </Confirm>
      )}
      {accion?.tipo === 'rechazar' && (
        <Confirm title="Rechazar solicitud" confirmLabel="Rechazar" tone="danger" withReason="Motivo (lo ve quien lo pidió)" onClose={() => setAccion(null)}
          onConfirm={async (motivo) => { await post(`/prestamos/${a.id}/rechazar`, { motivo }); listo('Solicitud rechazada.') }}>
          {a.solicitante_nombre} pidió {a.equipo_codigo} para «{a.motivo}».
        </Confirm>
      )}
      {accion?.tipo === 'devolver' && (
        <Confirm title={`Registrar devolución de ${a.equipo_codigo}`} confirmLabel="Registrar devolución" withReason="Observaciones (estado en que vuelve, accesorios…)" onClose={() => setAccion(null)}
          onConfirm={async (observaciones) => { await post(`/prestamos/${a.id}/devolver`, { observaciones }); listo(`${a.equipo_codigo} volvió al depósito.`) }}>
          El equipo vuelve al depósito y queda disponible para otro préstamo.
        </Confirm>
      )}
      {accion?.tipo === 'cancelar' && (
        <Confirm title="Cancelar solicitud" confirmLabel="Cancelar solicitud" tone="danger" onClose={() => setAccion(null)}
          onConfirm={async () => { await post(`/prestamos/${a.id}/rechazar`); listo('Solicitud cancelada.') }}>
          Se cancela tu pedido de {a.equipo_codigo}.
        </Confirm>
      )}
    </>
  )
}

function NuevoPrestamo({ onClose, onSaved }) {
  const { esStaff } = useAuth()
  const disponibles = useResource(() => get('/equipos/disponibles'))
  const personas = useResource(() => (esStaff ? get('/usuarios/activos') : Promise.resolve([])))
  const manana = new Date(Date.now() + 86400000)
  manana.setHours(18, 0, 0, 0)
  const f = useForm({ equipo_id: '', solicitante_id: '', motivo: '', destino: '', fecha_limite: localInput(manana), entregar: true })

  const guardar = () =>
    f.submit(
      async (v) => onSaved(await post('/prestamos', {
        ...v, equipo_id: Number(v.equipo_id), solicitante_id: v.solicitante_id ? Number(v.solicitante_id) : undefined,
      })),
      (v) => ({
        ...required(v, { equipo_id: 'Elegí qué equipo necesitás.', motivo: 'Contá para qué lo necesitás.', fecha_limite: 'Indicá hasta cuándo.' }),
        ...(esStaff && !v.solicitante_id ? { solicitante_id: 'Elegí a quién se le presta.' } : {}),
        ...(v.fecha_limite && new Date(v.fecha_limite) <= new Date() ? { fecha_limite: 'Tiene que ser una fecha futura.' } : {}),
      }),
    )

  const sinStock = disponibles.data && !disponibles.data.length
  return (
    <Modal
      title={esStaff ? 'Nuevo préstamo' : 'Pedir préstamo'}
      description={esStaff ? 'Registrá un préstamo del depósito; si lo entregás ahora el equipo queda en préstamo.' : 'Sistemas revisa el pedido y te avisa para retirarlo.'}
      onClose={onClose}
      onSubmit={guardar}
      footer={<><Button onClick={onClose}>Cancelar</Button><Button type="submit" variant="primary" loading={f.busy} disabled={sinStock}>{esStaff && f.values.entregar ? 'Registrar y entregar' : 'Enviar pedido'}</Button></>}
    >
      {f.message && <div className="form-error" role="alert">{f.message}</div>}
      {sinStock ? <Empty icon={ArrowLeftRight} title="No hay equipos disponibles">Todos los equipos prestables están en uso o reservados. Probá más tarde.</Empty> : (
        <div className="form-grid">
          <Field label="Equipo" required error={f.errors.equipo_id} className="span-2">
            {(id) => <EquipoSelect id={id} equipos={disponibles.data} {...f.bind('equipo_id')} data-autofocus />}
          </Field>
          {esStaff && (
            <Field label="Se le presta a" required error={f.errors.solicitante_id} className="span-2">
              {(id) => (
                <select id={id} className="select" {...f.bind('solicitante_id')}>
                  <option value="">Elegí una persona</option>
                  {personas.data?.map((u) => <option key={u.id} value={u.id}>{u.nombre} — {u.sector || 'sin sector'}</option>)}
                </select>
              )}
            </Field>
          )}
          <Field label="Para qué" required error={f.errors.motivo} className="span-2">{(id) => <input id={id} className="input" maxLength={300} {...f.bind('motivo')} placeholder="Ej.: capacitación, reunión con clientes, trabajo en obra" />}</Field>
          <Field label="Dónde se usa" error={f.errors.destino}>{(id) => <input id={id} className="input" maxLength={120} {...f.bind('destino')} placeholder="Sector u oficina" />}</Field>
          <Field label="Devolución" required error={f.errors.fecha_limite}>{(id) => <input id={id} type="datetime-local" className="input" {...f.bind('fecha_limite')} />}</Field>
          {esStaff && (
            <label className="check span-2">
              <input type="checkbox" checked={f.values.entregar} onChange={(e) => f.set('entregar', e.target.checked)} />
              Lo entrego ahora (si no, queda como pedido pendiente)
            </label>
          )}
        </div>
      )}
    </Modal>
  )
}

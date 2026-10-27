import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Archive, CalendarCheck, LifeBuoy, Pencil } from 'lucide-react'
import { useAuth } from '../../auth.jsx'
import { get, put } from '../../lib/api.js'
import { useResource } from '../../lib/useResource.js'
import { fecha, fechaHora, vence } from '../../lib/format.js'
import { COMPONENTES, ESTADO_EQUIPO, ESTADO_INCIDENCIA, ESTADO_PRESTAMO, PISOS, TIPOS } from '../../lib/labels.js'
import { Confirm, Modal } from '../../components/Modal.jsx'
import { Button, LoadError, Pill, Skeleton } from '../../components/ui.jsx'
import { useToast } from '../../components/Toast.jsx'
import { useShell } from '../../components/AppShell.jsx'
import { ReportarFalla } from '../incidencias/ReportarFalla.jsx'
import { EquipoForm } from './EquipoForm.jsx'

export function EquipoDetalle({ id, onClose, onChange }) {
  const { esStaff } = useAuth()
  const notify = useToast()
  const navigate = useNavigate()
  const { refreshBadges } = useShell()
  const { data: e, error, loading, reload } = useResource(() => get(`/equipos/${id}`), id)
  const [accion, setAccion] = useState(null)
  const cambiado = () => {
    reload()
    onChange()
  }

  if (accion === 'editar') return <EquipoForm equipo={e} onClose={() => setAccion(null)} onSaved={() => { setAccion(null); cambiado() }} />
  if (accion === 'falla') {
    return <ReportarFalla equipoId={e.id} onClose={() => setAccion(null)} onCreated={(inc) => { refreshBadges(); navigate(`/incidencias?ver=${inc.id}`) }} />
  }
  if (accion === 'baja') {
    return (
      <Confirm
        title={`Dar de baja ${e.codigo}`}
        confirmLabel="Dar de baja"
        tone="danger"
        onClose={() => setAccion(null)}
        onConfirm={async () => {
          await put(`/equipos/${e.id}`, { estado: 'baja', asignado_a: null })
          notify(`${e.codigo} dado de baja.`)
          cambiado()
        }}
      >
        El equipo sale del inventario en servicio y del plan de mantenimiento. Su historial se conserva y podés reactivarlo editándolo.
      </Confirm>
    )
  }

  const h = e?.historial
  return (
    <Modal drawer onClose={onClose} title={e ? e.codigo : 'Equipo'} description={e && `${TIPOS[e.tipo]} · ${e.marca} ${e.modelo}`}>
      {error ? <LoadError error={error} onRetry={reload} /> : loading && !e ? <Skeleton /> : (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Pill value={e.estado} map={ESTADO_EQUIPO} />
            {Number(e.prestable) === 1 && <Pill tone="info">Prestable</Pill>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button size="sm" icon={LifeBuoy} onClick={() => setAccion('falla')}>Reportar falla</Button>
            {esStaff && <Button size="sm" icon={Pencil} onClick={() => setAccion('editar')}>Editar</Button>}
            {esStaff && <Button size="sm" icon={CalendarCheck} onClick={() => navigate(`/mantenimiento?ver=${e.id}`)}>Registrar mantenimiento</Button>}
            {esStaff && e.estado !== 'baja' && <Button size="sm" variant="danger" icon={Archive} onClick={() => setAccion('baja')}>Dar de baja</Button>}
          </div>
          <dl className="facts">
            <div><dt>Ubicación</dt><dd>{e.sector} · {PISOS[e.piso]}</dd></div>
            <div><dt>Asignado a</dt><dd>{e.asignado_nombre || 'Compartido'}</dd></div>
            <div><dt>Dirección IP</dt><dd className="mono">{e.ip || '—'}</dd></div>
            <div><dt>N.º de serie</dt><dd className="mono">{e.nro_serie || '—'}</dd></div>
            <div><dt>Año de fabricación</dt><dd>{e.anio_fabricacion || '—'}</dd></div>
            <div><dt>Último mantenimiento</dt><dd>{fecha(e.ultimo_mantenimiento)}</dd></div>
            <div><dt>Próximo mantenimiento</dt><dd>{fecha(e.proximo_mantenimiento)} <span className="muted">({vence(e.proximo_mantenimiento)})</span></dd></div>
            {e.observaciones && <div style={{ gridColumn: '1 / -1' }}><dt>Observaciones</dt><dd>{e.observaciones}</dd></div>}
          </dl>
          <Historial titulo="Incidencias" vacio="Sin fallas registradas." items={h.incidencias} render={(i) => (
            <><span className="grow"><span className="title">{i.titulo}</span><span className="sub">{COMPONENTES[i.componente]} · {fechaHora(i.creada)}{i.tecnico ? ` · ${i.tecnico}` : ''}</span></span>
              <Pill value={i.estado} map={ESTADO_INCIDENCIA} /></>
          )} onClick={(i) => navigate(`/incidencias?ver=${i.id}`)} />
          <Historial titulo="Mantenimientos" vacio="Sin mantenimientos registrados." items={h.mantenimientos} render={(m) => (
            <span className="grow"><span className="title">{fecha(m.fecha)} · {m.tipo === 'preventivo' ? 'Preventivo' : 'Correctivo'}</span><span className="sub">{m.tareas}{m.tecnico ? ` · ${m.tecnico}` : ''}</span></span>
          )} />
          {h.prestamos.length > 0 && <Historial titulo="Préstamos" items={h.prestamos} render={(p) => (
            <><span className="grow"><span className="title">{p.solicitante}</span><span className="sub">{fechaHora(p.fecha_entrega || p.fecha_solicitud)} → {fechaHora(p.fecha_devolucion || p.fecha_limite)}</span></span>
              <Pill value={p.estado} map={ESTADO_PRESTAMO} /></>
          )} />}
        </>
      )}
    </Modal>
  )
}

function Historial({ titulo, items, render, vacio, onClick }) {
  return (
    <section>
      <h3 className="section-title">{titulo} <span className="faint">{items.length}</span></h3>
      {items.length ? (
        <ul className="list-plain">
          {items.slice(0, 8).map((it) => (
            <li key={it.id}>
              {onClick
                ? <button type="button" className="list-row" style={{ width: '100%', border: 0, cursor: 'pointer', textAlign: 'left' }} onClick={() => onClick(it)}>{render(it)}</button>
                : <div className="list-row">{render(it)}</div>}
            </li>
          ))}
        </ul>
      ) : <p className="muted">{vacio}</p>}
    </section>
  )
}

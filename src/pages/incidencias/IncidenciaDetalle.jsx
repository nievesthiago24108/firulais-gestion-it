import { useState } from 'react'
import { MessageSquare, PackagePlus, Save } from 'lucide-react'
import { useAuth } from '../../auth.jsx'
import { get, post, put } from '../../lib/api.js'
import { useResource } from '../../lib/useResource.js'
import { useForm } from '../../lib/useForm.js'
import { fechaHora, haceCuanto } from '../../lib/format.js'
import { COMPONENTES, ESTADO_INCIDENCIA, PISOS, PRIORIDAD } from '../../lib/labels.js'
import { Modal } from '../../components/Modal.jsx'
import { Button, Choices, Field, LoadError, Pill, Skeleton } from '../../components/ui.jsx'
import { useToast } from '../../components/Toast.jsx'
import { useShell } from '../../components/AppShell.jsx'

const TONO_EVENTO = { creada: 'warn', asignacion: 'info', estado: 'accent', repuesto: 'ok', comentario: 'text-faint' }

export function IncidenciaDetalle({ id, onClose, onChange }) {
  const { esStaff } = useAuth()
  const { data: inc, error, loading, reload, setData } = useResource(() => get(`/incidencias/${id}`), id)
  const actualizar = (nueva) => {
    setData(nueva)
    onChange()
  }

  return (
    <Modal drawer onClose={onClose} title={inc ? inc.titulo : 'Incidencia'} description={inc && `#${inc.id} · reportada ${haceCuanto(inc.creada)} por ${inc.reportado_nombre}`}>
      {error ? <LoadError error={error} onRetry={reload} /> : loading && !inc ? <Skeleton /> : (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Pill value={inc.estado} map={ESTADO_INCIDENCIA} />
            <Pill value={inc.prioridad} map={PRIORIDAD} />
          </div>
          <dl className="facts">
            <div><dt>Equipo</dt><dd>{inc.equipo_codigo} · {inc.equipo_marca} {inc.equipo_modelo}</dd></div>
            <div><dt>Ubicación</dt><dd>{inc.sector} · {PISOS[inc.piso]}</dd></div>
            <div><dt>Qué falla</dt><dd>{COMPONENTES[inc.componente]}</dd></div>
            <div><dt>Técnico</dt><dd>{inc.asignado_nombre || 'Sin asignar'}</dd></div>
            <div style={{ gridColumn: '1 / -1' }}><dt>Descripción</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{inc.descripcion}</dd></div>
            {inc.solucion && <div style={{ gridColumn: '1 / -1' }}><dt>Solución</dt><dd>{inc.solucion}</dd></div>}
          </dl>
          {esStaff && inc.estado !== 'cerrada' && <Gestion inc={inc} onSaved={actualizar} />}
          {esStaff && !['resuelta', 'cerrada'].includes(inc.estado) && <UsarRepuesto inc={inc} onSaved={actualizar} />}
          {inc.repuestos.length > 0 && (
            <section>
              <h3 className="section-title">Repuestos usados</h3>
              <ul className="list-plain">
                {inc.repuestos.map((r) => (
                  <li key={r.id} className="list-row"><span className="grow">{r.cantidad} × {r.nombre}</span><span className="faint">{fechaHora(r.fecha)}</span></li>
                ))}
              </ul>
            </section>
          )}
          <section>
            <h3 className="section-title">Historial</h3>
            <ol className="timeline">
              {inc.eventos.map((ev) => (
                <li key={ev.id} style={{ '--tone': `var(--${TONO_EVENTO[ev.tipo]})` }}>
                  <div>{ev.tipo === 'comentario' ? <><strong>{ev.usuario}:</strong> {ev.detalle}</> : ev.detalle}</div>
                  <div className="when">{ev.tipo !== 'comentario' && ev.usuario ? `${ev.usuario} · ` : ''}{fechaHora(ev.fecha)}</div>
                </li>
              ))}
            </ol>
            {inc.estado !== 'cerrada' && <Comentar inc={inc} onSaved={actualizar} />}
          </section>
        </>
      )}
    </Modal>
  )
}

/** Asignación, prioridad, estado y solución (personal de IT). */
function Gestion({ inc, onSaved }) {
  const notify = useToast()
  const { refreshBadges } = useShell()
  const { data: tecnicos } = useResource(() => get('/usuarios/tecnicos'))
  const f = useForm({
    asignado_a: inc.asignado_a ? String(inc.asignado_a) : '',
    prioridad: inc.prioridad, estado: inc.estado, solucion: inc.solucion || '',
  })
  const resolviendo = ['resuelta', 'cerrada'].includes(f.values.estado)
  const cambios = ['asignado_a', 'prioridad', 'estado', 'solucion'].some((k) => String(f.values[k] ?? '') !== String(inc[k] ?? ''))

  const guardar = () =>
    f.submit(
      async (v) => {
        const nueva = await put(`/incidencias/${inc.id}`, {
          asignado_a: v.asignado_a ? Number(v.asignado_a) : null, prioridad: v.prioridad, estado: v.estado,
          ...(v.solucion ? { solucion: v.solucion } : {}),
        })
        notify(v.estado !== inc.estado ? `Incidencia en «${ESTADO_INCIDENCIA[v.estado][0]}».` : 'Cambios guardados.')
        refreshBadges()
        onSaved(nueva)
      },
      (v) => ({ solucion: ['resuelta', 'cerrada'].includes(v.estado) && !v.solucion.trim() ? 'Describí la solución aplicada.' : undefined }),
    )

  return (
    <section className="panel" style={{ padding: 16, display: 'grid', gap: 14 }}>
      <h3 className="section-title" style={{ margin: 0 }}>Gestionar</h3>
      {f.message && <div className="form-error" role="alert">{f.message}</div>}
      <div className="form-grid">
        <Field label="Técnico asignado" error={f.errors.asignado_a}>
          {(id) => (
            <select id={id} className="select" {...f.bind('asignado_a')}>
              <option value="">Sin asignar</option>
              {tecnicos?.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          )}
        </Field>
        <Field label="Prioridad">
          {(id) => (
            <select id={id} className="select" {...f.bind('prioridad')}>
              {Object.entries(PRIORIDAD).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
            </select>
          )}
        </Field>
      </div>
      <div>
        <span className="field-label">Estado</span>
        <div style={{ marginTop: 6 }}>
          <Choices
            name="estado"
            value={f.values.estado}
            onChange={(v) => f.set('estado', v)}
            options={Object.entries(ESTADO_INCIDENCIA).map(([value, [label, tone]]) => ({ value, label, tone }))}
          />
        </div>
      </div>
      {resolviendo && (
        <Field label="Solución aplicada" required error={f.errors.solucion} hint="Queda en el historial del equipo.">
          {(id) => <textarea id={id} className="textarea" maxLength={1000} {...f.bind('solucion')} />}
        </Field>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="primary" icon={Save} loading={f.busy} disabled={!cambios} onClick={guardar}>Guardar cambios</Button>
      </div>
    </section>
  )
}

function UsarRepuesto({ inc, onSaved }) {
  const notify = useToast()
  const [abierto, setAbierto] = useState(false)
  const { data: repuestos } = useResource(() => (abierto ? get('/repuestos') : Promise.resolve(null)), abierto)
  const f = useForm({ repuesto_id: '', cantidad: '1' })
  const elegido = repuestos?.find((r) => String(r.id) === f.values.repuesto_id)

  if (!abierto) {
    return <Button icon={PackagePlus} onClick={() => setAbierto(true)} style={{ justifySelf: 'start' }}>Registrar repuesto usado</Button>
  }
  const usar = () =>
    f.submit(
      async (v) => {
        const nueva = await post(`/incidencias/${inc.id}/repuestos`, { repuesto_id: Number(v.repuesto_id), cantidad: Number(v.cantidad) })
        notify(`Se descontó ${v.cantidad} × ${elegido.nombre} del stock.`)
        setAbierto(false)
        onSaved(nueva)
      },
      (v) => ({
        repuesto_id: v.repuesto_id ? undefined : 'Elegí el repuesto.',
        cantidad: Number(v.cantidad) >= 1 ? (elegido && Number(v.cantidad) > elegido.stock ? `Solo quedan ${elegido.stock}.` : undefined) : 'Mínimo 1.',
      }),
    )
  return (
    <section className="panel" style={{ padding: 16, display: 'grid', gap: 12 }}>
      <h3 className="section-title" style={{ margin: 0 }}>Registrar repuesto usado</h3>
      {f.message && <div className="form-error" role="alert">{f.message}</div>}
      <div className="form-grid">
        <Field label="Repuesto" error={f.errors.repuesto_id}>
          {(id) => (
            <select id={id} className="select" {...f.bind('repuesto_id')} data-autofocus>
              <option value="">{repuestos ? 'Elegí un repuesto' : 'Cargando…'}</option>
              {repuestos?.map((r) => <option key={r.id} value={r.id} disabled={r.stock === 0}>{r.nombre} — stock {r.stock}</option>)}
            </select>
          )}
        </Field>
        <Field label="Cantidad" error={f.errors.cantidad}>
          {(id) => <input id={id} className="input" type="number" min="1" max={elegido?.stock} {...f.bind('cantidad')} />}
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button onClick={() => setAbierto(false)}>Cancelar</Button>
        <Button variant="primary" loading={f.busy} onClick={usar}>Descontar del stock</Button>
      </div>
    </section>
  )
}

function Comentar({ inc, onSaved }) {
  const [texto, setTexto] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const enviar = async (e) => {
    e.preventDefault()
    if (!texto.trim()) return
    setBusy(true)
    setError(null)
    try {
      onSaved(await post(`/incidencias/${inc.id}/comentarios`, { texto }))
      setTexto('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <label htmlFor="comentario" className="field-label">Agregar un comentario</label>
      <textarea id="comentario" className="textarea" style={{ minHeight: 64 }} value={texto} maxLength={1000} onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === 'Enter' && enviar(e)} placeholder="Novedades, preguntas o datos para el técnico" />
      {error && <div className="form-error" role="alert">{error}</div>}
      <Button icon={MessageSquare} loading={busy} disabled={!texto.trim()} onClick={enviar} style={{ justifySelf: 'end' }}>Comentar</Button>
    </div>
  )
}

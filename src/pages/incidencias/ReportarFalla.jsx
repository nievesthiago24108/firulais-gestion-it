import { Send } from 'lucide-react'
import { useAuth } from '../../auth.jsx'
import { get, post } from '../../lib/api.js'
import { useResource } from '../../lib/useResource.js'
import { required, useForm } from '../../lib/useForm.js'
import { COMPONENTES, PRIORIDAD } from '../../lib/labels.js'
import { Modal } from '../../components/Modal.jsx'
import { Button, Choices, Field } from '../../components/ui.jsx'
import { EquipoSelect } from '../../components/EquipoSelect.jsx'
import { useToast } from '../../components/Toast.jsx'

/** Formulario "Reportar falla": lo usan empleados y técnicos desde cualquier pantalla. */
export function ReportarFalla({ equipoId, onClose, onCreated }) {
  const { esStaff, usuario } = useAuth()
  const notify = useToast()
  const equipos = useResource(() => get('/equipos', esStaff ? {} : { para_reporte: 1 }))
  const f = useForm({ equipo_id: equipoId ? String(equipoId) : '', prioridad: 'media', componente: '', titulo: '', descripcion: '' })

  // el empleado con una sola PC asignada la encuentra ya elegida
  const propios = !esStaff && equipos.data ? equipos.data.filter((e) => e.asignado_a === usuario.id) : []
  if (!f.values.equipo_id && propios.length === 1) f.set('equipo_id', String(propios[0].id))

  const enviar = () =>
    f.submit(
      async (v) => {
        const inc = await post('/incidencias', { ...v, equipo_id: Number(v.equipo_id) })
        notify(`Falla reportada. Número de seguimiento: #${inc.id}`)
        onCreated(inc)
      },
      (v) => required(v, {
        equipo_id: 'Elegí el equipo con la falla.', componente: 'Elegí qué parte falla.',
        titulo: 'Escribí un resumen corto.', descripcion: 'Contá qué pasa.',
      }),
    )

  return (
    <Modal
      title="Reportar falla"
      description="El área de Sistemas recibe el aviso y te avisa por acá cuando lo toma un técnico."
      size="lg"
      onClose={onClose}
      onSubmit={enviar}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" icon={Send} loading={f.busy}>Enviar reporte</Button>
        </>
      }
    >
      {f.message && <div className="form-error" role="alert">{f.message}</div>}
      <Field label="Equipo" required error={f.errors.equipo_id}>
        {(id) => <EquipoSelect id={id} equipos={equipos.data} {...f.bind('equipo_id')} data-autofocus />}
      </Field>
      <div>
        <span className="field-label" id="prio-label">¿Qué tan urgente es?</span>
        <div style={{ marginTop: 6 }} aria-labelledby="prio-label">
          <Choices
            name="prioridad"
            value={f.values.prioridad}
            onChange={(v) => f.set('prioridad', v)}
            options={Object.entries(PRIORIDAD).map(([value, [label, tone, description]]) => ({ value, label, tone, description }))}
          />
        </div>
      </div>
      <div className="form-grid">
        <Field label="Qué parte falla" required error={f.errors.componente}>
          {(id) => (
            <select id={id} className="select" {...f.bind('componente')}>
              <option value="">Elegí una opción</option>
              {Object.entries(COMPONENTES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          )}
        </Field>
        <Field label="Resumen" required error={f.errors.titulo} hint="Por ejemplo: «No enciende» o «Sin internet»">
          {(id) => <input id={id} className="input" maxLength={120} {...f.bind('titulo')} />}
        </Field>
        <Field label="Qué pasa" required error={f.errors.descripcion} className="span-2" hint="Desde cuándo, qué mensaje aparece y qué probaste.">
          {(id) => <textarea id={id} className="textarea" maxLength={1000} {...f.bind('descripcion')} />}
        </Field>
      </div>
    </Modal>
  )
}

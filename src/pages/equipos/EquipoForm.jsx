import { Save } from 'lucide-react'
import { get, post, put } from '../../lib/api.js'
import { useResource } from '../../lib/useResource.js'
import { required, useForm } from '../../lib/useForm.js'
import { ESTADO_EQUIPO, PISOS, TIPOS } from '../../lib/labels.js'
import { Modal } from '../../components/Modal.jsx'
import { Button, Field } from '../../components/ui.jsx'
import { useToast } from '../../components/Toast.jsx'

const VACIO = {
  codigo: '', tipo: 'pc', marca: '', modelo: '', nro_serie: '', sector_id: '', asignado_a: '', ip: '',
  anio_fabricacion: String(new Date().getFullYear()), estado: 'operativo', prestable: false,
  ultimo_mantenimiento: '', proximo_mantenimiento: '', observaciones: '',
}

/** Alta y edición de equipos. */
export function EquipoForm({ equipo, onClose, onSaved }) {
  const notify = useToast()
  const sectores = useResource(() => get('/sectores'))
  const usuarios = useResource(() => get('/usuarios/activos'))
  const f = useForm(equipo
    ? Object.fromEntries(Object.keys(VACIO).map((k) => [k, k === 'prestable' ? Boolean(Number(equipo[k])) : equipo[k] == null ? '' : String(equipo[k])]))
    : VACIO)

  const guardar = () =>
    f.submit(
      async (v) => {
        const body = {
          ...v,
          sector_id: Number(v.sector_id),
          asignado_a: v.asignado_a ? Number(v.asignado_a) : null,
          anio_fabricacion: v.anio_fabricacion ? Number(v.anio_fabricacion) : null,
        }
        const res = equipo ? await put(`/equipos/${equipo.id}`, body) : await post('/equipos', body)
        notify(equipo ? `${res.codigo} actualizado.` : `${res.codigo} dado de alta.`)
        onSaved(res)
      },
      (v) => required(v, { codigo: 'Ingresá un código.', marca: 'Ingresá la marca.', modelo: 'Ingresá el modelo.', sector_id: 'Elegí el sector.' }),
    )

  const input = (name, props = {}) => (id) => <input id={id} className="input" {...f.bind(name)} {...props} />
  return (
    <Modal
      title={equipo ? `Editar ${equipo.codigo}` : 'Nuevo equipo'}
      description="Los datos quedan en el inventario y en la planilla de mantenimiento."
      size="lg"
      onClose={onClose}
      onSubmit={guardar}
      footer={<><Button onClick={onClose}>Cancelar</Button><Button type="submit" variant="primary" icon={Save} loading={f.busy}>{equipo ? 'Guardar cambios' : 'Dar de alta'}</Button></>}
    >
      {f.message && <div className="form-error" role="alert">{f.message}</div>}
      <div className="form-grid">
        <Field label="Código" required error={f.errors.codigo} hint="Ej.: PC-P1-TES-06">{input('codigo', { maxLength: 30, 'data-autofocus': true })}</Field>
        <Field label="Tipo" required error={f.errors.tipo}>
          {(id) => <select id={id} className="select" {...f.bind('tipo')}>{Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}
        </Field>
        <Field label="Marca" required error={f.errors.marca}>{input('marca', { maxLength: 60 })}</Field>
        <Field label="Modelo" required error={f.errors.modelo}>{input('modelo', { maxLength: 80 })}</Field>
        <Field label="Número de serie" error={f.errors.nro_serie}>{input('nro_serie', { maxLength: 60 })}</Field>
        <Field label="Año de fabricación" error={f.errors.anio_fabricacion}>{input('anio_fabricacion', { type: 'number', min: 1990, max: 2100 })}</Field>
        <Field label="Sector" required error={f.errors.sector_id}>
          {(id) => (
            <select id={id} className="select" {...f.bind('sector_id')}>
              <option value="">Elegí un sector</option>
              {PISOS.map((p, i) => (
                <optgroup key={p} label={p}>
                  {sectores.data?.filter((s) => s.piso === i).map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </optgroup>
              ))}
            </select>
          )}
        </Field>
        <Field label="Asignado a" error={f.errors.asignado_a} hint="Dejalo vacío para equipos compartidos.">
          {(id) => (
            <select id={id} className="select" {...f.bind('asignado_a')}>
              <option value="">Nadie (compartido)</option>
              {usuarios.data?.map((u) => <option key={u.id} value={u.id}>{u.nombre} — {u.sector || 'sin sector'}</option>)}
            </select>
          )}
        </Field>
        <Field label="Dirección IP" error={f.errors.ip}>{input('ip', { placeholder: '192.168.21.40', inputMode: 'decimal' })}</Field>
        <Field label="Estado" required error={f.errors.estado}>
          {(id) => <select id={id} className="select" {...f.bind('estado')}>{Object.entries(ESTADO_EQUIPO).map(([k, [v]]) => <option key={k} value={k}>{v}</option>)}</select>}
        </Field>
        <Field label="Último mantenimiento" error={f.errors.ultimo_mantenimiento}>{input('ultimo_mantenimiento', { type: 'date' })}</Field>
        <Field label="Próximo mantenimiento" error={f.errors.proximo_mantenimiento} hint="Se calcula solo al registrar un mantenimiento.">{input('proximo_mantenimiento', { type: 'date' })}</Field>
        <Field label="Observaciones" error={f.errors.observaciones} className="span-2">
          {(id) => <textarea id={id} className="textarea" maxLength={500} {...f.bind('observaciones')} />}
        </Field>
        <label className="check span-2">
          <input type="checkbox" checked={f.values.prestable} onChange={(e) => f.set('prestable', e.target.checked)} />
          Se puede prestar (notebooks, proyectores y otros equipos del depósito)
        </label>
      </div>
    </Modal>
  )
}

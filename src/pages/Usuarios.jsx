import { useMemo, useState } from 'react'
import { Pencil, Plus, Search, Users as UsersIcon } from 'lucide-react'
import { useAuth } from '../auth.jsx'
import { get, post, put } from '../lib/api.js'
import { useResource } from '../lib/useResource.js'
import { required, useForm } from '../lib/useForm.js'
import { PISOS, ROLES } from '../lib/labels.js'
import { iniciales } from '../lib/format.js'
import { Button, Choices, Empty, Field, LoadError, PageHeader, Pill, Skeleton, Tabs } from '../components/ui.jsx'
import { DataTable } from '../components/DataTable.jsx'
import { Modal } from '../components/Modal.jsx'
import { useToast } from '../components/Toast.jsx'

const TONO_ROL = { admin: 'info', tecnico: 'accent', empleado: 'neutral' }

export default function Usuarios() {
  const { usuario } = useAuth()
  const [rol, setRol] = useState('todos')
  const [q, setQ] = useState('')
  const [editar, setEditar] = useState(null) // usuario | 'nuevo'
  const { data, error, loading, reload } = useResource(() => get('/usuarios'))

  const tabs = ['todos', 'admin', 'tecnico', 'empleado'].map((value) => ({
    value, label: value === 'todos' ? 'Todos' : ROLES[value][0], count: (data || []).filter((u) => value === 'todos' || u.rol === value).length,
  }))
  const rows = useMemo(() => (data || []).filter((u) => (rol === 'todos' || u.rol === rol) &&
    (!q.trim() || `${u.nombre} ${u.email} ${u.sector}`.toLowerCase().includes(q.trim().toLowerCase()))), [data, rol, q])

  const columns = [
    {
      key: 'nombre', label: 'Persona', render: (u) => (
        <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="avatar" aria-hidden="true">{iniciales(u.nombre)}</span>
          <span><div className="cell-main">{u.nombre}{u.id === usuario.id && <span className="faint"> (vos)</span>}</div><div className="cell-sub">{u.email}</div></span>
        </span>
      ),
    },
    { key: 'rol', label: 'Rol', render: (u) => <Pill tone={TONO_ROL[u.rol]}>{ROLES[u.rol][0]}</Pill> },
    { key: 'sector', label: 'Sector', render: (u) => u.sector ? <>{u.sector}<div className="cell-sub">{PISOS[u.piso]}</div></> : <span className="faint">—</span> },
    { key: 'activo', label: 'Acceso', render: (u) => Number(u.activo) ? <Pill tone="ok">Habilitado</Pill> : <Pill tone="neutral">Deshabilitado</Pill> },
    { key: 'acciones', label: '', sort: false, align: 'right', render: (u) => <Button size="sm" icon={Pencil} onClick={() => setEditar(u)}>Editar</Button> },
  ]

  return (
    <>
      <PageHeader title="Usuarios" description="Quién puede entrar al sistema y qué puede hacer.">
        <Button variant="primary" icon={Plus} onClick={() => setEditar('nuevo')}>Nuevo usuario</Button>
      </PageHeader>
      <div className="toolbar">
        <Tabs tabs={tabs} value={rol} onChange={setRol} label="Filtrar por rol" />
        <div className="grow">
          <Search size={16} aria-hidden="true" />
          <input className="input" type="search" placeholder="Nombre, email o sector" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar usuarios" />
        </div>
      </div>
      <section className="panel">
        {error ? <LoadError error={error} onRetry={reload} /> : loading && !data ? <Skeleton /> : (
          <DataTable caption="Usuarios" columns={columns} rows={rows} pageSize={20} empty={<Empty icon={UsersIcon} title="No hay usuarios en esta vista" />} />
        )}
      </section>
      {editar && <UsuarioForm u={editar === 'nuevo' ? null : editar} propio={editar?.id === usuario.id} onClose={(ok) => { setEditar(null); if (ok) reload() }} />}
    </>
  )
}

function UsuarioForm({ u, propio, onClose }) {
  const notify = useToast()
  const sectores = useResource(() => get('/sectores'))
  const f = useForm(u
    ? { nombre: u.nombre, email: u.email, rol: u.rol, sector_id: u.sector_id ? String(u.sector_id) : '', activo: Boolean(Number(u.activo)), password: '' }
    : { nombre: '', email: '', rol: 'empleado', sector_id: '', activo: true, password: '' })
  const guardar = () =>
    f.submit(
      async (v) => {
        const body = { ...v, sector_id: v.sector_id ? Number(v.sector_id) : null }
        if (!body.password) delete body.password
        u ? await put(`/usuarios/${u.id}`, body) : await post('/usuarios', body)
        notify(u ? `${v.nombre} actualizado.` : `Usuario de ${v.nombre} creado.`)
        onClose(true)
      },
      (v) => ({
        ...required(v, { nombre: 'Ingresá el nombre.', email: 'Ingresá el email.' }),
        password: (!u || v.password) && v.password.length < 8 ? 'Mínimo 8 caracteres.' : undefined,
      }),
    )
  return (
    <Modal title={u ? `Editar ${u.nombre}` : 'Nuevo usuario'} size="lg" onClose={() => onClose(false)} onSubmit={guardar}
      footer={<><Button onClick={() => onClose(false)}>Cancelar</Button><Button type="submit" variant="primary" loading={f.busy}>{u ? 'Guardar cambios' : 'Crear usuario'}</Button></>}>
      {f.message && <div className="form-error" role="alert">{f.message}</div>}
      <div className="form-grid">
        <Field label="Nombre y apellido" required error={f.errors.nombre}>{(id) => <input id={id} className="input" maxLength={120} {...f.bind('nombre')} data-autofocus />}</Field>
        <Field label="Email" required error={f.errors.email}>{(id) => <input id={id} type="email" className="input" maxLength={120} {...f.bind('email')} />}</Field>
        <Field label="Sector" error={f.errors.sector_id}>
          {(id) => (
            <select id={id} className="select" {...f.bind('sector_id')}>
              <option value="">Sin sector</option>
              {PISOS.map((p, i) => <optgroup key={p} label={p}>{sectores.data?.filter((s) => s.piso === i).map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</optgroup>)}
            </select>
          )}
        </Field>
        <Field label={u ? 'Nueva contraseña' : 'Contraseña'} required={!u} error={f.errors.password} hint={u ? 'Dejala vacía para no cambiarla.' : 'Mínimo 8 caracteres.'}>
          {(id) => <input id={id} type="password" className="input" autoComplete="new-password" {...f.bind('password')} />}
        </Field>
      </div>
      <div>
        <span className="field-label">Rol</span>
        <div style={{ marginTop: 6 }}>
          {propio ? <p className="muted">No podés cambiar tu propio rol.</p> : (
            <Choices name="rol" value={f.values.rol} onChange={(v) => f.set('rol', v)}
              options={Object.entries(ROLES).map(([value, [label, description]]) => ({ value, label, description }))} />
          )}
        </div>
      </div>
      {!propio && (
        <label className="check">
          <input type="checkbox" checked={f.values.activo} onChange={(e) => f.set('activo', e.target.checked)} />
          Puede ingresar al sistema
        </label>
      )}
    </Modal>
  )
}

import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ArrowDownUp, Download, Package, Pencil, Plus, Search } from 'lucide-react'
import { get, post, put } from '../lib/api.js'
import { useResource } from '../lib/useResource.js'
import { required, useForm } from '../lib/useForm.js'
import { CATEGORIAS } from '../lib/labels.js'
import { exportarXlsx } from '../lib/exportar.js'
import { Button, Choices, Empty, Field, LoadError, Meter, PageHeader, Pill, Skeleton, Tabs } from '../components/ui.jsx'
import { DataTable } from '../components/DataTable.jsx'
import { Modal } from '../components/Modal.jsx'
import { useToast } from '../components/Toast.jsx'
import { useShell } from '../components/AppShell.jsx'

export default function Repuestos() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [categoria, setCategoria] = useState('')
  const [modal, setModal] = useState(null) // { tipo: 'nuevo' | 'editar' | 'ajustar', r }
  const { data, error, loading, reload } = useResource(() => get('/repuestos'))
  const bajo = params.get('bajo_stock') === '1'

  const rows = useMemo(() => (data || []).filter((r) =>
    (!bajo || Number(r.bajo_stock)) && (!categoria || r.categoria === categoria) &&
    (!q.trim() || `${r.nombre} ${r.compatible_con}`.toLowerCase().includes(q.trim().toLowerCase()))), [data, bajo, categoria, q])

  const columns = [
    { key: 'nombre', label: 'Repuesto', render: (r) => <><div className="cell-main">{r.nombre}</div><div className="cell-sub">{r.compatible_con || '—'}</div></> },
    { key: 'categoria', label: 'Categoría', render: (r) => CATEGORIAS[r.categoria] },
    {
      key: 'stock', label: 'Stock', sort: (r) => r.stock - r.stock_minimo, render: (r) => {
        const tone = r.stock === 0 ? 'danger' : Number(r.bajo_stock) ? 'warn' : undefined
        return (
          <div style={{ display: 'grid', gap: 4, minWidth: 140 }}>
            <span><b className="num">{r.stock}</b> <span className="muted">/ mínimo {r.stock_minimo}</span></span>
            <Meter value={r.stock} max={Math.max(r.stock_minimo * 2, r.stock, 1)} tone={tone} label={`Stock de ${r.nombre}`} />
          </div>
        )
      },
    },
    { key: 'estado', label: 'Estado', sort: (r) => r.stock - r.stock_minimo, render: (r) => r.stock === 0 ? <Pill tone="danger">Sin stock</Pill> : Number(r.bajo_stock) ? <Pill tone="warn">Reponer</Pill> : <Pill tone="ok">OK</Pill> },
    { key: 'ubicacion', label: 'Ubicación', render: (r) => <span className="muted">{r.ubicacion || '—'}</span> },
    {
      key: 'acciones', label: '', sort: false, align: 'right', render: (r) => (
        <div className="row-actions">
          <Button size="sm" icon={ArrowDownUp} onClick={() => setModal({ tipo: 'ajustar', r })}>Ajustar stock</Button>
          <Button size="sm" icon={Pencil} onClick={() => setModal({ tipo: 'editar', r })} aria-label={`Editar ${r.nombre}`} />
        </div>
      ),
    },
  ]
  const cerrar = (recargar) => {
    setModal(null)
    if (recargar) reload()
  }
  const exportar = () => exportarXlsx('repuestos-firulais', 'Repuestos', [
    ['Repuesto', (r) => r.nombre], ['Categoría', (r) => CATEGORIAS[r.categoria]], ['Compatible con', (r) => r.compatible_con],
    ['Stock', (r) => r.stock], ['Stock mínimo', (r) => r.stock_minimo], ['A reponer', (r) => Math.max(0, r.stock_minimo * 2 - r.stock)],
    ['Ubicación', (r) => r.ubicacion],
  ], data || [])

  const bajos = (data || []).filter((r) => Number(r.bajo_stock)).length
  return (
    <>
      <PageHeader title="Repuestos" description="Stock de piezas para reparaciones. Al usar un repuesto en una incidencia se descuenta solo.">
        <Button icon={Download} onClick={exportar} disabled={!data?.length}>Exportar Excel</Button>
        <Button variant="primary" icon={Plus} onClick={() => setModal({ tipo: 'nuevo' })}>Nuevo repuesto</Button>
      </PageHeader>
      <div className="toolbar">
        <Tabs label="Filtrar" value={bajo ? 'bajo' : 'todos'} onChange={(v) => setParams(v === 'bajo' ? { bajo_stock: '1' } : {})}
          tabs={[{ value: 'todos', label: 'Todos', count: data?.length ?? 0 }, { value: 'bajo', label: 'Para reponer', count: bajos }]} />
        <div className="grow">
          <Search size={16} aria-hidden="true" />
          <input className="input" type="search" placeholder="Buscar repuesto o compatibilidad" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar repuestos" />
        </div>
        <select className="select" value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoría">
          <option value="">Todas las categorías</option>
          {Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <section className="panel">
        {error ? <LoadError error={error} onRetry={reload} /> : loading && !data ? <Skeleton /> : (
          <DataTable caption="Repuestos" columns={columns} rows={rows}
            empty={<Empty icon={Package} title={bajo ? 'No hay repuestos para reponer' : 'No hay repuestos en esta vista'} />} />
        )}
      </section>
      {modal?.tipo === 'ajustar' && <Ajuste r={modal.r} onClose={cerrar} />}
      {(modal?.tipo === 'nuevo' || modal?.tipo === 'editar') && <RepuestoForm r={modal.r} onClose={cerrar} />}
    </>
  )
}

function Ajuste({ r, onClose }) {
  const notify = useToast()
  const { refreshBadges } = useShell()
  const f = useForm({ sentido: 'ingreso', cantidad: '', motivo: '' })
  const guardar = () =>
    f.submit(
      async (v) => {
        const delta = Number(v.cantidad) * (v.sentido === 'ingreso' ? 1 : -1)
        const res = await post(`/repuestos/${r.id}/ajustar`, { delta, motivo: v.motivo })
        notify(`${r.nombre}: stock actualizado a ${res.stock}.`)
        refreshBadges()
        onClose(true)
      },
      (v) => ({
        ...required(v, { motivo: v.sentido === 'ingreso' ? 'Indicá el origen (compra, devolución…).' : 'Indicá el motivo del retiro.' }),
        cantidad: Number(v.cantidad) >= 1 ? (v.sentido === 'egreso' && Number(v.cantidad) > r.stock ? `Solo hay ${r.stock}.` : undefined) : 'Ingresá una cantidad mayor a cero.',
      }),
    )
  return (
    <Modal title="Ajustar stock" description={`${r.nombre} · hay ${r.stock}`} onClose={() => onClose(false)} onSubmit={guardar}
      footer={<><Button onClick={() => onClose(false)}>Cancelar</Button><Button type="submit" variant="primary" loading={f.busy}>Guardar ajuste</Button></>}>
      {f.message && <div className="form-error" role="alert">{f.message}</div>}
      <Choices name="sentido" value={f.values.sentido} onChange={(v) => f.set('sentido', v)} options={[
        { value: 'ingreso', label: 'Ingreso', description: 'Compra o devolución', tone: 'ok' },
        { value: 'egreso', label: 'Retiro', description: 'Uso fuera de una incidencia, rotura', tone: 'warn' },
      ]} />
      <div className="form-grid">
        <Field label="Cantidad" required error={f.errors.cantidad}>{(id) => <input id={id} type="number" min="1" className="input" {...f.bind('cantidad')} data-autofocus />}</Field>
        <Field label="Motivo" required error={f.errors.motivo}>{(id) => <input id={id} className="input" maxLength={120} {...f.bind('motivo')} placeholder="Ej.: compra OC 1532" />}</Field>
      </div>
    </Modal>
  )
}

function RepuestoForm({ r, onClose }) {
  const notify = useToast()
  const f = useForm(r
    ? { nombre: r.nombre, categoria: r.categoria, compatible_con: r.compatible_con || '', stock: String(r.stock), stock_minimo: String(r.stock_minimo), ubicacion: r.ubicacion || '' }
    : { nombre: '', categoria: '', compatible_con: '', stock: '0', stock_minimo: '1', ubicacion: 'Depósito IT' })
  const guardar = () =>
    f.submit(
      async (v) => {
        const body = { ...v, stock: Number(v.stock), stock_minimo: Number(v.stock_minimo) }
        if (r) {
          delete body.stock
          await put(`/repuestos/${r.id}`, body)
        } else {
          await post('/repuestos', body)
        }
        notify(r ? 'Repuesto actualizado.' : `${v.nombre} agregado al stock.`)
        onClose(true)
      },
      (v) => required(v, { nombre: 'Ingresá el nombre.', categoria: 'Elegí la categoría.' }),
    )
  return (
    <Modal title={r ? 'Editar repuesto' : 'Nuevo repuesto'} onClose={() => onClose(false)} onSubmit={guardar}
      footer={<><Button onClick={() => onClose(false)}>Cancelar</Button><Button type="submit" variant="primary" loading={f.busy}>{r ? 'Guardar cambios' : 'Agregar repuesto'}</Button></>}>
      {f.message && <div className="form-error" role="alert">{f.message}</div>}
      <div className="form-grid">
        <Field label="Nombre" required error={f.errors.nombre} className="span-2">{(id) => <input id={id} className="input" maxLength={120} {...f.bind('nombre')} data-autofocus />}</Field>
        <Field label="Categoría" required error={f.errors.categoria}>
          {(id) => <select id={id} className="select" {...f.bind('categoria')}><option value="">Elegí una</option>{Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}
        </Field>
        <Field label="Ubicación" error={f.errors.ubicacion}>{(id) => <input id={id} className="input" maxLength={80} {...f.bind('ubicacion')} />}</Field>
        <Field label="Compatible con" error={f.errors.compatible_con} className="span-2">{(id) => <input id={id} className="input" maxLength={200} {...f.bind('compatible_con')} placeholder="Modelos de equipos donde sirve" />}</Field>
        {!r && <Field label="Stock inicial" error={f.errors.stock}>{(id) => <input id={id} type="number" min="0" className="input" {...f.bind('stock')} />}</Field>}
        <Field label="Stock mínimo" error={f.errors.stock_minimo} hint="Debajo de este número se marca para reponer.">{(id) => <input id={id} type="number" min="0" className="input" {...f.bind('stock_minimo')} />}</Field>
      </div>
    </Modal>
  )
}

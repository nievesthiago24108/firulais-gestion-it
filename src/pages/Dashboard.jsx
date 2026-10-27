import { Link, useNavigate } from 'react-router'
import { AlertOctagon, ArrowLeftRight, CalendarClock, LifeBuoy, PackageMinus, Plus, Monitor } from 'lucide-react'
import { useAuth } from '../auth.jsx'
import { get } from '../lib/api.js'
import { useResource } from '../lib/useResource.js'
import { fechaHora, haceCuanto, vence } from '../lib/format.js'
import { ESTADO_EQUIPO, ESTADO_INCIDENCIA, PISOS, PISO_CORTO, PRIORIDAD, TIPOS, prestamoEstado, ESTADO_PRESTAMO } from '../lib/labels.js'
import { Button, Empty, LoadError, PageHeader, Pill, Skeleton } from '../components/ui.jsx'
import { useShell } from '../components/AppShell.jsx'

export default function Dashboard() {
  const { esStaff } = useAuth()
  const { data, error, loading, reload } = useResource(() => get('/dashboard'))
  if (error) return <LoadError error={error} onRetry={reload} />
  if (loading && !data) return <div className="panel"><Skeleton rows={10} /></div>
  return esStaff ? <PanelSistemas d={data} /> : <PanelEmpleado d={data} />
}

const hoy = () => new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`

function PanelSistemas({ d }) {
  const k = d.kpi
  const resumen = [
    k.incidencias_abiertas && plural(k.incidencias_abiertas, 'incidencia abierta', 'incidencias abiertas'),
    k.mantenimientos_vencidos && plural(k.mantenimientos_vencidos, 'mantenimiento vencido', 'mantenimientos vencidos'),
    k.prestamos_pendientes && plural(k.prestamos_pendientes, 'préstamo para aprobar', 'préstamos para aprobar'),
  ].filter(Boolean)
  return (
    <>
      <PageHeader
        title="Panel de Sistemas"
        description={`${hoy().replace(/^./, (c) => c.toUpperCase())}. ${resumen.length ? `Hay ${resumen.join(', ')}.` : 'No hay nada pendiente.'}`}
      />
      <div className="stats">
        <Link className="stat" to="/equipos">
          <span className="label">Equipos operativos</span>
          <span className="value">{k.operativos}</span>
          <span className="note">de {k.equipos} · {k.en_reparacion} en reparación</span>
        </Link>
        <Link className="stat" to="/incidencias" data-tone={k.incidencias_criticas ? 'danger' : undefined}>
          <span className="label">Incidencias abiertas</span>
          <span className="value">{k.incidencias_abiertas}</span>
          <span className="note">{plural(k.incidencias_criticas, 'crítica', 'críticas')} · {k.sin_asignar} sin asignar</span>
        </Link>
        <Link className="stat" to="/mantenimiento" data-tone={k.mantenimientos_vencidos ? 'warn' : undefined}>
          <span className="label">Mantenimiento vencido</span>
          <span className="value">{k.mantenimientos_vencidos}</span>
          <span className="note">{k.mantenimientos_proximos} vencen en 30 días</span>
        </Link>
        <Link className="stat" to="/prestamos" data-tone={k.prestamos_demorados ? 'danger' : undefined}>
          <span className="label">Préstamos activos</span>
          <span className="value">{k.prestamos_activos}</span>
          <span className="note">{plural(k.prestamos_demorados, 'demorado', 'demorados')} · {k.prestamos_pendientes} por aprobar</span>
        </Link>
      </div>

      <div className="dash">
        <div className="stack">
          <Edificio pisos={d.equipos_por_piso} />
          <section className="panel">
            <div className="panel-head"><h2>Actividad reciente</h2></div>
            <ul className="activity">
              {d.actividad.map((a) => (
                <li key={a.id}>
                  <span><strong>{a.usuario || 'Sistema'}</strong> {a.accion}</span>
                  <time dateTime={a.fecha} title={fechaHora(a.fecha)}>{haceCuanto(a.fecha)}</time>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <Cola d={d} />
      </div>
    </>
  )
}

/** Corte del edificio: una fila por planta con un bloque por equipo. */
function Edificio({ pisos }) {
  const total = pisos.reduce((n, p) => n + p.total, 0)
  return (
    <section className="building" aria-labelledby="edificio-titulo">
      <div className="building-head">
        <h2 id="edificio-titulo">El edificio por planta</h2>
        <p>{total} equipos en servicio · tocá una planta para ver su inventario</p>
      </div>
      <div className="floors">
        {[...pisos].reverse().map((p) => {
          const pcs = Math.max(0, p.pcs - p.en_reparacion)
          return (
            <Link key={p.piso} to={`/equipos?piso=${p.piso}`} className="floor" aria-label={`${PISOS[p.piso]}: ${p.total} equipos, ${p.en_reparacion} en reparación`}>
              <span className="floor-tag">{PISO_CORTO[p.piso]}<small>{PISOS[p.piso]}</small></span>
              <span className="floor-units" aria-hidden="true">
                {Array.from({ length: p.en_reparacion }, (_, i) => <i key={`r${i}`} className="unit" data-kind="reparacion" />)}
                {Array.from({ length: pcs }, (_, i) => <i key={`c${i}`} className="unit" />)}
                {Array.from({ length: p.impresoras }, (_, i) => <i key={`i${i}`} className="unit" data-kind="impresora" />)}
                {Array.from({ length: p.otros }, (_, i) => <i key={`o${i}`} className="unit" data-kind="otros" />)}
              </span>
              <span className="floor-meta">
                <span><b>{p.total}</b> equipos</span>
                {p.en_reparacion > 0 && <span style={{ color: 'var(--danger)' }}><b style={{ color: 'inherit' }}>{p.en_reparacion}</b> en reparación</span>}
              </span>
            </Link>
          )
        })}
      </div>
      <div className="ground" />
      <div className="legend">
        <span><i style={{ background: 'var(--accent)' }} />PC</span>
        <span><i style={{ background: 'var(--info)' }} />Impresora</span>
        <span><i style={{ background: 'var(--text-faint)' }} />Servidores, red y préstamo</span>
        <span><i style={{ background: 'var(--danger)' }} />En reparación</span>
      </div>
    </section>
  )
}

/** Todo lo que necesita una acción, ordenado por urgencia. */
function Cola({ d }) {
  const items = [
    ...d.incidencias_recientes.map((i) => ({
      key: `i${i.id}`, to: `/incidencias?ver=${i.id}`, icon: i.prioridad === 'critica' ? AlertOctagon : LifeBuoy,
      tone: PRIORIDAD[i.prioridad][1], orden: { critica: 0, alta: 2, media: 5, baja: 6 }[i.prioridad] + (i.asignado_a ? 0.5 : 0),
      title: i.titulo,
      sub: `${i.equipo_codigo} · ${i.sector} · ${i.asignado_nombre ? `asignada a ${i.asignado_nombre}` : 'sin asignar'} · ${haceCuanto(i.creada)}`,
      pill: <Pill value={i.prioridad} map={PRIORIDAD} />,
    })),
    ...d.prestamos_pendientes.map((p) => ({
      key: `p${p.id}`, to: '/prestamos?estado=pendiente', icon: ArrowLeftRight, tone: 'warn', orden: 1,
      title: `${p.solicitante_nombre} pide ${p.equipo_codigo}`, sub: `${p.motivo} · ${haceCuanto(p.fecha_solicitud)}`,
      pill: <Pill tone="warn">Por aprobar</Pill>,
    })),
    ...d.mantenimientos_vencidos.map((e) => ({
      key: `m${e.id}`, to: `/mantenimiento?ver=${e.id}`, icon: CalendarClock, tone: 'warn', orden: 3,
      title: `Mantenimiento de ${e.codigo}`, sub: `${e.sector} · ${vence(e.proximo_mantenimiento)}`,
      pill: <Pill tone="warn">Vencido</Pill>,
    })),
    ...d.repuestos_bajo_stock.map((r) => ({
      key: `r${r.id}`, to: '/repuestos?bajo_stock=1', icon: PackageMinus, tone: r.stock === 0 ? 'danger' : 'info', orden: 4,
      title: r.nombre, sub: `Quedan ${r.stock} · mínimo ${r.stock_minimo}`,
      pill: <Pill tone={r.stock === 0 ? 'danger' : 'info'}>{r.stock === 0 ? 'Sin stock' : 'Stock bajo'}</Pill>,
    })),
  ].sort((a, b) => a.orden - b.orden)

  return (
    <section className="panel" aria-labelledby="cola-titulo">
      <div className="panel-head">
        <h2 id="cola-titulo">Para atender ahora</h2>
        <span className="muted" style={{ marginLeft: 'auto' }}>{items.length}</span>
      </div>
      {items.length ? items.slice(0, 14).map((it) => (
        <Link key={it.key} to={it.to} className="queue-item">
          <span className="queue-icon" style={{ '--tone': `var(--${it.tone === 'neutral' ? 'text-muted' : it.tone})`, '--tone-soft': `var(--${it.tone === 'neutral' ? 'neutral' : it.tone}-soft)` }}>
            <it.icon size={17} aria-hidden="true" />
          </span>
          <span className="grow">
            <span className="title">{it.title}</span>
            <span className="sub" style={{ display: 'block' }}>{it.sub}</span>
          </span>
          {it.pill}
        </Link>
      )) : <Empty title="Nada pendiente">Las incidencias, préstamos y mantenimientos que necesiten atención van a aparecer acá.</Empty>}
    </section>
  )
}

function PanelEmpleado({ d }) {
  const { usuario } = useAuth()
  const { reportarFalla } = useShell()
  const navigate = useNavigate()
  const abiertas = d.incidencias.filter((i) => !['resuelta', 'cerrada'].includes(i.estado))
  return (
    <>
      <PageHeader title={`Hola, ${usuario.nombre.split(' ')[0]}`} description="Tus equipos, las fallas que reportaste y tus préstamos.">
        <Button icon={ArrowLeftRight} onClick={() => navigate('/prestamos?nuevo=1')}>Pedir un préstamo</Button>
        <Button variant="primary" icon={Plus} onClick={reportarFalla}>Reportar falla</Button>
      </PageHeader>
      <div className="grid-2">
        <section className="panel">
          <div className="panel-head"><h2>Mis equipos</h2></div>
          <div className="panel-body">
            {d.equipos.length ? (
              <ul className="list-plain">
                {d.equipos.map((e) => (
                  <li key={e.id} className="list-row">
                    <Monitor size={20} className="muted" aria-hidden="true" />
                    <span className="grow">
                      <span className="title">{e.codigo} · {e.marca} {e.modelo}</span>
                      <span className="sub">{TIPOS[e.tipo]} · {e.sector} · {PISOS[e.piso]} · IP {e.ip || '—'} · próximo mantenimiento {vence(e.proximo_mantenimiento)}</span>
                    </span>
                    <Pill value={e.estado} map={ESTADO_EQUIPO} />
                  </li>
                ))}
              </ul>
            ) : <Empty title="No tenés equipos asignados" />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <h2>Mis fallas reportadas</h2>
            <div className="actions"><Link className="btn btn-sm" to="/incidencias">Ver todas</Link></div>
          </div>
          <div className="panel-body">
            {abiertas.length ? (
              <ul className="list-plain">
                {abiertas.map((i) => (
                  <li key={i.id}>
                    <Link to={`/incidencias?ver=${i.id}`} className="list-row" style={{ textDecoration: 'none', color: 'inherit' }}>
                      <span className="grow">
                        <span className="title">{i.titulo}</span>
                        <span className="sub">{i.equipo_codigo} · {i.asignado_nombre ? `lo atiende ${i.asignado_nombre}` : 'esperando técnico'} · {haceCuanto(i.creada)}</span>
                      </span>
                      <Pill value={i.estado} map={ESTADO_INCIDENCIA} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <Empty icon={LifeBuoy} title="No tenés fallas abiertas">Si algo no funciona, reportalo y el área de Sistemas lo va a atender.</Empty>}
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="panel-head"><h2>Mis préstamos</h2></div>
        <div className="panel-body">
          {d.prestamos.length ? (
            <ul className="list-plain">
              {d.prestamos.slice(0, 6).map((p) => (
                <li key={p.id} className="list-row">
                  <ArrowLeftRight size={18} className="muted" aria-hidden="true" />
                  <span className="grow">
                    <span className="title">{p.equipo_codigo} · {p.equipo_marca} {p.equipo_modelo}</span>
                    <span className="sub">{p.motivo}{['pendiente', 'activo'].includes(p.estado) && ` · devolver ${vence(p.fecha_limite)}`}</span>
                  </span>
                  <Pill value={prestamoEstado(p)} map={ESTADO_PRESTAMO} />
                </li>
              ))}
            </ul>
          ) : <Empty icon={ArrowLeftRight} title="No pediste préstamos">Podés pedir una notebook o un proyector del depósito de Sistemas.</Empty>}
        </div>
      </section>
    </>
  )
}

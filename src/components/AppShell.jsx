import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import {
  LayoutDashboard, Monitor, LifeBuoy, CalendarCheck, ArrowLeftRight, Package, Users, Search, Menu,
  Moon, Sun, LogOut, Plus, ChevronDown,
} from 'lucide-react'
import { useAuth } from '../auth.jsx'
import { get } from '../lib/api.js'
import { iniciales } from '../lib/format.js'
import { ROLES } from '../lib/labels.js'
import { Brand } from './Brand.jsx'
import { Button } from './ui.jsx'
import { ReportarFalla } from '../pages/incidencias/ReportarFalla.jsx'

const ShellContext = createContext({ refreshBadges: () => {}, reportarFalla: () => {} })
export const useShell = () => useContext(ShellContext)

const NAV = [
  { to: '/', label: 'Panel', icon: LayoutDashboard, end: true },
  { to: '/equipos', label: 'Equipos', icon: Monitor },
  { to: '/incidencias', label: 'Incidencias', icon: LifeBuoy, badge: 'incidencias_abiertas' },
  { to: '/mantenimiento', label: 'Mantenimiento', icon: CalendarCheck, staff: true, badge: 'mantenimientos_vencidos' },
  { to: '/prestamos', label: 'Préstamos', icon: ArrowLeftRight, badge: 'prestamos_pendientes' },
  { to: '/repuestos', label: 'Repuestos', icon: Package, staff: true, badge: 'repuestos_bajo_stock' },
  { to: '/usuarios', label: 'Usuarios', icon: Users, admin: true },
]

export function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark')
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try { localStorage.setItem('firulais-theme', next) } catch { /* sin almacenamiento: solo esta sesión */ }
    setTheme(next)
  }
  return [theme, toggle]
}

export function AppShell() {
  const { usuario, esStaff, esAdmin, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const [reportar, setReportar] = useState(false)
  const [badges, setBadges] = useState({})
  const [theme, toggleTheme] = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const menuRef = useRef(null)

  const refreshBadges = useCallback(() => {
    if (!esStaff) return
    get('/dashboard').then((d) => setBadges(d.kpi)).catch(() => {})
  }, [esStaff])

  useEffect(refreshBadges, [refreshBadges])
  useEffect(() => setOpen(false), [location.pathname])
  useEffect(() => {
    if (!menu) return
    const close = (e) => !menuRef.current?.contains(e.target) && setMenu(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menu])

  const buscar = (e) => {
    e.preventDefault()
    const q = new FormData(e.currentTarget).get('q').trim()
    navigate(`/equipos${q ? `?q=${encodeURIComponent(q)}` : ''}`)
  }

  const links = NAV.filter((n) => (!n.staff || esStaff) && (!n.admin || esAdmin))
  return (
    <ShellContext.Provider value={{ refreshBadges, reportarFalla: () => setReportar(true) }}>
      <a href="#contenido" className="sr-only">Saltar al contenido</a>
      <div className="shell">
        {open && <div className="scrim" onClick={() => setOpen(false)} />}
        <aside className="sidebar" data-open={open} aria-label="Navegación principal">
          <Link to="/" className="brand"><Brand /></Link>
          <nav style={{ display: 'grid', gap: 2 }}>
            {links.map(({ to, label, icon: Icon, end, badge }) => (
              <NavLink key={to} to={to} end={end} className="nav-link">
                <Icon size={18} aria-hidden="true" />
                {label}
                {esStaff && badge && badges[badge] > 0 && (
                  <span className="count" aria-label={`${badges[badge]} pendientes`}>{badges[badge]}</span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-foot">
            <Button variant="ghost" icon={theme === 'dark' ? Sun : Moon} onClick={toggleTheme} style={{ justifyContent: 'flex-start' }}>
              {theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
            </Button>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <Button variant="ghost" icon={Menu} className="menu-btn" onClick={() => setOpen(true)} aria-label="Abrir menú" />
            {esStaff ? (
              <form className="topbar-search" role="search" onSubmit={buscar}>
                <Search size={16} aria-hidden="true" />
                <input className="input" name="q" type="search" placeholder="Buscar equipo por código, IP, sector o persona" aria-label="Buscar equipos" />
              </form>
            ) : <div className="topbar-spacer" />}
            {esStaff && <div className="topbar-spacer" />}
            <Button variant="primary" icon={Plus} onClick={() => setReportar(true)}>Reportar falla</Button>
            <div style={{ position: 'relative' }} ref={menuRef}>
              <button type="button" className="user-chip" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-haspopup="menu">
                <span className="avatar">{iniciales(usuario.nombre)}</span>
                <span className="user-meta">
                  {usuario.nombre}
                  <small>{ROLES[usuario.rol][0]}</small>
                </span>
                <ChevronDown size={16} className="faint" aria-hidden="true" />
              </button>
              {menu && (
                <div className="popover" role="menu">
                  <div style={{ padding: '8px 10px 10px' }}>
                    <strong>{usuario.nombre}</strong>
                    <div className="muted" style={{ fontSize: 'var(--fs-xs)' }}>{usuario.email}</div>
                  </div>
                  <Button variant="ghost" icon={LogOut} role="menuitem" onClick={logout}>Cerrar sesión</Button>
                </div>
              )}
            </div>
          </header>
          <main id="contenido" className="content">
            <Outlet />
          </main>
        </div>
      </div>
      {reportar && (
        <ReportarFalla
          onClose={() => setReportar(false)}
          onCreated={(inc) => {
            setReportar(false)
            refreshBadges()
            navigate(`/incidencias?ver=${inc.id}`)
          }}
        />
      )}
    </ShellContext.Provider>
  )
}

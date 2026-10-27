import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider, useAuth } from './auth.jsx'
import { ToastProvider } from './components/Toast.jsx'
import { AppShell } from './components/AppShell.jsx'
import { Empty } from './components/ui.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Equipos from './pages/equipos/Equipos.jsx'
import Incidencias from './pages/incidencias/Incidencias.jsx'
import Mantenimiento from './pages/Mantenimiento.jsx'
import Prestamos from './pages/prestamos/Prestamos.jsx'
import Repuestos from './pages/Repuestos.jsx'
import Usuarios from './pages/Usuarios.jsx'

function Guard({ need, children }) {
  const { esStaff, esAdmin } = useAuth()
  const ok = need === 'admin' ? esAdmin : esStaff
  return ok ? children : <Empty title="Sin acceso">Esta sección es para el área de sistemas. Si la necesitás, pedile acceso al administrador.</Empty>
}

function Routed() {
  const { usuario } = useAuth()
  if (usuario === undefined) return null // verificando la sesión
  if (!usuario) return <Login />
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="equipos" element={<Equipos />} />
        <Route path="incidencias" element={<Incidencias />} />
        <Route path="mantenimiento" element={<Guard><Mantenimiento /></Guard>} />
        <Route path="prestamos" element={<Prestamos />} />
        <Route path="repuestos" element={<Guard><Repuestos /></Guard>} />
        <Route path="usuarios" element={<Guard need="admin"><Usuarios /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <AuthProvider>
          <Routed />
        </AuthProvider>
      </ToastProvider>
    </HashRouter>
  )
}

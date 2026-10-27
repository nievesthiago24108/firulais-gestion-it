import { useState } from 'react'
import { LogIn, Moon, Sun } from 'lucide-react'
import { useAuth } from '../auth.jsx'
import { Brand } from '../components/Brand.jsx'
import { Button, Field } from '../components/ui.jsx'
import { useTheme } from '../components/AppShell.jsx'
import { PISOS } from '../lib/labels.js'

// Usuarios de ejemplo de database/seed.sql (contraseña firulais2026). Solo se muestran en desarrollo.
const DEMO = [
  ['admin@firulais.com.ar', 'Administrador'],
  ['tecnico@firulais.com.ar', 'Técnico'],
  ['empleado@firulais.com.ar', 'Empleado'],
]

// Bocas de red del plano por planta: PCs, impresoras.
const PLANO = [[18, 4], [25, 3], [18, 3], [12, 3]]

export default function Login() {
  const { login, expirada } = useAuth()
  const [theme, toggleTheme] = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(expirada ? 'Tu sesión expiró. Ingresá de nuevo para continuar.' : null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!email || !password) return setError('Completá tu email y tu contraseña.')
    setBusy(true)
    setError(null)
    try {
      await login(email.trim(), password)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <section className="login-art">
        <div className="brand" style={{ padding: 0 }}><Brand /></div>
        <div>
          <h1>Todo el parque informático del edificio, en un solo lugar.</h1>
          <p>Equipos por planta y oficina, fallas reportadas, mantenimiento preventivo, préstamos y repuestos del área de Sistemas.</p>
        </div>
        <div className="building" aria-hidden="true" style={{ maxWidth: 560 }}>
          <div className="floors">
            {[...PLANO.keys()].reverse().map((i) => (
              <div key={i} className="floor">
                <span className="floor-tag">{['PB', 'P1', 'P2', 'P3'][i]}<small>{PISOS[i]}</small></span>
                <span className="floor-units">
                  {Array.from({ length: PLANO[i][0] }, (_, k) => <i key={k} className="unit" />)}
                  {Array.from({ length: PLANO[i][1] }, (_, k) => <i key={`p${k}`} className="unit" data-kind="impresora" />)}
                </span>
              </div>
            ))}
          </div>
          <div className="ground" />
        </div>
      </section>

      <section className="login-form">
        <form onSubmit={submit} noValidate>
          <div>
            <h2>Ingresar</h2>
            <p className="muted">Usá tu cuenta de la empresa.</p>
          </div>
          {error && <div className="form-error" role="alert">{error}</div>}
          <Field label="Email">
            {(id) => <input id={id} className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />}
          </Field>
          <Field label="Contraseña">
            {(id) => <input id={id} className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
          </Field>
          <Button type="submit" variant="primary" icon={LogIn} loading={busy}>Ingresar</Button>
          {import.meta.env.DEV && (
            <div className="demo-users">
              <span className="muted">Usuarios de prueba · contraseña firulais2026</span>
              {DEMO.map(([mail, rol]) => (
                <button key={mail} type="button" onClick={() => { setEmail(mail); setPassword('firulais2026') }}>
                  <span>{mail}</span><span className="muted">{rol}</span>
                </button>
              ))}
            </div>
          )}
          <Button variant="ghost" size="sm" icon={theme === 'dark' ? Sun : Moon} onClick={toggleTheme} style={{ justifySelf: 'start' }}>
            {theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
          </Button>
        </form>
      </section>
    </div>
  )
}

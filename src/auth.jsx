import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { get, post, setCsrf, setUnauthorizedHandler } from './lib/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(undefined) // undefined = verificando sesión
  const [expirada, setExpirada] = useState(false)

  const aplicar = useCallback((res) => {
    setCsrf(res.csrf)
    setUsuario(res.usuario)
    return res.usuario
  }, [])

  useEffect(() => {
    get('/auth/me').then(aplicar).catch(() => setUsuario(null))
    setUnauthorizedHandler(() => {
      setUsuario(null)
      setExpirada(true)
    })
  }, [aplicar])

  const login = async (email, password) => {
    const u = aplicar(await post('/auth/login', { email, password }))
    setExpirada(false)
    return u
  }

  const logout = async () => {
    await post('/auth/logout').catch(() => {})
    const res = await get('/auth/me').catch(() => ({ usuario: null, csrf: null }))
    aplicar(res)
  }

  const value = {
    usuario,
    expirada,
    login,
    logout,
    esStaff: usuario?.rol === 'admin' || usuario?.rol === 'tecnico',
    esAdmin: usuario?.rol === 'admin',
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

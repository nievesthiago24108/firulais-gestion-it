import { useCallback, useEffect, useState } from 'react'

// Carga datos de la API y expone { data, error, loading, reload, setData }.
// `key` cambia cuando cambian los filtros: se vuelve a pedir automáticamente.
export function useResource(loader, key = '') {
  const [state, setState] = useState({ data: null, error: null, loading: true })

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await loader()
      setState({ data, error: null, loading: false })
    } catch (error) {
      setState((s) => ({ ...s, error, loading: false }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    reload()
  }, [reload])

  const setData = (fn) => setState((s) => ({ ...s, data: typeof fn === 'function' ? fn(s.data) : fn }))
  return { ...state, reload, setData }
}

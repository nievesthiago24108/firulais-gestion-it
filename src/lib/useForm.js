import { useState } from 'react'

// Estado de un formulario con los errores por campo que devuelve la API (422).
export function useForm(initial) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)

  const set = (name, value) => {
    setValues((v) => ({ ...v, [name]: value }))
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e))
  }
  /** Props para <input>/<select>/<textarea> controlados. */
  const bind = (name) => ({
    name,
    value: values[name] ?? '',
    onChange: (e) => set(name, e.target.type === 'checkbox' ? e.target.checked : e.target.value),
  })

  /** Ejecuta `action`; si falla muestra el mensaje y marca los campos con error. */
  const submit = async (action, validate) => {
    const local = validate?.(values) || {}
    if (Object.values(local).some(Boolean)) {
      setErrors(local)
      setMessage('Revisá los campos marcados.')
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      return await action(values)
    } catch (e) {
      setErrors(e.campos || {})
      setMessage(e.message)
    } finally {
      setBusy(false)
    }
  }

  return { values, set, bind, errors, message, busy, submit, setValues }
}

/** Valida campos obligatorios: required(values, { campo: 'mensaje' }) */
export const required = (values, campos) =>
  Object.fromEntries(Object.entries(campos).map(([k, msg]) => [k, String(values[k] ?? '').trim() ? undefined : msg]))

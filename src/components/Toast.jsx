import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, AlertTriangle, X } from 'lucide-react'

const ToastContext = createContext(() => {})

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id))
  const notify = useCallback((message, tone = 'ok') => {
    const id = Math.random()
    setToasts((t) => [...t.slice(-3), { id, message, tone }])
    setTimeout(() => dismiss(id), tone === 'danger' ? 7000 : 4000)
  }, [])
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast" data-tone={t.tone}>
            {t.tone === 'danger'
              ? <AlertTriangle size={18} color="var(--danger)" aria-hidden="true" />
              : <CheckCircle2 size={18} color="var(--ok)" aria-hidden="true" />}
            <p>{t.message}</p>
            <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => dismiss(t.id)} aria-label="Cerrar aviso">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

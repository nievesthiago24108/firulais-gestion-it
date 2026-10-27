import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from './ui.jsx'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Ventana modal accesible: foco atrapado, Escape y clic en el fondo cierran, devuelve el foco al cerrar. */
export function Modal({ title, description, onClose, children, footer, size, drawer, onSubmit }) {
  const ref = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const previo = document.activeElement
    const first = ref.current?.querySelector('[data-autofocus]') || ref.current?.querySelectorAll(FOCUSABLE)[1]
    first?.focus()
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
      if (e.key === 'Tab') {
        const items = [...ref.current.querySelectorAll(FOCUSABLE)]
        if (!items.length) return
        const [a, z] = [items[0], items[items.length - 1]]
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus() }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previo?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const Wrapper = onSubmit ? 'form' : 'div'
  const wrapperProps = onSubmit ? { onSubmit: (e) => { e.preventDefault(); onSubmit(e) }, noValidate: true } : {}
  return createPortal(
    <div className={`overlay ${drawer ? 'drawer-overlay' : ''}`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <Wrapper ref={ref} className={drawer ? 'drawer' : 'modal'} data-size={size} role="dialog" aria-modal="true" aria-labelledby={titleId} {...wrapperProps}>
        <div className="modal-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <Button variant="ghost" icon={X} onClick={onClose} aria-label="Cerrar" />
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </Wrapper>
    </div>,
    document.body,
  )
}

/** Confirmación para acciones que cambian datos de forma importante. */
export function Confirm({ title, children, confirmLabel, tone = 'primary', onConfirm, onClose, withReason }) {
  const [busy, setBusy] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState(null)
  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      await onConfirm(reason)
      onClose()
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Volver</Button>
          <Button variant={tone} loading={busy} onClick={run} data-autofocus>{confirmLabel}</Button>
        </>
      }
    >
      {children && <p className="muted">{children}</p>}
      {withReason && (
        <div className="field">
          <label htmlFor="confirm-reason">{withReason}</label>
          <textarea id="confirm-reason" className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
        </div>
      )}
      {error && <div className="form-error" role="alert">{error}</div>}
    </Modal>
  )
}

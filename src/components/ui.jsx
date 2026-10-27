import { useId } from 'react'
import { Inbox, RotateCw } from 'lucide-react'

export function Button({ variant, size, icon: Icon, loading, children, className = '', ...props }) {
  const cls = ['btn', variant && `btn-${variant}`, size && `btn-${size}`, !children && 'btn-icon', className]
  return (
    <button type="button" className={cls.filter(Boolean).join(' ')} disabled={loading || props.disabled} {...props}>
      {loading ? <span className="spinner" aria-hidden="true" /> : Icon && <Icon size={size === 'sm' ? 15 : 17} aria-hidden="true" />}
      {children}
    </button>
  )
}

/** Estado con color. `value` se busca en `map` ({ valor: [texto, tono] }). */
export function Pill({ value, map, tone, children }) {
  const [text, t] = map?.[value] || [children ?? value, tone]
  return <span className="pill" data-tone={t || tone}>{text}</span>
}

export function Field({ label, error, hint, required, children, className = '' }) {
  const id = useId()
  const child = typeof children === 'function' ? children(id) : children
  return (
    <div className={`field ${className}`} data-invalid={Boolean(error)}>
      {label && (
        <label htmlFor={id}>
          {label}
          {required && <span className="req" aria-hidden="true">*</span>}
        </label>
      )}
      {child}
      {error ? <span className="error" role="alert">{error}</span> : hint && <span className="hint">{hint}</span>}
    </div>
  )
}

export function PageHeader({ title, description, children }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children && <div className="actions">{children}</div>}
    </header>
  )
}

export function Empty({ icon: Icon = Inbox, title, children, action }) {
  return (
    <div className="empty">
      <Icon size={36} strokeWidth={1.5} aria-hidden="true" />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

export function LoadError({ error, onRetry }) {
  return (
    <Empty title="No se pudieron cargar los datos" action={<Button icon={RotateCw} onClick={onRetry}>Reintentar</Button>}>
      {error?.message}
    </Empty>
  )
}

export function Skeleton({ rows = 6 }) {
  return (
    <div style={{ display: 'grid', gap: 10, padding: 20 }} aria-busy="true" aria-label="Cargando">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" style={{ height: 18, width: `${90 - (i % 3) * 18}%` }} />
      ))}
    </div>
  )
}

export function Meter({ value, max, tone, label }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="meter" data-tone={tone} role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <span style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Tabs({ tabs, value, onChange, label }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.value} type="button" role="tab" className="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}>
          {t.label}
          {t.count !== undefined && <span className="n">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

/** Opciones como tarjetas (radio). options: [{ value, label, description, tone }] */
export function Choices({ name, options, value, onChange }) {
  return (
    <div className="choices" role="radiogroup">
      {options.map((o) => (
        <label key={o.value} className="choice" style={o.tone ? { '--tone': `var(--${o.tone === 'neutral' ? 'text-muted' : o.tone})` } : undefined}>
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
          <strong>{o.label}</strong>
          {o.description && <small>{o.description}</small>}
        </label>
      ))}
    </div>
  )
}

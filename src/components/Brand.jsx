// Isotipo de FIRULAIS: el edificio de cuatro plantas con un punto de red encendido en cada una.
export function BrandMark({ className = 'brand-mark' }) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true">
      <rect x="1" y="1" width="38" height="38" rx="10" fill="var(--accent)" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="10" y={9 + i * 6} width="20" height="4" rx="1.5" fill="var(--accent-ink)" opacity={0.35 + i * 0.2} />
          <circle cx={i % 2 ? 26 : 14} cy={11 + i * 6} r="1.4" fill="var(--accent)" />
        </g>
      ))}
      <rect x="8" y="33" width="24" height="2" rx="1" fill="var(--accent-ink)" />
    </svg>
  )
}

export function Brand() {
  return (
    <>
      <BrandMark />
      <span>
        <span className="brand-name">FIRULAIS</span>
        <span className="brand-sub">Gestión IT · Sistemas</span>
      </span>
    </>
  )
}

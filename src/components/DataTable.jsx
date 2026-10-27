import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button, Empty } from './ui.jsx'

/**
 * Tabla con orden por columna y paginación en el navegador; en pantallas chicas se ve como tarjetas.
 * columns: [{ key, label, render(row), sort(row) → valor, align }]
 */
export function DataTable({ columns, rows, rowKey = 'id', onRowClick, pageSize = 15, empty, caption }) {
  const [sort, setSort] = useState(null)
  const [page, setPage] = useState(0)

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    const val = col.sort || ((r) => r[col.key])
    return [...rows].sort((a, b) => {
      const [x, y] = [val(a), val(b)]
      const cmp = x == null ? 1 : y == null ? -1 : typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'es')
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [rows, sort, columns])

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const current = Math.min(page, pages - 1)
  const visible = sorted.slice(current * pageSize, current * pageSize + pageSize)

  if (!rows.length) return empty || <Empty title="No hay registros" />

  const toggle = (key) => setSort((s) => (s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' }))

  return (
    <>
      <div className="table-wrap">
        <table className="table">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} style={{ textAlign: c.align }} aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                  {c.sort !== false && c.label ? (
                    <button onClick={() => toggle(c.key)}>
                      {c.label}
                      {sort?.key === c.key && (sort.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                    </button>
                  ) : c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr
                key={r[rowKey]}
                data-clickable={Boolean(onRowClick)}
                onClick={onRowClick ? (e) => !e.target.closest('button, a, input, select') && onRowClick(r) : undefined}
                onKeyDown={onRowClick ? (e) => e.key === 'Enter' && e.target === e.currentTarget && onRowClick(r) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
              >
                {columns.map((c) => (
                  <td key={c.key} data-label={c.label || ''} style={{ textAlign: c.align }}>
                    {c.render ? c.render(r) : r[c.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-foot">
        <span>
          {sorted.length === 1 ? '1 registro' : `${sorted.length} registros`}
          {pages > 1 && ` · página ${current + 1} de ${pages}`}
        </span>
        {pages > 1 && (
          <div className="pager">
            <Button size="sm" icon={ChevronLeft} disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Página anterior" />
            <Button size="sm" icon={ChevronRight} disabled={current >= pages - 1} onClick={() => setPage(current + 1)} aria-label="Página siguiente" />
          </div>
        )}
      </div>
    </>
  )
}

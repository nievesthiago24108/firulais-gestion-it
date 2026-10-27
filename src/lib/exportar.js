// Exporta filas a un archivo .xlsx (SheetJS se carga solo cuando se usa).
// columnas: [[título, fila => valor], ...]
export async function exportarXlsx(nombre, hoja, columnas, filas) {
  const XLSX = await import('xlsx')
  const datos = [columnas.map(([t]) => t), ...filas.map((f) => columnas.map(([, fn]) => fn(f) ?? ''))]
  const ws = XLSX.utils.aoa_to_sheet(datos)
  ws['!cols'] = columnas.map(([t], i) => ({ wch: Math.min(48, Math.max(t.length, ...datos.slice(1).map((r) => String(r[i]).length)) + 2) }))
  ws['!autofilter'] = { ref: ws['!ref'] }
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, hoja)
  XLSX.writeFile(wb, `${nombre}-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

// Prueba de punta a punta en el navegador con los tres roles.
// Uso: node tests/e2e/flujos.mjs [url]   (recarga la base de desarrollo antes y después)
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const URL_APP = process.argv[2] || 'http://127.0.0.1:8000/'
const reset = () => execFileSync(fileURLToPath(new URL('../../tools/dev-db.sh', import.meta.url)), ['reset'], { stdio: 'ignore' })
let ok = 0
let fallas = 0
const errores = []
const check = (desc, cond) => {
  if (cond) ok++
  else { fallas++; console.log(`FALLA: ${desc}`) }
}

reset()
const browser = await chromium.launch()

async function ingresar(email) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errores.push(e.message))
  page.on('console', (m) => m.type() === 'error' && !/status of 4\d\d/.test(m.text()) && errores.push(m.text()))
  await page.goto(URL_APP)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Contraseña').fill('firulais2026')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await page.waitForSelector('.content h1')
  return page
}
const toast = (page, texto) => page.locator('.toast', { hasText: texto }).first().waitFor({ timeout: 5000 }).then(() => true, () => false)
const dialog = (page) => page.getByRole('dialog')

try {
  // --- Login incorrecto
  const anon = await browser.newPage()
  await anon.goto(URL_APP)
  await anon.getByLabel('Email').fill('admin@firulais.com.ar')
  await anon.getByLabel('Contraseña').fill('incorrecta')
  await anon.getByRole('button', { name: 'Ingresar' }).click()
  check('login incorrecto muestra error', await anon.getByRole('alert').filter({ hasText: 'incorrectos' }).waitFor({ timeout: 5000 }).then(() => true, () => false))

  // --- Empleado: reporta una falla y pide un préstamo
  const emp = await ingresar('empleado@firulais.com.ar')
  check('empleado ve su panel', await emp.getByRole('heading', { name: /Hola/ }).isVisible())
  check('empleado no ve Usuarios ni Repuestos', !(await emp.getByRole('link', { name: 'Usuarios' }).count()) && !(await emp.getByRole('link', { name: 'Repuestos' }).count()))
  await emp.getByRole('button', { name: 'Reportar falla' }).first().click()
  await dialog(emp).getByRole('button', { name: 'Enviar reporte' }).click()
  check('su PC viene elegida', (await dialog(emp).getByLabel(/Equipo/).inputValue()) !== '')
  check('validación del formulario de falla', await dialog(emp).getByText('Elegí qué parte falla.').isVisible())
  await dialog(emp).getByText('Alta', { exact: true }).click()
  await dialog(emp).getByLabel(/Qué parte falla/).selectOption('memoria')
  await dialog(emp).getByLabel(/Resumen/).fill('Se reinicia sola')
  await dialog(emp).getByLabel(/Qué pasa/).fill('Desde ayer se reinicia cada media hora con pantalla azul.')
  await dialog(emp).getByRole('button', { name: 'Enviar reporte' }).click()
  check('falla reportada (aviso)', await toast(emp, 'Número de seguimiento'))
  await emp.waitForURL(/incidencias\?ver=\d+/)
  const incId = new URL(emp.url().replace('#/', '')).searchParams.get('ver')
  check('se abre el detalle de la falla', await dialog(emp).getByRole('heading', { name: 'Se reinicia sola' }).waitFor({ timeout: 5000 }).then(() => true, () => false))
  await dialog(emp).getByLabel('Agregar un comentario').fill('La dejo prendida para que la revisen.')
  await dialog(emp).getByRole('button', { name: 'Comentar' }).click()
  check('empleado comenta', await dialog(emp).getByText('La dejo prendida').first().waitFor({ timeout: 5000 }).then(() => true, () => false))
  await emp.keyboard.press('Escape')

  await emp.goto(`${URL_APP}#/prestamos?nuevo=1`)
  const eq = dialog(emp).getByLabel(/Equipo/)
  await eq.selectOption({ index: 1 })
  const pedido = (await eq.locator('option:checked').textContent()).split(' — ')[0]
  await dialog(emp).getByLabel(/Para qué/).fill('Capacitación en el Salón de Reuniones')
  await dialog(emp).getByRole('button', { name: 'Enviar pedido' }).click()
  check('empleado pide préstamo', await toast(emp, 'Solicitud enviada'))

  // --- Técnico: atiende la falla con un repuesto y la resuelve
  const tec = await ingresar('tecnico@firulais.com.ar')
  check('técnico ve el panel de Sistemas', await tec.getByRole('heading', { name: 'Panel de Sistemas' }).isVisible())
  check('la falla nueva aparece para atender', await tec.locator('.queue-item', { hasText: 'Se reinicia sola' }).isVisible())
  await tec.goto(`${URL_APP}#/incidencias?ver=${incId}`)
  const d = dialog(tec)
  await d.getByText('En reparación', { exact: true }).last().click()
  await d.getByRole('button', { name: 'Guardar cambios' }).click()
  check('incidencia en reparación', await toast(tec, 'En reparación'))
  await d.getByRole('button', { name: 'Registrar repuesto usado' }).click()
  const rep = d.getByLabel('Repuesto', { exact: true })
  await rep.locator('option', { hasText: 'Memoria DDR4' }).waitFor({ state: 'attached' })
  await rep.selectOption(await rep.locator('option', { hasText: 'Memoria DDR4' }).getAttribute('value'))
  await d.getByRole('button', { name: 'Descontar del stock' }).click()
  check('repuesto descontado', await toast(tec, 'Se descontó'))
  await d.getByText('Resuelta', { exact: true }).last().click()
  await d.getByRole('button', { name: 'Guardar cambios' }).click()
  check('no se resuelve sin solución', await d.getByText('Describí la solución aplicada.').first().isVisible())
  await d.getByLabel(/Solución aplicada/).fill('Se reemplazó el módulo de memoria RAM.')
  await d.getByRole('button', { name: 'Guardar cambios' }).click()
  check('incidencia resuelta', await toast(tec, 'Resuelta'))
  check('historial con el repuesto', await d.getByText(/Se usó 1 × Memoria/).isVisible())
  await tec.keyboard.press('Escape')

  // --- Técnico: entrega y recibe el préstamo pedido
  await tec.goto(`${URL_APP}#/prestamos?estado=pendiente`)
  const fila = tec.locator('tr', { hasText: pedido })
  await fila.getByRole('button', { name: 'Entregar' }).click()
  await dialog(tec).getByRole('button', { name: 'Entregar' }).click()
  check('préstamo entregado', await toast(tec, `${pedido} entregado`))
  await tec.goto(`${URL_APP}#/prestamos?estado=activo`)
  await tec.locator('tr', { hasText: pedido }).getByRole('button', { name: 'Registrar devolución' }).click()
  await dialog(tec).getByRole('button', { name: 'Registrar devolución' }).click()
  check('devolución registrada', await toast(tec, 'volvió al depósito'))

  // --- Técnico: mantenimiento y planilla Excel
  await tec.goto(`${URL_APP}#/mantenimiento`)
  await tec.locator('tbody tr').first().waitFor()
  const vencidosAntes = Number(await tec.getByRole('tab', { name: /Vencidos/ }).locator('.n').textContent())
  await tec.locator('tbody tr').first().getByRole('button', { name: 'Registrar' }).click()
  await dialog(tec).getByRole('button', { name: 'Registrar mantenimiento' }).click()
  check('mantenimiento registrado', await toast(tec, 'registrado'))
  check('baja la cantidad de vencidos', await tec.getByRole('tab', { name: /Vencidos/ }).locator('.n', { hasText: new RegExp(`^${vencidosAntes - 1}$`) })
    .waitFor({ timeout: 5000 }).then(() => true, () => false))
  const [descarga] = await Promise.all([tec.waitForEvent('download'), tec.getByRole('button', { name: 'Exportar planilla' }).click()])
  check('exporta planilla .xlsx', /^plan-mantenimiento-firulais-.*\.xlsx$/.test(descarga.suggestedFilename()))

  // --- Técnico: stock y alta de equipo
  await tec.goto(`${URL_APP}#/repuestos`)
  await tec.locator('tbody tr').first().getByRole('button', { name: 'Ajustar stock' }).click()
  await dialog(tec).getByLabel(/Cantidad/).fill('10')
  await dialog(tec).getByLabel(/Motivo/).fill('Compra OC 1532')
  await dialog(tec).getByRole('button', { name: 'Guardar ajuste' }).click()
  check('ingreso de stock', await toast(tec, 'stock actualizado'))
  await tec.goto(`${URL_APP}#/equipos`)
  await tec.getByRole('button', { name: 'Nuevo equipo' }).click()
  await dialog(tec).getByLabel(/Código/).fill('PC-P1-TES-99')
  await dialog(tec).getByLabel(/Marca/).fill('HP')
  await dialog(tec).getByLabel(/Modelo/).fill('ProDesk 400 G9 SFF')
  await dialog(tec).getByLabel(/Sector/).selectOption({ label: 'Tesorería' })
  await dialog(tec).getByLabel(/Dirección IP/).fill('192.168.21.250')
  await dialog(tec).getByRole('button', { name: 'Dar de alta' }).click()
  check('alta de equipo', await toast(tec, 'PC-P1-TES-99 dado de alta'))
  await tec.goto(`${URL_APP}#/usuarios`)
  check('técnico no accede a Usuarios', await tec.getByText('Sin acceso').isVisible())

  // --- Administrador: crea un usuario
  const adm = await ingresar('admin@firulais.com.ar')
  await adm.goto(`${URL_APP}#/usuarios`)
  await adm.getByRole('button', { name: 'Nuevo usuario' }).click()
  await dialog(adm).getByLabel(/Nombre y apellido/).fill('Nueva Técnica')
  await dialog(adm).getByLabel(/Email/).fill('nueva.tecnica@firulais.com.ar')
  await dialog(adm).getByLabel(/^Contraseña/).fill('segura2026')
  await dialog(adm).getByText('Técnico', { exact: true }).click()
  await dialog(adm).getByRole('button', { name: 'Crear usuario' }).click()
  check('admin crea usuario', await toast(adm, 'Usuario de Nueva Técnica creado'))
  await adm.locator('.user-chip').click()
  await adm.getByRole('menuitem', { name: 'Cerrar sesión' }).click()
  check('cerrar sesión vuelve al login', await adm.getByRole('heading', { name: 'Ingresar' }).waitFor({ timeout: 5000 }).then(() => true, () => false))
} catch (e) {
  fallas++
  console.log('ERROR:', e.message.split('\n')[0])
} finally {
  await browser.close()
  reset()
}
check(`sin errores de JavaScript${errores.length ? `: ${errores.join(' | ')}` : ''}`, errores.length === 0)
console.log(`E2E: ${ok} correctas, ${fallas} con fallas`)
process.exit(fallas ? 1 : 0)

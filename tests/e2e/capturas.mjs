// Capturas de pantalla de cada vista para revisión visual.
// Uso: node tests/e2e/capturas.mjs <url> <carpeta> [ancho] [tema]
import { chromium } from 'playwright'

const [url = 'http://127.0.0.1:8000/', out = '/tmp', ancho = '1440', tema = 'dark'] = process.argv.slice(2)
const browser = await chromium.launch()
const errores = []

async function sesion(email) {
  const ctx = await browser.newContext({ viewport: { width: Number(ancho), height: 900 }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errores.push(`${email}: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && errores.push(`${email}: ${m.text()}`))
  await page.goto(url)
  await page.evaluate((t) => localStorage.setItem('firulais-theme', t), tema)
  await page.reload()
  if (email) {
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Contraseña').fill('firulais2026')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await page.waitForSelector('.content')
  }
  return page
}
const foto = async (page, nombre, ruta) => {
  if (ruta !== undefined) await page.goto(`${url}#${ruta}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(250)
  await page.screenshot({ path: `${out}/${nombre}-${ancho}-${tema}.png`, fullPage: true })
}

const anon = await sesion(null)
await foto(anon, 'login')
const admin = await sesion('admin@firulais.com.ar')
await foto(admin, 'panel')
for (const [n, r] of [['equipos', '/equipos'], ['incidencias', '/incidencias'], ['mantenimiento', '/mantenimiento'], ['prestamos', '/prestamos'], ['repuestos', '/repuestos'], ['usuarios', '/usuarios']]) {
  await foto(admin, n, r)
}
await foto(admin, 'incidencia-detalle', '/incidencias?ver=1')
await foto(admin, 'equipo-detalle', '/equipos?ver=4')
await admin.goto(`${url}#/`)
await admin.getByRole('button', { name: 'Reportar falla' }).first().click()
await foto(admin, 'reportar-falla')
const emp = await sesion('empleado@firulais.com.ar')
await foto(emp, 'empleado-panel')
await foto(emp, 'empleado-prestamo', '/prestamos?nuevo=1')
await browser.close()
console.log(errores.length ? `Errores:\n${errores.join('\n')}` : 'Sin errores de consola')

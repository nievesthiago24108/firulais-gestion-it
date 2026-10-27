// Auditoría automática de accesibilidad (axe, WCAG 2.1 AA) en cada vista, tema oscuro y claro.
// Uso: node tests/e2e/accesibilidad.mjs [url]
import { chromium } from 'playwright'
import { AxeBuilder } from '@axe-core/playwright'

const URL_APP = process.argv[2] || 'http://127.0.0.1:8000/'
const RUTAS = ['/', '/equipos', '/equipos?ver=4', '/incidencias', '/incidencias?ver=1', '/mantenimiento', '/prestamos', '/repuestos', '/usuarios']
const browser = await chromium.launch()
let total = 0
for (const tema of ['dark', 'light']) {
  const page = await (await browser.newContext({ viewport: { width: 1366, height: 900 } })).newPage()
  await page.goto(URL_APP)
  await page.evaluate((t) => localStorage.setItem('firulais-theme', t), tema)
  await page.reload()
  const auditar = async (nombre) => {
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(300)
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    for (const v of r.violations) {
      total++
      console.log(`[${tema}] ${nombre}: ${v.id} (${v.impact}) — ${v.nodes.length} elemento(s): ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`)
    }
  }
  await auditar('login')
  await page.getByLabel('Email').fill('admin@firulais.com.ar')
  await page.getByLabel('Contraseña').fill('firulais2026')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await page.waitForSelector('.content h1')
  for (const r of RUTAS) {
    await page.goto(`${URL_APP}#${r}`)
    await auditar(r)
  }
  await page.close()
}
await browser.close()
console.log(total ? `${total} problemas de accesibilidad` : 'Sin problemas de accesibilidad (WCAG 2.1 AA)')
process.exit(total ? 1 : 0)

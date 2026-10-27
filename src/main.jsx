import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/700.css'
import './styles/tokens.css'
import './styles/app.css'
import App from './App.jsx'

// Tema guardado antes del primer render para que no parpadee.
try {
  const saved = localStorage.getItem('firulais-theme')
  if (saved) document.documentElement.dataset.theme = saved
} catch { /* sin almacenamiento: tema oscuro por defecto */ }

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

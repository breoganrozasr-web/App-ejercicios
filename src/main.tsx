import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import { App } from './App'
import { loadCustomExercises } from './data/repo'
import { registerPWA } from './ui/pwa'

function applyTheme() {
  try {
    const t = localStorage.getItem('forja-theme')
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t
    else delete document.documentElement.dataset.theme
  } catch {
    /* almacenamiento no disponible: se usa el tema del sistema */
  }
}

async function boot() {
  applyTheme()
  try {
    await loadCustomExercises()
  } catch (e) {
    console.error('No se pudieron cargar los ejercicios propios', e)
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  void registerPWA()
}

void boot()

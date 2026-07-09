import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/noto-sans/index.css'
import '@fontsource/rajdhani/700.css'
import './index.css'
import App from './App.tsx'
import { MainMenuView } from './components/MainMenuView.tsx'

const shouldSkipMenu = sessionStorage.getItem('webarpg-skip-menu-once') === 'true';
sessionStorage.removeItem('webarpg-skip-menu-once');
const isMainMenuOpen = !shouldSkipMenu;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isMainMenuOpen ? <MainMenuView /> : <App />}
  </StrictMode>,
)

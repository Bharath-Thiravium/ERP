import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './styles/mobile-responsive.css'
import './utils/globalErrorHandler.js'

// Handle app initialization
const initApp = () => {
  try {
    const root = ReactDOM.createRoot(document.getElementById('root')!)
    root.render(<App />)
    
    // Remove loading spinner and show content
    setTimeout(() => {
      const spinner = document.querySelector('.loading-spinner') as HTMLElement
      const rootEl = document.getElementById('root')
      if (spinner) spinner.style.display = 'none'
      if (rootEl) rootEl.classList.add('loaded')
    }, 100)
  } catch (error) {
    console.error('App initialization failed:', error)
    document.body.innerHTML = '<div style="text-align:center;padding:50px;"><h2>App Failed to Load</h2><p>Please refresh the page.</p></div>'
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp)
} else {
  initApp()
}

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
    
    // Show content immediately when React has rendered
    // This prevents FOUC while still allowing styles to load
    const showContent = () => {
      const spinner = document.querySelector('.loading-spinner') as HTMLElement
      const rootEl = document.getElementById('root')
      if (spinner) {
        spinner.style.opacity = '0'
        setTimeout(() => {
          if (spinner) spinner.style.display = 'none'
        }, 300)
      }
      if (rootEl) rootEl.classList.add('loaded')
    }
    
    // Show content after a short delay to ensure React has rendered
    setTimeout(showContent, 50)
    
    // Fallback: ensure content is shown even if something goes wrong
    setTimeout(() => {
      const rootEl = document.getElementById('root')
      if (rootEl && !rootEl.classList.contains('loaded')) {
        showContent()
      }
    }, 2000)
    
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

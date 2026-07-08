import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Dark mode is the default (index.html sets class="dark"); never overridden here.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

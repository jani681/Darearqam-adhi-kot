import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Ye alert bataye ga ke app load ho rahi hai
alert("React is Working!");

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

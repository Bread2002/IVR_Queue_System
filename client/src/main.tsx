import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import './index.css'
import App from './App.tsx'

// Read Auth0 config from environment variables (set in client/.env)
const domain   = import.meta.env.VITE_AUTH0_DOMAIN   as string
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID as string

// Show a clear error if the env vars haven't been filled in yet
if (!domain || !clientId || domain === 'YOUR_TENANT.auth0.com') {
  createRoot(document.getElementById('root')!).render(
    <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h2>⚠️ Auth0 not configured</h2>
      <p>Open <code>client/.env</code> and set <code>VITE_AUTH0_DOMAIN</code> and <code>VITE_AUTH0_CLIENT_ID</code>, then restart the dev server.</p>
    </div>
  )
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Auth0Provider
        domain={domain}
        clientId={clientId}
        authorizationParams={{ redirect_uri: window.location.origin }}
      >
        <App />
      </Auth0Provider>
    </StrictMode>,
  )
}

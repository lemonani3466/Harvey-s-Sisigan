// src/pages/LoginPage.jsx - UPDATED
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button, Input } from '../components/ui'

import wall1 from '../assets/LOGO/wall1.jpg'
import logo from '../assets/LOGO/logo.jpg'

export default function LoginPage() {

const { login } = useAuth()
const navigate = useNavigate()

const [email, setEmail] = useState('cashier1@sisigan.ph')
const [password, setPassword] = useState('cashier123')
const [loading, setLoading] = useState(false)
const [error, setError] = useState('')

async function handleLogin() {
setLoading(true)
setError('')

try {
  const loggedInUser = await login(email, password)

  if (loggedInUser?.role === 'CASHIER') {
    navigate('/dashboard')
  } else {
    navigate('/dashboard')
  }

} catch (e) {
  setError(e.message)
} finally {
  setLoading(false)
}


}

return (

<div style={{
  minHeight: '100vh',

  background: 'var(--brown-800)',
  //backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${wall1})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',

  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20
}}>

  {/* Login Container */}
  <div style={{
    display: 'flex',
    width: 900,
    maxWidth: '95%',
    borderRadius: 'var(--radius-xl)',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-xl)'
  }}>

    {/* LEFT PANEL (LOGO) */}
    <div style={{
      flex: 1,
      background: 'var(--brown-600)',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
      textAlign: 'center'
    }}>

      <img
        src={logo}
        alt="logo"
        style={{ width: 160, marginBottom: 20 }}
      />

      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700
      }}>
        Harvey's Special Crispy Sisig
      </h2>

      <p style={{
        opacity: 0.8,
        fontSize: 13
      }}>
        Point of Sale System
      </p>

    </div>


    {/* RIGHT PANEL (LOGIN FORM) */}
    <div style={{
      flex: 1,
      background: 'var(--cream)',
      padding: '50px 40px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }}>

      <h2 style={{
        fontSize: 24,
        marginBottom: 20,
        color: 'var(--brown-800)'
      }}>
        Login
      </h2>

      {error && (
        <div style={{
          background: 'var(--red-light)',
          color: 'var(--red-dark)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          marginBottom: 16,
          fontSize: 13,
        }}>
          {error}
        </div>
      )}

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }}>

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Enter your email"
        />

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Enter your password"
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />

        {/* Forgot Password Link - NEW */}
        <div style={{
          textAlign: 'right',
          marginBottom: 6
        }}>
          <Link
            to="/forgot-password"
            style={{
              fontSize: 13,
              color: 'var(--brown-600)',
              textDecoration: 'none',
              fontWeight: 500,
              transition: 'color 0.2s'
            }}
            onMouseEnter={e => e.target.style.color = 'var(--brown-800)'}
            onMouseLeave={e => e.target.style.color = 'var(--brown-600)'}
          >
            Forgot password?
          </Link>
        </div>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={loading}
          onClick={handleLogin}
          style={{ marginTop: 6 }}
        >
          {loading ? 'Signing in…' : 'Login'}
        </Button>

      </div>

      {/* Hint */}
        <div style={{
          marginTop: 24, padding: '12px 14px',
          background: 'var(--brown-100)', borderRadius: 'var(--radius-md)',
          fontSize: 12, color: 'var(--brown-800)', lineHeight: 1.8,
        }}>
      {/* Dev Accounts */}
        <div style={{
                fontSize: 12,
                color: 'var(--text-muted)'
              }}>
                <strong>Dev accounts:</strong><br />
                owner@sisigan.ph / owner123<br />
                manager@sisigan.ph / manager123<br />
                cashier1@sisigan.ph / cashier123
              </div>
        </div>
    </div>

  </div>

</div>

)
}
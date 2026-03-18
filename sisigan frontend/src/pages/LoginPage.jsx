// src/pages/LoginPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button, Input } from '../components/ui'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [email,    setEmail]    = useState('cashier1@sisigan.ph')
  const [password, setPassword] = useState('cashier123')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleLogin() {
    setLoading(true); setError('')
    try {
      const loggedInUser = await login(email, password)
      // Redirect based on role
      if (loggedInUser?.role === 'CASHIER') {
        navigate('/pos')
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
      background: 'var(--brown-950)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      {/* Background texture */}
      <div style={{
        position: 'fixed', inset: 0, opacity: 0.04,
        backgroundImage: 'radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)',
        backgroundSize: '32px 32px',
      }} />

      <div className="animate-slide" style={{
        background: 'var(--cream)', borderRadius: 'var(--radius-xl)',
        padding: '48px 40px', width: 380,
        boxShadow: 'var(--shadow-xl)',
        position: 'relative',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🍖</div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 28,
            color: 'var(--brown-800)', fontWeight: 700, marginBottom: 4,
          }}>
            Sisigan
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Point of Sale System
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'var(--red-light)', color: 'var(--red-dark)',
            padding: '10px 14px', borderRadius: 'var(--radius-md)',
            marginBottom: 16, fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={loading}
            onClick={handleLogin}
            style={{ marginTop: 6 }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </div>

        {/* Hint */}
        <div style={{
          marginTop: 24, padding: '12px 14px',
          background: 'var(--brown-100)', borderRadius: 'var(--radius-md)',
          fontSize: 12, color: 'var(--brown-800)', lineHeight: 1.8,
        }}>
          <strong>Dev accounts:</strong><br />
          admin@sisigan.ph / admin123<br />
          cashier1@sisigan.ph / cashier123
        </div>
      </div>
    </div>
  )
}

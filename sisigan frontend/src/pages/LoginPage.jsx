// src/pages/LoginPage.jsx - UI/UX IMPROVED VERSION

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

    <div
      style={{

        // CHANGE: smoother brown background
        minHeight: '100vh',

        background: `linear-gradient(135deg,var(--brown-700),var(--brown-600))`,

        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',

        padding: 24

      }}
    >

      {/* MAIN LOGIN CARD */}
      <div
        style={{
          display: 'flex',
          width: 950,
          maxWidth: '95%',
          minHeight: 600,
          overflow: 'hidden',
          borderRadius: 30,
          boxShadow:
            '0 30px 80px rgba(0,0,0,.22)',
          background: '#b3510a'
        }}
      >
        {/* =======================================LEFT SIDE — BRAND SECTION======================================= */}
        <div
          style={{
            flex: 1,
            background: `linear-gradient(180deg,var(--brown-600),var(--brown-700))`,
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 60,
            textAlign: 'center'
          }}
        >
          {/*logo*/}
          <img
            src={logo}
            alt="logo"
            style={{
              width: 150,
              height: 150,
              objectFit: 'cover',
              borderRadius: 20,
              boxShadow:
                '0 12px 40px rgba(0,0,0,.25)',
              border:
                '3px solid rgba(255,255,255,.12)',
              marginBottom: 30
            }}
          />
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 38,
              fontWeight: 700,
              lineHeight: 1.15,
              marginBottom: 10
            }}
          >
            Harvey's Special
            <br />
            Crispy Sisig
          </h1>
          <p
            style={{opacity: .8,fontSize: 14,letterSpacing: .5
            }}
          >
            Point of Sale System
          </p>
          {/* added feature indicators */}
          {/* <div
            style={{
              marginTop: 40,fontSize: 13,opacity: .7,lineHeight: 2
            }}
          >
            ✓ Inventory Tracking
            <br />
            ✓ Sales Analytics
            <br />
            ✓ Faster Transactions
          </div> */}
        </div>

        {/* =======================================RIGHT SIDE — LOGIN FORM======================================= */}

        <div
          style={{
            flex: 1,
            background: 'var(--cream)',
            padding: '70px 55px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}
        >
          <div style={{ marginBottom: 30 }}>
            <h2
              style={{
                fontSize: 34,marginBottom: 8,color: 'var(--brown-800)'
              }}
            >
              Welcome Back
            </h2>
            <p
              style={{
                color: 'var(--text-muted)',
                fontSize: 14
              }}
            >
              Sign in to continue
            </p>
          </div>

          {/* ERROR */}
          {error && (
            <div
              style={{
                background: 'var(--red-light)',color: 'var(--red-dark)',padding: 14,borderRadius: 14,marginBottom: 20,fontSize: 13
              }}
            >
              {error}
            </div>
          )}
          <div
            style={{display: 'flex',flexDirection: 'column',gap: 16
            }}
          >
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
              onKeyDown={e =>
                e.key === 'Enter' &&
                handleLogin()
              }
            />

            {/* CHANGE: more subtle forgot password */}
            <div
              style={{
                textAlign: 'right'
              }}
            >
              <Link
                to="/forgot-password"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--brown-600)',
                  textDecoration: 'none',
                  opacity: .85
                }}
              >
                Forgot password?
              </Link>
            </div>
            {/* CHANGE: stronger CTA */}
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={loading}
              onClick={handleLogin}
              style={{
                marginTop: 8,
                height: 54,
                borderRadius: 14,
                fontWeight: 700,
                boxShadow:
                  '0 10px 28px rgba(146,64,14,.22)'
              }}
            >

              {loading
                ? 'Signing in...'
                : 'Sign In'}

            </Button>

          </div>

          {/* =======================================DEV ACCOUNTS======================================= */}
          {/* CHANGE: collapsed so it doesn't compete with login action*/}
          {/* <details
            style={{
              marginTop: 32
            }}
          >
            <summary
              style={{
                cursor: 'pointer',
                fontSize: 12,
                color: 'var(--text-muted)'
              }}
            >
              Development Accounts
            </summary>
            <div
              style={{
                marginTop: 10,
                padding: 14,
                background:
                  'rgba(170,90,20,.08)',
                border:
                  '1px solid rgba(170,90,20,.12)',
                borderRadius: 14,
                fontSize: 12,
                lineHeight: 2
              }}
            >
              owner@sisigan.ph / owner123
              <br />
              manager@sisigan.ph / manager123
              <br />
              cashier1@sisigan.ph / cashier123
            </div>
          </details> */}

        </div>
      </div>
    </div>
  )
}
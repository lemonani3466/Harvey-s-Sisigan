// src/pages/ForgotPasswordPage.jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button, Input } from '../components/ui'
import logo from '../assets/LOGO/logo.jpg'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: email, 2: verification code, 3: new password
  const [email, setEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // STEP 1: Request password reset
  async function handleRequestReset() {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to request password reset')
      }

      setSuccess('Verification code sent to your email!')
      setStep(2)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // STEP 2: Verify code and move to password reset
  async function handleVerifyCode() {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Invalid or expired verification code')
      }

      setSuccess('Code verified! Please enter your new password.')
      setStep(3)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // STEP 3: Reset password
  async function handleResetPassword() {
    setLoading(true)
    setError('')
    setSuccess('')

    // Validation
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code: verificationCode,
          newPassword
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password')
      }

      setSuccess('Password reset successfully! Redirecting to login...')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--brown-800)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20
    }}>

      {/* Container */}
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
            fontSize: 13,
            marginTop: 20
          }}>
            Reset Your Password
          </p>

        </div>

        {/* RIGHT PANEL (FORM) */}
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
            marginBottom: 8,
            color: 'var(--brown-800)'
          }}>
            Forgot Password
          </h2>

          <p style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            marginBottom: 20
          }}>
            {step === 1 && 'Enter your email to receive a verification code'}
            {step === 2 && 'Enter the code sent to your email'}
            {step === 3 && 'Enter your new password'}
          </p>

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

          {success && (
            <div style={{
              background: 'var(--green-light)',
              color: 'var(--green-dark)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              marginBottom: 16,
              fontSize: 13,
            }}>
              {success}
            </div>
          )}

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14
          }}>

            {/* STEP 1: Email Input */}
            {step === 1 && (
              <>
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email"
                />

                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={loading || !email}
                  onClick={handleRequestReset}
                >
                  {loading ? 'Sending...' : 'Send Verification Code'}
                </Button>
              </>
            )}

            {/* STEP 2: Verification Code */}
            {step === 2 && (
              <>
                <Input
                  label="Verification Code"
                  type="text"
                  value={verificationCode}
                  onChange={e => setVerificationCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-digit code"
                  maxLength="6"
                />

                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={loading || verificationCode.length !== 6}
                  onClick={handleVerifyCode}
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                </Button>

                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onClick={() => {
                    setStep(1)
                    setVerificationCode('')
                    setError('')
                  }}
                >
                  Back
                </Button>
              </>
            )}

            {/* STEP 3: New Password */}
            {step === 3 && (
              <>
                <Input
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 8 characters)"
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                />

                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={loading || !newPassword || !confirmPassword}
                  onClick={handleResetPassword}
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </Button>

                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onClick={() => {
                    setStep(2)
                    setNewPassword('')
                    setConfirmPassword('')
                    setError('')
                  }}
                >
                  Back
                </Button>
              </>
            )}

          </div>

          {/* Back to login link */}
          <div style={{
            marginTop: 20,
            textAlign: 'center'
          }}>
            <Link
              to="/login"
              style={{
                color: 'var(--brown-600)',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 500
              }}
            >
              Back to Login
            </Link>
          </div>

        </div>

      </div>

    </div>
  )
}

// src/components/ui/index.jsx
// Shared UI primitives used across pages

// ─── STATUS BADGE ─────────────────────────────────────────
const STATUS_STYLES = {
  PENDING:   { bg: '#FEF3C7', color: '#92400E' },
  PREPARING: { bg: '#DBEAFE', color: '#1E40AF' },
  READY:     { bg: '#D1FAE5', color: '#065F46' },
  COMPLETED: { bg: '#F3F4F6', color: '#374151' },
  CANCELLED: { bg: '#FEE2E2', color: '#991B1B' },
}

export function Badge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.PENDING
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '2px 10px', borderRadius: 'var(--radius-full)',
      fontSize: 11, fontWeight: 700, letterSpacing: 0.6,
      textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>{status}</span>
  )
}

// ─── BUTTON ───────────────────────────────────────────────
const BTN_VARIANTS = {
  primary:   { bg: 'var(--brown-600)', color: '#fff', hover: 'var(--brown-700)' },
  success:   { bg: 'var(--green)',     color: '#fff', hover: '#166534' },
  danger:    { bg: 'var(--red)',       color: '#fff', hover: '#b91c1c' },
  ghost:     { bg: 'transparent',     color: 'var(--brown-600)', hover: 'var(--brown-100)' },
  outline:   { bg: '#fff',            color: 'var(--brown-700)', hover: 'var(--brown-50)' },
  secondary: { bg: 'var(--brown-100)',color: 'var(--brown-800)', hover: 'var(--brown-300)' },
}

export function Button({ children, variant = 'primary', size = 'md', disabled, onClick, style = {}, fullWidth }) {
  const v = BTN_VARIANTS[variant]
  const padding = size === 'sm' ? '7px 14px' : size === 'lg' ? '13px 24px' : '10px 18px'
  const fontSize = size === 'sm' ? 12 : size === 'lg' ? 15 : 13

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding, fontSize, fontWeight: 700,
        background: disabled ? '#e5e7eb' : v.bg,
        color: disabled ? '#9ca3af' : v.color,
        border: variant === 'outline' ? '1.5px solid var(--border)' : 'none',
        borderRadius: 'var(--radius-md)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s, opacity 0.15s',
        width: fullWidth ? '100%' : undefined,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ─── INPUT ────────────────────────────────────────────────
export function Input({ label, error, style = {}, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>}
      <input
        {...props}
        style={{
          padding: '10px 12px', border: `1.5px solid ${error ? 'var(--red)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-md)', fontSize: 14,
          background: '#fff', color: 'var(--text-dark)', outline: 'none',
          transition: 'border-color 0.15s',
          ...style,
        }}
        onFocus={e => e.target.style.borderColor = 'var(--brown-600)'}
        onBlur={e => e.target.style.borderColor = error ? 'var(--red)' : 'var(--border)'}
      />
      {error && <span style={{ fontSize: 12, color: 'var(--red)' }}>{error}</span>}
    </div>
  )
}

// ─── SELECT ───────────────────────────────────────────────
export function Select({ label, options = [], style = {}, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>}
      <select
        {...props}
        style={{
          padding: '10px 12px', border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius-md)', fontSize: 14,
          background: '#fff', color: 'var(--text-dark)', outline: 'none',
          ...style,
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

// ─── MODAL ────────────────────────────────────────────────
export function Modal({ title, onClose, children, width = 440 }) {
  return (
    <div
      className="animate-fade"
      // onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(28, 10, 0, 0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div className="animate-slide" style={{
        background: 'var(--cream)', borderRadius: 'var(--radius-xl)',
        padding: 28, width, maxWidth: '100%',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: 'var(--shadow-xl)',
      }}>
        {title && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--brown-800)' }}>{title}</h2>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 20, lineHeight: 1, padding: 4,
            }}>x</button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

// ─── CARD ─────────────────────────────────────────────────
export function Card({ children, style = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--cream)', border: '1.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: 16,
        cursor: onClick ? 'pointer' : 'default',
        transition: onClick ? 'box-shadow 0.15s, border-color 0.15s' : undefined,
        ...style,
      }}
      onMouseEnter={onClick ? e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = 'var(--brown-300)'; } : undefined}
      onMouseLeave={onClick ? e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; } : undefined}
    >
      {children}
    </div>
  )
}

// ─── EMPTY STATE ──────────────────────────────────────────
export function EmptyState({ icon = '📋', title, subtitle }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-faint)' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: 'var(--text-muted)' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13 }}>{subtitle}</div>}
    </div>
  )
}

// ─── SPINNER ──────────────────────────────────────────────
export function Spinner({ size = 24, color = 'var(--brown-600)' }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid var(--border)`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  )
}

// src/components/layout/Navbar.jsx
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() { logout(); navigate('/login') }

  // Nav items visible per role
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['MANAGER', 'ADMIN'] },
    { to: '/pos',       label: 'New Order', icon: '🧾', roles: ['ADMIN', 'CASHIER'] },
    { to: '/orders',    label: 'Orders',    icon: '📋', roles: ['MANAGER', 'ADMIN', 'CASHIER'] },
    { to: '/menu',      label: 'Menu',      icon: '🍽️', roles: ['MANAGER', 'ADMIN'] },
    { to: '/users',     label: 'Accounts',  icon: '👥', roles: ['MANAGER', 'ADMIN'] },
  ].filter(item => item.roles.includes(user?.role))

  return (
    <nav style={{
      height: 'var(--nav-height)', background: 'var(--brown-800)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 22 }}>🍖</span>
        <span style={{ fontFamily: 'var(--font-display)', color: '#fff', fontSize: 18, fontWeight: 700 }}>Sisigan</span>
        <span style={{
          background: 'var(--brown-100)', color: 'var(--brown-800)',
          fontSize: 11, fontWeight: 700, padding: '3px 10px',
          borderRadius: 'var(--radius-full)', letterSpacing: 0.3,
        }}>
          {user?.role === 'MANAGER' ? 'All Branches' : user?.branch?.name || 'POS'}
        </span>
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: 4 }}>
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 'var(--radius-md)',
            textDecoration: 'none', fontSize: 13, fontWeight: 600,
            background: isActive ? 'rgba(255,255,255,0.18)' : 'transparent',
            color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
            transition: 'background 0.15s, color 0.15s',
          })}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      {/* User info + logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{user?.name}</div>
          <div style={{ color: 'var(--brown-300)', fontSize: 11 }}>{user?.role}</div>
        </div>
        <button onClick={handleLogout} style={{
          background: 'rgba(255,255,255,0.12)', border: 'none',
          color: '#fff', padding: '7px 14px', borderRadius: 'var(--radius-md)',
          fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s',
        }}
          onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.22)'}
          onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.12)'}
        >
          Sign Out
        </button>
      </div>
    </nav>
  )
}
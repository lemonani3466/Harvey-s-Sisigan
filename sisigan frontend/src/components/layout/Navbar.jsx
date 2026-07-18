import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

import logo from '../../assets/LOGO/logo.jpg'
import allorder from '../../assets/ICONS/allorder.png'
import analytics from '../../assets/ICONS/analytics.png'
import dashboard from '../../assets/ICONS/dashboard.png'
import branches from '../../assets/ICONS/branches.png'
import acc from '../../assets/ICONS/account.png'
import menu from '../../assets/ICONS/menu.png'
import orders from '../../assets/ICONS/orders.png'
import order from '../../assets/ICONS/order.png'
import inventory from '../../assets/ICONS/inventory.png'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: dashboard, roles: ['OWNER', 'MANAGER', 'CASHIER'] },
    { to: '/analytics', label: 'Analytics', icon: analytics, roles: ['OWNER'] },
    { to: '/inventory', label: 'Inventory', icon: inventory, roles: ['OWNER', 'MANAGER'] },
    { to: '/pos',       label: 'New Order', icon: order, roles: ['MANAGER', 'CASHIER'] },
    { to: '/orders',    label: 'Orders',    icon: orders, roles: ['MANAGER', 'CASHIER'] },
    { to: '/menu',      label: 'Menu',      icon: menu, roles: ['OWNER', 'MANAGER'] },
    { to: '/branches',  label: 'Branches',  icon: branches, roles: ['OWNER'] },
    { to: '/users',     label: 'Accounts',  icon: acc, roles: ['OWNER', 'MANAGER'] },
  ].filter(item => item.roles.includes(user?.role))

  return (
    <nav style={{
      height: 'var(--nav-height)', background: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 28px', boxShadow: '0 2px 14px rgba(120,53,15,0.08)',
      borderBottom: '1px solid var(--border-light)',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      {/* ── Logo section ───────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <img
          src={logo}
          alt="Harvey's Sisig Logo"
          style={{
            height: 46, width: 46, objectFit: 'cover',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 2px 8px rgba(120,53,15,0.15)',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
          <span style={{
            fontFamily: 'Georgia', color: 'var(--brown-800)',
            fontSize: 19, fontWeight: 700, whiteSpace: 'nowrap',
          }}>
            Harvey's Special Crispy Sisig
          </span>
          <span style={{
            display: 'inline-flex', alignSelf: 'flex-start', marginTop: 4,
            background: 'var(--brown-100)', color: 'var(--brown-700)',
            fontSize: 11, fontWeight: 700, padding: '3px 12px',
            borderRadius: 'var(--radius-full)', letterSpacing: 0.3,
          }}>
            {user?.role === 'OWNER' ? 'All Branches' : (user?.branch?.name || 'POS')}
          </span>
        </div>
      </div>

      {/* ── Nav pills ──────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '11px 20px', borderRadius: 'var(--radius-full)',
              textDecoration: 'none', fontSize: 14, fontWeight: 600,
              background: isActive ? 'var(--gradient-primary)' : 'transparent',
              color: isActive ? '#fff' : 'var(--brown-700)',
              boxShadow: isActive ? '0 4px 14px rgba(180,83,9,0.35)' : 'none',
              transition: 'background 220ms ease, color 220ms ease, box-shadow 220ms ease, transform 180ms ease',
              whiteSpace: 'nowrap',
            })}
            onMouseEnter={e => {
              if (!e.currentTarget.classList.contains('active')) {
                e.currentTarget.style.background = e.currentTarget.getAttribute('aria-current') === 'page'
                  ? undefined
                  : 'var(--brown-50)'
              }
            }}
            onMouseLeave={e => {
              if (e.currentTarget.getAttribute('aria-current') !== 'page') {
                e.currentTarget.style.background = 'transparent'
              }
            }}
          >
            <img src={item.icon} alt="" style={{ width: 19, height: 19, objectFit: 'contain', flexShrink: 0 }} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      {/* ── Owner / sign out section ───────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'var(--brown-100)', color: 'var(--brown-700)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, flexShrink: 0,
          }}>
            👤
          </div>
          <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
            <div style={{ color: 'var(--text-dark)', fontSize: 13.5, fontWeight: 700 }}>{user?.name}</div>
            <div style={{
              color: 'var(--brown-600)', fontSize: 10.5, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: 0.6,
            }}>
              {user?.role}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            background: '#fff', border: '1.5px solid var(--border)',
            color: 'var(--brown-700)', padding: '9px 18px',
            borderRadius: 'var(--radius-full)',
            fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
            transition: 'all 200ms ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#fef2f2'
            e.currentTarget.style.borderColor = '#fca5a5'
            e.currentTarget.style.color = 'var(--red-dark)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#fff'
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--brown-700)'
          }}
        >
          Sign Out
        </button>
      </div>
    </nav>
  )
}
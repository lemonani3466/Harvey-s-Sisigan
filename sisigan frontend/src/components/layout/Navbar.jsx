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
    //{ to: '/forecast', label: 'Forecast',   icon: forecast, roles: ['OWNER'] },
    { to: '/inventory', label: 'Inventory', icon: inventory, roles: ['OWNER', 'MANAGER'] },
    { to: '/pos',       label: 'New Order', icon: order, roles: ['MANAGER', 'CASHIER'] },
    { to: '/orders',    label: 'Orders',    icon: orders, roles: ['MANAGER', 'CASHIER'] },
    { to: '/menu',      label: 'Menu',      icon: menu, roles: ['OWNER', 'MANAGER'] },
    { to: '/branches',  label: 'Branches',  icon: branches, roles: ['OWNER'] },
    { to: '/users',     label: 'Accounts',  icon: acc, roles: ['OWNER', 'MANAGER'] },
  ].filter(item => item.roles.includes(user?.role))

  return (
    <nav style={{
      height: '70px', background: 'var(--brown-800)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src={logo} alt="Harvey's Sisig Logo" style={{ height: 36, width: 'auto', objectFit: 'contain' }} />
        <span style={{ fontFamily: 'sans-serif', color: '#fff', fontSize: 18, fontWeight: 700 }}>Harvey's Special Crispy Sisig</span>
        <span style={{
          background: 'var(--brown-100)', color: 'var(--brown-800)',
          fontSize: 11, fontWeight: 700, padding: '3px 10px',
          borderRadius: 'var(--radius-full)', letterSpacing: 0.3,
        }}>
          {user?.role === 'OWNER' ? 'All Branches' : user?.branch?.name || 'POS'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '7px 14px', borderRadius: 'var(--radius-md)',
            textDecoration: 'none', fontSize: 15, fontWeight: 600,
            background: isActive ? 'rgba(255,255,255,0.18)' : 'transparent',
            color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
            transition: 'background 0.15s, color 0.15s',
          })}>
            <img src={item.icon} alt={item.label} className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

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

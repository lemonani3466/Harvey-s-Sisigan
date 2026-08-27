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
      height: 'var(--nav-height)',
      background: 'linear-gradient(180deg,var(--brown-500),var(--brown-600))',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 28px', boxShadow: '0 2px 14px rgba(28,10,0,0.25)',
      position: 'sticky', top: 0, zIndex: 100,
      gap: 16, // ADDED: consistent spacing between the 3 sections when squeezed
    }}>
      {/* ── Logo section ───────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        flexShrink: 0, // UNCHANGED: logo never shrinks
      }}>
        <img
          src={logo}
          alt="Harvey's Sisig Logo"
          style={{
            height: 46, width: 46, objectFit: 'cover',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            flexShrink: 0, // ADDED: prevent logo image itself from squishing
          }}
        />
        {/* MODIFIED: hide the wordmark text on narrower widths so the pill bar gets
            more room, instead of letting the whole navbar overflow vertically */}
        <div className="navbar-brand-text" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
          <span style={{
            fontFamily: 'Georgia', color: '#fff',
            fontSize: 19, fontWeight: 700, whiteSpace: 'nowrap',
          }}>
            Harvey's Special Crispy Sisig
          </span>
          <span style={{
            display: 'inline-flex', alignSelf: 'flex-start', marginTop: 4,
            background: 'rgba(255,255,255,0.18)', color: '#fff',
            fontSize: 11, fontWeight: 700, padding: '3px 12px',
            borderRadius: 'var(--radius-full)', letterSpacing: 0.3,
          }}>
            {user?.role === 'OWNER' ? 'All Branches' : (user?.branch?.name || 'POS')}
          </span>
        </div>
      </div>

      {/* ── Nav pills ──────────────────────────────────── */}
      {/* MODIFIED: flexWrap removed (was causing the vertical stacking bug).
          Container now scrolls horizontally instead, and flex:1/minWidth:0 lets
          it actually shrink below its content width so overflow-x can kick in. */}
      <div
        className="navbar-scroll"
        style={{
          display: 'flex', gap: 6,
          flexWrap: 'nowrap',        // MODIFIED: was 'wrap'
          flex: '1 1 auto',          // ADDED: let this section shrink/grow
          minWidth: 0,               // ADDED: required for overflow to work inside flexbox
          overflowX: 'auto',         // ADDED: horizontal scroller
          overflowY: 'hidden',       // ADDED: never grow the navbar's height
          scrollbarWidth: 'thin',    // ADDED: thin scrollbar on Firefox
          justifyContent: 'flex-start', // MODIFIED: was 'center' (center fights with scrolling)
          WebkitOverflowScrolling: 'touch', // ADDED: smooth momentum scroll on touch devices
        }}
      >
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '11px 20px', borderRadius: 'var(--radius-full)',
              textDecoration: 'none', fontSize: 14, fontWeight: 600,
              background: isActive ? 'rgba(255,255,255,0.22)' : 'transparent',
              color: isActive ? '#fff' : 'rgba(255,255,255,0.72)',
              boxShadow: isActive ? '0 2px 10px rgba(0,0,0,0.15)' : 'none',
              transition: 'background 220ms ease, color 220ms ease, box-shadow 220ms ease, transform 180ms ease',
              whiteSpace: 'nowrap',
              flexShrink: 0, // ADDED: pills keep their natural width, never get squished
            })}
            onMouseEnter={e => {
              if (e.currentTarget.getAttribute('aria-current') !== 'page') {
                e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
                e.currentTarget.style.color = '#fff'
              }
            }}
            onMouseLeave={e => {
              if (e.currentTarget.getAttribute('aria-current') !== 'page') {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'rgba(255,255,255,0.72)'
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
            background: 'rgba(255,255,255,0.18)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, flexShrink: 0,
          }}>
            👤
          </div>
          {/* MODIFIED: hide name/role text block on narrower widths, same idea as brand text */}
          <div className="navbar-user-text" style={{ textAlign: 'left', lineHeight: 1.2 }}>
            <div style={{ color: '#fff', fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div style={{
              color: 'rgba(255,255,255,0.75)', fontSize: 10.5, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: 0.6, whiteSpace: 'nowrap',
            }}>
              {user?.role}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.3)',
            color: '#fff', padding: '9px 18px',
            borderRadius: 'var(--radius-full)',
            fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
            transition: 'all 200ms ease',
            flexShrink: 0, // ADDED: sign out button keeps its size
            whiteSpace: 'nowrap', // ADDED
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(220,38,38,0.85)'
            e.currentTarget.style.borderColor = 'rgba(220,38,38,0.85)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'
          }}
        >
          Sign Out
        </button>
      </div>

      {/* ADDED: responsive rules + custom thin scrollbar styling for the pill bar.
          At <=1024px the brand wordmark and user name/role text collapse first,
          giving the pill bar more room before it ever needs to scroll.
          Below that, the pill bar scrolls horizontally instead of wrapping. */}
      <style>{`
        .navbar-scroll::-webkit-scrollbar {
          height: 4px;
        }
        .navbar-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.35);
          border-radius: 4px;
        }
        .navbar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        @media (max-width: 1024px) {
          .navbar-brand-text { display: none !important; }
        }
        @media (max-width: 860px) {
          .navbar-user-text { display: none !important; }
        }
      `}</style>
    </nav>
  )
}
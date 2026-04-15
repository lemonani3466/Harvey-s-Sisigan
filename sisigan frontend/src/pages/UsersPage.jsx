// src/pages/UsersPage.jsx
import { useState, useEffect } from 'react'
import { usersApi, dashboardApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Button, Input, Modal, Badge, EmptyState } from '../components/ui'

const ROLE_COLORS = {
  OWNER:   { bg: '#FEE2E2', color: '#991B1B' },
  MANAGER: { bg: '#DBEAFE', color: '#1E40AF' },
  CASHIER: { bg: '#D1FAE5', color: '#065F46' },
}

function RoleBadge({ role }) {
  const s = ROLE_COLORS[role] || ROLE_COLORS.CASHIER
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '2px 10px', borderRadius: 'var(--radius-full)',
      fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
    }}>{role}</span>
  )
}

// ─── CREATE / EDIT MODAL ──────────────────────────────────
function UserModal({ editUser, branches, onClose, onSaved, requestingRole }) {
  const isEdit = !!editUser
  const [form, setForm] = useState({
    name:     editUser?.name     || '',
    email:    editUser?.email    || '',
    password: '',
    role:     editUser?.role     || 'CASHIER',
    branchId: editUser?.branch?.id || branches[0]?.id || '',
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // Roles that current user can assign
  const assignableRoles = requestingRole === 'OWNER'
    ? ['MANAGER', 'CASHIER']
    : ['CASHIER']  // Manager can only create cashiers

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    setLoading(true); setError('')
    try {
      if (isEdit) {
        const payload = { name: form.name, email: form.email }
        if (requestingRole === 'OWNER') {
          payload.role = form.role
          payload.branchId = form.branchId
        }
        await usersApi.update(editUser.id, payload)
      } else {
        if (!form.password) { setError('Password is required.'); setLoading(false); return }
        await usersApi.create(form)
      }
      onSaved()
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <Modal title={isEdit ? 'Edit Account' : 'Create Account'} onClose={onClose} width={420}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Full Name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Juan dela Cruz" />
        <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@sisigan.ph" />

        {!isEdit && (
          <Input label="Password" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Minimum 6 characters" />
        )}

        <div>
          <label style={lbl}>Role</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {assignableRoles.map(r => (
              <button key={r} onClick={() => set('role', r)} style={{
                flex: 1, padding: '9px 4px',
                border: `2px solid ${form.role === r ? 'var(--brown-600)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                background: form.role === r ? 'var(--brown-600)' : '#fff',
                color: form.role === r ? '#fff' : 'var(--brown-700)',
                fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
              }}>{r}</button>
            ))}
          </div>
        </div>

        {/* Branch assignment — Owner can pick any branch */}
        {requestingRole === 'OWNER' && (
          <div>
            <label style={lbl}>Branch</label>
            <select value={form.branchId} onChange={e => set('branchId', e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: 14, background: '#fff', outline: 'none' }}>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name} — {b.city}</option>)}
            </select>
          </div>
        )}

        {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="outline" fullWidth onClick={onClose}>Cancel</Button>
          <Button variant="primary" fullWidth disabled={loading} onClick={save}>
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Account'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── RESET PASSWORD MODAL ─────────────────────────────────
function ResetPasswordModal({ user, onClose }) {
  const [pwd,     setPwd]     = useState('')
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState('')

  async function save() {
    setLoading(true); setError('')
    try {
      await usersApi.resetPassword(user.id, pwd)
      setDone(true)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <Modal title={`Reset Password — ${user.name}`} onClose={onClose} width={360}>
      {done ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
          <div style={{ fontWeight: 700, color: 'var(--green)', marginBottom: 16 }}>Password updated!</div>
          <Button variant="primary" fullWidth onClick={onClose}>Close</Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="New Password" type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="Minimum 6 characters" />
          {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="outline" fullWidth onClick={onClose}>Cancel</Button>
            <Button variant="primary" fullWidth disabled={loading || pwd.length < 6} onClick={save}>
              {loading ? 'Updating…' : 'Reset Password'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─── USERS PAGE ───────────────────────────────────────────
export default function UsersPage() {
  const { user: me } = useAuth()
  const [users,    setUsers]    = useState([])
  const [branches, setBranches] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editUser,   setEditUser]   = useState(null)
  const [resetUser,  setResetUser]  = useState(null)
  const [toggling,   setToggling]   = useState(null)
  const [filterRole, setFilterRole] = useState('ALL')

  async function load() {
    setLoading(true)
    try {
      const [u, b] = await Promise.all([
        usersApi.list(),
        me?.role === 'OWNER' ? dashboardApi.branches() : Promise.resolve({ data: [] }),
      ])
      setUsers(u.data || [])
      // For manager, their own branch only
      if (me?.role === 'MANAGER') {
        setBranches([me.branch].filter(Boolean))
      } else {
        setBranches(b.data || [])
      }
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleToggle(userId) {
    setToggling(userId)
    try {
      await usersApi.toggle(userId)
      await load()
    } finally { setToggling(null) }
  }

  const filtered = filterRole === 'ALL' ? users : users.filter(u => u.role === filterRole)

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--brown-800)' }}>Accounts</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            {me?.role === 'OWNER' ? 'Manage accounts across all branches' : `Manage accounts for ${me?.branch?.name}`}
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowCreate(true)}>+ New Account</Button>
      </div>

      {/* Role filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['ALL', 'OWNER', 'MANAGER', 'CASHIER'].map(r => (
          <button key={r} onClick={() => setFilterRole(r)} style={{
            padding: '7px 16px', borderRadius: 'var(--radius-full)', border: 'none',
            background: filterRole === r ? 'var(--brown-600)' : 'var(--brown-100)',
            color: filterRole === r ? '#fff' : 'var(--brown-800)',
            fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
          }}>{r} {r !== 'ALL' ? `(${users.filter(u => u.role === r).length})` : `(${users.length})`}</button>
        ))}
      </div>

      {/* Users table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-faint)' }}>Loading accounts…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="👤" title="No accounts found" />
      ) : (
        <div style={{ background: 'var(--cream)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 140px 110px 120px', padding: '10px 16px', background: 'var(--brown-50)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span>Branch</span>
            <span>Status</span>
            <span style={{ textAlign: 'right' }}>Actions</span>
          </div>

          {filtered.map((u, i) => (
            <div key={u.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 120px 140px 110px 120px',
              padding: '12px 16px', alignItems: 'center',
              borderBottom: i < filtered.length - 1 ? '1px solid var(--border-light)' : 'none',
              opacity: !u.isActive ? 0.55 : 1,
              background: u.id === me?.id ? 'rgba(180,83,9,0.03)' : undefined,
            }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: 14 }}>
                  {u.name} {u.id === me?.id && <span style={{ fontSize: 10, color: 'var(--brown-500)' }}>(you)</span>}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
              <div><RoleBadge role={u.role} /></div>
              <div style={{ fontSize: 12, color: 'var(--text-mid)' }}>{u.branch?.name || '—'}</div>
              <div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: u.isActive ? 'var(--green-light)' : 'var(--red-light)',
                  color: u.isActive ? 'var(--green-dark)' : 'var(--red-dark)',
                }}>
                  {u.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                {/* Manager can only act on Cashiers — hide buttons for Owner/Manager rows */}
                {(me?.role === 'OWNER' || u.role === 'CASHIER') && (
                  <>
                    <button onClick={() => setEditUser(u)} style={actionBtn} title="Edit">✏️</button>
                    <button onClick={() => setResetUser(u)} style={actionBtn} title="Reset password">🔑</button>
                    {u.id !== me?.id && (
                      <button
                        onClick={() => handleToggle(u.id)}
                        disabled={toggling === u.id}
                        style={{ ...actionBtn, color: u.isActive ? 'var(--red)' : 'var(--green)' }}
                        title={u.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {toggling === u.id ? '…' : u.isActive ? '🚫' : '✅'}
                      </button>
                    )}
                  </>
                )}
                {/* Show a lock icon for rows the Manager cannot touch */}
                {me?.role === 'MANAGER' && u.role !== 'CASHIER' && u.id !== me?.id && (
                  <span title="No permission to edit this account" style={{ fontSize: 16, opacity: 0.35 }}>🔒</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <UserModal
          branches={branches}
          requestingRole={me?.role}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); load() }}
        />
      )}

      {editUser && (
        <UserModal
          editUser={editUser}
          branches={branches}
          requestingRole={me?.role}
          onClose={() => setEditUser(null)}
          onSaved={() => { setEditUser(null); load() }}
        />
      )}

      {resetUser && (
        <ResetPasswordModal
          user={resetUser}
          onClose={() => { setResetUser(null); load() }}
        />
      )}
    </div>
  )
}

const lbl = { fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8 }
const actionBtn = { background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', padding: '4px 8px', fontSize: 14 }
// src/pages/BranchesPage.jsx
import { useState, useEffect } from 'react'
import { branchesApi } from '../api/client'
import { Button, Input, Modal, EmptyState } from '../components/ui'

// ─── BRANCH FORM MODAL ────────────────────────────────────
function BranchModal({ editBranch, onClose, onSaved }) {
  const isEdit = !!editBranch
  const [form, setForm] = useState({
    name:      editBranch?.name      || '',
    address:   editBranch?.address   || '',
    city:      editBranch?.city      || '',
    contactNo: editBranch?.contactNo || '',
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    setLoading(true); setError('')
    try {
      if (isEdit) {
        await branchesApi.update(editBranch.id, form)
      } else {
        await branchesApi.create(form)
      }
      onSaved()
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <Modal title={isEdit ? '✏️ Edit Branch' : '🏪 New Branch'} onClose={onClose} width={420}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input
          label="Branch Name *"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="e.g. Sisigan BGC"
        />
        <Input
          label="Address *"
          value={form.address}
          onChange={e => set('address', e.target.value)}
          placeholder="e.g. 5th Ave, Bonifacio Global City"
        />
        <Input
          label="City *"
          value={form.city}
          onChange={e => set('city', e.target.value)}
          placeholder="e.g. Taguig"
        />
        <Input
          label="Contact No. (optional)"
          value={form.contactNo}
          onChange={e => set('contactNo', e.target.value)}
          placeholder="e.g. 09171234567"
        />

        {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <Button variant="outline" fullWidth onClick={onClose}>Cancel</Button>
          <Button variant="primary" fullWidth disabled={loading} onClick={save}>
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : '+ Create Branch'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── BRANCHES PAGE ────────────────────────────────────────
export default function BranchesPage() {
  const [branches,   setBranches]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editBranch, setEditBranch] = useState(null)
  const [toggling,   setToggling]   = useState(null)

  async function load() {
    setLoading(true)
    try {
      const data = await branchesApi.list()
      setBranches(data.data || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleToggle(id) {
    setToggling(id)
    try {
      await branchesApi.toggle(id)
      await load()
    } finally { setToggling(null) }
  }

  const active   = branches.filter(b => b.isActive)
  const inactive = branches.filter(b => !b.isActive)

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--brown-800)' }}>Branches</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            {active.length} active · {inactive.length} inactive
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowCreate(true)}>+ New Branch</Button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Branches', value: branches.length,  icon: '🏪' },
          { label: 'Active',         value: active.length,    icon: '✅' },
          { label: 'Inactive',       value: inactive.length,  icon: '🚫' },
          { label: 'Total Staff',    value: branches.reduce((s, b) => s + (b._count?.users || 0), 0), icon: '👥' },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, background: 'var(--cream)', border: '1.5px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <span style={{ fontSize: 28 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--brown-800)' }}>
                {s.value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Branch list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-faint)' }}>Loading branches…</div>
      ) : branches.length === 0 ? (
        <EmptyState icon="🏪" title="No branches yet" subtitle="Create your first branch above" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {branches.map(branch => (
            <div key={branch.id} style={{
              background: 'var(--cream)',
              border: `1.5px solid ${branch.isActive ? 'var(--border)' : 'var(--border-light)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '18px 22px',
              display: 'flex', alignItems: 'center', gap: 16,
              opacity: branch.isActive ? 1 : 0.6,
            }}>

              {/* Icon */}
              <div style={{
                width: 48, height: 48, borderRadius: 'var(--radius-md)',
                background: branch.isActive ? 'var(--brown-100)' : 'var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, flexShrink: 0,
              }}>
                🏪
              </div>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--brown-800)', fontFamily: 'var(--font-display)' }}>
                    {branch.name}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: branch.isActive ? 'var(--green-light)' : 'var(--red-light)',
                    color: branch.isActive ? 'var(--green-dark)' : 'var(--red-dark)',
                  }}>
                    {branch.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  📍 {branch.address}, {branch.city}
                </div>
                {branch.contactNo && (
                  <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>
                    📞 {branch.contactNo}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: 20, flexShrink: 0 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--brown-700)' }}>
                    {branch._count?.users || 0}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Staff</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--brown-700)' }}>
                    {branch._count?.orders || 0}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Orders</div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => setEditBranch(branch)}
                  style={actionBtn}
                  title="Edit branch"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleToggle(branch.id)}
                  disabled={toggling === branch.id}
                  title={branch.isActive ? 'Deactivate branch' : 'Activate branch'}
                  style={{
                    ...actionBtn,
                    borderColor: branch.isActive ? 'var(--border)' : 'var(--green)',
                    background: branch.isActive ? '#fff' : 'var(--green-light)',
                    color: branch.isActive ? 'var(--red)' : 'var(--green-dark)',
                  }}
                >
                  {toggling === branch.id ? '…' : branch.isActive ? '🚫' : '✅'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <BranchModal
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); load() }}
        />
      )}

      {editBranch && (
        <BranchModal
          editBranch={editBranch}
          onClose={() => setEditBranch(null)}
          onSaved={() => { setEditBranch(null); load() }}
        />
      )}
    </div>
  )
}

const actionBtn = {
  background: '#fff', border: '1.5px solid var(--border)',
  borderRadius: 'var(--radius-sm)', cursor: 'pointer',
  padding: '6px 10px', fontSize: 15,
}

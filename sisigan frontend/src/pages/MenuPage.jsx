// src/pages/MenuPage.jsx
import { useState, useEffect } from 'react'
import { menuApi } from '../api/client'
import { Button, Input, Modal, Badge, EmptyState, Card } from '../components/ui'
import { useAuth } from '../context/AuthContext'

function AddItemModal({ categories, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', price: '', description: '', categoryId: categories[0]?.id || '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.name || !form.price) { setError('Name and price are required.'); return }
    setLoading(true); setError('')
    try {
      await menuApi.create({ ...form, price: Number(form.price), categoryId: Number(form.categoryId) })
      onSaved()
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <Modal title="Add Menu Item" onClose={onClose} width={400}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Item Name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Spicy Sisig" />
        <Input label="Price (₱)" type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0.00" />

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Category</label>
          <select value={form.categoryId} onChange={e => set('categoryId', e.target.value)}
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: 14, background: '#fff', outline: 'none' }}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Description (optional)</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="Short description…" rows={3}
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: 14, background: '#fff', outline: 'none', resize: 'vertical', fontFamily: 'var(--font-body)' }}
          />
        </div>

        {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="outline" fullWidth onClick={onClose}>Cancel</Button>
          <Button variant="primary" fullWidth disabled={loading} onClick={save}>
            {loading ? 'Saving…' : 'Add Item'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default function MenuPage() {
  const { user } = useAuth()
  const [menu,      setMenu]      = useState([])
  const [activeTab, setActiveTab] = useState(null)
  const [showAdd,   setShowAdd]   = useState(false)
  const [toggling,  setToggling]  = useState(null)
  const [search,    setSearch]    = useState('')

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  async function load() {
    const data = await menuApi.categories()
    setMenu(data.data || [])
    if (!activeTab && data.data?.length) setActiveTab(data.data[0].id)
  }

  useEffect(() => { load() }, [])

  async function handleToggle(itemId) {
    setToggling(itemId)
    try {
      await menuApi.toggle(itemId)
      await load()
    } finally { setToggling(null) }
  }

  const categories = menu
  // When searching, flatten all items across categories; otherwise show active tab
  const currentItems = search.trim()
    ? menu.flatMap(c => c.items).filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        (i.description || '').toLowerCase().includes(search.toLowerCase())
      )
    : categories.find(c => c.id === activeTab)?.items || []

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--brown-800)' }}>
          Menu Management
        </h1>
        {canEdit && (
          <Button variant="primary" onClick={() => setShowAdd(true)}>+ Add Item</Button>
        )}
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <span style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          fontSize: 16, pointerEvents: 'none',
        }}>🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search menu items…"
          style={{
            width: '100%', padding: '10px 12px 10px 38px',
            border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)',
            fontSize: 14, background: '#fff', outline: 'none',
            boxSizing: 'border-box',
            borderColor: search ? 'var(--brown-400)' : 'var(--border)',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--brown-500)'}
          onBlur={e => e.target.style.borderColor = search ? 'var(--brown-400)' : 'var(--border)'}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 16, color: 'var(--text-muted)', padding: 4,
            }}
          >✕</button>
        )}
      </div>

      {/* Category tabs — hidden while searching */}
      {!search && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {categories.map(cat => {
            const disabledCount = cat.items.filter(i => !i.isAvailable).length
            return (
              <button key={cat.id} onClick={() => setActiveTab(cat.id)} style={{
                padding: '7px 18px', borderRadius: 'var(--radius-full)', border: 'none',
                background: activeTab === cat.id ? 'var(--brown-600)' : 'var(--brown-100)',
                color: activeTab === cat.id ? '#fff' : 'var(--brown-800)',
                fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {cat.name} <span style={{ opacity: 0.7 }}>({cat.items.length})</span>
                {disabledCount > 0 && (
                  <span style={{
                    marginLeft: 4, background: 'var(--red-light)', color: 'var(--red-dark)',
                    borderRadius: 'var(--radius-full)', fontSize: 10, padding: '1px 6px', fontWeight: 700,
                  }}>
                    {disabledCount} off
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Search result count */}
      {search && (
        <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--text-muted)' }}>
          {currentItems.length === 0
            ? `No items found for "${search}"`
            : `${currentItems.length} item${currentItems.length !== 1 ? 's' : ''} found for "${search}"`
          }
        </div>
      )}

      {/* Items table */}
      {currentItems.length === 0 ? (
        <EmptyState icon="🍽️" title="No items in this category" />
      ) : (
        <div style={{ background: 'var(--cream)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 100px 160px 100px',
            padding: '10px 16px', background: 'var(--brown-50)',
            borderBottom: '1px solid var(--border)',
            fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: 0.5,
          }}>
            <span>Item</span>
            <span>Price</span>
            <span>Description</span>
            <span style={{ textAlign: 'right' }}>Status</span>
          </div>

          {currentItems.map((item, i) => (
            <div key={item.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 100px 160px 100px',
              padding: '12px 16px', alignItems: 'center',
              borderBottom: i < currentItems.length - 1 ? '1px solid var(--border-light)' : 'none',
              background: !item.isAvailable ? 'rgba(220,38,38,0.04)' : undefined,
            }}>
              <div>
                <div style={{
                  fontWeight: 600, fontSize: 14,
                  color: item.isAvailable ? 'var(--text-dark)' : 'var(--text-faint)',
                  textDecoration: !item.isAvailable ? 'line-through' : 'none',
                }}>
                  {item.name}
                </div>
              </div>
              <div style={{ fontWeight: 700, color: item.isAvailable ? 'var(--brown-700)' : 'var(--text-faint)' }}>
                ₱{Number(item.price).toFixed(2)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', paddingRight: 12 }}>
                {item.description || <span style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>No description</span>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: item.isAvailable ? 'var(--green-light)' : 'var(--red-light)',
                  color: item.isAvailable ? 'var(--green-dark)' : 'var(--red-dark)',
                }}>
                  {item.isAvailable ? 'Available' : 'Disable'}
                </span>
                {canEdit && (
                  <button
                    onClick={() => handleToggle(item.id)}
                    disabled={toggling === item.id}
                    style={{
                      padding: '4px 10px',
                      border: `1.5px solid ${item.isAvailable ? 'var(--border)' : 'var(--green)'}`,
                      borderRadius: 'var(--radius-sm)',
                      background: item.isAvailable ? '#fff' : 'var(--green-light)',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      color: item.isAvailable ? 'var(--text-muted)' : 'var(--green-dark)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {toggling === item.id ? '…' : item.isAvailable ? 'Disable' : '✓ Enable'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddItemModal
          categories={categories}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load() }}
        />
      )}
    </div>
  )
}
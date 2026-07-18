import { useState, useEffect, useMemo, useCallback } from 'react'
import { inventoryApi, reportsApi, dashboardApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Button, EmptyState, Modal, Input } from '../components/ui'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

const COLORS = ['#b45309', '#d97706', '#f59e0b', '#92400e', '#78350f', '#a16207']
const CATEGORIES = ['SAUCE', 'SPICES', 'MAIN_INGREDIENT', 'RICE', 'UTILITIES', 'GAS']
const UNITS = ['ML', 'GRAM', 'LITER', 'PCS', 'GALLON', 'TANK', 'BAG', 'PACK', 'TUB']

function StatCard({ label, value, sub, tone = 'var(--brown-800)' }) {
  return (
    <div style={{ background: 'var(--cream)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '22px 24px', flex: 1, minWidth: 200, boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: tone, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12.5, color: 'var(--text-faint)', marginTop: 8 }}>{sub}</div>}
    </div>
  )
}

function Section({ title, right, children }) {
  return (
    <div style={{ background: 'var(--cream)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--brown-800)', fontSize: 17, fontWeight: 700 }}>{title}</h3>
        {right}
      </div>
      {children}
    </div>
  )
}

function AddIngredientModal({ isOwner, branches, branchId, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '',
    category: 'SAUCE',
    unit: 'PCS',
    quantity: '',
    minThreshold: '',
    price: '',
    consumptionRateDays: '',
    consumptionLabel: '',
    dailyDeductionAmount: '',
    branchId: branchId || branches[0]?.id || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })) }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name,
        category: form.category,
        unit: form.unit,
        quantity: Number(form.quantity),
      }

      if (isOwner && form.branchId) payload.branchId = Number(form.branchId)
      if (form.minThreshold !== '') payload.minThreshold = Number(form.minThreshold)
      if (form.price !== '') payload.price = Number(form.price)
      if (form.consumptionRateDays !== '') payload.consumptionRateDays = Number(form.consumptionRateDays)
      if (form.consumptionLabel.trim()) payload.consumptionLabel = form.consumptionLabel.trim()
      if (form.dailyDeductionAmount !== '') payload.dailyDeductionAmount = Number(form.dailyDeductionAmount)

      await inventoryApi.create(payload)
      onSaved()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Add Ingredient" onClose={onClose} width={480}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Oyster Sauce" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={lbl}>Category</label>
            <select value={form.category} onChange={(e) => set('category', e.target.value)} style={selectStyle}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Unit</label>
            <select value={form.unit} onChange={(e) => set('unit', e.target.value)} style={selectStyle}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        {isOwner && (
          <div>
            <label style={lbl}>Branch</label>
            <select value={form.branchId} onChange={(e) => set('branchId', e.target.value)} style={selectStyle}>
              <option value="">Select branch</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Quantity" type="number" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} />
          <Input label="Min Threshold" type="number" value={form.minThreshold} onChange={(e) => set('minThreshold', e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Price (optional)" type="number" value={form.price} onChange={(e) => set('price', e.target.value)} />
          <Input label="Consumption Days" type="number" value={form.consumptionRateDays} onChange={(e) => set('consumptionRateDays', e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Consumption Label" value={form.consumptionLabel} onChange={(e) => set('consumptionLabel', e.target.value)} placeholder="e.g. Daily" />
          <Input label="Daily Deduction" type="number" value={form.dailyDeductionAmount} onChange={(e) => set('dailyDeductionAmount', e.target.value)} />
        </div>

        {error && <div style={{ color: 'var(--red)', fontSize: 13 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="outline" fullWidth onClick={onClose}>Cancel</Button>
          <Button variant="primary" fullWidth disabled={saving || !form.name || !form.quantity} onClick={save}>
            {saving ? 'Saving...' : 'Add Ingredient'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function AdjustStockModal({ item, onClose, onSaved }) {
  const [mode, setMode] = useState(item.presetMode || 'ADD') // ADD | DEDUCT | SET
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const currentQty = Number(item.quantity || 0)

  async function save() {
    setSaving(true)
    setError('')
    try {
      const value = Number(amount)
      if (Number.isNaN(value) || value < 0) {
        setError('Amount must be a non-negative number.')
        setSaving(false)
        return
      }

      let nextQty = currentQty
      if (mode === 'ADD') nextQty = currentQty + value
      if (mode === 'DEDUCT') nextQty = Math.max(0, currentQty - value)
      if (mode === 'SET') nextQty = value

      await inventoryApi.update(item.id, {
        quantity: nextQty,
        note: note.trim() || `Stock ${mode.toLowerCase()} adjustment`,
      })

      onSaved()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Adjust Stock - ${item.ingredient?.name}`} onClose={onClose} width={440}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ padding: '12px 14px', background: 'var(--brown-50)', borderRadius: 'var(--radius-md)', fontSize: 13.5 }}>
          Current: <strong>{currentQty.toFixed(3)} {item.ingredient?.unit}</strong>
        </div>

        <div>
          <label style={lbl}>Action</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { key: 'ADD', label: 'Refill (+)' },
              { key: 'DEDUCT', label: 'Deduct (-)' },
              { key: 'SET', label: 'Set Exact' },
            ].map((m) => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                style={{
                  flex: 1,
                  padding: '10px 6px',
                  border: `1.5px solid ${mode === m.key ? 'var(--brown-600)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)',
                  background: mode === m.key ? 'var(--gradient-primary)' : '#fff',
                  color: mode === m.key ? '#fff' : 'var(--brown-700)',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 180ms ease',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <Input
          label={mode === 'SET' ? `Set Quantity (${item.ingredient?.unit})` : `Amount (${item.ingredient?.unit})`}
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Received new stock"
        />

        {error && <div style={{ color: 'var(--red)', fontSize: 13 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="outline" fullWidth onClick={onClose}>Cancel</Button>
          <Button variant="primary" fullWidth disabled={saving || amount === ''} onClick={save}>
            {saving ? 'Saving...' : 'Apply'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default function InventoryPage() {
  const { user } = useAuth()
  const isOwner = user?.role === 'OWNER'

  const [loading, setLoading] = useState(true)
  const [branchId, setBranchId] = useState('')
  const [branches, setBranches] = useState([])
  const [inventory, setInventory] = useState([])
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [adjustItem, setAdjustItem] = useState(null)

  useEffect(() => {
    if (!isOwner) return
    dashboardApi.branches().then((d) => setBranches(d.data || []))
  }, [isOwner])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (branchId) params.branchId = branchId

      const [invRes, reportRes] = await Promise.all([
        inventoryApi.list(params),
        reportsApi.usage({ ...params, period: 'weekly' }),
      ])

      setInventory(invRes.data || [])
      setReport(reportRes.data || null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [branchId])

  useEffect(() => { load() }, [load])

  const lowStockItems = useMemo(
    () => inventory.filter((i) => Number(i.quantity) <= Number(i.minThreshold)),
    [inventory]
  )

  const categoryLowChartData = useMemo(() => {
    const m = {}
    for (const item of inventory) {
      const key = item.ingredient?.category || 'OTHER'
      if (!m[key]) m[key] = { name: key, low: 0, healthy: 0 }
      if (Number(item.quantity) <= Number(item.minThreshold)) m[key].low += 1
      else m[key].healthy += 1
    }
    return Object.values(m)
  }, [inventory])

  const topUsageData = useMemo(() => {
    const rows = report?.usageByItem || []
    return rows
      .map((r) => ({
        name: r.ingredientName,
        usage: Math.abs(Number(r.netChange || 0)),
      }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 8)
  }, [report])

  const onSavedIngredient = async () => {
    setShowAdd(false)
    await load()
  }

  const onSavedAdjustment = async () => {
    setAdjustItem(null)
    await load()
  }

  if (loading && !report) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>Loading inventory insights...</div>
  }

  return (
    <div style={{ width: '95%', maxWidth: 1800, margin: '0 auto', padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--brown-800)', marginBottom: 4 }}>Inventory Insights</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {isOwner ? 'Cross-branch ingredient visibility and alerts' : `${user?.branch?.name} stock and usage`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {isOwner && (
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} style={{ padding: '9px 14px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', background: '#fff', cursor: 'pointer' }}>
              <option value="">All Branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>+ Add Ingredient</Button>
          <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
        </div>
      </div>

      {error && <div style={{ background: 'var(--red-light)', color: 'var(--red-dark)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 16 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
        <StatCard label="Inventory Items" value={inventory.length} />
        <StatCard label="Low Stock Alerts" value={lowStockItems.length} tone={lowStockItems.length ? 'var(--red)' : 'var(--green)'} />
        <StatCard label="Weekly Usage Events" value={report?.summary?.totalLogs || 0} sub="Based on audit logs" />
      </div>

      <div style={{ marginBottom: 18 }}>
        <Section title="All Ingredients List">
          {inventory.length === 0 ? (
            <EmptyState icon="📦" title="No ingredients yet" subtitle="Add ingredients to start tracking stock" />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                <thead>
                  <tr style={{ background: 'var(--brown-50)' }}>
                    {['Ingredient', 'Category', 'Qty', 'Threshold', 'Price', 'Branch', 'Status', 'Actions'].map((h) => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item, idx) => {
                    const low = Number(item.quantity) <= Number(item.minThreshold)
                    return (
                      <tr key={item.id} style={{
                        borderBottom: idx < inventory.length - 1 ? '1px solid var(--border-light)' : 'none',
                        background: idx % 2 === 1 ? 'rgba(180,83,9,0.015)' : undefined,
                      }}>
                        <td style={{ padding: '11px 14px', fontWeight: 600 }}>{item.ingredient?.name}</td>
                        <td style={{ padding: '11px 14px', color: 'var(--text-mid)' }}>{item.ingredient?.category}</td>
                        <td style={{ padding: '11px 14px' }}>{Number(item.quantity).toFixed(3)} {item.ingredient?.unit}</td>
                        <td style={{ padding: '11px 14px' }}>{Number(item.minThreshold).toFixed(3)} {item.ingredient?.unit}</td>
                        <td style={{ padding: '11px 14px' }}>{item.price ? `₱${Number(item.price).toFixed(2)}` : '-'}</td>
                        <td style={{ padding: '11px 14px', color: 'var(--text-mid)' }}>{item.branch?.name}</td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 'var(--radius-full)', background: low ? 'var(--red-light)' : 'var(--green-light)', color: low ? 'var(--red-dark)' : 'var(--green-dark)' }}>
                            {low ? 'LOW' : 'OK'}
                          </span>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => setAdjustItem({ ...item, presetMode: 'ADD' })}
                              style={{ ...actionBtn, color: 'var(--green-dark)' }}
                            >
                              Refill
                            </button>
                            <button
                              onClick={() => setAdjustItem({ ...item, presetMode: 'DEDUCT' })}
                              style={{ ...actionBtn, color: 'var(--red-dark)' }}
                            >
                              Deduct
                            </button>
                            <button
                              onClick={() => setAdjustItem({ ...item, presetMode: 'SET' })}
                              style={actionBtn}
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      <div style={{ marginBottom: 18 }}>
        <Section title="Low Stock Alerts">
          {lowStockItems.length === 0 ? (
            <EmptyState icon="✅" title="No low stock items" subtitle="All tracked ingredients are above threshold" />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                <thead>
                  <tr style={{ background: 'var(--brown-50)' }}>
                    {['Ingredient', 'Category', 'Current', 'Threshold', 'Branch'].map((h) => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: idx < lowStockItems.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                      <td style={{ padding: '11px 14px', fontWeight: 600 }}>{item.ingredient?.name}</td>
                      <td style={{ padding: '11px 14px', color: 'var(--text-mid)' }}>{item.ingredient?.category}</td>
                      <td style={{ padding: '11px 14px', color: 'var(--red-dark)', fontWeight: 700 }}>{Number(item.quantity).toFixed(3)} {item.ingredient?.unit}</td>
                      <td style={{ padding: '11px 14px' }}>{Number(item.minThreshold).toFixed(3)} {item.ingredient?.unit}</td>
                      <td style={{ padding: '11px 14px', color: 'var(--text-mid)' }}>{item.branch?.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <Section title="Top Weekly Ingredient Usage">
          {topUsageData.length === 0 ? (
            <EmptyState icon="📊" title="No usage logs yet" subtitle="Create orders or run daily deduction to populate" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topUsageData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [Number(v).toFixed(3), 'Used']} />
                <Bar dataKey="usage" fill="var(--brown-500)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>

        <Section title="Stock Health by Category">
          {categoryLowChartData.length === 0 ? (
            <EmptyState icon="📊" title="No inventory data" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={categoryLowChartData} dataKey="low" nameKey="name" cx="50%" cy="50%" outerRadius={92} label={({ name, value }) => `${name}: ${value}`}>
                  {categoryLowChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [v, 'Low Stock Count']} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Section>
      </div>

      {showAdd && (
        <AddIngredientModal
          isOwner={isOwner}
          branches={branches}
          branchId={branchId}
          onClose={() => setShowAdd(false)}
          onSaved={onSavedIngredient}
        />
      )}

      {adjustItem && (
        <AdjustStockModal
          item={adjustItem}
          onClose={() => setAdjustItem(null)}
          onSaved={onSavedAdjustment}
        />
      )}
    </div>
  )
}

const lbl = {
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  display: 'block',
  marginBottom: 7,
}

const selectStyle = {
  width: '100%',
  padding: '12px 14px',
  border: '1.5px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  fontSize: 14.5,
  background: '#fff',
  cursor: 'pointer',
}

const actionBtn = {
  background: '#fff',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  padding: '6px 10px',
  fontSize: 12,
  fontWeight: 700,
  transition: 'all 180ms ease',
}
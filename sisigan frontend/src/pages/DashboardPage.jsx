// src/pages/DashboardPage.jsx
import { useState, useEffect, useCallback } from 'react'
import { dashboardApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Button, EmptyState } from '../components/ui'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

// ─── PALETTE for pie/bar charts ───────────────────────────
const COLORS = ['#b45309', '#d97706', '#f59e0b', '#92400e', '#78350f', '#fbbf24', '#a16207', '#ca8a04']

const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'week',  label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Custom' },
]

// ─── STAT CARD ────────────────────────────────────────────
function StatCard({ label, value, sub, color = 'var(--brown-800)', icon }) {
  return (
    <div style={{
      background: 'var(--cream)', border: '1.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '20px 22px',
      flex: 1, minWidth: 180,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
            {label}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>
            {value}
          </div>
          {sub && <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 6 }}>{sub}</div>}
        </div>
        {icon && <span style={{ fontSize: 28, opacity: 0.6 }}>{icon}</span>}
      </div>
    </div>
  )
}

// ─── SECTION CARD ─────────────────────────────────────────
function Section({ title, children, style = {} }) {
  return (
    <div style={{
      background: 'var(--cream)', border: '1.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: 20, ...style,
    }}>
      <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--brown-800)', fontSize: 15, marginBottom: 16 }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

// ─── CUSTOM TOOLTIP ───────────────────────────────────────
function ChartTooltip({ active, payload, label, prefix = '₱' }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
      {label && <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--brown-800)' }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || 'var(--brown-600)' }}>
          {p.name}: {prefix}{typeof p.value === 'number' ? p.value.toLocaleString('en-PH', { minimumFractionDigits: 2 }) : p.value}
        </div>
      ))}
    </div>
  )
}

// ─── DASHBOARD PAGE ───────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth()
  const isOwner = user?.role === 'OWNER'

  const [data,      setData]      = useState(null)
  const [branches,  setBranches]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [period,    setPeriod]    = useState('today')
  const [branchId,  setBranchId]  = useState('')
  const [from,      setFrom]      = useState('')
  const [to,        setTo]        = useState('')

  // Load branch list for Owner filter
  useEffect(() => {
    if (isOwner) {
      dashboardApi.branches().then(d => setBranches(d.data || []))
    }
  }, [isOwner])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { period }
      if (branchId)          params.branchId = branchId
      if (period === 'custom' && from) params.from = from
      if (period === 'custom' && to)   params.to   = to
      const res = await dashboardApi.get(params)
      setData(res.data)
    } finally { setLoading(false) }
  }, [period, branchId, from, to])

  useEffect(() => { load() }, [load])

  const fmt = (n) => `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

  if (loading && !data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
      <span style={{ fontSize: 32 }}>🍖</span>
      <span style={{ color: 'var(--text-muted)' }}>Loading dashboard…</span>
    </div>
  )

  const s = data?.summary || {}

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>

      {/* ── Header ─────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--brown-800)', marginBottom: 2 }}>
            Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            {isOwner ? 'All branches overview' : `${user?.branch?.name} overview`}
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {/* Period selector */}
          <div style={{ display: 'flex', gap: 4 }}>
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)} style={{
                padding: '7px 14px', borderRadius: 'var(--radius-full)', border: 'none',
                background: period === p.value ? 'var(--brown-600)' : 'var(--brown-100)',
                color: period === p.value ? '#fff' : 'var(--brown-800)',
                fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
              }}>{p.label}</button>
            ))}
          </div>

          {/* Custom date range */}
          {period === 'custom' && (
            <>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                style={{ padding: '7px 10px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: 13 }} />
              <input type="date" value={to} onChange={e => setTo(e.target.value)}
                style={{ padding: '7px 10px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: 13 }} />
            </>
          )}

          {/* Branch filter — Owner only */}
          {isOwner && (
            <select value={branchId} onChange={e => setBranchId(e.target.value)}
              style={{ padding: '7px 12px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: 13, background: '#fff' }}>
              <option value="">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}

          <Button variant="outline" size="sm" onClick={load}>↻</Button>
        </div>
      </div>

      {/* ── Stat Cards ─────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard icon="💰" label="Total Sales"       value={fmt(s.totalSales || 0)}      color="var(--brown-800)" />
        <StatCard icon="🧾" label="Completed Orders"  value={s.totalOrders || 0}           sub={`Avg ${fmt(s.avgOrderValue || 0)} / order`} />
        <StatCard icon="📦" label="All Orders"        value={s.allOrdersCount || 0}        sub={`${s.cancelledCount || 0} cancelled`} />
        {/*<StatCard icon="📊" label="Avg Order Value"   value={fmt(s.avgOrderValue || 0)}    color="var(--green)" />*/}
      </div>

      {/* ── Charts row 1 ───────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Sales Trend */}
        <Section title="📈 Sales Trend">
          {data?.salesTrend?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.salesTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="sales" name="Sales" stroke="var(--brown-600)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyState icon="📈" title="No sales data for this period" />}
        </Section>

        {/* Sales by Category — Pie */}
        <Section title="🥧 Sales by Category">
          {data?.salesByCategory?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.salesByCategory}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {data.salesByCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 'Sales']} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState icon="🥧" title="No category data yet" />}
        </Section>
      </div>

      {/* ── Charts row 2 ───────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Best Sellers */}
        <Section title="🏆 Best Sellers (by quantity)">
          {data?.bestSellers?.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.bestSellers} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                <Tooltip content={<ChartTooltip prefix="" />} formatter={(v, n) => [v, n === 'qty' ? 'Qty sold' : 'Revenue']} />
                <Bar dataKey="qty" name="qty" fill="var(--brown-500)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState icon="🏆" title="No sales data yet" />}
        </Section>

        {/* Payment Breakdown */}
        <Section title="💳 Payment Methods">
          {data?.paymentBreakdown?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.paymentBreakdown.map((p, i) => {
                const maxTotal = data.paymentBreakdown[0].total
                const pct = Math.round((p.total / maxTotal) * 100)
                return (
                  <div key={p.method}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{p.method}</span>
                      <span style={{ color: 'var(--brown-700)', fontWeight: 700 }}>{fmt(p.total)}</span>
                    </div>
                    <div style={{ background: 'var(--border)', borderRadius: 6, height: 8 }}>
                      <div style={{ width: `${pct}%`, background: COLORS[i % COLORS.length], borderRadius: 6, height: 8, transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{p.count} transaction{p.count !== 1 ? 's' : ''}</div>
                  </div>
                )
              })}
            </div>
          ) : <EmptyState icon="💳" title="No payment data yet" />}
        </Section>
      </div>

      {/* ── Branch Comparison (Owner only) ─────────────── */}
      {isOwner && data?.salesByBranch?.length > 0 && (
        <Section title="🏪 Sales by Branch" style={{ marginBottom: 16 }}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.salesByBranch}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="sales" name="Sales" fill="var(--brown-600)" radius={[4, 4, 0, 0]}>
                {data.salesByBranch.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>
      )}

      {/* ── Best Sellers Table ──────────────────────────── */}
      {data?.bestSellers?.length > 0 && (
        <Section title="📋 Best Sellers Detail">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--brown-50)' }}>
                  {['#', 'Item', 'Qty Sold', 'Revenue'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: h === '#' || h === 'Qty Sold' || h === 'Revenue' ? 'center' : 'left', fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.bestSellers.map((item, i) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '9px 12px', textAlign: 'center', color: 'var(--text-faint)', fontWeight: 700 }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </td>
                    <td style={{ padding: '9px 12px', fontWeight: 600, color: 'var(--text-dark)' }}>{item.name}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--brown-700)' }}>{item.qty}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--green)' }}>{fmt(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  )
}

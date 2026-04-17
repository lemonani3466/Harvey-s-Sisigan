// src/pages/ForecastPage.jsx
import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button, EmptyState } from '../components/ui'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const COLORS = ['#b45309', '#d97706', '#f59e0b', '#92400e', '#78350f', '#fbbf24', '#a16207', '#ca8a04']

const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
]

const MENU_GROUPS = {
  'Silog Meals': [
    'Sisilog',
    'Bagnetsilog',
    'Hungarian Silog',
    'Shanghaisilog',
    'Nuggets Silog',
    'Hotsilog',
    'Siomaisilog',
    'Dinakdakansilog',
    'Chicksilog',
    'Bangsilog',
    'Porksilog',
  ],
  Combos: [
    'CM1 Egg + Rice + Hungarian',
    'CM2 Egg + Rice + Nuggets',
    'CM3 Egg + Rice + Shanghai',
    'CM4 Egg + Rice + Bagnet',
    'CM5 Egg + Rice + Bagnet',
    'CM6 Egg + Rice + Hotdog',
    'CM7 Egg + Rice + Bagnet',
    'CM8 Egg + Rice + Bagnet',
  ],
  'Rice Meals': [
    'Beef Bulalo',
    'Crispy Chicharon Bulaklak',
    'Crispy Dinakdakan',
    'Crispy Sisig Barkada',
    'Calamares',
    'Garlic Butter Bangus',
    'Crispy Bagnet',
    'Shanghai',
    'Siomai Rice',
  ],
  Pancit: ['Pancit Bihon Guisado', 'Pancit Canton Guisado'],
  Pizza: [
    '4 in 1',
    'Double Cheese',
    'Shawarma',
    'Hawaiian',
    'Beefy Mushroom',
    'Ham and Cheese',
    'Bacon',
    'Pepperoni',
    'Overload',
  ],
}

const EXCLUDED_FIELDS = new Set(['Date', 'DayOfWeek', 'DayType', 'TotalOrders', 'ForecastTotalOrders'])
const AVG_ORDER_VALUE = 100
const AUTO_REFRESH_MS = 60000

function sumByKeys(row, keys) {
  return keys.reduce((sum, key) => sum + (Number(row?.[key]) || 0), 0)
}

function fmtPeso(n) {
  return `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

function formatLastUpdated(date) {
  if (!date) return 'Never'
  return new Date(date).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function StatCard({ label, value, sub, color = 'var(--brown-800)', icon }) {
  return (
    <div style={{
      background: 'var(--cream)',
      border: '1.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px 22px',
      flex: 1,
      minWidth: 180,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: 6,
          }}>
            {label}
          </div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            fontWeight: 700,
            color,
            lineHeight: 1,
          }}>
            {value}
          </div>
          {sub && <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 6 }}>{sub}</div>}
        </div>
        {icon && <span style={{ fontSize: 28, opacity: 0.7 }}>{icon}</span>}
      </div>
    </div>
  )
}

function Section({ title, children, style = {} }) {
  return (
    <div style={{
      background: 'var(--cream)',
      border: '1.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: 20,
      ...style,
    }}>
      <h3 style={{
        fontFamily: 'var(--font-display)',
        color: 'var(--brown-800)',
        fontSize: 15,
        marginBottom: 16,
      }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function ChartTooltip({ active, payload, label, prefix = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 13,
    }}>
      {label && (
        <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--brown-800)' }}>
          {label}
        </div>
      )}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || 'var(--brown-600)' }}>
          {p.name}: {prefix}{typeof p.value === 'number'
            ? p.value.toLocaleString('en-PH', { minimumFractionDigits: prefix ? 2 : 0 })
            : p.value}
        </div>
      ))}
    </div>
  )
}

export default function ForecastPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [rawData, setRawData] = useState([])
  const [period, setPeriod] = useState('week')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [error, setError] = useState('')

  const loadForecast = useCallback(async ({ showLoading = false, silent = false } = {}) => {
    try {
      if (showLoading) setLoading(true)
      if (!showLoading && !silent) setRefreshing(true)

      const res = await fetch(`/data/forecast_output.json?t=${Date.now()}`, {
        cache: 'no-store',
      })

      if (!res.ok) throw new Error('Failed to load forecast_output.json')

      const json = await res.json()
      setRawData(Array.isArray(json) ? json : [])
      setLastUpdated(new Date())
      setError('')
    } catch (err) {
      console.error('Forecast refresh failed:', err)
      setError(err?.message || 'Failed to refresh forecast data.')
      setRawData([])
    } finally {
      if (showLoading) setLoading(false)
      if (!showLoading && !silent) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadForecast({ showLoading: true })

    const interval = setInterval(() => {
      loadForecast({ silent: true })
    }, AUTO_REFRESH_MS)

    return () => clearInterval(interval)
  }, [loadForecast])

  const filteredData = useMemo(() => {
    if (!rawData.length) return []
    if (period === 'today') return rawData.slice(0, 1)
    if (period === 'week') return rawData.slice(0, 7)
    if (period === 'month') return rawData.slice(0, 30)
    return rawData
  }, [rawData, period])

  const summary = useMemo(() => {
    const totalOrders = filteredData.reduce((sum, row) => sum + (Number(row.ForecastTotalOrders) || 0), 0)
    const totalSales = totalOrders * AVG_ORDER_VALUE
    const avgOrders = filteredData.length ? totalOrders / filteredData.length : 0

    return {
      totalSales,
      totalOrders,
      avgOrderValue: AVG_ORDER_VALUE,
      avgOrders,
    }
  }, [filteredData])

  const salesTrend = useMemo(() => {
    return filteredData.map(row => ({
      date: row.Date?.slice(5, 10) || '',
      sales: (Number(row.ForecastTotalOrders) || 0) * AVG_ORDER_VALUE,
      orders: Number(row.ForecastTotalOrders) || 0,
    }))
  }, [filteredData])

  const salesByCategory = useMemo(() => {
    return Object.entries(MENU_GROUPS)
      .map(([name, keys]) => ({
        name,
        value: filteredData.reduce((sum, row) => sum + sumByKeys(row, keys), 0) * AVG_ORDER_VALUE,
      }))
      .filter(item => item.value > 0)
  }, [filteredData])

  const bestSellers = useMemo(() => {
    if (!filteredData.length) return []

    const menuItems = Object.keys(filteredData[0]).filter(key => !EXCLUDED_FIELDS.has(key))

    return menuItems
      .map((name, idx) => {
        const qty = filteredData.reduce((sum, row) => sum + (Number(row[name]) || 0), 0)
        return {
          id: idx + 1,
          name,
          qty,
          revenue: qty * AVG_ORDER_VALUE,
        }
      })
      .filter(item => item.qty > 0)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10)
  }, [filteredData])

  const topCategories = useMemo(() => {
    return salesByCategory.map((cat, i) => ({
      ...cat,
      fill: COLORS[i % COLORS.length],
    }))
  }, [salesByCategory])

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        flexDirection: 'column',
        gap: 12,
      }}>
        <span style={{ fontSize: 32 }}>📈</span>
        <span style={{ color: 'var(--text-muted)' }}>Loading forecast dashboard…</span>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 24,
            color: 'var(--brown-800)',
            marginBottom: 2,
          }}>
            Forecast Dashboard
          </h1>
          {/* <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 4 }}>
            Forecast overview based on your generated JSON data
          </p> */}
          <p style={{ color: 'var(--text-faint)', fontSize: 12 }}>
            Last updated: {formatLastUpdated(lastUpdated)} · Auto-refresh every {AUTO_REFRESH_MS / 1000}s
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-full)',
                  border: 'none',
                  background: period === p.value ? 'var(--brown-600)' : 'var(--brown-100)',
                  color: period === p.value ? '#fff' : 'var(--brown-800)',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={() => loadForecast()}>
            {refreshing ? '⟳ Refreshing...' : '↻ Refresh'}
          </Button>
        </div>
      </div>

      {error && (
        <div style={{
          marginBottom: 16,
          background: '#fff7ed',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 12px',
          color: 'var(--brown-800)',
          fontSize: 13,
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard
          icon="💰"
          label="Forecast Sales"
          value={fmtPeso(summary.totalSales)}
          color="var(--brown-800)"
        />
        <StatCard
          icon="📦"
          label="Forecast Orders"
          value={summary.totalOrders || 0}
          sub={`${summary.avgOrders.toFixed(0)} avg / day`}
        />
        <StatCard
          icon="🧾"
          label="Avg Order Value"
          value={fmtPeso(summary.avgOrderValue)}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Section title="📈 Forecast Sales Trend">
          {salesTrend.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip prefix="₱" />} />
                <Line
                  type="monotone"
                  dataKey="sales"
                  name="Sales"
                  stroke="var(--brown-600)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="📈" title="No forecast trend data available" />
          )}
        </Section>

        <Section title="🥧 Forecast by Category">
          {topCategories.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={topCategories}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {topCategories.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [fmtPeso(v), 'Sales']} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="🥧" title="No category forecast data available" />
          )}
        </Section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        <Section title="🏆 Best Sellers Forecast (by quantity)">
          {bestSellers.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={bestSellers.slice(0, 6)} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                <Tooltip
                  content={<ChartTooltip prefix="" />}
                  formatter={(v, n) => [v, n === 'qty' ? 'Qty sold' : 'Revenue']}
                />
                <Bar dataKey="qty" name="qty" fill="var(--brown-500)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="🏆" title="No forecast sales data yet" />
          )}
        </Section>

        <Section title="📋 Forecast Summary">
          {summary.totalOrders > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ padding: '10px 12px', background: 'var(--brown-50)', borderRadius: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Projected orders</div>
                <div style={{ fontWeight: 700, color: 'var(--brown-800)', fontSize: 18 }}>
                  {summary.totalOrders}
                </div>
              </div>

              <div style={{ padding: '10px 12px', background: 'var(--brown-50)', borderRadius: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Projected sales</div>
                <div style={{ fontWeight: 700, color: 'var(--brown-800)', fontSize: 18 }}>
                  {fmtPeso(summary.totalSales)}
                </div>
              </div>

              <div style={{ padding: '10px 12px', background: 'var(--brown-50)', borderRadius: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Average per day</div>
                <div style={{ fontWeight: 700, color: 'var(--brown-800)', fontSize: 18 }}>
                  {summary.avgOrders.toFixed(0)} orders
                </div>
              </div>
            </div>
          ) : (
            <EmptyState icon="📋" title="No forecast summary available" />
          )}
        </Section>
      </div>

      {bestSellers.length > 0 && (
        <Section title="📋 Forecast Best Sellers Detail">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--brown-50)' }}>
                  {['#', 'Item', 'Qty Forecast', 'Revenue'].map(h => (
                    <th
                      key={h}
                      style={{
                        padding: '9px 12px',
                        textAlign: h === '#' || h === 'Qty Forecast' || h === 'Revenue' ? 'center' : 'left',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        borderBottom: '1px solid var(--border)',
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bestSellers.map((item, i) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '9px 12px', textAlign: 'center', color: 'var(--text-faint)', fontWeight: 700 }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </td>
                    <td style={{ padding: '9px 12px', fontWeight: 600, color: 'var(--text-dark)' }}>
                      {item.name}
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--brown-700)' }}>
                      {item.qty}
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--green)' }}>
                      {fmtPeso(item.revenue)}
                    </td>
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

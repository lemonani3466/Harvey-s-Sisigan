// src/pages/DashboardPage.jsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { dashboardApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Button, EmptyState } from '../components/ui'
import * as XLSX from 'xlsx'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const COLORS = ['#b45309', '#d97706', '#f59e0b', '#92400e', '#78350f', '#fbbf24', '#a16207', '#ca8a04']

const PERIODS = [
  { value: 'today',  label: 'Today' },
  { value: 'week',   label: 'This Week' },
  { value: 'month',  label: 'This Month' },
  { value: 'custom', label: 'Custom' },
]

// ── Shared styles ──────────────────────────────────────────────────────────────
const dateInputStyle = {
  display: 'block', marginTop: 4, width: '100%', padding: '7px 10px',
  border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13,
  color: 'var(--brown-800)', background: '#fff', boxSizing: 'border-box', cursor: 'pointer',
}
const primaryBtnStyle = {
  flex: 1, padding: '8px 0', borderRadius: 'var(--radius-full)', border: 'none',
  background: 'var(--brown-600)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
}
const secondaryBtnStyle = {
  flex: 1, padding: '8px 0', borderRadius: 'var(--radius-full)',
  border: '1.5px solid var(--border)', background: 'transparent',
  color: 'var(--brown-700)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(n) {
  return `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

function getPeriodLabel(period, customStart, customEnd) {
  if (period === 'today')  return 'Today'
  if (period === 'week')   return 'This Week'
  if (period === 'month')  return 'This Month'
  if (period === 'custom' && customStart && customEnd) return `${customStart} to ${customEnd}`
  return 'Custom'
}

// ── Excel download ─────────────────────────────────────────────────────────────
function downloadExcel(data, periodLabel, branchLabel) {
  const s = data?.summary || {}
  const wb = XLSX.utils.book_new()

  // Sheet 1: Summary
  const summaryRows = [
    { Metric: 'Period',              Value: periodLabel },
    { Metric: 'Branch',              Value: branchLabel },
    { Metric: 'Total Sales (PHP)',   Value: Number(s.totalSales  || 0) },
    { Metric: 'Completed Orders',    Value: Number(s.totalOrders || 0) },
    { Metric: 'All Orders',          Value: Number(s.allOrdersCount || 0) },
    { Metric: 'Cancelled Orders',    Value: Number(s.cancelledCount || 0) },
    { Metric: 'Avg Order Value (PHP)', Value: Number(s.avgOrderValue || 0) },
  ]
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows)
  wsSummary['!cols'] = [{ wch: 26 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')

  // Sheet 2: Sales Trend
  if (data?.salesTrend?.length) {
    const trendRows = data.salesTrend.map(r => ({
      Date:           r.date,
      'Sales (PHP)':  Number(r.sales || 0),
      Orders:         Number(r.orders || 0),
    }))
    const wsTrend = XLSX.utils.json_to_sheet(trendRows)
    wsTrend['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, wsTrend, 'Sales Trend')
  }

  // Sheet 3: Best Sellers
  if (data?.bestSellers?.length) {
    const sellerRows = data.bestSellers.map((item, i) => ({
      Rank:                i + 1,
      'Menu Item':         item.name,
      'Qty Sold':          item.qty,
      'Revenue (PHP)':     Number(item.revenue || 0),
    }))
    const wsSellers = XLSX.utils.json_to_sheet(sellerRows)
    wsSellers['!cols'] = [{ wch: 6 }, { wch: 32 }, { wch: 12 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, wsSellers, 'Best Sellers')
  }

  // Sheet 4: Sales by Category
  if (data?.salesByCategory?.length) {
    const catRows = data.salesByCategory.map(c => ({
      Category:       c.name,
      'Sales (PHP)':  Number(c.value || 0),
    }))
    const wsCat = XLSX.utils.json_to_sheet(catRows)
    wsCat['!cols'] = [{ wch: 20 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, wsCat, 'By Category')
  }

  // Sheet 5: Payment Methods
  if (data?.paymentBreakdown?.length) {
    const payRows = data.paymentBreakdown.map(p => ({
      Method:         p.method,
      'Total (PHP)':  Number(p.total || 0),
      Transactions:   p.count,
    }))
    const wsPay = XLSX.utils.json_to_sheet(payRows)
    wsPay['!cols'] = [{ wch: 18 }, { wch: 16 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, wsPay, 'Payment Methods')
  }

  // Sheet 6: Branch comparison (owner only)
  if (data?.salesByBranch?.length) {
    const branchRows = data.salesByBranch.map(b => ({
      Branch:         b.name,
      'Sales (PHP)':  Number(b.sales || 0),
    }))
    const wsBranch = XLSX.utils.json_to_sheet(branchRows)
    wsBranch['!cols'] = [{ wch: 24 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, wsBranch, 'By Branch')
  }

  const slug = periodLabel.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')
  XLSX.writeFile(wb, `dashboard_${slug}_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

// ── PDF download ───────────────────────────────────────────────────────────────
function downloadPDF(data, periodLabel, branchLabel) {
  const s = data?.summary || {}

  const trendRows  = data?.salesTrend       || []
  const sellers    = data?.bestSellers      || []
  const categories = data?.salesByCategory  || []
  const payments   = data?.paymentBreakdown || []
  const branches   = data?.salesByBranch    || []

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Dashboard Report – ${periodLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1c0a00; padding: 32px; }
    h1 { font-size: 22px; color: #92400e; margin-bottom: 4px; }
    .meta { font-size: 11px; color: #78716c; margin-bottom: 24px; }
    h2 { font-size: 14px; color: #92400e; margin: 24px 0 8px;
         border-bottom: 1.5px solid #d97706; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 12px; }
    th { background: #fef3c7; color: #78350f; font-weight: 700; font-size: 10px;
         text-transform: uppercase; padding: 7px 10px; text-align: left;
         border-bottom: 2px solid #d97706; letter-spacing: 0.3px; }
    td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) td { background: #fffbeb; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 4px; }
    .stat-box { background: #fef3c7; border: 1px solid #d97706; border-radius: 8px; padding: 12px 16px; }
    .stat-label { font-size: 10px; text-transform: uppercase; color: #92400e; font-weight: 700; margin-bottom: 4px; }
    .stat-val { font-size: 18px; font-weight: 700; color: #78350f; }
    .stat-sub { font-size: 10px; color: #a16207; margin-top: 2px; }
    @media print {
      body { padding: 16px; }
      h2 { page-break-after: avoid; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>Dashboard Report</h1>
  <div class="meta">
    Period: <strong>${periodLabel}</strong> &nbsp;·&nbsp;
    Branch: <strong>${branchLabel}</strong> &nbsp;·&nbsp;
    Generated: ${new Date().toLocaleString('en-PH')}
  </div>

  <h2>Summary</h2>
  <div class="summary-grid">
    <div class="stat-box">
      <div class="stat-label">Total Sales</div>
      <div class="stat-val">PHP ${Number(s.totalSales || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Completed Orders</div>
      <div class="stat-val">${Number(s.totalOrders || 0).toLocaleString()}</div>
      <div class="stat-sub">Avg PHP ${Number(s.avgOrderValue || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })} / order</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">All Orders</div>
      <div class="stat-val">${Number(s.allOrdersCount || 0).toLocaleString()}</div>
      <div class="stat-sub">${Number(s.cancelledCount || 0)} cancelled</div>
    </div>
  </div>

  ${trendRows.length ? `
  <h2>Sales Trend</h2>
  <table>
    <thead><tr><th>Date</th><th class="num">Sales (PHP)</th><th class="num">Orders</th></tr></thead>
    <tbody>
      ${trendRows.map(r => `
        <tr>
          <td>${r.date}</td>
          <td class="num">${Number(r.sales || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
          <td class="num">${r.orders || ''}</td>
        </tr>`).join('')}
    </tbody>
  </table>` : ''}

  ${sellers.length ? `
  <h2>Best Sellers</h2>
  <table>
    <thead><tr><th>#</th><th>Item</th><th class="num">Qty</th><th class="num">Revenue (PHP)</th></tr></thead>
    <tbody>
      ${sellers.map((item, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${item.name}</td>
          <td class="num">${item.qty}</td>
          <td class="num">${Number(item.revenue || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
        </tr>`).join('')}
    </tbody>
  </table>` : ''}

  ${categories.length ? `
  <h2>Sales by Category</h2>
  <table>
    <thead><tr><th>Category</th><th class="num">Sales (PHP)</th></tr></thead>
    <tbody>
      ${categories.map(c => `
        <tr>
          <td>${c.name}</td>
          <td class="num">${Number(c.value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
        </tr>`).join('')}
    </tbody>
  </table>` : ''}

  ${payments.length ? `
  <h2>Payment Methods</h2>
  <table>
    <thead><tr><th>Method</th><th class="num">Total (PHP)</th><th class="num">Transactions</th></tr></thead>
    <tbody>
      ${payments.map(p => `
        <tr>
          <td>${p.method}</td>
          <td class="num">${Number(p.total || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
          <td class="num">${p.count}</td>
        </tr>`).join('')}
    </tbody>
  </table>` : ''}

  ${branches.length ? `
  <h2>Sales by Branch</h2>
  <table>
    <thead><tr><th>Branch</th><th class="num">Sales (PHP)</th></tr></thead>
    <tbody>
      ${branches.map(b => `
        <tr>
          <td>${b.name}</td>
          <td class="num">${Number(b.sales || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
        </tr>`).join('')}
    </tbody>
  </table>` : ''}
</body>
</html>`

  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 400)
}

// ── Custom Range Picker (matches ForecastPage style) ───────────────────────────
function CustomRangePicker({ startDate, endDate, onChange, onClose }) {
  const [localStart, setLocalStart] = useState(startDate || '')
  const [localEnd,   setLocalEnd]   = useState(endDate   || '')
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  function handleApply() {
    if (!localStart || !localEnd || localStart > localEnd) return
    onChange(localStart, localEnd)
    onClose()
  }

  const dayCount = useMemo(() => {
    if (!localStart || !localEnd) return 0
    return Math.max(0, Math.round((new Date(localEnd) - new Date(localStart)) / 86400000))
  }, [localStart, localEnd])

  const isValid = localStart && localEnd && localStart <= localEnd

  return (
    <div ref={ref} style={{
      position: 'absolute', top: '110%', right: 0, zIndex: 100,
      background: 'var(--cream)', border: '1.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)', boxShadow: '0 8px 32px rgba(120,53,15,0.12)',
      padding: 18, minWidth: 280,
    }}>
      <div style={{ marginBottom: 10, fontWeight: 700, fontSize: 13, color: 'var(--brown-800)' }}>
        Select Date Range
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
          Start Date
          <input type="date" value={localStart} max={localEnd || undefined}
            onChange={e => setLocalStart(e.target.value)} style={dateInputStyle} />
        </label>
        <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
          End Date
          <input type="date" value={localEnd} min={localStart || undefined}
            onChange={e => setLocalEnd(e.target.value)} style={dateInputStyle} />
        </label>
      </div>

      {isValid && (
        <div style={{
          margin: '10px 0', padding: '7px 10px', background: 'var(--brown-50)',
          borderRadius: 8, fontSize: 12, color: 'var(--brown-700)', fontWeight: 600,
        }}>
          {dayCount === 0 ? 'Same day' : `${dayCount} day${dayCount !== 1 ? 's' : ''} selected`}
        </div>
      )}

      {localStart && localEnd && localStart > localEnd && (
        <div style={{ margin: '8px 0', fontSize: 12, color: '#dc2626' }}>
          End date must be after start date.
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
        <button onClick={handleApply} disabled={!isValid}
          style={{ ...primaryBtnStyle, opacity: isValid ? 1 : 0.45, cursor: isValid ? 'pointer' : 'not-allowed' }}>
          Apply
        </button>
      </div>
    </div>
  )
}

// ── Export Dropdown ────────────────────────────────────────────────────────────
function ExportDropdown({ onExcelDownload, onPDFDownload, disabled }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const options = [
    { icon: '📊', label: 'Download Excel (.xlsx)', action: () => { onExcelDownload(); setOpen(false) } },
    { icon: '📄', label: 'Download PDF (Print)',    action: () => { onPDFDownload();  setOpen(false) } },
  ]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={disabled}
        style={{
          padding: '7px 14px', borderRadius: 'var(--radius-full)',
          border: '1.5px solid var(--border)',
          background: open ? 'var(--brown-100)' : '#fff',
          color: 'var(--brown-800)', fontWeight: 700, fontSize: 12,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
        }}
      >
        Download {open ? '▲' : '▼'}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '110%', right: 0, zIndex: 200,
          background: 'var(--cream)', border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius-lg)', boxShadow: '0 8px 24px rgba(120,53,15,0.12)',
          minWidth: 190, overflow: 'hidden',
        }}>
          {options.map(({ icon, label, action }) => (
            <button key={label} onClick={action} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '11px 16px', border: 'none',
              background: 'transparent', color: 'var(--brown-800)',
              fontWeight: 600, fontSize: 13, cursor: 'pointer',
              textAlign: 'left', transition: 'background 0.1s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--brown-50)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: 16 }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── StatCard ───────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = 'var(--brown-800)', icon }) {
  return (
    <div style={{
      background: 'var(--cream)', border: '1.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '20px 22px', flex: 1, minWidth: 180,
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

// ── Section ────────────────────────────────────────────────────────────────────
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

// ── Chart Tooltip ──────────────────────────────────────────────────────────────
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

// ── Dashboard Page ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth()
  const isOwner = user?.role === 'OWNER'

  const [data,      setData]      = useState(null)
  const [branches,  setBranches]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [period,    setPeriod]    = useState('today')
  const [branchId,  setBranchId]  = useState('')

  // Custom range state (mirrors ForecastPage)
  const [showRangePicker, setShowRangePicker] = useState(false)
  const [customStart,     setCustomStart]     = useState('')
  const [customEnd,       setCustomEnd]       = useState('')

  useEffect(() => {
    if (isOwner) {
      dashboardApi.branches().then(d => setBranches(d.data || []))
    }
  }, [isOwner])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { period }
      if (branchId)                        params.branchId = branchId
      if (period === 'custom' && customStart) params.from = customStart
      if (period === 'custom' && customEnd)   params.to   = customEnd
      const res = await dashboardApi.get(params)
      setData(res.data)
    } finally {
      setLoading(false)
    }
  }, [period, branchId, customStart, customEnd])

  useEffect(() => { load() }, [load])

  // Derived labels for export / display
  const periodLabel = getPeriodLabel(period, customStart, customEnd)

  const branchLabel = useMemo(() => {
    if (!branchId) return 'All Branches'
    return branches.find(b => String(b.id) === String(branchId))?.name || branchId
  }, [branchId, branches])

  const customRangeLabel = useMemo(() => {
    if (period !== 'custom' || !customStart || !customEnd) return null
    const fmtDate = d => new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
    return `${fmtDate(customStart)} – ${fmtDate(customEnd)}`
  }, [period, customStart, customEnd])

  function handlePeriodClick(value) {
    if (value === 'custom') {
      setPeriod('custom')
      setShowRangePicker(true)
    } else {
      setPeriod(value)
      setShowRangePicker(false)
    }
  }

  if (loading && !data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
      <span style={{ fontSize: 32 }}>🍖</span>
      <span style={{ color: 'var(--text-muted)' }}>Loading dashboard…</span>
    </div>
  )

  const s = data?.summary || {}

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>

      {/* ── Header ────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--brown-800)', marginBottom: 2 }}>
            Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            {isOwner ? 'All branches overview' : `${user?.branch?.name} overview`}
          </p>
        </div>

        {/* ── Controls ────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>

          {/* Period buttons + custom range picker */}
          <div style={{ display: 'flex', gap: 4, position: 'relative', alignItems: 'center' }}>
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => handlePeriodClick(p.value)} style={{
                padding: '7px 14px', borderRadius: 'var(--radius-full)', border: 'none',
                background: period === p.value ? 'var(--brown-600)' : 'var(--brown-100)',
                color: period === p.value ? '#fff' : 'var(--brown-800)',
                fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {p.label}
              </button>
            ))}

            {/* Inline pill showing selected range */}
            {customRangeLabel && (
              <span
                onClick={() => setShowRangePicker(true)}
                title="Click to change range"
                style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--brown-600)',
                  background: 'var(--brown-50)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-full)', padding: '4px 10px',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {customRangeLabel} ✎
              </span>
            )}

            {/* Date range dropdown */}
            {showRangePicker && (
              <CustomRangePicker
                startDate={customStart}
                endDate={customEnd}
                onChange={(s, e) => { setCustomStart(s); setCustomEnd(e) }}
                onClose={() => setShowRangePicker(false)}
              />
            )}
          </div>

          {/* Branch filter — Owner only */}
          {isOwner && (
            <select value={branchId} onChange={e => setBranchId(e.target.value)}
              style={{ padding: '7px 12px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: 13, background: '#fff' }}>
              <option value="">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}

          {/* Export dropdown */}
          <ExportDropdown
            disabled={!data}
            onExcelDownload={() => downloadExcel(data, periodLabel, branchLabel)}
            onPDFDownload={() => downloadPDF(data, periodLabel, branchLabel)}
          />

          <Button variant="outline" size="sm" onClick={load}>↻</Button>
        </div>
      </div>

      {/* Hint when custom is selected but no range set yet */}
      {period === 'custom' && (!customStart || !customEnd) && (
        <div style={{
          marginBottom: 16, background: '#fffbeb', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: '10px 14px',
          color: 'var(--brown-700)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          📅 Pick a start and end date to filter the dashboard.
        </div>
      )}

      {/* ── Stat Cards ────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard icon="💰" label="Total Sales"      value={fmt(s.totalSales || 0)}     color="var(--brown-800)" />
        <StatCard icon="🧾" label="Completed Orders" value={s.totalOrders || 0}          sub={`Avg ${fmt(s.avgOrderValue || 0)} / order`} />
        <StatCard icon="📦" label="All Orders"       value={s.allOrdersCount || 0}       sub={`${s.cancelledCount || 0} cancelled`} />
      </div>

      {/* ── Charts row 1 ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Section title="📈 Sales Trend">
          {data?.salesTrend?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.salesTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="sales" name="Sales" stroke="var(--brown-600)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyState icon="📈" title="No sales data for this period" />}
        </Section>

        <Section title="🥧 Sales by Category">
          {data?.salesByCategory?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.salesByCategory} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {data.salesByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 'Sales']} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState icon="🥧" title="No category data yet" />}
        </Section>
      </div>

      {/* ── Charts row 2 ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
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
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
                      {p.count} transaction{p.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : <EmptyState icon="💳" title="No payment data yet" />}
        </Section>
      </div>

      {/* ── Branch Comparison (Owner only) ────────────────── */}
      {isOwner && data?.salesByBranch?.length > 0 && (
        <Section title="🏪 Sales by Branch" style={{ marginBottom: 16 }}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.salesByBranch}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="sales" name="Sales" fill="var(--brown-600)" radius={[4, 4, 0, 0]}>
                {data.salesByBranch.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>
      )}

      {/* ── Best Sellers Table ─────────────────────────────── */}
      {data?.bestSellers?.length > 0 && (
        <Section title="📋 Best Sellers Detail">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--brown-50)' }}>
                  {['#', 'Item', 'Qty Sold', 'Revenue'].map(h => (
                    <th key={h} style={{
                      padding: '9px 12px',
                      textAlign: h === '#' || h === 'Qty Sold' || h === 'Revenue' ? 'center' : 'left',
                      fontWeight: 700, color: 'var(--text-muted)',
                      borderBottom: '1px solid var(--border)',
                      fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>{h}</th>
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
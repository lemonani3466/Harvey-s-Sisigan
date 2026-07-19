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
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
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
//   style for the small "reset" ghost button used in CustomRangePicker
const resetBtnStyle = {
  width: '100%', padding: '7px 0', borderRadius: 'var(--radius-full)',
  border: '1.5px dashed var(--border)', background: 'transparent',
  color: 'var(--text-muted)', fontWeight: 600, fontSize: 12, cursor: 'pointer',
  marginTop: 8,
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(n) {
  return `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

function getPeriodLabel(period, customStart, customEnd) {
  if (period === 'today') return 'Today'
  if (period === 'week') return 'This Week'
  if (period === 'month') return 'This Month'
  if (period === 'custom' && customStart && customEnd) return `${customStart} to ${customEnd}`
  return 'Custom'
}

//   helper to get today's date as YYYY-MM-DD in local time (used to default the Sales Report range)
function todayISO() {
  const d = new Date()
  const tzOffset = d.getTimezoneOffset() * 60000
  return new Date(d - tzOffset).toISOString().slice(0, 10)
}

// ── Excel download ─────────────────────────────────────────────────────────────
function downloadExcel(data, periodLabel, branchLabel) {
  const s = data?.summary || {}
  const wb = XLSX.utils.book_new()

  // Sheet 1: Summary
  const summaryRows = [
    { Metric: 'Period', Value: periodLabel },
    { Metric: 'Branch', Value: branchLabel },
    { Metric: 'Total Sales (PHP)', Value: Number(s.totalSales || 0) },
    { Metric: 'Completed Orders', Value: Number(s.totalOrders || 0) },
    { Metric: 'All Orders', Value: Number(s.allOrdersCount || 0) },
    { Metric: 'Cancelled Orders', Value: Number(s.cancelledCount || 0) },
    { Metric: 'Avg Order Value (PHP)', Value: Number(s.avgOrderValue || 0) },
  ]
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows)
  wsSummary['!cols'] = [{ wch: 26 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')

  // Sheet 2: Sales Trend
  if (data?.salesTrend?.length) {
    const trendRows = data.salesTrend.map(r => ({
      Date: r.date,
      'Sales (PHP)': Number(r.sales || 0),
      Orders: Number(r.orders || 0),
    }))
    const wsTrend = XLSX.utils.json_to_sheet(trendRows)
    wsTrend['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, wsTrend, 'Sales Trend')
  }

  // Sheet 3: Best Sellers
  if (data?.bestSellers?.length) {
    const sellerRows = data.bestSellers.map((item, i) => ({
      Rank: i + 1,
      'Menu Item': item.name,
      'Qty Sold': item.qty,
      'Revenue (PHP)': Number(item.revenue || 0),
    }))
    const wsSellers = XLSX.utils.json_to_sheet(sellerRows)
    wsSellers['!cols'] = [{ wch: 6 }, { wch: 32 }, { wch: 12 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, wsSellers, 'Best Sellers')
  }

  // Sheet 4: Sales by Category
  if (data?.salesByCategory?.length) {
    const catRows = data.salesByCategory.map(c => ({
      Category: c.name,
      'Sales (PHP)': Number(c.value || 0),
    }))
    const wsCat = XLSX.utils.json_to_sheet(catRows)
    wsCat['!cols'] = [{ wch: 20 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, wsCat, 'By Category')
  }

  // Sheet 5: Payment Methods
  if (data?.paymentBreakdown?.length) {
    const payRows = data.paymentBreakdown.map(p => ({
      Method: p.method,
      'Total (PHP)': Number(p.total || 0),
      Transactions: p.count,
    }))
    const wsPay = XLSX.utils.json_to_sheet(payRows)
    wsPay['!cols'] = [{ wch: 18 }, { wch: 16 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, wsPay, 'Payment Methods')
  }

  // Sheet 6: Branch comparison (owner only)
  if (data?.salesByBranch?.length) {
    const branchRows = data.salesByBranch.map(b => ({
      Branch: b.name,
      'Sales (PHP)': Number(b.sales || 0),
    }))
    const wsBranch = XLSX.utils.json_to_sheet(branchRows)
    wsBranch['!cols'] = [{ wch: 24 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, wsBranch, 'By Branch')
  }

  const slug = periodLabel.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')
  XLSX.writeFile(wb, `dashboard_${slug}_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

//   dedicated Excel export for the itemized Sales Report (all meals bought in the range)
function downloadSalesReportExcel(data, periodLabel, branchLabel) {
  const s     = data?.summary || {}
  const wb    = XLSX.utils.book_new()

  // All items sorted by qty descending (remove any top-10 limit)
  const items = (data?.allSellers || data?.bestSellers || [])
  const totalQty = items.reduce((sum, item) => sum + Number(item.qty || 0), 0)

  const rows = [
    // 1. Establishment name
    ["Harvey's Sisigan"],
    [],
    // 2. Report title + meta
    ["Sales Report"],
    ["Range:", periodLabel],
    ["Branch:", branchLabel],
    ["Generated:", new Date().toLocaleString("en-PH")],
    [],
    ["TOTAL SALES (PHP)", Number(s.totalSales || 0)],
    ["TOTAL MEALS SOLD",  totalQty],
    [],
    // 3. Table header
    ["#", "MEAL / ITEM", "QTY SOLD", "REVENUE (PHP)"],
  ]

  // 4. All items (no limit)
  items.forEach((item, i) => {
    rows.push([i + 1, item.name, Number(item.qty || 0), Number(item.revenue || 0)])
  })

  // 5. Total row
  rows.push(["", "TOTAL", totalQty, Number(s.totalSales || 0)])

  const wsItems = XLSX.utils.aoa_to_sheet(rows)

  // ── Styling ──────────────────────────────────────────
  // Column widths
  wsItems['!cols'] = [{ wch: 6 }, { wch: 38 }, { wch: 14 }, { wch: 20 }]

  // Merge A1:D1 for establishment name
  wsItems['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }]

  // Bold + large font for establishment name (A1)
  if (wsItems['A1']) {
    wsItems['A1'].s = {
      font:      { bold: true, sz: 32, name: 'Arial' },
      alignment: { horizontal: 'center', vertical: 'center' },
    }
  }

  // Bold for "Sales Report" (A3)
  if (wsItems['A3']) {
    wsItems['A3'].s = { font: { bold: true, sz: 14 } }
  }

  // Bold for totals row labels (A8, A9)
  ;['A8', 'A9'].forEach(cell => {
    if (wsItems[cell]) wsItems[cell].s = { font: { bold: true } }
  })

  // Bold + background for table header row (row 11, index 10)
  ;['A11', 'B11', 'C11', 'D11'].forEach(cell => {
    if (wsItems[cell]) {
      wsItems[cell].s = {
        font:    { bold: true, color: { rgb: '78350F' } },
        fill:    { fgColor: { rgb: 'FEF3C7' } },
        border: {
          bottom: { style: 'medium', color: { rgb: 'D97706' } },
        },
      }
    }
  })

  // Bold + underline total row (last row)
  const lastRow = rows.length
  ;['B', 'C', 'D'].forEach(col => {
    const cell = `${col}${lastRow}`
    if (wsItems[cell]) {
      wsItems[cell].s = { font: { bold: true } }
    }
  })

  XLSX.utils.book_append_sheet(wb, wsItems, 'Sales Report')

  const slug = periodLabel.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')
  XLSX.writeFile(wb, `sales_report_${slug}_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

//   separate HTML builder for the itemized "Sales Report" (all meals bought in range)
function buildSalesReportHTML(data, periodLabel, branchLabel) {
  const s = data?.summary || {}
  const items = data?.allSellers || data?.bestSellers || []
  const totalQty = items.reduce((sum, it) => sum + Number(it.qty || 0), 0)

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Sales Report – ${periodLabel}</title>
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
    tfoot td { font-weight: 700; border-top: 2px solid #d97706; border-bottom: none; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 4px; }
    .stat-box { background: #fef3c7; border: 1px solid #d97706; border-radius: 8px; padding: 12px 16px; }
    .stat-label { font-size: 10px; text-transform: uppercase; color: #92400e; font-weight: 700; margin-bottom: 4px; }
    .stat-val { font-size: 18px; font-weight: 700; color: #78350f; }
    @media print {
      body { padding: 16px; }
      h2 { page-break-after: avoid; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>Sales Report</h1>
  <div class="meta">
    Range: <strong>${periodLabel}</strong> &nbsp;·&nbsp;
    Branch: <strong>${branchLabel}</strong> &nbsp;·&nbsp;
    Generated: ${new Date().toLocaleString('en-PH')}
  </div>

  <div class="summary-grid">
    <div class="stat-box">
      <div class="stat-label">Total Sales</div>
      <div class="stat-val">PHP ${Number(s.totalSales || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Total Meals Sold</div>
      <div class="stat-val">${totalQty.toLocaleString()}</div>
    </div>
  </div>

  <h2>Meals Bought (${items.length} item${items.length !== 1 ? 's' : ''})</h2>
  ${items.length ? `
  <table>
    <thead><tr><th>#</th><th>Meal / Item</th><th class="num">Qty Sold</th><th class="num">Revenue (PHP)</th></tr></thead>
    <tbody>
      ${items.map((item, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${item.name}</td>
          <td class="num">${item.qty}</td>
          <td class="num">${Number(item.revenue || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
        </tr>`).join('')}
    </tbody>
    <tfoot>
      <tr>
        <td></td>
        <td>Total</td>
        <td class="num">${totalQty}</td>
        <td class="num">${Number(s.totalSales || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
      </tr>
    </tfoot>
  </table>` : `<p style="color:#78716c;">No meals were sold in this date range.</p>`}
</body>
</html>`
}

// ── Custom Range Picker (matches ForecastPage style) ───────────────────────────
//   added an `onReset` prop + Reset button so the picked custom range can be cleared
function CustomRangePicker({ startDate, endDate, onChange, onClose, onReset }) {
  const [localStart, setLocalStart] = useState(startDate || '')
  const [localEnd, setLocalEnd] = useState(endDate || '')
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

  //   clears both the local inputs and the parent's stored custom range
  function handleReset() {
    setLocalStart('')
    setLocalEnd('')
    onReset()
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

      {/*   Reset button — clears the currently applied custom range */}
      {(startDate || endDate) && (
        <button onClick={handleReset} style={resetBtnStyle}>
          ✕ Reset Range
        </button>
      )}
    </div>
  )
}

// Print Preview Modal — shows the generated report HTML inside an iframe
// so the user can review it before printing/downloading, instead of jumping
// straight into the browser's print dialog.
function PrintPreviewModal({ html, title, onClose, onDownloadExcel }) {
  const iframeRef = useRef(null)

  function handlePrint() {
    const win = iframeRef.current?.contentWindow
    if (win) win.print()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(28,10,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 860,
        height: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Modal header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 20px', borderBottom: '1.5px solid var(--border)', background: 'var(--cream)',
        }}>
          <strong style={{ fontSize: 14, color: 'var(--brown-800)' }}>🖨️ Print Preview — {title}</strong>
          <div style={{ display: 'flex', gap: 8 }}>
            {onDownloadExcel && (
              <button onClick={onDownloadExcel} style={{
                padding: '6px 12px', borderRadius: 'var(--radius-full)',
                border: '1.5px solid var(--border)', background: '#fff',
                color: 'var(--brown-800)', fontWeight: 700, fontSize: 12, cursor: 'pointer',
              }}>📊 Excel</button>
            )}
            <button onClick={handlePrint} style={{
              padding: '6px 14px', borderRadius: 'var(--radius-full)', border: 'none',
              background: 'var(--brown-600)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer',
            }}>Print / Save as PDF</button>
            <button onClick={onClose} style={{
              padding: '6px 12px', borderRadius: 'var(--radius-full)',
              border: '1.5px solid var(--border)', background: 'transparent',
              color: 'var(--brown-700)', fontWeight: 700, fontSize: 12, cursor: 'pointer',
            }}>Close</button>
          </div>
        </div>

        {/* Preview body */}
        <iframe ref={iframeRef} title="report-preview" srcDoc={html}
          style={{ flex: 1, border: 'none', width: '100%', background: '#fff' }} />
      </div>
    </div>
  )
}

//   Sales Report Modal — lets the user pick a date range (default = today,
// real-time), view every meal/item bought in that range, then print-preview,
// print/download as PDF, or export to Excel.
function SalesReportModal({ branchId, branches, branchLabel, isOwner, onClose }) {
  const today = todayISO()
  const [start, setStart] = useState(today)
  const [end, setEnd] = useState(today)
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showPreview, setShowPreview] = useState(false)

  const reportBranchLabel = useMemo(() => {
    return branchLabel || 'All Branches'
  }, [branchLabel])

  const rangeLabel = start === end ? start : `${start} to ${end}`

  const fetchReport = useCallback(async () => {
    if (!start || !end || start > end) return
    setLoading(true)
    try {
      const params = { period: 'custom', from: start, to: end }
      if (branchId) params.branchId = branchId
      const res = await dashboardApi.get(params)
      setReportData(res.data)
    } finally {
      setLoading(false)
    }
  }, [start, end, branchId])

  useEffect(() => { fetchReport() }, [fetchReport])

  //   resets the report's own date range back to today (real-time)
  function handleResetRange() {
    setStart(today)
    setEnd(today)
  }

  const items = reportData?.allSellers || reportData?.bestSellers || []
  const totalQty = items.reduce((sum, it) => sum + Number(it.qty || 0), 0)
  const isValidRange = start && end && start <= end

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(28,10,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900,
        padding: 24,
      }}>
        <div style={{
          background: 'var(--cream)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 760,
          maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 20px', borderBottom: '1.5px solid var(--border)',
          }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--brown-800)' }}>
                Sales Report
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{branchLabel}</p>
            </div>
            <button onClick={onClose} style={{
              border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)',
            }}>✕</button>
          </div>

          {/* Date range controls — defaults to real-time today, fully adjustable */}
          <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap',
            padding: '14px 20px', borderBottom: '1.5px solid var(--border)',
          }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
              From
              <input type="date" value={start} max={end}
                onChange={e => setStart(e.target.value)} style={dateInputStyle} />
            </label>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
              To
              <input type="date" value={end} min={start} max={today}
                onChange={e => setEnd(e.target.value)} style={dateInputStyle} />
            </label>
            <button onClick={handleResetRange} style={{
              padding: '7px 14px', borderRadius: 'var(--radius-full)',
              border: '1.5px dashed var(--border)', background: 'transparent',
              color: 'var(--text-muted)', fontWeight: 600, fontSize: 12, cursor: 'pointer',
            }}>↺ Reset to Today</button>

            <div style={{ flex: 1 }} />

            <button onClick={() => setShowPreview(true)} disabled={!reportData}
              style={{
                padding: '7px 14px', borderRadius: 'var(--radius-full)', border: 'none',
                background: 'var(--brown-600)', color: '#fff', fontWeight: 700, fontSize: 12,
                cursor: reportData ? 'pointer' : 'not-allowed', opacity: reportData ? 1 : 0.5,
              }}>🖨️ Preview Report</button>
            <button onClick={() => downloadSalesReportExcel(reportData, rangeLabel, branchLabel)} disabled={!reportData}
              style={{
                padding: '7px 14px', borderRadius: 'var(--radius-full)',
                border: '1.5px solid var(--border)', background: '#fff',
                color: 'var(--brown-800)', fontWeight: 700, fontSize: 12,
                cursor: reportData ? 'pointer' : 'not-allowed', opacity: reportData ? 1 : 0.5,
              }}>📊 Excel</button>
          </div>

          {!isValidRange && (
            <div style={{ padding: '10px 20px', fontSize: 12, color: '#dc2626' }}>
              "To" date must be on or after "From" date.
            </div>
          )}

          {/* Itemized meals table */}
          <div style={{ overflowY: 'auto', padding: '16px 20px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading report…</div>
            ) : items.length ? (
              <>
                <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
                  <StatCard label="Total Sales" value={fmt(reportData?.summary?.totalSales || 0)} />
                  <StatCard label="Total Meals Sold" value={totalQty} />
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--brown-50)' }}>
                      {['#', 'Meal / Item', 'Qty Sold', 'Revenue'].map(h => (
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
                    {items.map((item, i) => (
                      <tr key={item.id || item.name} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '9px 12px', textAlign: 'center', color: 'var(--text-faint)', fontWeight: 700 }}>{i + 1}</td>
                        <td style={{ padding: '9px 12px', fontWeight: 600, color: 'var(--text-dark)' }}>{item.name}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--brown-700)' }}>{item.qty}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--green)' }}>{fmt(item.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <EmptyState icon="📑" title="No meals sold in this date range" />
            )}
          </div>
        </div>
      </div>

      Print preview opens on top of the report modal
      {showPreview && reportData && (
        <PrintPreviewModal
          title={`Sales Report (${rangeLabel})`}
          html={buildSalesReportHTML(reportData, rangeLabel, branchLabel)}
          onClose={() => setShowPreview(false)}
          onDownloadExcel={() => downloadSalesReportExcel(reportData, rangeLabel, branchLabel)}
        />
      )}
    </>
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

  const [data, setData] = useState(null)
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('today')
  const [branchId, setBranchId] = useState('')

  // Custom range state (mirrors ForecastPage)
  const [showRangePicker, setShowRangePicker] = useState(false)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  // state for the print-preview modal (main dashboard export) and the sales report modal
  const [showSalesReport, setShowSalesReport] = useState(false)

  useEffect(() => {
    if (isOwner) {
      dashboardApi.branches().then(d => setBranches(d.data || []))
    }
  }, [isOwner])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { period }
      if (branchId) params.branchId = branchId
      if (period === 'custom' && customStart) params.from = customStart
      if (period === 'custom' && customEnd) params.to = customEnd
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
    // Cashier always belongs to one branch
    if (!isOwner) {
      return user?.branch?.name || "Unknown Branch"
    }

    // Owner
    if (!branchId) return "All Branches"

    return (
      branches.find(b => String(b.id) === String(branchId))?.name ||
      "All Branches"
    )
  }, [isOwner, user, branchId, branches])

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

  //   resets the custom range entirely and falls back to "Today"
  function handleResetCustomRange() {
    setCustomStart('')
    setCustomEnd('')
    setPeriod('today')
    setShowRangePicker(false)
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

            {/* Date range dropdown —   now passes onReset so user can clear the range */}
            {showRangePicker && (
              <CustomRangePicker
                startDate={customStart}
                endDate={customEnd}
                onChange={(s, e) => { setCustomStart(s); setCustomEnd(e) }}
                onClose={() => setShowRangePicker(false)}
                onReset={handleResetCustomRange}
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

          {/*   new "Sales Report" button — opens the itemized meals-sold modal */}
          <button onClick={() => setShowSalesReport(true)} style={{
            padding: '7px 14px', borderRadius: 'var(--radius-full)',
            border: '1.5px solid var(--border)', background: '#fff',
            color: 'var(--brown-800)', fontWeight: 700, fontSize: 12, cursor: 'pointer',
          }}>Sales Report</button>

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
        <StatCard icon="💰" label="Total Sales" value={fmt(s.totalSales || 0)} color="var(--brown-800)" />
        <StatCard icon="🧾" label="Completed Orders" value={s.totalOrders || 0} sub={`Avg ${fmt(s.avgOrderValue || 0)} / order`} />
        <StatCard icon="📦" label="All Orders" value={s.allOrdersCount || 0} sub={`${s.cancelledCount || 0} cancelled`} />
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

      {/*   Sales Report modal — itemized meals bought, adjustable date range, default today */}
      {showSalesReport && (
        <SalesReportModal
          branchId={branchId}
          branches={branches}
          branchLabel={branchLabel}
          isOwner={isOwner}
          onClose={() => setShowSalesReport(false)}
        />
      )}
    </div>
  )
}
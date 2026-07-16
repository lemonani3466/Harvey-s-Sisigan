import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ordersApi, authApi } from '../api/client'
import { Badge, Button, Modal, Card, EmptyState } from '../components/ui'
import { printReceipt } from '../components/ui/ThermalReceipt'
import { useAuth } from '../context/AuthContext'

const STATUSES = ['COMPLETED', 'CANCELLED']

const PH_DISCOUNTS = {
  SENIOR:  { label: 'Senior Citizen', percentage: 20, icon: '🧓' },
  PWD:     { label: 'PWD',            percentage: 20, icon: '♿' },
  STUDENT: { label: 'Student',        percentage: 10, icon: '🎓' },
}

const labelStyle = {
  fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
  letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 6,
}

const inputStyle = {
  width: '100%', padding: '10px 12px',
  border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)',
  fontSize: 14, background: '#fff', outline: 'none',
}

const MODAL_WIDTH = 440
const narrowStyle = { maxWidth: 320, margin: '0 auto' }

// ── 3-Dot Menu ────────────────────────────────────────
function OrderRowMenu({ order, onView, onPay, onReprint, onCancel, onReopen }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const isCancellable = order.status !== 'CANCELLED' && order.status !== 'COMPLETED'
  const isReopenable  = order.status === 'CANCELLED' || order.status === 'COMPLETED'
  const canPay        = !order.payment && order.status !== 'CANCELLED' && order.status !== 'COMPLETED'
  const canReprint    = order.status === 'COMPLETED' && order.payment

  const menuItems = [
    canPay      && { label: '💳 Pay Now',        action: onPay },
    canReprint  && { label: '🖨️ Reprint Receipt', action: onReprint },
    isCancellable && { label: '❌ Cancel Order',  action: onCancel },
    isReopenable  && { label: '🔓 Reopen Order',  action: onReopen },
  ].filter(Boolean)

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        style={{
          width: 32, height: 32, border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius-sm)', background: '#fff',
          cursor: 'pointer', fontSize: 16, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)',
        }}
      >⋮</button>

      {open && (
        <div style={{
          position: 'absolute', top: 36, left: 0, zIndex: 100,
          background: '#fff', border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius-md)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          minWidth: 180, overflow: 'hidden',
        }}>
          {menuItems.map((item, i) => (
            <button key={i} onClick={e => { e.stopPropagation(); setOpen(false); item.action() }} style={{
              width: '100%', padding: '10px 14px', border: 'none',
              background: 'none', textAlign: 'left', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, color: 'var(--text-dark)',
              borderBottom: i < menuItems.length - 1 ? '1px solid var(--border-light)' : 'none',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--brown-100)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >{item.label}</button>
          ))}
          {menuItems.length === 0 && (
            <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-faint)' }}>No actions</div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Discount View ──────────────────────────────────────
function DiscountView({ total, selected, setSelected, onApply, onBack }) {
  const discount = PH_DISCOUNTS[selected]
  const deducted = (discount.percentage / 100) * total
  const newTotal = Math.max(0, total - deducted)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={labelStyle}>Discount Type</label>
        <select value={selected} onChange={e => setSelected(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          {Object.entries(PH_DISCOUNTS).map(([key, d]) => (
            <option key={key} value={key}>{d.icon} {d.label} — {d.percentage}%</option>
          ))}
        </select>
      </div>
      <div style={{ background: 'var(--brown-100)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-mid)', marginBottom: 6 }}>
          <span>Original Total</span><span>₱{total.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--red-dark)', marginBottom: 6 }}>
          <span>{discount.label} Discount ({discount.percentage}%)</span>
          <span>- ₱{deducted.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: 'var(--brown-800)', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <span>New Total</span><span>₱{newTotal.toFixed(2)}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Button variant="outline" fullWidth onClick={onBack}>Cancel</Button>
        <Button variant="primary" fullWidth onClick={() => onApply({ key: selected, label: discount.label, percentage: discount.percentage, deducted })}>Apply</Button>
      </div>
    </div>
  )
}

// ── Cancel View ────────────────────────────────────────
function CancelView({ order, onClose, onCancelled }) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleCancel() {
    setLoading(true); setError('')
    try { await ordersApi.cancel(order.id); onCancelled() }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div>
      <div style={{ ...narrowStyle, textAlign: 'center', padding: '8px 0 20px' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--brown-800)', fontSize: 18, marginBottom: 8 }}>
          Cancel {order.orderNumber}?
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-mid)', marginBottom: 0 }}>
          This will cancel the order. This action cannot be undone.
        </p>
      </div>
      {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <Button variant="outline" fullWidth onClick={onClose}>No, Keep</Button>
        <Button variant="danger" fullWidth disabled={loading} onClick={handleCancel}>
          {loading ? 'Cancelling…' : 'Yes, Cancel'}
        </Button>
      </div>
    </div>
  )
}

// ── Reopen View ────────────────────────────────────────
function ReopenView({ order, onClose, onReopened }) {
  const { user } = useAuth()
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleReopen() {
    if (!password.trim()) { setError('Password is required.'); return }
    setLoading(true); setError('')
    try {
      await authApi.login(user.email, password)
      let reopened = { ...order, status: 'PENDING', payment: null }
      if (typeof ordersApi.reopen === 'function') {
        const result = await ordersApi.reopen(order.id)
        reopened = result?.data || reopened
      }
      onReopened(reopened)
    } catch (e) {
      setError(e.message || 'Incorrect password. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <div>
      <div style={{ ...narrowStyle, textAlign: 'center', padding: '8px 0 20px' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔓</div>
        <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--brown-800)', fontSize: 18, marginBottom: 8 }}>
          Reopen {order.orderNumber}?
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-mid)' }}>
          Enter your password to reopen this order and move it back to Pending.
        </p>
      </div>
      <div style={{ ...narrowStyle, marginBottom: 16, textAlign: 'left' }}>
        <label style={labelStyle}>Your Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleReopen()}
          placeholder="Enter your password" style={inputStyle} autoFocus />
      </div>
      {error && <p style={{ ...narrowStyle, color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <Button variant="outline" fullWidth onClick={onClose}>Cancel</Button>
        <Button variant="primary" fullWidth disabled={loading || !password.trim()} onClick={handleReopen}>
          {loading ? 'Verifying…' : 'Confirm Reopen'}
        </Button>
      </div>
    </div>
  )
}

// ── Payment View ───────────────────────────────────────
function PaymentView({ order, baseTotal, total, method, setMethod, amountPaid, setAmountPaid, refNo, setRefNo, discount, onRemoveDiscount, onOpenDiscount, loading, error, onBack, onPay }) {
  const paid       = Number(amountPaid) || 0
  const change     = paid - total
  const needsRef   = method !== 'CASH'
  const canConfirm = paid >= total && (!needsRef || refNo.trim().length > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ background: 'var(--brown-100)', borderRadius: 'var(--radius-md)', padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--brown-800)', fontSize: 13 }}>{order.orderNumber}</span>
        <span style={{ color: 'var(--brown-800)', fontWeight: 700, fontSize: 20, fontFamily: 'var(--font-display)' }}>P{baseTotal.toFixed(2)}</span>
      </div>

      {discount ? (
        <div style={{ background: 'var(--red-light)', borderRadius: 'var(--radius-md)', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--red-dark)' }}>
              {PH_DISCOUNTS[discount.key]?.icon} {discount.label} ({discount.percentage}%)
            </div>
            <div style={{ fontSize: 11, color: 'var(--red-dark)' }}>- ₱{discount.deducted.toFixed(2)} → New total: ₱{total.toFixed(2)}</div>
          </div>
          <button onClick={onRemoveDiscount} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red-dark)', fontWeight: 700, fontSize: 18, padding: '0 4px' }}>✕</button>
        </div>
      ) : (
        <button onClick={onOpenDiscount} style={{ width: '100%', padding: '7px 12px', border: '1.5px dashed var(--border)', borderRadius: 'var(--radius-md)', background: '#fff', color: 'var(--brown-600)', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          🏷️ Add Discount
        </button>
      )}

      <div>
        <label style={labelStyle}>Payment Method</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {['CASH', 'GCASH', 'MAYA', 'CARD'].map(m => (
            <button key={m} onClick={() => { setMethod(m); setRefNo('') }} style={{
              flex: 1, padding: '7px 4px',
              border: `2px solid ${method === m ? 'var(--brown-600)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-md)',
              background: method === m ? 'var(--brown-600)' : '#fff',
              color: method === m ? '#fff' : 'var(--brown-700)',
              fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
            }}>{m}</button>
          ))}
        </div>
      </div>

      <div>
        <label style={labelStyle}>Amount Paid (P)</label>
        <input type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)}
          placeholder={`Minimum P${total.toFixed(2)}`} style={inputStyle} />
      </div>

      {needsRef && (
        <div>
          <label style={labelStyle}>{method} Reference No. *</label>
          <input value={refNo} onChange={e => setRefNo(e.target.value)}
            placeholder={`Enter ${method} reference number`} style={inputStyle} />
        </div>
      )}

      {paid > 0 && (
        <div style={{ background: change >= 0 ? 'var(--green-light)' : 'var(--red-light)', borderRadius: 'var(--radius-md)', padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: change >= 0 ? 'var(--green-dark)' : 'var(--red-dark)', fontSize: 13, fontWeight: 600 }}>
            {change >= 0 ? 'Change' : 'Short by'}
          </span>
          <span style={{ color: change >= 0 ? 'var(--green-dark)' : 'var(--red-dark)', fontWeight: 700, fontSize: 18 }}>
            P{Math.abs(change).toFixed(2)}
          </span>
        </div>
      )}

      {needsRef && !refNo.trim() && paid >= total && (
        <p style={{ color: 'var(--brown-600)', fontSize: 12, margin: 0 }}>Reference number is required for {method} payments.</p>
      )}

      {error && <p style={{ color: 'var(--red)', fontSize: 13, margin: 0 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
        <Button variant="outline" onClick={onBack} style={{ flex: '0 0 auto' }}>Back</Button>
        <Button variant="success" size="lg" fullWidth disabled={loading || !canConfirm} onClick={onPay}>
          {loading ? 'Processing...' : 'Confirm and Print Receipt'}
        </Button>
      </div>
    </div>
  )
}

// ── Detail View ────────────────────────────────────────
function DetailView({ order, onPayNow, onCancelOrder, onReopenOrder, onReprint }) {
  const isCancellable = order.status !== 'CANCELLED' && order.status !== 'COMPLETED'
  const isReopenable  = order.status === 'CANCELLED' || order.status === 'COMPLETED'

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, marginTop: -8 }}>
        <Badge status={order.status} />
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{order.type?.replace('_', ' ')}</span>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', marginBottom: 12 }}>
        {order.items?.map(item => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-dark)' }}>{item.menuItem?.name}</div>
              {item.notes && <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{item.notes}</div>}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>x{item.quantity}</div>
              <div style={{ fontWeight: 700, color: 'var(--brown-700)', fontSize: 14 }}>P{Number(item.subtotal).toFixed(2)}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 0 16px' }}>
        <span style={{ fontWeight: 700, color: 'var(--text-mid)' }}>TOTAL</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--brown-800)', fontWeight: 700 }}>
          P{Number(order.totalAmount).toFixed(2)}
        </span>
      </div>

      {order.payment && (
        <div style={{ background: 'var(--green-light)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ color: 'var(--green-dark)', fontWeight: 700, marginBottom: 4, fontSize: 13 }}>
            Paid via {order.payment.method}
          </div>
          <div style={{ color: 'var(--green-dark)', fontSize: 13 }}>
            Paid: P{Number(order.payment.amountPaid).toFixed(2)} | Change: P{Number(order.payment.change).toFixed(2)}
          </div>
          {order.payment.referenceNo && (
            <div style={{ color: 'var(--green-dark)', fontSize: 12, marginTop: 2 }}>Ref: {order.payment.referenceNo}</div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {!order.payment && order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
          <Button variant="success" fullWidth onClick={onPayNow}>Pay Now</Button>
        )}
        {order.status === 'COMPLETED' && order.payment && (
          <Button variant="outline" fullWidth onClick={onReprint}>Reprint Receipt</Button>
        )}
        {isCancellable && (
          <Button variant="danger" fullWidth onClick={onCancelOrder}>Cancel Order</Button>
        )}
        {isReopenable && (
          <Button variant="outline" fullWidth onClick={onReopenOrder}>🔓 Reopen Order</Button>
        )}
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text-faint)', textAlign: 'right' }}>
        {order.cashier?.name} | {new Date(order.createdAt).toLocaleString('en-PH')}
      </div>
    </div>
  )
}

// ── Order Detail Modal (orchestrator) ─────────────────
function OrderDetailModal({ orderId, onClose, onRefresh, autoOpenPay = false, initialView = 'detail' }) {
  const { user } = useAuth()
  const [order, setOrder] = useState(null)
  const [view,  setView]  = useState(initialView)

  const [method,           setMethod]           = useState('CASH')
  const [amountPaid,       setAmountPaid]       = useState('')
  const [refNo,            setRefNo]            = useState('')
  const [discount,         setDiscount]         = useState(null)
  const [discountSelected, setDiscountSelected] = useState('SENIOR')
  const [payLoading,       setPayLoading]       = useState(false)
  const [payError,         setPayError]         = useState('')

  useEffect(() => {
    ordersApi.get(orderId).then(d => setOrder(d.data))
  }, [orderId])

  useEffect(() => {
    if (!autoOpenPay || !order) return
    if (!order.payment && order.status !== 'CANCELLED' && order.status !== 'COMPLETED') {
      setView('pay')
    }
  }, [autoOpenPay, order])

  function resetPaymentForm() {
    setMethod('CASH'); setAmountPaid(''); setRefNo(''); setDiscount(null); setPayError('')
  }

  function handleReprint() {
    if (!order?.payment) return
    const d = order.payment.discountAmount
      ? { label: order.payment.discountLabel, percentage: Number(order.payment.discountPercentage), deducted: Number(order.payment.discountAmount) }
      : null
    printReceipt({ ...order, cashier: order.cashier, branch: user?.branch }, order.payment, user?.branch?.name, d)
  }

  async function handlePay() {
    const baseTotal = Number(order.totalAmount)
    const total = discount ? Math.max(0, baseTotal - discount.deducted) : baseTotal
    setPayLoading(true); setPayError('')
    try {
      const payload = { method, amountPaid: Number(amountPaid) || 0 }
      if (method !== 'CASH' && refNo.trim()) payload.referenceNo = refNo.trim()
      if (discount) { payload.discountType = discount.key; payload.discountAmount = discount.deducted }

      const result = await ordersApi.pay(order.id, payload)
      printReceipt(
        { ...order, cashier: { name: user?.name }, branch: user?.branch },
        result.data.payment,
        user?.branch?.name,
        discount
      )
      resetPaymentForm(); onRefresh(); onClose()
    } catch (e) {
      setPayError(e.message)
    } finally {
      setPayLoading(false)
    }
  }

  if (!order) {
    return (
      <Modal title="Order Details" onClose={onClose} width={MODAL_WIDTH}>
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-faint)' }}>Loading...</div>
      </Modal>
    )
  }

  const baseTotal = Number(order.totalAmount)
  const total = discount ? Math.max(0, baseTotal - discount.deducted) : baseTotal

  const titles = {
    detail:   `Order ${order.orderNumber}`,
    pay:      'Process Payment',
    discount: 'Apply Discount',
    cancel:   'Cancel Order',
    reopen:   'Reopen Order',
  }

  return (
    <Modal title={titles[view]} onClose={onClose} width={MODAL_WIDTH}>
      {view === 'detail' && (
        <DetailView
          order={order}
          onPayNow={() => { resetPaymentForm(); setView('pay') }}
          onCancelOrder={() => setView('cancel')}
          onReopenOrder={() => setView('reopen')}
          onReprint={handleReprint}
        />
      )}
      {view === 'pay' && (
        <PaymentView
          order={order} baseTotal={baseTotal} total={total}
          method={method} setMethod={setMethod}
          amountPaid={amountPaid} setAmountPaid={setAmountPaid}
          refNo={refNo} setRefNo={setRefNo}
          discount={discount}
          onRemoveDiscount={() => { setDiscount(null); setAmountPaid('') }}
          onOpenDiscount={() => setView('discount')}
          loading={payLoading} error={payError}
          onBack={() => setView('detail')}
          onPay={handlePay}
        />
      )}
      {view === 'discount' && (
        <DiscountView
          total={baseTotal}
          selected={discountSelected} setSelected={setDiscountSelected}
          onBack={() => setView('pay')}
          onApply={d => { setDiscount(d); setAmountPaid(''); setView('pay') }}
        />
      )}
      {view === 'cancel' && (
        <CancelView
          order={order}
          onClose={() => setView('detail')}
          onCancelled={() => { onRefresh(); onClose() }}
        />
      )}
      {view === 'reopen' && (
        <ReopenView
          order={order}
          onClose={() => setView('detail')}
          onReopened={(updatedOrder) => { setOrder(updatedOrder); resetPaymentForm(); setView('pay') }}
        />
      )}
    </Modal>
  )
}

// ── Order Row ──────────────────────────────────────────
function OrderRow({ order, onView, onAction }) {
  const displayName = order.customerName
    ? `${order.customerName} - ${order.orderNumber}`
    : order.orderNumber

  const dateStr = new Date(order.createdAt).toLocaleDateString('en-PH', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
  const timeStr = new Date(order.createdAt).toLocaleTimeString('en-PH', {
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 16px',
      borderBottom: '1px solid var(--border-light)',
      background: '#fff',
      transition: 'background 0.1s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
      onMouseLeave={e => e.currentTarget.style.background = '#fff'}
    >
      {/* 3-dot menu */}
      <OrderRowMenu
        order={order}
        onView={() => onAction(order.id, 'detail')}
        onPay={() => onAction(order.id, 'pay')}
        onReprint={() => onAction(order.id, 'reprint')}
        onCancel={() => onAction(order.id, 'cancel')}
        onReopen={() => onAction(order.id, 'reopen')}
      />

      {/* Eye button */}
      <button
        onClick={() => onView(order.id)}
        style={{
          width: 32, height: 32, border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius-sm)', background: '#fff',
          cursor: 'pointer', fontSize: 15, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: 'var(--brown-600)', flexShrink: 0,
        }}
        title="View order details"
      >👁</button>

      {/* Order info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {displayName}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {order.items?.slice(0, 2).map(i => i.menuItem?.name).join(', ')}
          {order.items?.length > 2 ? ` +${order.items.length - 2} more` : ''}
        </div>
      </div>

      {/* Amount */}
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--brown-700)', fontSize: 14, flexShrink: 0 }}>
        ₱{Number(order.totalAmount).toFixed(2)}
      </div>

      {/* Date & time */}
      <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0, minWidth: 130 }}>
        <div>{dateStr}</div>
        <div>{timeStr}</div>
      </div>

      {/* Status badge */}
      <div style={{ flexShrink: 0 }}>
        <Badge status={order.status} />
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────
export default function OrdersPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [orders,         setOrders]         = useState([])
  const [filter,         setFilter]         = useState('COMPLETED')
  const [loading,        setLoading]        = useState(false)
  const [selectedId,     setSelectedId]     = useState(null)
  const [selectedView,   setSelectedView]   = useState('detail')
  const [autoPayOrderId, setAutoPayOrderId] = useState(null)
  const [search,         setSearch]         = useState('')
  const [dateFrom,       setDateFrom]       = useState('')
  const [dateTo,         setDateTo]         = useState('')
  const [reprinting,     setReprinting]     = useState(null)
  const { user } = useAuth()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await ordersApi.list({ status: filter, limit: 100 })
      setOrders(data.orders || [])
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const id = setInterval(load, 15000)
    return () => clearInterval(id)
  }, [load])

  useEffect(() => {
    const openOrderId = location.state?.openOrderId
    const autoPay     = location.state?.autoPay
    if (!openOrderId) return
    setSelectedId(openOrderId)
    setSelectedView('detail')
    setAutoPayOrderId(autoPay ? openOrderId : null)
    navigate(location.pathname, { replace: true, state: {} })
  }, [location.pathname, location.state, navigate])

  async function handleAction(orderId, action) {
    if (action === 'reprint') {
      // fetch order and reprint directly
      try {
        const d = await ordersApi.get(orderId)
        const order = d.data
        if (order?.payment) {
          printReceipt(
            { ...order, cashier: order.cashier, branch: user?.branch },
            order.payment,
            user?.branch?.name
          )
        }
      } catch (e) { console.error(e) }
      return
    }
    setSelectedView(action)
    setSelectedId(orderId)
  }

  // Client-side filtering
  const filteredOrders = orders.filter(order => {
    const q = search.toLowerCase()
    const matchesSearch = !q ||
      order.orderNumber?.toLowerCase().includes(q) ||
      order.customerName?.toLowerCase().includes(q) ||
      order.items?.some(i => i.menuItem?.name?.toLowerCase().includes(q))

    const createdAt = new Date(order.createdAt)
    const matchesFrom = !dateFrom || createdAt >= new Date(dateFrom)
    const matchesTo   = !dateTo   || createdAt <= new Date(dateTo + 'T23:59:59')

    return matchesSearch && matchesFrom && matchesTo
  })

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--brown-800)' }}>Orders</h1>
        <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
      </div>

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '7px 18px', borderRadius: 'var(--radius-full)', border: 'none',
            background: filter === s ? 'var(--brown-600)' : 'var(--brown-100)',
            color:      filter === s ? '#fff' : 'var(--brown-800)',
            fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
          }}>{s}</button>
        ))}
      </div>

      {/* Search & Date filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, pointerEvents: 'none' }}>🔍</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search orders…"
            style={{ ...inputStyle, paddingLeft: 34, width: '100%', boxSizing: 'border-box' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)' }}>✕</button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>From</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ ...inputStyle, width: 'auto', padding: '8px 10px' }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>To</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ ...inputStyle, width: 'auto', padding: '8px 10px' }} />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>✕ Clear</button>
          )}
        </div>
      </div>

      {/* Results count */}
      {(search || dateFrom || dateTo) && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
          {filteredOrders.length} result{filteredOrders.length !== 1 ? 's' : ''} found
        </div>
      )}

      {/* List */}
      {loading && orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-faint)' }}>Loading orders...</div>
      ) : filteredOrders.length === 0 ? (
        <EmptyState icon="List" title={`No ${filter.toLowerCase()} orders`} subtitle="Orders will appear here" />
      ) : (
        <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {/* List header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 16px', background: 'var(--brown-50)',
            borderBottom: '1px solid var(--border)',
            fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5,
          }}>
            <div style={{ width: 74, flexShrink: 0 }}>Actions</div>
            <div style={{ flex: 1 }}>Order</div>
            <div style={{ flexShrink: 0, minWidth: 80, textAlign: 'right' }}>Amount</div>
            <div style={{ flexShrink: 0, minWidth: 130, textAlign: 'right' }}>Date & Time</div>
            <div style={{ flexShrink: 0, width: 80, textAlign: 'right' }}>Status</div>
          </div>

          {filteredOrders.map(order => (
            <OrderRow
              key={order.id}
              order={order}
              onView={id => { setSelectedView('detail'); setSelectedId(id) }}
              onAction={handleAction}
            />
          ))}
        </div>
      )}

      {selectedId && (
        <OrderDetailModal
          orderId={selectedId}
          initialView={selectedView}
          autoOpenPay={autoPayOrderId === selectedId}
          onClose={() => { setSelectedId(null); setAutoPayOrderId(null) }}
          onRefresh={load}
        />
      )}
    </div>
  )
}
import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ordersApi, authApi } from '../api/client'
import { Badge, Button, Modal, Card, EmptyState } from '../components/ui'
import { printReceipt } from '../components/ui/ThermalReceipt'
import { useAuth } from '../context/AuthContext'

const STATUSES = ['COMPLETED', 'CANCELLED']

// ── Cancel Confirmation Modal ─────────────────────────
function CancelModal({ order, onClose, onCancelled }) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

 async function handleCancel() {
  console.log('cancel called, order:', order)  // 👈 log full order object
  setLoading(true); setError('')
  try {
    await ordersApi.cancel(order.id)
    onCancelled()
  } catch (e) {
    console.log('cancel error:', e.message)  // 👈 log any error
    setError(e.message)
  } finally {
    setLoading(false)
  }
}
  return (
    <Modal title="Cancel Order" onClose={onClose} width={360}>
      <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
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
    </Modal>
  )
}

// ── Reopen (Password) Modal ───────────────────────────
function ReopenModal({ order, onClose, onReopened }) {
  const { user } = useAuth()
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleReopen() {
    if (!password.trim()) { setError('Password is required.'); return }
    setLoading(true); setError('')
    try {
      // Verify password by attempting login with current user's email
      await authApi.login(user.email, password)
      // Password correct — reopen order to PENDING
     // await ordersApi.updateStatus(order.id, 'PENDING')
      onReopened(order)
    } catch (e) {
      setError('Incorrect password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Reopen Order" onClose={onClose} width={360}>
      <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔓</div>
        <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--brown-800)', fontSize: 18, marginBottom: 8 }}>
          Reopen {order.orderNumber}?
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-mid)' }}>
          Enter your password to reopen this order and move it back to Pending.
        </p>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Your Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleReopen()}
          placeholder="Enter your password"
          style={inputStyle}
          autoFocus
        />
      </div>
      {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <Button variant="outline" fullWidth onClick={onClose}>Cancel</Button>
        <Button variant="primary" fullWidth disabled={loading || !password.trim()} onClick={handleReopen}>
          {loading ? 'Verifying…' : 'Confirm Reopen'}
        </Button>
      </div>
    </Modal>
  )
}

function PaymentModal({ order, onClose, onPaid }) {
  const { user } = useAuth()
  const [method,     setMethod]     = useState('CASH')
  const [amountPaid, setAmountPaid] = useState('')
  const [refNo,      setRefNo]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  const total      = Number(order.totalAmount)
  const paid       = Number(amountPaid) || 0
  const change     = paid - total
  const needsRef   = method !== 'CASH'
  const canConfirm = paid >= total && (!needsRef || refNo.trim().length > 0)

  async function handlePay() {
    setLoading(true); setError('')
    try {
      const payload = { method, amountPaid: paid }
      if (needsRef && refNo.trim().length > 0) payload.referenceNo = refNo.trim()

      const result = await ordersApi.pay(order.id, payload)
      printReceipt(
        { ...order, cashier: { name: user?.name }, branch: user?.branch },
        result.data.payment,
        user?.branch?.name
      )
      onPaid(result.data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Process Payment" onClose={onClose} width={400}>
      <div style={{ background: 'var(--brown-100)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--brown-800)', fontSize: 13 }}>{order.orderNumber}</span>
        <span style={{ color: 'var(--brown-800)', fontWeight: 700, fontSize: 20, fontFamily: 'var(--font-display)' }}>P{total.toFixed(2)}</span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Payment Method</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {['CASH', 'GCASH', 'MAYA', 'CARD'].map(m => (
            <button key={m} onClick={() => { setMethod(m); setRefNo('') }} style={{
              flex: 1, padding: '9px 4px',
              border:      `2px solid ${method === m ? 'var(--brown-600)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-md)',
              background:  method === m ? 'var(--brown-600)' : '#fff',
              color:       method === m ? '#fff' : 'var(--brown-700)',
              fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
            }}>{m}</button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: needsRef ? 14 : 0 }}>
        <label style={labelStyle}>Amount Paid (P)</label>
        <input type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)}
          placeholder={`Minimum P${total.toFixed(2)}`} style={inputStyle} />
      </div>

      {needsRef && (
        <div style={{ marginTop: 14 }}>
          <label style={labelStyle}>{method} Reference No. *</label>
          <input value={refNo} onChange={e => setRefNo(e.target.value)}
            placeholder={`Enter ${method} reference number`} style={inputStyle} />
        </div>
      )}

      {paid > 0 && (
        <div style={{ background: change >= 0 ? 'var(--green-light)' : 'var(--red-light)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: change >= 0 ? 'var(--green-dark)' : 'var(--red-dark)', fontSize: 13, fontWeight: 600 }}>
            {change >= 0 ? 'Change' : 'Short by'}
          </span>
          <span style={{ color: change >= 0 ? 'var(--green-dark)' : 'var(--red-dark)', fontWeight: 700, fontSize: 18 }}>
            P{Math.abs(change).toFixed(2)}
          </span>
        </div>
      )}

      {needsRef && !refNo.trim() && paid >= total && (
        <p style={{ color: 'var(--brown-600)', fontSize: 12, marginTop: 10 }}>
          Reference number is required for {method} payments.
        </p>
      )}

      {error && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 10 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <Button variant="outline" onClick={onClose} style={{ flex: '0 0 auto' }}>Cancel</Button>
        <Button variant="success" size="lg" fullWidth disabled={loading || !canConfirm} onClick={handlePay}>
          {loading ? 'Processing...' : 'Confirm and Print Receipt'}
        </Button>
      </div>
    </Modal>
  )
}

function OrderDetailModal({ orderId, onClose, onRefresh, autoOpenPay = false }) {
  const { user }   = useAuth()
  const [order,       setOrder]      = useState(null)
  const [showPay,     setShowPay]    = useState(false)
  const [showCancel,  setShowCancel] = useState(false)
  const [showReopen,  setShowReopen] = useState(false)

  useEffect(() => {
    ordersApi.get(orderId).then(d => setOrder(d.data))
  }, [orderId])

  useEffect(() => {
    if (!autoOpenPay || !order) return
    if (!order.payment && order.status !== 'CANCELLED' && order.status !== 'COMPLETED') {
      setShowPay(true)
    }
  }, [autoOpenPay, order])

  function handleReprint() {
    if (!order?.payment) return
    printReceipt(
      { ...order, cashier: order.cashier, branch: user?.branch },
      order.payment,
      user?.branch?.name
    )
  }

  if (!order) {
    return (
      <Modal title="Order Details" onClose={onClose}>
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-faint)' }}>Loading...</div>
      </Modal>
    )
  }

  const isCancellable = order.status !== 'CANCELLED' && order.status !== 'COMPLETED'
  const isReopenable  = order.status === 'CANCELLED' || order.status === 'COMPLETED'

  return (
    <Modal title={`Order ${order.orderNumber}`} onClose={onClose} width={460}>
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
            <div style={{ color: 'var(--green-dark)', fontSize: 12, marginTop: 2 }}>
              Ref: {order.payment.referenceNo}
            </div>
          )}
        </div>
      )}

      {/* ── Action Buttons ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {/* Pay Now — only for active unpaid orders */}
        {!order.payment && order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
          <Button variant="success" fullWidth onClick={() => setShowPay(true)}>Pay Now</Button>
        )}

        {/* Reprint — completed & paid */}
        {order.status === 'COMPLETED' && order.payment && (
          <Button variant="outline" fullWidth onClick={handleReprint}>Reprint Receipt</Button>
        )}

        {/* Cancel — active orders only, with confirmation */}
        {isCancellable && (
          <Button variant="danger" fullWidth onClick={() => setShowCancel(true)}>Cancel Order</Button>
        )}

        {/* Reopen — cancelled/completed orders, requires password */}
        {isReopenable && (
          <Button variant="outline" fullWidth onClick={() => setShowReopen(true)}>🔓 Reopen Order</Button>
        )}
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text-faint)', textAlign: 'right' }}>
        {order.cashier?.name} | {new Date(order.createdAt).toLocaleString('en-PH')}
      </div>

      {showPay && (
        <PaymentModal order={order} onClose={() => setShowPay(false)}
          onPaid={() => { setShowPay(false); onRefresh(); onClose() }} />
      )}

      {showCancel && (
        <CancelModal order={order} onClose={() => setShowCancel(false)}
          onCancelled={() => { setShowCancel(false); onRefresh(); onClose() }} />
      )}

      {showReopen && (
        <ReopenModal order={order} onClose={() => setShowReopen(false)}
          onReopened={() => { setShowReopen(false); setShowPay(true) }} />
      )}
    </Modal>
  )
}

export default function OrdersPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [orders,       setOrders]       = useState([])
  const [filter,       setFilter]       = useState('COMPLETED')
  const [loading,      setLoading]      = useState(false)
  const [selectedId,   setSelectedId]   = useState(null)
  const [autoPayOrderId, setAutoPayOrderId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await ordersApi.list({ status: filter, limit: 50 })
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
    setAutoPayOrderId(autoPay ? openOrderId : null)
    navigate(location.pathname, { replace: true, state: {} })
  }, [location.pathname, location.state, navigate])

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--brown-800)' }}>Orders</h1>
        <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '7px 18px', borderRadius: 'var(--radius-full)', border: 'none',
            background: filter === s ? 'var(--brown-600)' : 'var(--brown-100)',
            color:      filter === s ? '#fff' : 'var(--brown-800)',
            fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
          }}>{s}</button>
        ))}
      </div>

      {loading && orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-faint)' }}>Loading orders...</div>
      ) : orders.length === 0 ? (
        <EmptyState icon="List" title={`No ${filter.toLowerCase()} orders`} subtitle="Orders will appear here" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 12 }}>
          {orders.map(order => (
            <Card key={order.id} onClick={() => setSelectedId(order.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, color: 'var(--brown-800)', fontSize: 14 }}>{order.orderNumber}</span>
                <Badge status={order.status} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                {order.type?.replace('_', ' ')}
                {order.payment ? ` | ${order.payment.method}` : ''}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-mid)', marginBottom: 8 }}>
                {order.items?.slice(0, 2).map(i => i.menuItem?.name).join(', ')}
                {order.items?.length > 2 ? ` +${order.items.length - 2} more` : ''}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-display)', color: 'var(--brown-700)', fontWeight: 700, fontSize: 16 }}>
                  P{Number(order.totalAmount).toFixed(2)}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                  {new Date(order.createdAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                  {' | '}
                  {order.cashier?.name}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selectedId && (
        <OrderDetailModal
          orderId={selectedId}
          autoOpenPay={autoPayOrderId === selectedId}
          onClose={() => { setSelectedId(null); setAutoPayOrderId(null) }}
          onRefresh={load}
        />
      )}
    </div>
  )
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
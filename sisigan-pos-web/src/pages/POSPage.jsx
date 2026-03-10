// src/pages/POSPage.jsx
// Changes:
//   1. Removed TableNumber and CustomerName fields
//   2. Order immediately opens PaymentModal (straight to payment)
//   3. Fixed: referenceNo only required/sent for non-CASH methods
//   4. Auto-prints thermal receipt on successful payment
import { useState, useEffect } from 'react'
import { menuApi, ordersApi } from '../api/client'
import { Button, Input, Modal, EmptyState } from '../components/ui'
import { printReceipt } from '../components/ui/ThermalReceipt'
import { useAuth } from '../context/AuthContext'

const labelStyle = {
  fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
  letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 8,
}

const qtyBtnStyle = {
  width: 26, height: 26, border: '1.5px solid var(--border)',
  borderRadius: 'var(--radius-sm)', background: '#fff',
  cursor: 'pointer', fontWeight: 700, fontSize: 14,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'var(--brown-700)',
}

// ─── PAYMENT MODAL ────────────────────────────────────────
function PaymentModal({ order, onClose, onPaid }) {
  const { user }   = useAuth()
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
      const result = await ordersApi.pay(order.id, {
        method,
        amountPaid: paid,
        referenceNo: needsRef ? refNo.trim() : null,
      })
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
    <Modal title="💳 Process Payment" onClose={onClose} width={400}>
      <div style={{
        background: 'var(--brown-100)', borderRadius: 'var(--radius-md)',
        padding: '14px 16px', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ color: 'var(--brown-700)', fontWeight: 700 }}>{order.orderNumber}</span>
          <span style={{ color: 'var(--brown-800)', fontWeight: 700, fontSize: 22, fontFamily: 'var(--font-display)' }}>
            ₱{total.toFixed(2)}
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--brown-700)' }}>
          {order.items?.length} item{order.items?.length !== 1 ? 's' : ''} · {order.type?.replace('_', ' ')}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Payment Method</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {['CASH', 'GCASH', 'MAYA', 'CARD'].map(m => (
            <button key={m} onClick={() => { setMethod(m); setRefNo('') }} style={{
              flex: 1, padding: '10px 4px',
              border: `2px solid ${method === m ? 'var(--brown-600)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-md)',
              background: method === m ? 'var(--brown-600)' : '#fff',
              color: method === m ? '#fff' : 'var(--brown-700)',
              fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
            }}>{m}</button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: needsRef ? 14 : 0 }}>
        <Input
          label="Amount Paid (₱)"
          type="number"
          value={amountPaid}
          onChange={e => setAmountPaid(e.target.value)}
          placeholder={`Minimum ₱${total.toFixed(2)}`}
        />
      </div>

      {needsRef && (
        <div style={{ marginTop: 14 }}>
          <Input
            label={`${method} Reference No. *`}
            value={refNo}
            onChange={e => setRefNo(e.target.value)}
            placeholder={`Enter ${method} reference number`}
          />
        </div>
      )}

      {paid > 0 && (
        <div style={{
          background: change >= 0 ? 'var(--green-light)' : 'var(--red-light)',
          borderRadius: 'var(--radius-md)', padding: '10px 14px',
          marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ color: change >= 0 ? 'var(--green-dark)' : 'var(--red-dark)', fontSize: 13, fontWeight: 600 }}>
            {change >= 0 ? 'Change' : '⚠ Short by'}
          </span>
          <span style={{ color: change >= 0 ? 'var(--green-dark)' : 'var(--red-dark)', fontWeight: 700, fontSize: 18 }}>
            ₱{Math.abs(change).toFixed(2)}
          </span>
        </div>
      )}

      {needsRef && !refNo.trim() && paid >= total && (
        <p style={{ color: 'var(--brown-600)', fontSize: 12, marginTop: 10 }}>
          ⚠ Reference number is required for {method} payments.
        </p>
      )}

      {error && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 10 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <Button variant="outline" onClick={onClose} style={{ flex: '0 0 auto' }}>Cancel</Button>
        <Button variant="success" size="lg" fullWidth disabled={loading || !canConfirm} onClick={handlePay}>
          {loading ? 'Processing…' : '✓ Confirm & Print Receipt'}
        </Button>
      </div>
    </Modal>
  )
}

// ─── POS PAGE ─────────────────────────────────────────────
export default function POSPage() {
  const [menu,           setMenu]           = useState([])
  const [activeCategory, setActiveCategory] = useState(null)
  const [cart,           setCart]           = useState([])
  const [orderType,      setOrderType]      = useState('DINE_IN')
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState('')
  const [payOrder,       setPayOrder]       = useState(null)
  const [doneMsg,        setDoneMsg]        = useState('')

  useEffect(() => {
    menuApi.categories().then(d => {
      setMenu(d.data || [])
      if (d.data?.length) setActiveCategory(d.data[0].id)
    })
  }, [])

  const currentItems = menu.find(c => c.id === activeCategory)?.items || []
  const totalAmount  = cart.reduce((s, i) => s + i.qty * Number(i.price), 0)

  function addToCart(item) {
    setCart(prev => {
      const ex = prev.find(i => i.id === item.id)
      if (ex) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }]
    })
  }

  function adjustQty(id, delta) {
    setCart(prev =>
      prev.map(i => i.id === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0)
    )
  }

  function clearCart() {
    setCart([]); setOrderType('DINE_IN')
  }

  async function placeOrder() {
    if (!cart.length) return
    setLoading(true); setError('')
    try {
      const result = await ordersApi.create({
        type: orderType,
        items: cart.map(i => ({ menuItemId: i.id, quantity: i.qty })),
      })
      // Build enriched order object for receipt (backend may not return full items)
      const enriched = {
        ...result.data,
        items: cart.map(i => ({
          menuItem:  { name: i.name },
          quantity:  i.qty,
          unitPrice: i.price,
          subtotal:  i.qty * Number(i.price),
        })),
      }
      setPayOrder(enriched)
      clearCart()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handlePaid() {
    setPayOrder(null)
    setDoneMsg('Transaction complete! Receipt printed.')
    setTimeout(() => setDoneMsg(''), 4000)
  }

  function handlePayCancel() {
    setPayOrder(null)
    setDoneMsg('Order saved. Finish payment from the Orders page.')
    setTimeout(() => setDoneMsg(''), 5000)
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - var(--nav-height))', overflow: 'hidden' }}>

      {/* ── LEFT: Menu ───────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--border)' }}>

        <div style={{
          display: 'flex', gap: 8, padding: '12px 16px',
          overflowX: 'auto', background: '#fff',
          borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          {menu.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{
              padding: '7px 18px', borderRadius: 'var(--radius-full)',
              border: 'none', whiteSpace: 'nowrap',
              background: activeCategory === cat.id ? 'var(--brown-600)' : 'var(--brown-100)',
              color: activeCategory === cat.id ? '#fff' : 'var(--brown-800)',
              fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
            }}>{cat.name}</button>
          ))}
        </div>

        <div style={{
          flex: 1, overflowY: 'auto', padding: 16,
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 10, alignContent: 'start',
        }}>
          {currentItems.map(item => {
            const inCart = cart.find(i => i.id === item.id)
            return (
              <div
                key={item.id} onClick={() => addToCart(item)}
                className="animate-fade"
                style={{
                  background: inCart ? 'var(--brown-100)' : 'var(--cream)',
                  border: `2px solid ${inCart ? 'var(--brown-500)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-lg)', padding: '14px 12px',
                  cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none',
                }}
                onMouseEnter={e => { if (!inCart) e.currentTarget.style.borderColor = 'var(--brown-300)' }}
                onMouseLeave={e => { if (!inCart) e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 4, lineHeight: 1.3 }}>
                  {item.name}
                </div>
                <div style={{ fontSize: 15, color: 'var(--brown-600)', fontWeight: 700 }}>
                  ₱{Number(item.price).toFixed(0)}
                </div>
                {inCart && (
                  <div style={{ marginTop: 6, fontSize: 11, color: 'var(--brown-700)', fontWeight: 600 }}>
                    ✓ ×{inCart.qty} in cart
                  </div>
                )}
              </div>
            )
          })}
          {currentItems.length === 0 && (
            <div style={{ gridColumn: '1/-1' }}>
              <EmptyState icon="🍽️" title="No items in this category" />
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Cart ──────────────────────────────────────── */}
      <div style={{ width: 300, display: 'flex', flexDirection: 'column', background: 'var(--cream)' }}>

        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--brown-800)', fontSize: 16, marginBottom: 12 }}>
            New Order
          </h2>
          <div style={{ display: 'flex', gap: 6 }}>
            {['DINE_IN', 'TAKEOUT', 'DELIVERY'].map(t => (
              <button key={t} onClick={() => setOrderType(t)} style={{
                flex: 1, padding: '8px 4px',
                border: `2px solid ${orderType === t ? 'var(--brown-600)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                background: orderType === t ? 'var(--brown-600)' : '#fff',
                color: orderType === t ? '#fff' : 'var(--brown-700)',
                fontWeight: 700, fontSize: 10, cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {t === 'DINE_IN' ? 'Dine In' : t === 'TAKEOUT' ? 'Takeout' : 'Delivery'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {cart.length === 0 ? (
            <EmptyState icon="🛒" title="Cart is empty" subtitle="Tap menu items to add" />
          ) : (
            cart.map(item => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center',
                padding: '9px 0', borderBottom: '1px solid var(--border-light)', gap: 8,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dark)', lineHeight: 1.3 }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--brown-600)', marginTop: 2 }}>
                    ₱{Number(item.price).toFixed(0)} each
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button onClick={() => adjustQty(item.id, -1)} style={qtyBtnStyle}>−</button>
                  <span style={{ width: 22, textAlign: 'center', fontWeight: 700, fontSize: 13 }}>{item.qty}</span>
                  <button onClick={() => adjustQty(item.id, +1)} style={qtyBtnStyle}>+</button>
                </div>
                <div style={{ minWidth: 52, textAlign: 'right', fontWeight: 700, color: 'var(--brown-700)', fontSize: 13 }}>
                  ₱{(item.qty * Number(item.price)).toFixed(0)}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, alignItems: 'baseline' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-mid)', fontSize: 13 }}>TOTAL</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--brown-800)', fontWeight: 700 }}>
              ₱{totalAmount.toFixed(2)}
            </span>
          </div>

          {doneMsg && (
            <div style={{ background: 'var(--green-light)', color: 'var(--green-dark)', padding: '8px 12px', borderRadius: 'var(--radius-md)', marginBottom: 10, fontSize: 13, fontWeight: 600 }}>
              ✓ {doneMsg}
            </div>
          )}
          {error && (
            <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            {cart.length > 0 && (
              <Button variant="ghost" onClick={clearCart} style={{ flex: '0 0 auto' }}>Clear</Button>
            )}
            <Button variant="primary" fullWidth size="lg" disabled={loading || cart.length === 0} onClick={placeOrder}>
              {loading ? 'Creating…' : '💳 Order & Pay'}
            </Button>
          </div>
        </div>
      </div>

      {payOrder && (
        <PaymentModal order={payOrder} onClose={handlePayCancel} onPaid={handlePaid} />
      )}
    </div>
  )
}

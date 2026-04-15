// src/pages/POSPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { menuApi, ordersApi } from '../api/client'
import { Button, EmptyState } from '../components/ui'

const qtyBtnStyle = {
  width: 26, height: 26, border: '1.5px solid var(--border)',
  borderRadius: 'var(--radius-sm)', background: '#fff',
  cursor: 'pointer', fontWeight: 700, fontSize: 14,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'var(--brown-700)',
}

export default function POSPage() {
  const navigate = useNavigate()
  const [menu, setMenu] = useState([])
  const [activeCategory, setActiveCategory] = useState(null)
  const [cart, setCart] = useState([])
  const [orderType, setOrderType] = useState('DINE_IN')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    menuApi.categories({ includePhoto: true }).then(d => {
      setMenu(d.data || [])
      if (d.data?.length) setActiveCategory(d.data[0].id)
    })
  }, [])

  const currentItems = menu.find(c => c.id === activeCategory)?.items || []
  const totalAmount = cart.reduce((s, i) => s + i.qty * Number(i.price), 0)

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
      const orderId = result?.data?.id
      clearCart()
      if (orderId) {
        navigate('/orders', {
          state: { openOrderId: orderId, autoPay: true },
        })
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
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
              color:      activeCategory === cat.id ? '#fff' : 'var(--brown-800)',
              fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
            }}>{cat.name}</button>
          ))}
        </div>

        <div style={{
          flex: 1, overflowY: 'auto', padding: 16,
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 10, alignContent: 'start',
        }}>
          {currentItems.length === 0 && (
            <div style={{ gridColumn: '1/-1' }}>
              <EmptyState icon="🍽️" title="No items in this category" />
            </div>
          )}
          {currentItems.map(item => {
            const inCart = cart.find(i => i.id === item.id)
            return (
              <div
                key={item.id} onClick={() => addToCart(item)}
                style={{
                  background:   inCart ? 'var(--brown-100)' : 'var(--cream)',
                  border:       `2px solid ${inCart ? 'var(--brown-500)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  cursor:       'pointer', transition: 'all 0.15s', userSelect: 'none',
                  overflow:     'hidden',
                }}
              >
                {item.photo ? (
                  <img
                    src={item.photo} alt={item.name}
                    style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div style={{
                    width: '100%', height: 90, background: 'var(--brown-100)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28,
                  }}>
                    ☕
                  </div>
                )}

                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 4 }}>
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
              </div>
            )
          })}
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
                border:      `2px solid ${orderType === t ? 'var(--brown-600)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                background:  orderType === t ? 'var(--brown-600)' : '#fff',
                color:       orderType === t ? '#fff' : 'var(--brown-700)',
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
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dark)' }}>
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
    </div>
  )
}

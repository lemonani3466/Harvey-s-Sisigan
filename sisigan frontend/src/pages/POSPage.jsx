// src/pages/POSPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { menuApi, ordersApi } from '../api/client'
import { Button, EmptyState } from '../components/ui'

const hideSpinnerStyle = `
  input[type=number]::-webkit-outer-spin-button,
  input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  input[type=number] { -moz-appearance: textfield; }
`

const qtyBtnStyle = {
  width: 26, height: 26, border: '1.5px solid var(--border)',
  borderRadius: 'var(--radius-sm)', background: '#fff',
  cursor: 'pointer', fontWeight: 700, fontSize: 14,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'var(--brown-700)',
}

const SIZE_PRESETS = [
  { minCardWidth: 110, imageHeight: 60,  nameFontSize: 11, priceFontSize: 12, padding: '7px 9px'   },
  { minCardWidth: 130, imageHeight: 75,  nameFontSize: 12, priceFontSize: 13, padding: '8px 10px'  },
  { minCardWidth: 150, imageHeight: 90,  nameFontSize: 13, priceFontSize: 15, padding: '10px 12px' },
  { minCardWidth: 175, imageHeight: 110, nameFontSize: 14, priceFontSize: 16, padding: '11px 13px' },
  { minCardWidth: 210, imageHeight: 135, nameFontSize: 15, priceFontSize: 18, padding: '13px 15px' },
]

export default function POSPage() {
  const navigate = useNavigate()
  const [menu, setMenu] = useState([])
  const [activeCategory, setActiveCategory] = useState(null)
  const [cart, setCart] = useState([])
  const [orderType, setOrderType] = useState('DINE_IN')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sizeIndex, setSizeIndex] = useState(2)
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    menuApi.categories({ includePhoto: true, enforceStock: true }).then(d => {
      setMenu(d.data || [])
      if (d.data?.length) setActiveCategory(d.data[0].id)
    })
  }, [])

  const preset = SIZE_PRESETS[sizeIndex]
  const currentItems = menu.find(c => c.id === activeCategory)?.items || []
  const totalAmount = cart.reduce((sum, i) => sum + (parseInt(i.qty) || 0) * Number(i.price), 0)

  function addToCart(item) {
    setCart(prev => {
      const ex = prev.find(i => i.id === item.id)
      if (ex) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }]
    })
  }

  function adjustQty(id, delta) {
    setCart(prev =>
      prev.map(i => i.id === id ? { ...i, qty: (parseInt(i.qty) || 0) + delta } : i).filter(i => i.qty > 0)
    )
  }

  function clearCart() {
    setCart([]); setOrderType('DINE_IN'); setConfirmClear(false)
  }

  async function placeOrder() {
    if (!cart.length) return
    setLoading(true); setError('')
    try {
      const result = await ordersApi.create({
        type: orderType,
        items: cart.map(i => ({ menuItemId: i.id, quantity: parseInt(i.qty) || 1 })),
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
      <style>{hideSpinnerStyle}</style>

      {/* ── LEFT: Menu ───────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--border)' }}>

        {/* Category tabs + size slider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
          background: '#fff', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: 8, flex: 1, overflowX: 'auto' }}>
            {menu.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{
                padding: '7px 18px', borderRadius: 'var(--radius-full)',
                border: 'none', whiteSpace: 'nowrap',
                background: activeCategory === cat.id ? 'var(--brown-600)' : 'var(--brown-100)',
                color:      activeCategory === cat.id ? '#fff' : 'var(--brown-800)',
                fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
              }}>{cat.name}</button>
            ))}
          </div>

          {/* Size slider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
            background: 'var(--brown-100)', borderRadius: 'var(--radius-full)',
            padding: '4px 10px',
          }}>
           <span style={{ fontSize: 13, color: 'var(--brown-700)', fontWeight: 600, whiteSpace: 'nowrap', lineHeight: 1 }}>Decrease</span>
            <input
              type="range" min={0} max={SIZE_PRESETS.length - 1} step={1} value={sizeIndex}
              onChange={e => setSizeIndex(Number(e.target.value))}
              style={{ width: 72, accentColor: 'var(--brown-600)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: 13, color: 'var(--brown-700)', fontWeight: 600, whiteSpace: 'nowrap', lineHeight: 1 }}>Increase</span>
          </div>
        </div>

        {/* Menu grid */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: 16,
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(${preset.minCardWidth}px, 1fr))`,
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
                  cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none', overflow: 'hidden',
                }}
              >
                {item.photo ? (
                  <img src={item.photo} alt={item.name}
                    style={{ width: '100%', height: preset.imageHeight, objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{
                    width: '100%', height: preset.imageHeight, background: 'var(--brown-100)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
                  }}>☕</div>
                )}
                <div style={{ padding: preset.padding }}>
                  <div style={{ fontSize: preset.nameFontSize, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 4 }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: preset.priceFontSize, color: 'var(--brown-600)', fontWeight: 700 }}>
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
            {['DINE_IN', 'TAKEOUT'].map(t => (
              <button key={t} onClick={() => setOrderType(t)} style={{
                flex: 1, padding: '8px 4px',
                border:      `2px solid ${orderType === t ? 'var(--brown-600)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                background:  orderType === t ? 'var(--brown-600)' : '#fff',
                color:       orderType === t ? '#fff' : 'var(--brown-700)',
                fontWeight: 700, fontSize: 10, cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {t === 'DINE_IN' ? 'Dine In' : 'Takeout'}
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
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dark)' }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--brown-600)', marginTop: 2 }}>
                    ₱{Number(item.price).toFixed(0)} each
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button onClick={() => adjustQty(item.id, -1)} style={qtyBtnStyle}>−</button>
                  <input
                    type="number"
                    min={1}
                    value={item.qty}
                    onChange={e => {
                      const val = parseInt(e.target.value)
                      if (!isNaN(val) && val > 0) {
                        setCart(prev => prev.map(i => i.id === item.id ? { ...i, qty: val } : i))
                      } else if (e.target.value === '') {
                        setCart(prev => prev.map(i => i.id === item.id ? { ...i, qty: '' } : i))
                      }
                    }}
                    onBlur={e => {
                      const val = parseInt(e.target.value)
                      if (isNaN(val) || val < 1) {
                        setCart(prev => prev.map(i => i.id === item.id ? { ...i, qty: 1 } : i))
                      }
                    }}
                    style={{
                      width: 40, textAlign: 'center', fontWeight: 700, fontSize: 13,
                      border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                      padding: '2px 4px', outline: 'none', color: 'var(--text-dark)',
                    }}
                  />
                  <button onClick={() => adjustQty(item.id, +1)} style={qtyBtnStyle}>+</button>
                </div>
                <div style={{ minWidth: 52, textAlign: 'right', fontWeight: 700, color: 'var(--brown-700)', fontSize: 13 }}>
                  ₱{((parseInt(item.qty) || 0) * Number(item.price)).toFixed(0)}
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
              <Button variant="ghost" onClick={() => setConfirmClear(true)} style={{ flex: '0 0 auto' }}>Clear</Button>
            )}
            <Button variant="primary" fullWidth size="lg" disabled={loading || cart.length === 0} onClick={placeOrder}>
              {loading ? 'Creating…' : '💳 Order & Pay'}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Clear Confirmation Modal ──────────────────────────── */}
      {confirmClear && (
        <div
          onClick={() => setConfirmClear(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 'var(--radius-lg)',
            padding: '28px 28px 22px', width: 300,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🗑️</div>
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--brown-800)', fontSize: 18, marginBottom: 8 }}>
              Clear cart?
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-mid)', marginBottom: 22 }}>
              This will remove all items from the current order.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmClear(false)} style={{
                flex: 1, padding: '10px 0', borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--border)', background: '#fff',
                color: 'var(--brown-700)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}>No, keep</button>
              <button onClick={clearCart} style={{
                flex: 1, padding: '10px 0', borderRadius: 'var(--radius-md)',
                border: 'none', background: 'var(--brown-600)', color: '#fff',
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}>Yes, clear</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
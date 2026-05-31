// src/pages/POSPage.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { menuApi, ordersApi } from '../api/client'
import { Button, EmptyState } from '../components/ui'
import { useAuth } from '../context/AuthContext'

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

// UNCHANGED — card size presets
const SIZE_PRESETS = [
  { minCardWidth: 110, imageHeight: 60,  nameFontSize: 11, priceFontSize: 12, padding: '7px 9px'   },
  { minCardWidth: 130, imageHeight: 75,  nameFontSize: 12, priceFontSize: 13, padding: '8px 10px'  },
  { minCardWidth: 150, imageHeight: 90,  nameFontSize: 13, priceFontSize: 15, padding: '10px 12px' },
  { minCardWidth: 175, imageHeight: 110, nameFontSize: 14, priceFontSize: 16, padding: '11px 13px' },
  { minCardWidth: 210, imageHeight: 135, nameFontSize: 15, priceFontSize: 18, padding: '13px 15px' },
]

// ─────────────────────────────────────────────────────────────────────────────
// ADDED — StockPopup component
// A centered modal popup that appears when:
//   (a) A blocked (out-of-stock) menu card is tapped
//   (b) The "Order & Pay" button is clicked while cart has stock errors
//   (c) The backend rejects the order with an insufficient-stock error
//
// Displays a readable list of every problem ingredient with:
//   - Ingredient name
//   - How many are needed (recipe qty × order qty, e.g. "2 orders × 1 = 2 bags")
//   - How many are actually in stock right now
//   - What the unit is (BAG, PCS, TANK, etc.)
//
// Dismissed by clicking "Got it" or clicking the dark backdrop.
// ─────────────────────────────────────────────────────────────────────────────
function StockPopup({ popup, onClose }) {
  if (!popup) return null

  // popup shape: { title, message?, lines: [{ label, needed, available, unit, needsQty, stockQty }] }
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16,
          padding: '24px 24px 20px', width: '100%', maxWidth: 400,
          boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
        }}
      >
        {/* Icon + Title */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⛔</div>
          <h3 style={{
            fontFamily: 'var(--font-display)', color: '#991b1b',
            fontSize: 17, margin: 0,
          }}>
            {popup.title}
          </h3>
          {popup.message && (
            <p style={{ fontSize: 12, color: '#6b7280', margin: '6px 0 0', lineHeight: 1.5 }}>
              {popup.message}
            </p>
          )}
        </div>

        {/* Ingredient lines */}
        {popup.lines?.length > 0 && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fca5a5',
            borderRadius: 10, overflow: 'hidden', marginBottom: 18,
          }}>
            {/* Table header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 80px 80px',
              padding: '7px 12px',
              background: '#fee2e2', fontSize: 10, fontWeight: 700,
              color: '#991b1b', textTransform: 'uppercase', letterSpacing: 0.4,
            }}>
              <span>Ingredient</span>
              <span style={{ textAlign: 'center' }}>Needed</span>
              <span style={{ textAlign: 'center' }}>In Stock</span>
            </div>

            {/* One row per problem ingredient */}
            {popup.lines.map((line, i) => (
              <div
                key={line.label}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 80px 80px',
                  padding: '9px 12px', alignItems: 'center',
                  borderTop: i > 0 ? '1px solid #fecaca' : 'none',
                  background: '#fff',
                }}
              >
                {/* Ingredient name + unit */}
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12, color: '#1f2937' }}>
                    {line.label}
                  </div>
                  <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>
                    unit: {line.unit}
                  </div>
                </div>

                {/* Needed column — shows the human-readable breakdown */}
                {/* e.g. "2 orders × 1 = 2 bags" so staff understand where the number comes from */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#dc2626' }}>
                    {line.needed}
                  </div>
                  {/* If we have the breakdown info, show it as a small sub-label */}
                  {line.needsQty && (
                    <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 1, lineHeight: 1.3 }}>
                      {line.needsQty}
                    </div>
                  )}
                </div>

                {/* In Stock column */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#6b7280' }}>
                    {line.available}
                  </div>
                  {line.stockQty && (
                    <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 1, lineHeight: 1.3 }}>
                      {line.stockQty}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dismiss button */}
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '11px 0',
            borderRadius: 10, border: 'none',
            background: '#dc2626', color: '#fff',
            fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}
        >
          Got it
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main POSPage component
// ─────────────────────────────────────────────────────────────────────────────
export default function POSPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  // UNCHANGED state
  const [menu,           setMenu]           = useState([])
  const [activeCategory, setActiveCategory] = useState(null)
  const [cart,           setCart]           = useState([])
  const [orderType,      setOrderType]      = useState('DINE_IN')
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState('')
  const [confirmClear,   setConfirmClear]   = useState(false)

  // CHANGED — removed sizeIndex / slider state.
  // ADDED   — cardSize state: one of 'sm' | 'md' | 'lg'. Controlled by + / - buttons
  //           instead of the old range slider. Defaults to 'md'.
  const [cardSize, setCardSize] = useState('md')

  // UNCHANGED — stockInfo and fetchedIds
  const [stockInfo, setStockInfo] = useState({})
  const fetchedIds = useRef(new Set())

  // ADDED — popup state.
  // null = no popup. When set, holds the data passed to <StockPopup />.
  // Shape: { title, message?, lines: [{ label, needed, available, unit, needsQty, stockQty }] }
  const [popup, setPopup] = useState(null)

  const branchId = user?.branchId

  // UNCHANGED — loadMenu
  const loadMenu = useCallback(() => {
    menuApi.categories({ includePhoto: true, enforceStock: true }).then(d => {
      setMenu(d.data || [])
      if (d.data?.length) setActiveCategory(prev => prev ?? d.data[0].id)
    })
  }, [])

  useEffect(() => { loadMenu() }, [loadMenu])

  // UNCHANGED — stock fetching per category
  useEffect(() => {
    if (!branchId || !activeCategory) return
    const cat = menu.find(c => c.id === activeCategory)
    if (!cat) return
    const unfetched = cat.items.filter(item => !fetchedIds.current.has(item.id))
    if (!unfetched.length) return
    unfetched.forEach(item => fetchedIds.current.add(item.id))
    Promise.allSettled(
      unfetched.map(item =>
        menuApi.checkStock(item.id, branchId).then(res => ({ id: item.id, ...res.data }))
      )
    ).then(results => {
      const updates = {}
      results.forEach(r => { if (r.status === 'fulfilled') updates[r.value.id] = r.value })
      setStockInfo(prev => ({ ...prev, ...updates }))
    })
  }, [activeCategory, menu, branchId])

  // ── ADDED — Card size presets (replaces SIZE_PRESETS + sizeIndex slider) ──
  // Three fixed sizes. The + / - buttons cycle through them.
  // This is simpler than a continuous slider and easier to tap on a touchscreen.
  const CARD_SIZES = {
    sm: { minCardWidth: 120, imageHeight: 70,  nameFontSize: 11, priceFontSize: 12, padding: '7px 9px'   },
    md: { minCardWidth: 155, imageHeight: 95,  nameFontSize: 13, priceFontSize: 15, padding: '10px 12px' },
    lg: { minCardWidth: 200, imageHeight: 130, nameFontSize: 15, priceFontSize: 18, padding: '13px 15px' },
  }
  const SIZE_ORDER = ['sm', 'md', 'lg']
  const preset = CARD_SIZES[cardSize]

  function decreaseSize() {
    const idx = SIZE_ORDER.indexOf(cardSize)
    if (idx > 0) setCardSize(SIZE_ORDER[idx - 1])
  }
  function increaseSize() {
    const idx = SIZE_ORDER.indexOf(cardSize)
    if (idx < SIZE_ORDER.length - 1) setCardSize(SIZE_ORDER[idx + 1])
  }

  // UNCHANGED — derived values
  const currentItems = menu.find(c => c.id === activeCategory)?.items || []
  const totalAmount  = cart.reduce((sum, i) => sum + (parseInt(i.qty) || 0) * Number(i.price), 0)

  // UNCHANGED — cart stock error computation
  const cartStockErrors = cart.flatMap(cartItem => {
    const info = stockInfo[cartItem.id]
    if (!info || !info.hasRecipe) return []
    const qty = parseInt(cartItem.qty) || 1
    return info.ingredients
      .filter(ing => ing.currentStock < ing.required * qty)
      .map(ing => ({
        itemName:       cartItem.name,
        ingredientName: ing.name,
        needed:         ing.required * qty,
        available:      ing.currentStock,
        unit:           ing.unit,
        // ADDED — breakdown strings for the popup
        // "2 orders × 1 per order = 2 bags" — makes the number meaningful to staff
        needsQty: `${qty} order${qty !== 1 ? 's' : ''} × ${ing.required} per order`,
        stockQty: `${ing.currentStock} ${ing.unit} in stock`,
      }))
  })

  const hasBlockingError = cartStockErrors.length > 0

  // ── ADDED — buildPopupLines ───────────────────────────────────────────────
  // Converts cartStockErrors (or a custom message) into the shape StockPopup expects.
  // Groups lines by ingredient name so the same ingredient from multiple cart
  // items only appears once (with totals summed).
  function buildCartPopupLines() {
    // Merge duplicate ingredient entries across different cart items
    const merged = {}
    for (const err of cartStockErrors) {
      if (!merged[err.ingredientName]) {
        merged[err.ingredientName] = { ...err }
      } else {
        merged[err.ingredientName].needed   += err.needed
        merged[err.ingredientName].needsQty  = `${merged[err.ingredientName].needed} total needed`
      }
    }
    return Object.values(merged).map(err => ({
      label:     err.ingredientName,
      needed:    `${err.needed} ${err.unit}`,
      available: `${err.available} ${err.unit}`,
      unit:      err.unit,
      needsQty:  err.needsQty,
      stockQty:  `currently in stock`,
    }))
  }

  // ── ADDED — showBlockedCardPopup ──────────────────────────────────────────
  // Called when the cashier taps a menu card that is fully blocked (out of stock).
  // Builds popup lines from that item's ingredient data and opens the popup.
  function showBlockedCardPopup(item) {
    const info = stockInfo[item.id]
    if (!info || !info.hasRecipe) return

    const lines = info.ingredients
      .filter(ing => ing.status === 'OUT_OF_STOCK')
      .map(ing => ({
        label:     ing.name,
        needed:    `${ing.required} ${ing.unit}`,    // recipe requires this per order
        available: `${ing.currentStock} ${ing.unit}`, // what's actually in inventory
        unit:      ing.unit,
        needsQty:  `${ing.required} ${ing.unit} needed per order`,
        stockQty:  ing.currentStock === 0 ? 'completely out' : `only ${ing.currentStock} left`,
      }))

    setPopup({
      title:   `${item.name} is out of stock`,
      message: 'The following ingredients are insufficient to prepare this item:',
      lines,
    })
  }

  // UNCHANGED — cart actions
  function addToCart(item) {
    setCart(prev => {
      const ex = prev.find(i => i.id === item.id)
      if (ex) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }]
    })
    setError('')
  }

  function adjustQty(id, delta) {
    setCart(prev =>
      prev.map(i => i.id === id ? { ...i, qty: (parseInt(i.qty) || 0) + delta } : i).filter(i => i.qty > 0)
    )
  }

  function clearCart() {
    setCart([]); setOrderType('DINE_IN'); setConfirmClear(false); setError('')
  }

  // CHANGED — placeOrder
  // Same logic as before EXCEPT:
  //   (1) If hasBlockingError, instead of just setting an error string we open the popup.
  //   (2) If the backend throws, we also open the popup with the backend's message
  //       instead of showing a static banner. The static error banner is still set
  //       as a fallback for non-stock errors.
  async function placeOrder() {
    if (!cart.length) return

    // CHANGED — open popup instead of just setting error string
    if (hasBlockingError) {
      setPopup({
        title:   'Insufficient Stock',
        message: 'Some items in your cart cannot be prepared. Here are the details:',
        lines:   buildCartPopupLines(),
      })
      return
    }

    setLoading(true); setError('')
    try {
      const result = await ordersApi.create({
        type:  orderType,
        items: cart.map(i => ({ menuItemId: i.id, quantity: parseInt(i.qty) || 1 })),
      })
      const orderId = result?.data?.id

      // UNCHANGED — refresh menu after successful order
      fetchedIds.current.clear()
      setStockInfo({})
      loadMenu()
      clearCart()

      if (orderId) {
        navigate('/orders', { state: { openOrderId: orderId, autoPay: true } })
      }
    } catch (e) {
      // CHANGED — backend stock errors open a popup; other errors use the static banner
      // Backend messages look like: "Insufficient stock for 'Bigas'. Need 2, only 1 available."
      // We detect stock errors by checking if the message contains "Insufficient stock" or "stock"
      const isStockError = e.message?.toLowerCase().includes('stock') ||
                           e.message?.toLowerCase().includes('insufficient')

      if (isStockError) {
        // Refresh stock cache then open popup with backend message
        fetchedIds.current.clear()
        setStockInfo({})
        loadMenu()
        setPopup({
          title:   'Order Failed — Stock Issue',
          message: e.message,
          lines:   [], // backend message is descriptive enough; no extra table needed
        })
      } else {
        // Non-stock errors (network, auth, etc.) — keep static banner
        setError(e.message)
      }
    } finally {
      setLoading(false)
    }
  }

  // UNCHANGED — getStockBadge
  function getStockBadge(itemId) {
    const info = stockInfo[itemId]
    if (!info || !info.hasRecipe) return null
    if (!info.canOrder) {
      return { label: '⛔ Out of stock', bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' }
    }
    const lowIng = info.ingredients.find(i => i.status === 'LOW_STOCK')
    if (lowIng) {
      return { label: `⚠️ Low: ${lowIng.name}`, bg: '#fffbeb', color: '#b45309', border: '#fcd34d' }
    }
    return null
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - var(--nav-height))', overflow: 'hidden' }}>
      <style>{hideSpinnerStyle}</style>

      {/* ADDED — StockPopup rendered at root level so it overlays everything */}
      <StockPopup popup={popup} onClose={() => setPopup(null)} />

      {/* ── LEFT: Menu grid ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--border)' }}>

        {/* Category tabs + CHANGED size controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#fff', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8, flex: 1, overflowX: 'auto' }}>
            {menu.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{
                padding: '7px 18px', borderRadius: 'var(--radius-full)', border: 'none', whiteSpace: 'nowrap',
                background: activeCategory === cat.id ? 'var(--brown-600)' : 'var(--brown-100)',
                color:      activeCategory === cat.id ? '#fff' : 'var(--brown-800)',
                fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
              }}>{cat.name}</button>
            ))}
          </div>

          {/* CHANGED — replaced range slider with − / + buttons and a size label */}
          {/* Old code was: <input type="range" ... /> with "Decrease" / "Increase" labels */}
          {/* New code: two square buttons with a fixed label in the middle */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
            background: 'var(--brown-100)', borderRadius: 'var(--radius-full)',
            padding: '4px 10px',
          }}>
            <button
              onClick={decreaseSize}
              disabled={cardSize === 'sm'}
              style={{
                width: 28, height: 28, borderRadius: '50%', border: 'none',
                background: cardSize === 'sm' ? '#e5e7eb' : 'var(--brown-600)',
                color: cardSize === 'sm' ? '#9ca3af' : '#fff',
                fontWeight: 700, fontSize: 16, cursor: cardSize === 'sm' ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >−</button>

            <span style={{
              fontSize: 11, fontWeight: 700, color: 'var(--brown-700)',
              minWidth: 58, textAlign: 'center', textTransform: 'uppercase',
              letterSpacing: 0.5, whiteSpace: 'nowrap',
            }}>
              MENU ITEM SIZE
            </span>

            <button
              onClick={increaseSize}
              disabled={cardSize === 'lg'}
              style={{
                width: 28, height: 28, borderRadius: '50%', border: 'none',
                background: cardSize === 'lg' ? '#e5e7eb' : 'var(--brown-600)',
                color: cardSize === 'lg' ? '#9ca3af' : '#fff',
                fontWeight: 700, fontSize: 16, cursor: cardSize === 'lg' ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >+</button>
          </div>
        </div>

        {/* Menu grid — UNCHANGED except onClick now calls showBlockedCardPopup for blocked items */}
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
            const inCart  = cart.find(i => i.id === item.id)
            const badge   = getStockBadge(item.id)
            const blocked = badge?.label?.startsWith('⛔')

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (blocked) {
                    // CHANGED — tapping a blocked card now opens the popup
                    // instead of doing nothing silently
                    showBlockedCardPopup(item)
                  } else {
                    addToCart(item)
                  }
                }}
                style={{
                  background:   blocked ? '#fef2f2' : inCart ? 'var(--brown-100)' : 'var(--cream)',
                  border:       `2px solid ${blocked ? '#fca5a5' : inCart ? 'var(--brown-500)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  // CHANGED — blocked cards now show 'pointer' with a red cursor feel
                  // (still not-allowed for touch devices, but clickable to show popup)
                  cursor:  blocked ? 'pointer' : 'pointer',
                  opacity: blocked ? 0.80 : 1,
                  transition: 'all 0.15s', userSelect: 'none', overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {item.photo ? (
                  <img src={item.photo} alt={item.name}
                    style={{ width: '100%', height: preset.imageHeight, objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', height: preset.imageHeight, background: 'var(--brown-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>☕</div>
                )}

                {/* UNCHANGED — stock badge overlay */}
                {badge && (
                  <div style={{
                    position: 'absolute', top: 6, right: 6,
                    background: badge.bg, color: badge.color,
                    border: `1px solid ${badge.border}`,
                    borderRadius: 6, fontSize: 9, fontWeight: 700,
                    padding: '2px 6px', lineHeight: 1.4,
                    maxWidth: '90%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {badge.label}
                  </div>
                )}

                <div style={{ padding: preset.padding }}>
                  <div style={{ fontSize: preset.nameFontSize, fontWeight: 700, color: blocked ? '#9ca3af' : 'var(--text-dark)', marginBottom: 4 }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: preset.priceFontSize, color: blocked ? '#9ca3af' : 'var(--brown-600)', fontWeight: 700 }}>
                    ₱{Number(item.price).toFixed(0)}
                  </div>
                  {inCart && !blocked && (
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

      {/* ── RIGHT: Cart ──────────────────────────────────────────────────── */}
      <div style={{ width: 300, display: 'flex', flexDirection: 'column', background: 'var(--cream)' }}>

        {/* UNCHANGED — Order type selector */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--brown-800)', fontSize: 16, marginBottom: 12 }}>New Order</h2>
          <div style={{ display: 'flex', gap: 6 }}>
            {['DINE_IN', 'TAKEOUT'].map(t => (
              <button key={t} onClick={() => setOrderType(t)} style={{
                flex: 1, padding: '8px 4px',
                border:     `2px solid ${orderType === t ? 'var(--brown-600)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                background: orderType === t ? 'var(--brown-600)' : '#fff',
                color:      orderType === t ? '#fff' : 'var(--brown-700)',
                fontWeight: 700, fontSize: 10, cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {t === 'DINE_IN' ? 'Dine In' : 'Takeout'}
              </button>
            ))}
          </div>
        </div>

        {/* Cart items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {cart.length === 0 ? (
            <EmptyState icon="🛒" title="Cart is empty" subtitle="Tap menu items to add" />
          ) : (
            cart.map(item => {
              const info = stockInfo[item.id]
              const qty  = parseInt(item.qty) || 1

              // UNCHANGED — stock warnings per cart item
              const stockWarnings = info?.hasRecipe
                ? info.ingredients.filter(ing => ing.currentStock < ing.required * qty)
                : []
              const lowWarnings = info?.hasRecipe
                ? info.ingredients.filter(ing => ing.status === 'LOW_STOCK' && ing.currentStock >= ing.required * qty)
                : []
              const isBlocked = stockWarnings.length > 0

              return (
                <div key={item.id} style={{ padding: '9px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: isBlocked ? '#dc2626' : 'var(--text-dark)' }}>
                        {isBlocked ? '⛔ ' : ''}{item.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--brown-600)', marginTop: 2 }}>
                        ₱{Number(item.price).toFixed(0)} each
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button onClick={() => adjustQty(item.id, -1)} style={qtyBtnStyle}>−</button>
                      <input
                        type="number" min={1} value={item.qty}
                        onChange={e => {
                          const val = parseInt(e.target.value)
                          if (!isNaN(val) && val > 0) setCart(prev => prev.map(i => i.id === item.id ? { ...i, qty: val } : i))
                          else if (e.target.value === '') setCart(prev => prev.map(i => i.id === item.id ? { ...i, qty: '' } : i))
                        }}
                        onBlur={e => {
                          const val = parseInt(e.target.value)
                          if (isNaN(val) || val < 1) setCart(prev => prev.map(i => i.id === item.id ? { ...i, qty: 1 } : i))
                        }}
                        style={{
                          width: 40, textAlign: 'center', fontWeight: 700, fontSize: 13,
                          border: `1.5px solid ${isBlocked ? '#fca5a5' : 'var(--border)'}`,
                          borderRadius: 'var(--radius-sm)', padding: '2px 4px', outline: 'none',
                          color: isBlocked ? '#dc2626' : 'var(--text-dark)',
                        }}
                      />
                      <button onClick={() => adjustQty(item.id, +1)} style={qtyBtnStyle}>+</button>
                    </div>
                    <div style={{ minWidth: 52, textAlign: 'right', fontWeight: 700, color: isBlocked ? '#dc2626' : 'var(--brown-700)', fontSize: 13 }}>
                      ₱{(qty * Number(item.price)).toFixed(0)}
                    </div>
                  </div>

                  {/* CHANGED — Insufficient stock warnings now show human-readable quantities */}
                  {/* Old: "⛔ Bigas: need 2, only 1 left" */}
                  {/* New: "⛔ Bigas: 2 orders × 1 per order = 2 bags needed, only 1 bag in stock" */}
                  {stockWarnings.map(ing => (
                    <div key={ing.name} style={{
                      marginTop: 5, fontSize: 10, fontWeight: 600,
                      color: '#dc2626', background: '#fef2f2',
                      border: '1px solid #fca5a5', borderRadius: 5, padding: '4px 9px',
                      lineHeight: 1.5,
                    }}>
                      ⛔ <strong>{ing.name}</strong>
                      {' — '}
                      {/* CHANGED — show the breakdown so staff understand why it's blocked */}
                      {qty} order{qty !== 1 ? 's' : ''} × {ing.required} per order
                      {' = '}
                      <strong>{ing.required * qty} {ing.unit}</strong> needed,
                      only <strong>{ing.currentStock} {ing.unit}</strong> in stock
                    </div>
                  ))}

                  {/* CHANGED — Low-stock advisories also show readable quantities */}
                  {/* Old: "⚠️ Low stock: Bigas (3 BAG left)" */}
                  {/* New: "⚠️ Low stock: Bigas — 3 bags remaining (min. threshold reached)" */}
                  {!isBlocked && lowWarnings.map(ing => (
                    <div key={ing.name} style={{
                      marginTop: 5, fontSize: 10, fontWeight: 600,
                      color: '#b45309', background: '#fffbeb',
                      border: '1px solid #fcd34d', borderRadius: 5, padding: '4px 9px',
                      lineHeight: 1.5,
                    }}>
                      ⚠️ <strong>{ing.name}</strong>
                      {' — '}
                      only <strong>{ing.currentStock} {ing.unit}</strong> remaining
                      {' '}(low stock — restock soon)
                    </div>
                  ))}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>

          {/* UNCHANGED — static error banner for non-stock backend errors */}
          {error && (
            <div style={{ marginBottom: 10, fontSize: 11, fontWeight: 600, color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 7, padding: '8px 12px', lineHeight: 1.5 }}>
              ⛔ {error}
            </div>
          )}

          {/* CHANGED — hasBlockingError no longer shows a static banner here.
              Instead the banner is replaced with a clickable hint that opens the popup.
              This keeps the footer clean and directs the cashier to the full details popup. */}
          {hasBlockingError && !error && (
            <button
              onClick={() => setPopup({
                title:   'Insufficient Stock',
                message: 'Some items in your cart cannot be prepared. Tap each red item for details.',
                lines:   buildCartPopupLines(),
              })}
              style={{
                width: '100%', marginBottom: 10,
                fontSize: 11, fontWeight: 700,
                color: '#dc2626', background: '#fef2f2',
                border: '1.5px solid #fca5a5', borderRadius: 7,
                padding: '8px 12px', lineHeight: 1.5, cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              ⛔ Stock issue detected — tap here to see details
            </button>
          )}

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
            <Button
              variant="primary" fullWidth size="lg"
              disabled={loading || cart.length === 0 || hasBlockingError}
              onClick={placeOrder}
            >
              {loading ? 'Creating…' : '💳 Order & Pay'}
            </Button>
          </div>
        </div>
      </div>

      {/* UNCHANGED — Clear confirmation modal */}
      {confirmClear && (
        <div onClick={() => setConfirmClear(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 'var(--radius-lg)', padding: '28px 28px 22px', width: 300, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🗑️</div>
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--brown-800)', fontSize: 18, marginBottom: 8 }}>Clear cart?</h3>
            <p style={{ fontSize: 13, color: 'var(--text-mid)', marginBottom: 22 }}>This will remove all items from the current order.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmClear(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border)', background: '#fff', color: 'var(--brown-700)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>No, keep</button>
              <button onClick={clearCart} style={{ flex: 1, padding: '10px 0', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--brown-600)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Yes, clear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
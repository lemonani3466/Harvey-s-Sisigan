// src/components/ui/ThermalReceipt.jsx
// Thermal receipt generator — opens a print window sized for 80mm thermal paper
// Call printReceipt(order, payment, branchName) from anywhere

export function printReceipt(order, payment, branchName = 'Sisigan Restaurant') {
  const items = order.items || []
  const total = Number(order.totalAmount)
  const paid  = Number(payment.amountPaid)
  const change = Number(payment.change)
  const now = new Date(payment.processedAt || new Date())

  const dateStr = now.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  // Build item rows — 80mm thermal = ~42 chars wide at 12px monospace
  function padLine(left, right, width = 32) {
    const spaces = width - left.length - right.length
    return left + ' '.repeat(Math.max(1, spaces)) + right
  }

  const itemLines = items.map(item => {
    const name     = item.menuItem?.name || item.name || ''
    const qty      = item.quantity || item.qty || 1
    const subtotal = `₱${Number(item.subtotal || qty * Number(item.unitPrice || item.price)).toFixed(2)}`
    const qtyPrice = `${qty} x ₱${Number(item.unitPrice || item.price).toFixed(2)}`

    return `
      <div class="item-name">${name}</div>
      <div class="item-row">${padLine(qtyPrice, subtotal)}</div>
    `
  }).join('')

  const refLine = payment.referenceNo
    ? `<div class="line">Ref No: ${payment.referenceNo}</div>`
    : ''

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Receipt - ${order.orderNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      width: 80mm;
      padding: 4mm 4mm 12mm;
      color: #000;
      background: #fff;
    }

    .center  { text-align: center; }
    .right   { text-align: right; }
    .bold    { font-weight: bold; }
    .large   { font-size: 16px; }
    .small   { font-size: 10px; }
    .spacer  { margin: 4px 0; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }

    .header-logo {
      font-size: 22px;
      text-align: center;
      margin-bottom: 2px;
    }
    .header-name {
      font-size: 16px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .header-sub {
      font-size: 10px;
      text-align: center;
      color: #444;
      margin-bottom: 2px;
    }

    .order-num {
      font-size: 18px;
      font-weight: bold;
      text-align: center;
      margin: 4px 0 2px;
    }
    .order-type {
      text-align: center;
      font-size: 11px;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #555;
    }

    .item-name { font-weight: bold; margin-top: 4px; }
    .item-row  { white-space: pre; font-size: 11px; color: #222; }

    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      font-weight: bold;
      margin: 2px 0;
    }
    .total-row.grand {
      font-size: 15px;
      border-top: 1px solid #000;
      padding-top: 4px;
      margin-top: 4px;
    }
    .total-row.change { color: #000; }

    .payment-method {
      text-align: center;
      font-size: 13px;
      font-weight: bold;
      letter-spacing: 1px;
      margin: 4px 0;
      text-transform: uppercase;
    }
    .line { font-size: 11px; color: #444; }

    .footer {
      text-align: center;
      font-size: 10px;
      color: #555;
      margin-top: 8px;
      line-height: 1.6;
    }
    .footer .tagline {
      font-size: 12px;
      font-weight: bold;
      color: #000;
    }

    @media print {
      body { margin: 0; padding: 4mm 4mm 12mm; }
      @page { margin: 0; size: 80mm auto; }
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header-logo">🍖</div>
  <div class="header-name">${branchName}</div>
  <div class="header-sub">${order.branch?.address || ''}</div>
  <div class="header-sub">${order.branch?.city || ''}</div>

  <div class="divider"></div>

  <!-- ORDER INFO -->
  <div class="order-num">${order.orderNumber}</div>
  <div class="order-type">${order.type?.replace('_', ' ') || 'ORDER'}</div>

  <div class="spacer"></div>
  <div class="line">Date : ${dateStr}</div>
  <div class="line">Time : ${timeStr}</div>
  <div class="line">Cashier: ${order.cashier?.name || 'N/A'}</div>

  <div class="divider"></div>

  <!-- ITEMS -->
  ${itemLines}

  <div class="divider"></div>

  <!-- TOTALS -->
  <div class="total-row grand">
    <span>TOTAL</span>
    <span>₱${total.toFixed(2)}</span>
  </div>
  <div class="total-row">
    <span>${payment.method}</span>
    <span>₱${paid.toFixed(2)}</span>
  </div>
  <div class="total-row change">
    <span>CHANGE</span>
    <span>₱${change.toFixed(2)}</span>
  </div>

  ${refLine}

  <div class="divider"></div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="tagline">Salamat sa iyong pagbisita!</div>
    <div>Thank you for dining with us.</div>
    <div>Please come again! 🙏</div>
    <div style="margin-top:6px;">*** OFFICIAL RECEIPT ***</div>
  </div>

</body>
</html>
  `

  // Open print window
  const win = window.open('', '_blank', 'width=320,height=600,toolbar=0,menubar=0')
  if (!win) { alert('Please allow popups to print receipt.'); return }

  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => {
    win.print()
    win.close()
  }, 300)
}

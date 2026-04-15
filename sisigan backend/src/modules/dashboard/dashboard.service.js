// src/modules/dashboard/dashboard.service.js
// Analytics — OWNER sees all branches, MANAGER sees only their branch

const prisma = require('../../config/db');

// ── DATE HELPERS ──────────────────────────────────────────
function getDateRange(period, from, to) {
  const now = new Date();

  if (period === 'today') {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end   = new Date(now); end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (period === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay()); // Sunday
    start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end   = new Date(now); end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (period === 'custom' && from && to) {
    const start = new Date(from); start.setHours(0, 0, 0, 0);
    const end   = new Date(to);   end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  // Default: today
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end   = new Date(now); end.setHours(23, 59, 59, 999);
  return { start, end };
}

// ── MAIN DASHBOARD ────────────────────────────────────────
async function getDashboard({ period = 'today', from, to, branchId }, requestingUser) {
  const { start, end } = getDateRange(period, from, to);

  // Branch scoping
  const scopedBranchId =
    requestingUser.role === 'OWNER'
      ? (branchId ? Number(branchId) : null)   // Manager can filter by branch or see all
      : requestingUser.branchId;                // Admin always sees only their branch

  const orderWhere = {
    status: 'COMPLETED',
    createdAt: { gte: start, lte: end },
    ...(scopedBranchId && { branchId: scopedBranchId }),
  };

  // ── 1. Summary stats ──────────────────────────────────
  const [completedOrders, allOrders] = await Promise.all([
    prisma.order.findMany({
      where: orderWhere,
      include: {
        payment: true,
        items: { include: { menuItem: { include: { category: true } } } },
        branch: { select: { id: true, name: true } },
      },
    }),
    prisma.order.count({
      where: {
        createdAt: { gte: start, lte: end },
        ...(scopedBranchId && { branchId: scopedBranchId }),
      },
    }),
  ]);

  const totalSales  = completedOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
  const totalOrders = completedOrders.length;
  const avgOrder    = totalOrders > 0 ? totalSales / totalOrders : 0;

  const cancelledCount = await prisma.order.count({
    where: {
      status: 'CANCELLED',
      createdAt: { gte: start, lte: end },
      ...(scopedBranchId && { branchId: scopedBranchId }),
    },
  });

  // ── 2. Best sellers ───────────────────────────────────
  const itemSalesMap = {};
  for (const order of completedOrders) {
    for (const item of order.items) {
      const id   = item.menuItemId;
      const name = item.menuItem?.name || 'Unknown';
      if (!itemSalesMap[id]) itemSalesMap[id] = { id, name, qty: 0, revenue: 0 };
      itemSalesMap[id].qty     += item.quantity;
      itemSalesMap[id].revenue += Number(item.subtotal);
    }
  }
  const bestSellers = Object.values(itemSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

  // ── 3. Sales by category (pie chart) ─────────────────
  const categoryMap = {};
  for (const order of completedOrders) {
    for (const item of order.items) {
      const catName = item.menuItem?.category?.name || 'Uncategorized';
      if (!categoryMap[catName]) categoryMap[catName] = { name: catName, value: 0, qty: 0 };
      categoryMap[catName].value += Number(item.subtotal);
      categoryMap[catName].qty   += item.quantity;
    }
  }
  const salesByCategory = Object.values(categoryMap).sort((a, b) => b.value - a.value);

  // ── 4. Sales trend (per day within range) ────────────
  const trendMap = {};
  for (const order of completedOrders) {
    const day = order.createdAt.toISOString().split('T')[0];
    if (!trendMap[day]) trendMap[day] = { date: day, sales: 0, orders: 0 };
    trendMap[day].sales  += Number(order.totalAmount);
    trendMap[day].orders += 1;
  }
  const salesTrend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

  // ── 5. Sales by branch (Owner only) ─────────────────
  let salesByBranch = [];
  if (requestingUser.role === 'OWNER' && !scopedBranchId) {
    const branchMap = {};
    for (const order of completedOrders) {
      const bName = order.branch?.name || 'Unknown';
      const bId   = order.branch?.id;
      if (!branchMap[bId]) branchMap[bId] = { id: bId, name: bName, sales: 0, orders: 0 };
      branchMap[bId].sales  += Number(order.totalAmount);
      branchMap[bId].orders += 1;
    }
    salesByBranch = Object.values(branchMap).sort((a, b) => b.sales - a.sales);
  }

  // ── 6. Payment method breakdown ───────────────────────
  const paymentMap = {};
  for (const order of completedOrders) {
    if (!order.payment) continue;
    const m = order.payment.method;
    if (!paymentMap[m]) paymentMap[m] = { method: m, count: 0, total: 0 };
    paymentMap[m].count += 1;
    paymentMap[m].total += Number(order.payment.amountPaid);
  }
  const paymentBreakdown = Object.values(paymentMap).sort((a, b) => b.total - a.total);

  return {
    period: { label: period, start, end },
    summary: {
      totalSales,
      totalOrders,
      avgOrderValue: avgOrder,
      allOrdersCount: allOrders,
      cancelledCount,
    },
    bestSellers,
    salesByCategory,
    salesTrend,
    salesByBranch,
    paymentBreakdown,
  };
}

// ── BRANCH LIST for filter dropdown ───────────────────────
async function getBranches() {
  return prisma.branch.findMany({
    where: { isActive: true },
    select: { id: true, name: true, city: true },
    orderBy: { name: 'asc' },
  });
}

module.exports = { getDashboard, getBranches };
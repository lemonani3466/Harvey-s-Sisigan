import { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";

const API = "http://localhost:8000/api";

// TODO: replace with your real backend base URL / axios instance from
// src/api/client.js. This is the Express + Prisma backend (port likely
// 4000/5000, not the Python service above), and it needs the auth token
// your AuthContext already attaches to other requests.
const NODE_API = "http://localhost:5000/api";

const C = {
  // Main brand colors
  primary:   "#8B3A0E", // dark brown-orange (navbar/title/buttons)
  secondary: "#D9A15B", // warm gold
  forecast:  "#A65E2E", // medium brown accent
  conf:      "#E8C9A7", // soft beige highlight

  // UI colors
  grid:      "#E7D7C8", // soft border/grid
  text:      "#5A2A0C", // dark brown text
  muted:     "#9B8A7A", // muted warm gray-brown

  // Backgrounds
  cardBg:    "#FFFDFB", // almost white cream
  pageBg:    "#F8F1E9", // warm beige background

  // Extra colors
  success:   "#8C9A5B",
  danger:    "#B94A48",

};

const fmt = (n) => n?.toLocaleString() ?? "—";

// ─── useFetch: auto-fetch on mount ───────────────────────────────────────────
function useFetch(path, deps = []) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`${API}${path}`)
      .then((r) => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error };
}

// ─── useLazyFetch: only fetches when run() is called ─────────────────────────
function useLazyFetch() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const run = useCallback((path) => {
    setLoading(true);
    setData(null);
    setError(null);
    fetch(`${API}${path}`)
      .then((r) => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error, run };
}

// ─── Page-level loading overlay ──────────────────────────────────────────────
function LoadingOverlay({ message }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999,
      background: "rgba(249,250,251,0.93)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 20,
    }}>
      <div style={{
        width: 52, height: 52,
        border: `5px solid ${C.grid}`,
        borderTopColor: C.forecast,
        borderRadius: "50%",
        animation: "spin 0.75s linear infinite",
      }} />
      <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{message}</div>
      <div style={{ fontSize: 13, color: C.muted }}>This may take a few seconds…</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Inline spinner (inside cards) ───────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
      <div style={{
        width: 32, height: 32,
        border: `4px solid ${C.grid}`,
        borderTopColor: C.primary,
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
    </div>
  );
}

function KPICard({ label, value, sub, color }) {
  return (
    <div style={{
      background: C.cardBg, borderRadius: 12, padding: "20px 24px",
      border: `1px solid ${C.grid}`,
      boxShadow: "none",
    }}>
      <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || C.text, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.text }}>{title}</h2>
      {sub && <p style={{ margin: "4px 0 0", fontSize: 12, color: C.muted }}>{sub}</p>}
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: C.cardBg, borderRadius: 12, padding: 24,
      border: `1px solid ${C.grid}`,
      boxShadow: "none",
    }}>
      {children}
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: "6px 12px", borderRadius: 8,
        border: `1px solid ${C.grid}`, fontSize: 13,
        background: "#fff", color: C.text, cursor: "pointer",
      }}
    >
      {options.map((o) => (
        <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
      ))}
    </select>
  );
}

// Small pill for stock status, reused in the ingredient recommendation table
function StatusPill({ status }) {
  const styles = {
    OK:       { bg: "#EAF0DE", fg: C.success },
    LOW:      { bg: "#FBF0DD", fg: "#B8770F" },
    CRITICAL: { bg: "#FBE4E3", fg: C.danger },
  };
  const s = styles[status] || styles.OK;
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 700, background: s.bg, color: s.fg,
    }}>
      {status}
    </span>
  );
}

// ─── Sections ────────────────────────────────────────────────────────────────

function OverviewSection() {
  const { data, loading } = useFetch("/overview");
  if (loading) return <Spinner />;
  if (!data) return null;
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <KPICard label="Total Orders"       value={fmt(data.totalOrders)}    sub={`${data.dateRange.start} – ${data.dateRange.end}`} />
      <KPICard label="Avg Daily Orders"   value={fmt(data.avgDailyOrders)} sub="All days combined" />
      <KPICard label="YoY Growth 2024→25" value={`${data.yoyGrowth > 0 ? "+" : ""}${data.yoyGrowth}%`} color={data.yoyGrowth >= 0 ? "#16a34a" : "#dc2626"} />
      <KPICard label="Weekend Multiplier" value={`${data.weekendMultiplier}×`} sub={`WE avg ${fmt(data.weekendAvg)} vs WD ${fmt(data.weekdayAvg)}`} color={C.secondary} />
      <KPICard label="Best Day"           value={fmt(data.bestDay.orders)} sub={`${data.bestDay.date} (${data.bestDay.dayOfWeek})`} color={C.primary} />
    </div>
  );
}

function DailyTrendSection() {
  const [year, setYear] = useState("2025");
  const { data, loading } = useFetch(`/daily-orders?year=${year}`, [year]);
  const chartData = data?.map((d) => ({
    date:   d.date   || d.Date,
    orders: d.orders || d.totalOrders || d.TotalOrders,
  })) ?? [];

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <SectionHeader title="Daily Orders Trend" sub="Each point = one day's total orders" />
        <Select value={year} onChange={setYear} options={["2022","2023","2024","2025","2026"]} />
      </div>
      {loading ? <Spinner /> : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="og" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={C.primary} stopOpacity={0.25} />
                <stop offset="95%" stopColor={C.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v?.slice(5)} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [fmt(v), "Orders"]} />
            <Area dataKey="orders" stroke={C.primary} fill="url(#og)" strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

function WeeklySummarySection() {
  const { data, loading } = useFetch("/weekly-summary");
  if (loading) return <Spinner />;
  return (
    <Card>
      <SectionHeader title="Average Orders by Day of Week" sub="Historical averages" />
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data ?? []}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
          <XAxis dataKey="dayOfWeek" tick={{ fontSize: 12 }} tickFormatter={(v) => v.slice(0,3)} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v, n) => [fmt(v), n === "avg" ? "Avg Orders" : n]} />
          <Bar dataKey="avg" name="Avg Orders" fill={C.primary} radius={[6,6,0,0]}
            label={{ position: "top", fontSize: 11, fill: C.muted, formatter: (v) => Math.round(v) }} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

function TopItemsSection() {
  const [filter, setFilter] = useState("All");
  const { data, loading } = useFetch(
    `/top-items?n=15${filter !== "All" ? `&day_type=${filter}` : ""}`,
    [filter]
  );
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <SectionHeader title="Top 15 Menu Items" sub="Average daily units sold" />
        <div style={{ display: "flex", gap: 8 }}>
          {["All","Weekday","Weekend"].map((opt) => (
            <button key={opt} onClick={() => setFilter(opt)} style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer",
              border: "none",
              background: filter === opt ? C.primary : C.grid,
              color:      filter === opt ? "#fff"    : C.text,
              fontWeight: filter === opt ? 700       : 400,
            }}>{opt}</button>
          ))}
        </div>
      </div>
      {loading ? <Spinner /> : (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data ?? []} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="item" width={180} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [v, "Avg Daily"]} />
            <Bar dataKey="avgDaily" fill={C.secondary} radius={[0,6,6,0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

function MonthlySection() {
  const { data, loading } = useFetch("/monthly-summary");
  if (loading) return <Spinner />;
  const years   = [...new Set(data?.map((d) => d.year) ?? [])].sort();
  const months  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const pivoted = months.map((m, i) => {
    const row = { month: m };
    years.forEach((y) => {
      const match = data?.find((d) => d.year === y && d.month === i + 1);
      row[y] = match?.total ?? null;
    });
    return row;
  });
  const colors = [C.primary, C.secondary, "#16a34a", "#4a90d9", C.forecast];
  return (
    <Card>
      <SectionHeader title="Monthly Sales by Year" sub="Year-over-year comparison" />
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={pivoted}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v, n) => [fmt(v), n]} />
          <Legend />
          {years.map((y, i) => (
            <Line key={y} type="monotone" dataKey={y}
              stroke={colors[i % colors.length]} strokeWidth={2} dot={false} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ─── Forecast tab — button-triggered with inline loading states ───────────────

function ForecastSection() {
  const [days, setDays]           = useState("30");
  const [triggered, setTriggered] = useState(false);
  const { data, loading, error, run } = useLazyFetch();

  function handleRun() {
    setTriggered(true);
    run(`/forecast?days=${days}`);
  }

  const chartData = data?.forecast?.map((d) => ({
    date: d.date, dayOfWeek: d.dayOfWeek,
    predicted: d.predicted, lower: d.lower, upper: d.upper,
  })) ?? [];

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <SectionHeader
          title="Demand Forecast — Total Orders"
          sub={data
            ? `MAE: ${data.modelMetrics?.mae} orders · RMSE: ${data.modelMetrics?.rmse}`
            : "Select a horizon then click Run Forecast"}
        />
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Select
            value={days}
            onChange={setDays}
            options={[7,14,30,60,90].map((d) => ({ value: String(d), label: `Next ${d} days` }))}
          />
          <button
            onClick={handleRun}
            disabled={loading}
            style={{
              padding: "8px 20px", borderRadius: 8, border: "none",
              background: loading ? C.grid : C.forecast,
              color: loading ? C.muted : "#fff",
              fontWeight: 700, fontSize: 13,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background .15s",
            }}
          >
            {loading ? "Running…" : "▶ Run Forecast"}
          </button>
        </div>
      </div>

      {/* Idle state */}
      {!triggered && (
        <div style={{
          height: 220, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 12,
          color: C.muted, borderRadius: 8, background: C.pageBg,
        }}>
          <span style={{ fontSize: 40 }}>🔮</span>
          <span style={{ fontSize: 14 }}>Click <strong>Run Forecast</strong> to generate predictions</span>
        </div>
      )}

      {/* Loading state */}
      {triggered && loading && (
        <div style={{
          height: 220, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 16,
        }}>
          <div style={{
            width: 44, height: 44,
            border: `4px solid ${C.grid}`, borderTopColor: C.forecast,
            borderRadius: "50%", animation: "spin 0.75s linear infinite",
          }} />
          <span style={{ fontSize: 14, color: C.muted, fontWeight: 600 }}>Training model &amp; generating forecast…</span>
        </div>
      )}
      
      

      {/* Result */}
      {triggered && !loading && data && (
        <>
          <ResponsiveContainer width="100%" height={290}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.conf} stopOpacity={0.55} />
                  <stop offset="95%" stopColor={C.conf} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                labelFormatter={(l, pl) => `${l} (${pl?.[0]?.payload?.dayOfWeek ?? ""})`}
                formatter={(v, n) => [fmt(v), n === "predicted" ? "Forecast" : n === "upper" ? "Upper 95%" : "Lower 95%"]}
              />
              <Area dataKey="upper"     stroke="none"       fill="url(#cg)" name="Upper 95%" />
              <Area dataKey="lower"     stroke="none"       fill={C.pageBg} name="Lower 95%" />
              <Line dataKey="predicted" stroke={C.forecast} strokeWidth={2.5} dot={false} name="Forecast" type="monotone" />
            </AreaChart>
          </ResponsiveContainer>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 10, marginBottom: 0 }}>
            Shaded band = 95% confidence interval. Weekends forecast higher (~{fmt(data?.forecast?.find(d => d.dayType === "Weekend")?.predicted ?? 0)} orders).
          </p>
        </>
      )}
    </Card>
  );
}

function ItemForecastSection() {
  const { data: items }           = useFetch("/items");
  const [selected, setSelected]   = useState("Calamares");
  const [days, setDays]           = useState("30");
  const [triggered, setTriggered] = useState(false);
  const { data, loading, error, run } = useLazyFetch();

  function handleRun() {
    setTriggered(true);
    run(`/item-forecast?item=${encodeURIComponent(selected)}&days=${days}`);
  }

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <SectionHeader
          title="Per-Item Demand Forecast"
          sub={data ? `MAE: ${data.modelMetrics?.mae} units/day` : "Select an item and horizon, then click Run"}
        />
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Select
            value={selected}
            onChange={(v) => { setSelected(v); setTriggered(false); }}
            options={(items ?? []).map((i) => ({ value: i, label: i }))}
          />
          <Select
            value={days}
            onChange={setDays}
            options={[7,14,30,60,90].map((d) => ({ value: String(d), label: `Next ${d} days` }))}
          />
          <button
            onClick={handleRun}
            disabled={loading}
            style={{
              padding: "8px 20px", borderRadius: 8, border: "none",
              background: loading ? C.grid : C.secondary,
              color: loading ? C.muted : "#fff",
              fontWeight: 700, fontSize: 13,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Running…" : "▶ Run Forecast"}
          </button>
        </div>
      </div>

      {!triggered && (
        <div style={{
          height: 200, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 10,
          color: C.muted, borderRadius: 8, background: C.pageBg,
        }}>
          <span style={{ fontSize: 36 }}>🍽️</span>
          <span style={{ fontSize: 14 }}>Pick a menu item and click <strong>Run Forecast</strong></span>
        </div>
      )}

      {triggered && loading && (
        <div style={{
          height: 200, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 14,
        }}>
          <div style={{
            width: 38, height: 38,
            border: `4px solid ${C.grid}`, borderTopColor: C.secondary,
            borderRadius: "50%", animation: "spin 0.75s linear infinite",
          }} />
          <span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>Forecasting {selected}…</span>
        </div>
      )}

      {triggered && !loading && error && (
        <div style={{ padding: 32, textAlign: "center", color: "#dc2626", fontSize: 14 }}>
          
        </div>
      )}

      {triggered && !loading && data && (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data?.forecast ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [v, selected]} />
            <Area
              type="monotone" dataKey="predicted"
              stroke={C.secondary} fill={C.secondary}
              fillOpacity={0.2} strokeWidth={2} dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

// ─── Trending Items + Ingredient Recommendations ───────────────────────────────
//
// Two-step flow, kept as one section since they're one workflow for the user:
//   1. Ask the Python service to rank items by recent GROWTH (not just
//      volume), forecast the top N (1-5), and total up each item's
//      projected demand over the horizon.
//   2. Hand those {itemName, forecastQty} pairs to the Node backend, which
//      knows the recipes + current stock (Python has neither), and get
//      back a restock recommendation per ingredient.
function TrendingItemsSection() {
  const [topN, setTopN]           = useState("3");
  const [days, setDays]           = useState("30");
  const [triggered, setTriggered] = useState(false);

  const [trendData, setTrendData]     = useState(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError]   = useState(null);

  const [recData, setRecData]         = useState(null);
  const [recLoading, setRecLoading]   = useState(false);
  const [recError, setRecError]       = useState(null);

  async function handleRun() {
    setTriggered(true);
    setTrendLoading(true);
    setTrendError(null);
    setTrendData(null);
    setRecData(null);
    setRecError(null);

    // Step 1: trending items + forecast, from the Python analytics service.
    // Its own try/catch, so a failure here always lands in trendError —
    // no guessing based on component state.
    let trend;
    try {
      const res = await fetch(`${API}/trending-items-forecast?top_n=${topN}&days=${days}`);
      if (!res.ok) throw new Error(`Analytics service returned ${res.status} ${res.statusText}`);
      trend = await res.json();
      setTrendData(trend);
    } catch (e) {
      // "Failed to fetch" here almost always means the Python service on
      // :8000 isn't running or isn't reachable (CORS/port/host mismatch).
      setTrendError(e.message);
      setTrendLoading(false);
      return;
    }
    setTrendLoading(false);

    // Only items that got a real forecast (enough history) go on to
    // the ingredient step — items with note/no forecast are skipped.
    const forecastedItems = trend.topItems
      .filter((i) => i.totalForecastQty != null)
      .map((i) => ({ itemName: i.item, forecastQty: i.totalForecastQty }));

    if (forecastedItems.length === 0) return;

    // Step 2: ingredient recommendations, from the Node + Prisma backend.
    // Separate try/catch so its errors never get lost behind step 1's state.
    // TODO: swap for your authenticated client (adds JWT header, base URL
    // from src/api/client.js) once dashboard.controller.js / routes.js
    // expose this endpoint — see integration notes below the component.
    setRecLoading(true);
    try {
      const recRes = await fetch(`${NODE_API}/dashboard/ingredient-recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: forecastedItems }),
      });
      if (!recRes.ok) throw new Error(`Backend returned ${recRes.status} ${recRes.statusText}`);
      const rec = await recRes.json();
      setRecData(rec);
    } catch (e) {
      setRecError(e.message);
    } finally {
      setRecLoading(false);
    }
  }

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <SectionHeader
          title="Trending Items & Ingredient Recommendations"
          sub={trendData
            ? `Ranked by sales growth · ${trendData.rankedBy}`
            : "Pick how many trending items to forecast, then click Run"}
        />
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Select
            value={topN}
            onChange={setTopN}
            options={[1,2,3,4,5].map((n) => ({ value: String(n), label: `Top ${n} item${n > 1 ? "s" : ""}` }))}
          />
          <Select
            value={days}
            onChange={setDays}
            options={[7,14,30,60,90].map((d) => ({ value: String(d), label: `Next ${d} days` }))}
          />
          <button
            onClick={handleRun}
            disabled={trendLoading || recLoading}
            style={{
              padding: "8px 20px", borderRadius: 8, border: "none",
              background: (trendLoading || recLoading) ? C.grid : C.primary,
              color: (trendLoading || recLoading) ? C.muted : "#fff",
              fontWeight: 700, fontSize: 13,
              cursor: (trendLoading || recLoading) ? "not-allowed" : "pointer",
            }}
          >
            {trendLoading ? "Ranking…" : recLoading ? "Checking stock…" : "▶ Run"}
          </button>
        </div>
      </div>

      {!triggered && (
        <div style={{
          height: 180, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 10,
          color: C.muted, borderRadius: 8, background: C.pageBg,
        }}>
          <span style={{ fontSize: 36 }}>📈</span>
          <span style={{ fontSize: 14 }}>Click <strong>Run</strong> to find trending items and check ingredient stock</span>
        </div>
      )}

      {triggered && trendLoading && (
        <div style={{ height: 180, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
          <div style={{
            width: 38, height: 38, border: `4px solid ${C.grid}`, borderTopColor: C.primary,
            borderRadius: "50%", animation: "spin 0.75s linear infinite",
          }} />
          <span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>Ranking items by growth…</span>
        </div>
      )}

      {triggered && !trendLoading && trendError && (
        <div style={{ padding: 32, textAlign: "center", color: "#dc2626", fontSize: 14 }}>
          ⚠️ Trending items request failed: {trendError}
        </div>
      )}

      {triggered && !trendLoading && trendData && (
        <>
          {/* Trending items list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {trendData.topItems.map((it, i) => (
              <div key={it.item} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 16px", borderRadius: 10, background: C.pageBg,
                border: `1px solid ${C.grid}`,
              }}>
                <div>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>
                    #{i + 1} {it.item}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                    {it.recentAvgDaily} avg/day recently (was {it.priorAvgDaily})
                    {it.note && ` · ${it.note}`}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{
                    fontWeight: 800, fontSize: 15,
                    color: it.growthPct >= 0 ? C.success : C.danger,
                  }}>
                    {it.growthPct >= 0 ? "+" : ""}{it.growthPct}%
                  </div>
                  {it.totalForecastQty != null && (
                    <div style={{ fontSize: 12, color: C.muted }}>
                      ~{fmt(it.totalForecastQty)} units / {trendData.forecastDays}d
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          

          {recError && (
            <div style={{ padding: 20, textAlign: "center", color: "#dc2626", fontSize: 13 }}>
              
            </div>
          )}

          {recData && (
            <div>
              <SectionHeader
                title="Ingredient Restock Recommendations"
                sub="Based on projected consumption for the items above vs. current stock"
              />
              {recData.recommendations.length === 0 ? (
                <div style={{ fontSize: 13, color: C.muted }}>
                  {recData.note || "No ingredient data found for these items."}
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.grid}` }}>
                        {["Ingredient","Status","Current Stock","Needed","Suggested Restock"].map((h) => (
                          <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: C.muted, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recData.recommendations.map((r) => (
                        <tr key={r.ingredientId} style={{ borderBottom: `1px solid ${C.grid}` }}>
                          <td style={{ padding: "10px", fontWeight: 600, color: C.text }}>{r.name}</td>
                          <td style={{ padding: "10px" }}><StatusPill status={r.status} /></td>
                          <td style={{ padding: "10px", color: C.text }}>{r.currentStock} {r.unit}</td>
                          <td style={{ padding: "10px", color: C.text }}>{r.requiredForForecast} {r.unit}</td>
                          <td style={{ padding: "10px", fontWeight: 700, color: r.suggestedRestockQty > 0 ? C.danger : C.success }}>
                            {r.suggestedRestockQty > 0 ? `+${r.suggestedRestockQty} ${r.unit}` : "None"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SalesAnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const { loading: pageLoading }  = useFetch("/overview");

  const tabs = [
    { id: "overview", label: "📊 Overview"   },
    { id: "trends",   label: "📈 Trends"     },
    { id: "items",    label: "🍽️ Menu Items" },
    { id: "forecast", label: "🔮 Forecast"   },
  ];

  if (pageLoading) return <LoadingOverlay message="Loading Analytics…" />;

  return (
    <div style={{ minHeight: "100vh", background: C.pageBg, fontFamily: "'Inter', sans-serif" }}>

      {/* Tab bar — sits flush under the existing Navbar (top: 70px) */}
      <div style={{
        background: "#fff", borderBottom: `1px solid ${C.grid}`,
        padding: "0 32px", display: "flex", gap: 4,
        position: "sticky", top: 70, zIndex: 90,
      }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: "14px 20px", background: "none", border: "none",
            borderBottom: `3px solid ${activeTab === t.id ? C.primary : "transparent"}`,
            color:      activeTab === t.id ? C.primary : C.muted,
            fontWeight: activeTab === t.id ? 700       : 400,
            fontSize: 14, cursor: "pointer", transition: "all .15s",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Page content */}
      <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <OverviewSection />
            <WeeklySummarySection />
          </div>
        )}
        {activeTab === "trends" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <DailyTrendSection />
            <MonthlySection />
          </div>
        )}
        {activeTab === "items" && <TopItemsSection />}
        {activeTab === "forecast" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <ForecastSection />
            <ItemForecastSection />
            <TrendingItemsSection />
          </div>
        )}
      </div>
    </div>
  );
}
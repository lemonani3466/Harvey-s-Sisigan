"""
Harvey's Sisigan - Sales Analysis & Demand Forecasting Microservice
FastAPI service that runs alongside the existing Node.js backend.
Endpoint: http://localhost:8000

Forecasting models:
  - /api/forecast      → Facebook Prophet  (captures weekly + yearly seasonality)
  - /api/item-forecast → GradientBoosting  (fast, per-item, lag-feature aware)
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
from prophet import Prophet
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings("ignore")

app = FastAPI(
    title="Harvey's Sisigan Analytics API",
    description="Sales Analysis & Demand Forecasting Service",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Data Loading ─────────────────────────────────────────────────────────────

DATA_PATH = "./sales_forecast_seed_data.xlsx"

def load_data() -> pd.DataFrame:
    df = pd.read_excel(DATA_PATH)
    df["Date"] = pd.to_datetime(df["Date"])
    df["Year"] = df["Date"].dt.year
    df["Month"] = df["Date"].dt.month
    df["Week"] = df["Date"].dt.isocalendar().week.astype(int)
    df["DayNum"] = (df["Date"] - df["Date"].min()).dt.days
    return df

ITEM_COLS = [
    "Beef Bulalo", "Pancit Bihon Guisado", "Crispy Chicharon Bulaklak",
    "Crispy Dinakdakan", "Crispy Sisig Barkada", "Calamares",
    "Pancit Canton Guisado", "Shanghai", "Garlic Butter Bangus", "Crispy Bagnet",
    "CM1 Egg + Rice + Hungarian", "CM2 Egg + Rice + Nuggets",
    "CM3 Egg + Rice + Shanghai", "CM4 Egg + Rice + Bagnet",
    "CM5 Egg + Rice + Bagnet", "CM6 Egg + Rice + Hotdog",
    "CM7 Egg + Rice + Bagnet", "CM8 Egg + Rice + Bagnet",
    "Sisilog", "Bagnetsilog", "Hungarian Silog", "Shanghaisilog",
    "Nuggets Silog", "Hotsilog", "Siomaisilog", "Siomai Rice",
    "Dinakdakansilog", "Chicksilog", "Bangsilog", "Porksilog",
    "4 in 1", "Double Cheese", "Shawarma", "Hawaiian", "Beefy Mushroom",
    "Ham and Cheese", "Bacon", "Pepperoni", "Overload"
]

# ─── Feature Engineering (shared by item forecast) ───────────────────────────

def add_gbr_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add lag + calendar features for GradientBoosting item forecasting."""
    df = df.sort_values("Date").reset_index(drop=True)
    df["DayOfWeekNum"] = df["Date"].dt.dayofweek        # 0=Mon … 6=Sun
    df["IsWeekend"]    = (df["DayOfWeekNum"] >= 5).astype(int)
    df["DayOfMonth"]   = df["Date"].dt.day
    df["Quarter"]      = df["Date"].dt.quarter
    df["WeekOfYear"]   = df["Date"].dt.isocalendar().week.astype(int)
    df["IsPayday"]     = (
        df["DayOfMonth"].between(1, 7) | df["DayOfMonth"].between(15, 20)
    ).astype(int)
    return df

GBR_FEATURES = [
    "DayNum", "DayOfWeekNum", "IsWeekend", "Month",
    "WeekOfYear", "DayOfMonth", "Quarter", "IsPayday",
    "lag7", "lag14", "roll7_mean", "roll14_mean",
]

def build_lag_features(series: pd.Series) -> pd.DataFrame:
    """Compute lag-7, lag-14, roll-7-mean, roll-14-mean for a series."""
    s = series.copy()
    return pd.DataFrame({
        "lag7":       s.shift(7),
        "lag14":      s.shift(14),
        "roll7_mean": s.shift(1).rolling(7).mean(),
        "roll14_mean":s.shift(1).rolling(14).mean(),
    })


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "Harvey's Analytics Service running", "version": "2.0.0"}


@app.get("/api/overview")
def get_overview():
    """KPI summary cards for the dashboard."""
    df = load_data()
    total_orders  = int(df["TotalOrders"].sum())
    avg_daily     = round(float(df["TotalOrders"].mean()), 1)
    best_day      = df.loc[df["TotalOrders"].idxmax()]
    worst_day     = df.loc[df["TotalOrders"].idxmin()]

    last_year  = df[df["Year"] == 2025]["TotalOrders"].sum()
    prior_year = df[df["Year"] == 2024]["TotalOrders"].sum()
    yoy = round((last_year - prior_year) / prior_year * 100, 2) if prior_year else 0

    weekday_avg = df[df["DayType"] == "Weekday"]["TotalOrders"].mean()
    weekend_avg = df[df["DayType"] == "Weekend"]["TotalOrders"].mean()

    return {
        "totalOrders":       total_orders,
        "avgDailyOrders":    avg_daily,
        "bestDay": {
            "date":      str(best_day["Date"].date()),
            "dayOfWeek": best_day["DayOfWeek"],
            "orders":    int(best_day["TotalOrders"]),
        },
        "worstDay": {
            "date":      str(worst_day["Date"].date()),
            "dayOfWeek": worst_day["DayOfWeek"],
            "orders":    int(worst_day["TotalOrders"]),
        },
        "yoyGrowth":         yoy,
        "weekendMultiplier": round(weekend_avg / weekday_avg, 2),
        "weekdayAvg":        round(weekday_avg, 1),
        "weekendAvg":        round(weekend_avg, 1),
        "dateRange": {
            "start": str(df["Date"].min().date()),
            "end":   str(df["Date"].max().date()),
        },
    }


@app.get("/api/daily-orders")
def get_daily_orders(year: int = None):
    """Daily orders trend — optionally filtered by year."""
    df = load_data()
    if year:
        df = df[df["Year"] == year]
    records = df[["Date", "TotalOrders", "DayType", "DayOfWeek"]].copy()
    records["Date"] = records["Date"].dt.strftime("%Y-%m-%d")
    return records.to_dict(orient="records")


@app.get("/api/weekly-summary")
def get_weekly_summary():
    """Average orders per day of week."""
    df = load_data()
    order   = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
    grouped = df.groupby("DayOfWeek")["TotalOrders"].agg(["mean","std","min","max"]).reset_index()
    grouped.columns = ["dayOfWeek","avg","std","min","max"]
    grouped["avg"] = grouped["avg"].round(1)
    grouped["std"] = grouped["std"].round(1)
    grouped["dayOfWeek"] = pd.Categorical(grouped["dayOfWeek"], categories=order, ordered=True)
    return grouped.sort_values("dayOfWeek").to_dict(orient="records")


@app.get("/api/monthly-summary")
def get_monthly_summary():
    """Monthly totals across all years."""
    df = load_data()
    grouped = df.groupby(["Year","Month"])["TotalOrders"].sum().reset_index()
    grouped.columns = ["year","month","total"]
    month_names = {1:"Jan",2:"Feb",3:"Mar",4:"Apr",5:"May",6:"Jun",
                   7:"Jul",8:"Aug",9:"Sep",10:"Oct",11:"Nov",12:"Dec"}
    grouped["monthName"] = grouped["month"].map(month_names)
    return grouped.to_dict(orient="records")


@app.get("/api/top-items")
def get_top_items(n: int = 10, day_type: str = None):
    """Rank menu items by average daily sales."""
    df = load_data()
    if day_type in ("Weekday","Weekend"):
        df = df[df["DayType"] == day_type]
    means = df[ITEM_COLS].mean().sort_values(ascending=False)
    return [
        {"rank": i+1, "item": item, "avgDaily": round(val, 2)}
        for i, (item, val) in enumerate(means.head(n).items())
    ]


@app.get("/api/item-trends")
def get_item_trends(item: str = Query(..., description="Menu item name")):
    """Monthly average trend for a specific menu item."""
    df = load_data()
    if item not in ITEM_COLS:
        raise HTTPException(status_code=404, detail=f"Item '{item}' not found")
    grouped = df.groupby(["Year","Month"])[item].mean().reset_index()
    grouped.columns = ["year","month","avgOrders"]
    grouped["avgOrders"] = grouped["avgOrders"].round(2)
    grouped["label"] = grouped["year"].astype(str) + "-" + grouped["month"].astype(str).str.zfill(2)
    return grouped.to_dict(orient="records")


@app.get("/api/heatmap")
def get_heatmap():
    """Day-of-week × Month heatmap of average orders."""
    df = load_data()
    month_names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    pivot = df.groupby(["DayOfWeek","Month"])["TotalOrders"].mean().reset_index()
    pivot.columns = ["dayOfWeek","month","avg"]
    pivot["avg"]       = pivot["avg"].round(1)
    pivot["monthName"] = pivot["month"].apply(lambda m: month_names[m-1])
    return pivot.to_dict(orient="records")


# ─── /api/forecast  — Prophet ─────────────────────────────────────────────────

@app.get("/api/forecast")
def get_forecast(days: int = Query(30, ge=7, le=90)):
    """
    Demand forecast for the next N days using Facebook Prophet.

    Prophet handles:
      - Weekly seasonality  (Mon–Sun rhythm, Friday uptick, weekend spike)
      - Yearly seasonality  (holiday seasons, mid-year dip)
      - Trend changepoints  (captures growth over time)
      - Multiplicative mode (variance scales with level — realistic for food sales)

    Returns predicted daily orders with 95% confidence interval.
    """
    df = load_data()

    prophet_df = (
        df[["Date","TotalOrders"]]
        .rename(columns={"Date":"ds","TotalOrders":"y"})
    )

    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        seasonality_mode="multiplicative",   # variance scales with level
        changepoint_prior_scale=0.3,         # flexible trend
        seasonality_prior_scale=15.0,        # strong weekly/yearly components
        interval_width=0.95,
    )
    model.fit(prophet_df)

    future   = model.make_future_dataframe(periods=days)
    forecast = model.predict(future)

    # Accuracy metrics on training data
    train_pred = forecast[forecast["ds"].isin(prophet_df["ds"])]["yhat"].values
    y_true     = prophet_df["y"].values
    mae  = round(float(mean_absolute_error(y_true, train_pred)), 2)
    rmse = round(float(np.sqrt(mean_squared_error(y_true, train_pred))), 2)

    future_fc = forecast.tail(days)
    result = []
    for _, row in future_fc.iterrows():
        dt = row["ds"]
        result.append({
            "date":      str(dt.date()),
            "dayOfWeek": dt.strftime("%A"),
            "dayType":   "Weekend" if dt.weekday() >= 5 else "Weekday",
            "predicted": round(max(0, float(row["yhat"]))),
            "lower":     round(max(0, float(row["yhat_lower"]))),
            "upper":     round(float(row["yhat_upper"])),
        })

    # Weekend note for chart subtitle
    weekend_avg = round(
        float(future_fc[future_fc["ds"].dt.weekday >= 5]["yhat"].mean()), 0
    )

    return {
        "forecast":     result,
        "modelMetrics": {"mae": mae, "rmse": rmse},
        "forecastDays": days,
        "weekendAvg":   int(weekend_avg),
        "model":        "Prophet (weekly + yearly seasonality, multiplicative)",
    }


# ─── /api/item-forecast  — GradientBoosting with lag features ─────────────────

@app.get("/api/item-forecast")
def get_item_forecast(
    item: str = Query(..., description="Menu item name"),
    days: int = Query(30, ge=7, le=90),
):
    """
    Forecast for a specific menu item using GradientBoosting Regressor.

    Features used:
      - Calendar: day-of-week, weekend flag, day-of-month, week-of-year,
                  month, quarter, payday flag (1–7 & 15–20)
      - Lag:      7-day lag, 14-day lag
      - Rolling:  7-day rolling mean, 14-day rolling mean

    This gives item-level forecasts that respect weekly rhythm without
    needing a separate Prophet model per item.
    """
    df = load_data()
    if item not in ITEM_COLS:
        raise HTTPException(status_code=404, detail=f"Item '{item}' not found")

    df = add_gbr_features(df)
    lags = build_lag_features(df[item])
    df   = pd.concat([df, lags], axis=1).dropna().reset_index(drop=True)

    X = df[GBR_FEATURES].values
    y = df[item].values

    model = GradientBoostingRegressor(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        random_state=42,
    )
    model.fit(X, y)

    y_pred_train = model.predict(X)
    mae  = round(float(mean_absolute_error(y, y_pred_train)), 2)
    rmse = round(float(np.sqrt(mean_squared_error(y, y_pred_train))), 2)
    sigma = float((y - y_pred_train).std())

    # Rolling forecast: re-use last known values, advance window day by day
    last_row    = df.iloc[-1]
    last_date   = df["Date"].max()
    last_daynum = int(df["DayNum"].max())

    # Keep a buffer of recent actuals to compute lags on-the-fly
    recent = list(df[item].values[-14:])

    forecast = []
    for i in range(1, days + 1):
        future_date = last_date + timedelta(days=i)
        day_num     = last_daynum + i
        dow         = future_date.weekday()
        is_weekend  = int(dow >= 5)
        month       = future_date.month
        woy         = int(future_date.isocalendar()[1])
        dom         = future_date.day
        quarter     = (month - 1) // 3 + 1
        is_payday   = int(1 <= dom <= 7 or 15 <= dom <= 20)

        lag7       = recent[-7]  if len(recent) >= 7  else recent[0]
        lag14      = recent[-14] if len(recent) >= 14 else recent[0]
        roll7_mean = float(np.mean(recent[-7:]))
        roll14_mean= float(np.mean(recent[-14:] if len(recent) >= 14 else recent))

        X_fut = np.array([[
            day_num, dow, is_weekend, month, woy, dom,
            quarter, is_payday, lag7, lag14, roll7_mean, roll14_mean,
        ]])
        pred = float(model.predict(X_fut)[0])
        pred = max(0.0, pred)

        forecast.append({
            "date":      str(future_date.date()),
            "dayOfWeek": future_date.strftime("%A"),
            "dayType":   "Weekend" if is_weekend else "Weekday",
            "predicted": round(pred, 1),
            "lower":     round(max(0.0, pred - 1.96 * sigma), 1),
            "upper":     round(pred + 1.96 * sigma, 1),
        })

        # Advance rolling window with the new prediction
        recent.append(pred)
        if len(recent) > 14:
            recent.pop(0)

    return {
        "item":         item,
        "forecast":     forecast,
        "modelMetrics": {"mae": mae, "rmse": rmse},
        "model":        "GradientBoosting (lag-7, lag-14, rolling means, calendar features)",
    }


@app.get("/api/items")
def list_items():
    """Return all available menu item names."""
    return ITEM_COLS
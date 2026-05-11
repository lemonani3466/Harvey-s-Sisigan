"""
Harvey's Sisigan - Sales Analysis & Demand Forecasting Microservice
FastAPI service that runs alongside the existing Node.js backend.
Endpoint: http://localhost:8000
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
from sklearn.metrics import mean_absolute_error, mean_squared_error
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings("ignore")

app = FastAPI(
    title="Harvey's Sisigan Analytics API",
    description="Sales Analysis & Demand Forecasting Service",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Data Loading ────────────────────────────────────────────────────────────

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

# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "Harvey's Analytics Service running", "version": "1.0.0"}


@app.get("/api/overview")
def get_overview():
    """KPI summary cards for the dashboard."""
    df = load_data()
    total_orders = int(df["TotalOrders"].sum())
    avg_daily = round(df["TotalOrders"].mean(), 1)
    best_day = df.loc[df["TotalOrders"].idxmax()]
    worst_day = df.loc[df["TotalOrders"].idxmin()]

    # YoY growth (last full year vs prior year)
    last_year = df[df["Year"] == 2025]["TotalOrders"].sum()
    prior_year = df[df["Year"] == 2024]["TotalOrders"].sum()
    yoy = round((last_year - prior_year) / prior_year * 100, 2)

    # Weekend multiplier
    weekday_avg = df[df["DayType"] == "Weekday"]["TotalOrders"].mean()
    weekend_avg = df[df["DayType"] == "Weekend"]["TotalOrders"].mean()

    return {
        "totalOrders": total_orders,
        "avgDailyOrders": avg_daily,
        "bestDay": {
            "date": str(best_day["Date"].date()),
            "dayOfWeek": best_day["DayOfWeek"],
            "orders": int(best_day["TotalOrders"])
        },
        "worstDay": {
            "date": str(worst_day["Date"].date()),
            "dayOfWeek": worst_day["DayOfWeek"],
            "orders": int(worst_day["TotalOrders"])
        },
        "yoyGrowth": yoy,
        "weekendMultiplier": round(weekend_avg / weekday_avg, 2),
        "weekdayAvg": round(weekday_avg, 1),
        "weekendAvg": round(weekend_avg, 1),
        "dateRange": {
            "start": str(df["Date"].min().date()),
            "end": str(df["Date"].max().date())
        }
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
    order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    grouped = df.groupby("DayOfWeek")["TotalOrders"].agg(["mean", "std", "min", "max"]).reset_index()
    grouped.columns = ["dayOfWeek", "avg", "std", "min", "max"]
    grouped["avg"] = grouped["avg"].round(1)
    grouped["std"] = grouped["std"].round(1)
    grouped["min"] = grouped["min"].astype(int)
    grouped["max"] = grouped["max"].astype(int)
    grouped["dayOfWeek"] = pd.Categorical(grouped["dayOfWeek"], categories=order, ordered=True)
    grouped = grouped.sort_values("dayOfWeek")
    return grouped.to_dict(orient="records")


@app.get("/api/monthly-summary")
def get_monthly_summary():
    """Monthly totals and averages across all years."""
    df = load_data()
    grouped = df.groupby(["Year", "Month"])["TotalOrders"].sum().reset_index()
    grouped.columns = ["year", "month", "total"]
    month_names = {1:"Jan",2:"Feb",3:"Mar",4:"Apr",5:"May",6:"Jun",
                   7:"Jul",8:"Aug",9:"Sep",10:"Oct",11:"Nov",12:"Dec"}
    grouped["monthName"] = grouped["month"].map(month_names)
    return grouped.to_dict(orient="records")


@app.get("/api/top-items")
def get_top_items(n: int = 10, day_type: str = None):
    """Rank menu items by average daily sales."""
    df = load_data()
    if day_type in ("Weekday", "Weekend"):
        df = df[df["DayType"] == day_type]
    means = df[ITEM_COLS].mean().sort_values(ascending=False)
    result = [
        {"rank": i+1, "item": item, "avgDaily": round(val, 2)}
        for i, (item, val) in enumerate(means.head(n).items())
    ]
    return result


@app.get("/api/item-trends")
def get_item_trends(item: str = Query(..., description="Menu item name")):
    """Monthly average trend for a specific menu item."""
    df = load_data()
    if item not in ITEM_COLS:
        raise HTTPException(status_code=404, detail=f"Item '{item}' not found")
    grouped = df.groupby(["Year", "Month"])[item].mean().reset_index()
    grouped.columns = ["year", "month", "avgOrders"]
    grouped["avgOrders"] = grouped["avgOrders"].round(2)
    grouped["label"] = grouped["year"].astype(str) + "-" + grouped["month"].astype(str).str.zfill(2)
    return grouped.to_dict(orient="records")


@app.get("/api/heatmap")
def get_heatmap():
    """Day-of-week x Month heatmap of average orders."""
    df = load_data()
    order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    month_names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    pivot = df.groupby(["DayOfWeek", "Month"])["TotalOrders"].mean().reset_index()
    pivot.columns = ["dayOfWeek", "month", "avg"]
    pivot["avg"] = pivot["avg"].round(1)
    pivot["monthName"] = pivot["month"].apply(lambda m: month_names[m-1])
    return pivot.to_dict(orient="records")


@app.get("/api/forecast")
def get_forecast(days: int = Query(30, ge=7, le=90)):
    """
    Demand forecast for the next N days using polynomial regression.
    Returns predicted daily orders with confidence interval.
    """
    df = load_data()

    # Build features
    df_model = df[["DayNum", "DayType", "DayOfWeek", "Month", "TotalOrders"]].copy()
    df_model["IsWeekend"] = (df_model["DayType"] == "Weekend").astype(int)

    X = df_model[["DayNum", "IsWeekend", "Month"]].values
    y = df_model["TotalOrders"].values

    poly = PolynomialFeatures(degree=2, include_bias=False)
    X_poly = poly.fit_transform(X)
    model = LinearRegression()
    model.fit(X_poly, y)

    # Residual std for confidence interval
    y_pred_train = model.predict(X_poly)
    residuals = y - y_pred_train
    sigma = residuals.std()

    # Generate future dates
    last_date = df["Date"].max()
    last_day_num = int(df["DayNum"].max())
    forecast = []

    for i in range(1, days + 1):
        future_date = last_date + timedelta(days=i)
        day_num = last_day_num + i
        is_weekend = 1 if future_date.weekday() >= 5 else 0
        month = future_date.month
        X_fut = poly.transform([[day_num, is_weekend, month]])
        pred = float(model.predict(X_fut)[0])
        forecast.append({
            "date": str(future_date.date()),
            "dayOfWeek": future_date.strftime("%A"),
            "dayType": "Weekend" if is_weekend else "Weekday",
            "predicted": round(max(0, pred)),
            "lower": round(max(0, pred - 1.96 * sigma)),
            "upper": round(pred + 1.96 * sigma)
        })

    # Model accuracy on training data
    mae = round(mean_absolute_error(y, y_pred_train), 2)
    rmse = round(np.sqrt(mean_squared_error(y, y_pred_train)), 2)

    return {
        "forecast": forecast,
        "modelMetrics": {"mae": mae, "rmse": rmse},
        "forecastDays": days
    }


@app.get("/api/item-forecast")
def get_item_forecast(
    item: str = Query(..., description="Menu item name"),
    days: int = Query(30, ge=7, le=90)
):
    """Forecast for a specific menu item."""
    df = load_data()
    if item not in ITEM_COLS:
        raise HTTPException(status_code=404, detail=f"Item '{item}' not found")

    df_model = df[["DayNum", "DayType", "Month", item]].copy()
    df_model["IsWeekend"] = (df_model["DayType"] == "Weekend").astype(int)

    X = df_model[["DayNum", "IsWeekend", "Month"]].values
    y = df_model[item].values

    poly = PolynomialFeatures(degree=2, include_bias=False)
    X_poly = poly.fit_transform(X)
    model = LinearRegression()
    model.fit(X_poly, y)

    y_pred_train = model.predict(X_poly)
    sigma = (y - y_pred_train).std()

    last_date = df["Date"].max()
    last_day_num = int(df["DayNum"].max())
    forecast = []

    for i in range(1, days + 1):
        future_date = last_date + timedelta(days=i)
        day_num = last_day_num + i
        is_weekend = 1 if future_date.weekday() >= 5 else 0
        month = future_date.month
        X_fut = poly.transform([[day_num, is_weekend, month]])
        pred = float(model.predict(X_fut)[0])
        forecast.append({
            "date": str(future_date.date()),
            "dayOfWeek": future_date.strftime("%A"),
            "dayType": "Weekend" if is_weekend else "Weekday",
            "predicted": round(max(0, pred), 1),
            "lower": round(max(0, pred - 1.96 * sigma), 1),
            "upper": round(pred + 1.96 * sigma, 1)
        })

    mae = round(mean_absolute_error(y, y_pred_train), 2)
    return {"item": item, "forecast": forecast, "modelMetrics": {"mae": mae}}


@app.get("/api/items")
def list_items():
    """Return all available menu item names."""
    return ITEM_COLS

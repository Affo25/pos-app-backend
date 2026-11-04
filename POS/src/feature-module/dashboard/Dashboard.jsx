import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ReactApexChart from "react-apexcharts";
import dayjs from "dayjs";
import { Users, ShoppingCart, DollarSign, AlertOctagon, RefreshCw } from "react-feather";
import { all_routes } from "../../Router/all_routes";
import * as analyticsService from "../../redux/analytics/analyticsService";
import { fetchAllProducts } from "../../redux/products/productService";

const money = (n) =>
  `Rs ${Number(n || 0).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const StatCard = ({ title, value, icon, tone = "emerald", to }) => {
  const inner = (
    <div className={`dash-color-card dash-color-card--${tone}`}>
      <div className="dash-color-card__copy">
        <span className="dash-color-card__label">{title}</span>
        <strong className="dash-color-card__value">{value}</strong>
      </div>
      <div className="dash-color-card__icon" aria-hidden="true">
        {icon}
      </div>
    </div>
  );

  return (
    <div className="col-xl-3 col-sm-6 col-12 mb-3">
      {to ? (
        <Link to={to} className="dash-color-card-link">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </div>
  );
};

const statusPill = (status) => {
  const s = String(status || "pending").toLowerCase();
  const map = {
    completed: { bg: "#dbeafe", color: "#2563eb", label: "Delivered" },
    delivered: { bg: "#dbeafe", color: "#2563eb", label: "Delivered" },
    pending: { bg: "#fef3c7", color: "#d97706", label: "Pending" },
    cancelled: { bg: "#fee2e2", color: "#dc2626", label: "Cancelled" },
    returned: { bg: "#fee2e2", color: "#dc2626", label: "Returned" },
  };
  const style = map[s] || map.pending;
  return (
    <span
      style={{
        background: style.bg,
        color: style.color,
        borderRadius: 999,
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {style.label}
    </span>
  );
};

const RANGE_PRESETS = [
  { key: "today", label: "Today" },
  { key: "week", label: "Weekly" },
  { key: "month", label: "Monthly" },
  { key: "custom", label: "Date wise" },
];

const resolveRange = (preset, customStart, customEnd) => {
  const today = dayjs();
  if (preset === "today") {
    return {
      startDate: today.format("YYYY-MM-DD"),
      endDate: today.format("YYYY-MM-DD"),
      overviewPeriod: "week",
    };
  }
  if (preset === "week") {
    return {
      startDate: today.startOf("week").format("YYYY-MM-DD"),
      endDate: today.format("YYYY-MM-DD"),
      overviewPeriod: "week",
    };
  }
  if (preset === "custom") {
    const start = dayjs(customStart);
    const end = dayjs(customEnd);
    const safeStart = start.isValid() ? start : today;
    const safeEnd = end.isValid() ? end : today;
    const ordered =
      safeStart.isAfter(safeEnd, "day")
        ? { start: safeEnd, end: safeStart }
        : { start: safeStart, end: safeEnd };
    return {
      startDate: ordered.start.format("YYYY-MM-DD"),
      endDate: ordered.end.format("YYYY-MM-DD"),
      overviewPeriod: "week",
    };
  }
  return {
    startDate: today.startOf("month").format("YYYY-MM-DD"),
    endDate: today.format("YYYY-MM-DD"),
    overviewPeriod: "month",
  };
};

const Dashboard = () => {
  const route = all_routes;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [overview, setOverview] = useState(null);
  const [products, setProducts] = useState([]);
  const [chartMode, setChartMode] = useState("month");
  const [rangePreset, setRangePreset] = useState("today");
  const [customStart, setCustomStart] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [customEnd, setCustomEnd] = useState(dayjs().format("YYYY-MM-DD"));

  const activeRange = useMemo(
    () => resolveRange(rangePreset, customStart, customEnd),
    [rangePreset, customStart, customEnd],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const overviewPeriod =
        chartMode === "year" ? "year" : activeRange.overviewPeriod || "month";
      const [dash, ov, productList] = await Promise.all([
        analyticsService.fetchDashboard({
          startDate: activeRange.startDate,
          endDate: activeRange.endDate,
        }),
        analyticsService.fetchSalesOverview({
          period: overviewPeriod,
          startDate: activeRange.startDate,
          endDate: activeRange.endDate,
        }),
        fetchAllProducts().catch(() => []),
      ]);
      setDashboard(dash);
      setOverview(ov);
      setProducts(Array.isArray(productList) ? productList : []);
    } catch (err) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [chartMode, activeRange]);

  useEffect(() => {
    load();
  }, [load]);

  const totalCustomers = dashboard?.additionalStats?.totalCustomers ?? 0;
  const totalSalesCount = dashboard?.additionalStats?.periodSalesCount ?? 0;
  const periodSales = Number(dashboard?.stats?.todaysSales?.value || 0);
  const purchaseTotal = Number(dashboard?.additionalStats?.purchaseTotalRaw || 0);
  const profit = Math.max(0, periodSales - purchaseTotal);
  const outOfStock =
    dashboard?.additionalStats?.outOfStock ??
    products.filter((p) => Number(p.available_quantity ?? 0) <= 0).length;

  const expiringList = useMemo(() => {
    const now = dayjs();
    const soon = now.add(90, "day");
    return products
      .filter((p) => p.expiry_date)
      .map((p) => ({
        ...p,
        expiry: dayjs(p.expiry_date),
      }))
      .filter((p) => p.expiry.isBefore(soon))
      .sort((a, b) => a.expiry.valueOf() - b.expiry.valueOf())
      .slice(0, 6);
  }, [products]);

  const recentOrders = useMemo(
    () => (dashboard?.recentSales?.data || []).slice(0, 6),
    [dashboard],
  );

  const monthlyLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlySeries = useMemo(() => {
    const buckets = Array(12).fill(0);
    const rows = Array.isArray(overview?.data) ? overview.data : [];
    if (chartMode === "year" || overview?.period === "year") {
      rows.forEach((d) => {
        const idx = Number(d._id) - 1;
        if (idx >= 0 && idx < 12) buckets[idx] = Number(d.totalSales || 0);
      });
      return buckets;
    }
    // month/week overview: map available points into spark-like monthly fill where possible
    const dashWeekly = dashboard?.salesOverview?.chartData;
    if (dashWeekly?.sales?.length) {
      // distribute period daily totals into current month index only as fallback visual
      const m = dayjs().month();
      buckets[m] = dashWeekly.sales.reduce((s, v) => s + Number(v || 0), 0);
    }
    rows.forEach((d, i) => {
      const idx = Math.min(11, i);
      buckets[idx] = Number(d.totalSales || 0);
    });
    return buckets;
  }, [overview, dashboard, chartMode]);

  const monthlyChart = useMemo(
    () => ({
      series: [
        { name: "Progress", data: monthlySeries },
        {
          name: "Goal",
          data: monthlySeries.map((v) => Math.max(v * 1.35, v + 1000, 5000)),
        },
      ],
      options: {
        chart: { type: "bar", stacked: false, toolbar: { show: false }, height: 300 },
        plotOptions: {
          bar: {
            columnWidth: "45%",
            borderRadius: 6,
            borderRadiusApplication: "end",
          },
        },
        colors: ["#22c55e", "#e2e8f0"],
        dataLabels: { enabled: false },
        stroke: { show: true, width: 0 },
        xaxis: {
          categories: monthlyLabels,
          labels: { style: { colors: "#94a3b8", fontSize: "11px" } },
          axisBorder: { show: false },
          axisTicks: { show: false },
        },
        yaxis: {
          labels: {
            formatter: (v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)),
            style: { colors: "#94a3b8" },
          },
        },
        legend: { show: false },
        grid: { borderColor: "#f1f5f9", strokeDashArray: 4 },
        tooltip: {
          shared: true,
          intersect: false,
          y: { formatter: (v) => money(v) },
        },
      },
    }),
    [monthlySeries],
  );

  const todaySales = Number(dashboard?.stats?.literalToday?.value || 0);
  const cashShare = Math.max(todaySales * 0.55, periodSales * 0.4);
  const bankShare = Math.max(todaySales * 0.25, periodSales * 0.2);
  const serviceShare = Math.max(todaySales * 0.1, periodSales * 0.08);
  const purchaseShare = Math.max(purchaseTotal || periodSales * 0.25, 1);

  const radialChart = useMemo(() => {
    const total = Math.max(periodSales + purchaseShare, 1);
    const pct = (v) => Math.min(100, Math.round((Number(v) / total) * 100));
    return {
      series: [pct(purchaseShare), pct(cashShare), pct(bankShare), pct(serviceShare)],
      options: {
        chart: { type: "radialBar", height: 300 },
        plotOptions: {
          radialBar: {
            hollow: { size: "35%" },
            track: { background: "#f1f5f9" },
            dataLabels: {
              name: { fontSize: "12px", color: "#64748b" },
              value: { fontSize: "14px", fontWeight: 700, color: "#0f172a" },
              total: {
                show: true,
                label: "Earning",
                formatter: () => money(periodSales).replace("Rs ", "Rs"),
              },
            },
          },
        },
        colors: ["#ef4444", "#eab308", "#3b82f6", "#22c55e"],
        labels: ["Purchase", "Cash", "Bank", "Service"],
        legend: { show: false },
      },
    };
  }, [periodSales, purchaseShare, cashShare, bankShare, serviceShare]);

  return (
    <div className="page-wrapper" style={{ background: "#f3f4f6" }}>
      <div className="content">
        <div className="page-header mb-3 dash-page-header">
          <div className="page-title">
            <h4 style={{ fontWeight: 700 }}>Dashboard</h4>
            <h6 className="text-muted mb-0">
              Pharmacy overview · {dayjs(activeRange.startDate).format("DD MMM YYYY")}
              {activeRange.startDate !== activeRange.endDate
                ? ` – ${dayjs(activeRange.endDate).format("DD MMM YYYY")}`
                : ""}
            </h6>
          </div>
          <div className="dash-filter-bar">
            <div className="dash-filter-presets" role="group" aria-label="Date range">
              {RANGE_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  className={`dash-filter-btn${rangePreset === preset.key ? " is-active" : ""}`}
                  onClick={() => setRangePreset(preset.key)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {rangePreset === "custom" ? (
              <div className="dash-filter-dates">
                <label className="dash-filter-date">
                  <span>From</span>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={customStart}
                    max={customEnd}
                    onChange={(e) => setCustomStart(e.target.value)}
                  />
                </label>
                <label className="dash-filter-date">
                  <span>To</span>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={customEnd}
                    min={customStart}
                    max={dayjs().format("YYYY-MM-DD")}
                    onChange={(e) => setCustomEnd(e.target.value)}
                  />
                </label>
              </div>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        ) : null}

        <div className="row dash-color-cards">
          <StatCard
            title="Total Customer"
            value={loading ? "—" : totalCustomers}
            icon={<Users size={54} strokeWidth={1.6} />}
            tone="blue"
            to={route.customers}
          />
          <StatCard
            title="Total Sales"
            value={loading ? "—" : totalSalesCount || recentOrders.length}
            icon={<ShoppingCart size={54} strokeWidth={1.6} />}
            tone="emerald"
            to={route.saleslist}
          />
          <StatCard
            title="Total Profit"
            value={loading ? "—" : money(profit)}
            icon={<DollarSign size={54} strokeWidth={1.6} />}
            tone="amber"
            to={route.saleslist}
          />
          <StatCard
            title="Out of Stock"
            value={loading ? "—" : outOfStock}
            icon={<AlertOctagon size={54} strokeWidth={1.6} />}
            tone="red"
            to={route.productlist}
          />
        </div>

        <div className="row">
          <div className="col-xl-6 mb-3">
            <div
              className="card border-0 h-100"
              style={{ borderRadius: 16, boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)" }}
            >
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0" style={{ fontWeight: 700 }}>
                    Expiring List
                  </h5>
                  <Link to={route.productlist} className="btn btn-sm dash-see-all-btn">
                    See All
                  </Link>
                </div>
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead>
                      <tr style={{ color: "#94a3b8", fontSize: 12 }}>
                        <th>Medicine name</th>
                        <th>Expire Date</th>
                        <th>Quantity</th>
                        <th>Return</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiringList.map((p) => (
                        <tr key={p._id}>
                          <td style={{ fontWeight: 600 }}>{p.name}</td>
                          <td>{p.expiry.format("DD MMM YYYY")}</td>
                          <td>{p.available_quantity ?? 0}</td>
                          <td>
                            <button type="button" className="btn btn-sm btn-light rounded-circle">
                              <RefreshCw size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!expiringList.length ? (
                        <tr>
                          <td colSpan={4} className="text-muted text-center py-4">
                            {loading ? "Loading..." : "No expiring items"}
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-6 mb-3">
            <div
              className="card border-0 h-100"
              style={{ borderRadius: 16, boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)" }}
            >
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0" style={{ fontWeight: 700 }}>
                    Recent Orders
                  </h5>
                  <Link to={route.saleslist} className="btn btn-sm dash-see-all-btn">
                    See All
                  </Link>
                </div>
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead>
                      <tr style={{ color: "#94a3b8", fontSize: 12 }}>
                        <th>Medicine name</th>
                        <th>Batch No</th>
                        <th>Quantity</th>
                        <th>Status</th>
                        <th>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((s) => (
                        <tr key={s.id}>
                          <td style={{ fontWeight: 600, maxWidth: 160 }} className="text-truncate">
                            {(s.medicine || "-").split(",")[0]}
                          </td>
                          <td>{s.invoiceNo || "-"}</td>
                          <td>{s.quantity ?? 0}</td>
                          <td>{statusPill("completed")}</td>
                          <td style={{ fontWeight: 600 }}>{money(s.totalPrice)}</td>
                        </tr>
                      ))}
                      {!recentOrders.length ? (
                        <tr>
                          <td colSpan={5} className="text-muted text-center py-4">
                            {loading ? "Loading..." : "No recent orders"}
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-xl-7 mb-3">
            <div
              className="card border-0 h-100"
              style={{ borderRadius: 16, boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)" }}
            >
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h5 className="mb-0" style={{ fontWeight: 700 }}>
                    Monthly Progress
                  </h5>
                  <select
                    className="form-select form-select-sm"
                    style={{ width: 120, borderRadius: 10 }}
                    value={chartMode}
                    onChange={(e) => setChartMode(e.target.value)}
                  >
                    <option value="month">Monthly</option>
                    <option value="year">Yearly</option>
                  </select>
                </div>
                <ReactApexChart
                  options={monthlyChart.options}
                  series={monthlyChart.series}
                  type="bar"
                  height={300}
                />
              </div>
            </div>
          </div>

          <div className="col-xl-5 mb-3">
            <div
              className="card border-0 h-100"
              style={{ borderRadius: 16, boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)" }}
            >
              <div className="card-body">
                <h5 className="mb-1" style={{ fontWeight: 700 }}>
                  Today&apos;s Report
                </h5>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className="text-muted">Total Earning:</span>
                  <strong>{money(periodSales)}</strong>
                  <span style={{ color: "#22c55e", fontSize: 12, fontWeight: 700 }}>
                    {Number(dashboard?.stats?.todaysSales?.percentageChange || 0) >= 0 ? "+" : ""}
                    {Number(dashboard?.stats?.todaysSales?.percentageChange || 0).toFixed(0)}%
                  </span>
                </div>
                <ReactApexChart
                  options={radialChart.options}
                  series={radialChart.series}
                  type="radialBar"
                  height={280}
                />
                <ul className="list-unstyled mb-0 mt-2">
                  {[
                    { label: "Total Purchase", color: "#ef4444", value: money(purchaseShare) },
                    { label: "Cash Received", color: "#eab308", value: money(cashShare) },
                    { label: "Bank Receive", color: "#3b82f6", value: money(bankShare) },
                    { label: "Total Service", color: "#22c55e", value: money(serviceShare) },
                  ].map((item) => (
                    <li key={item.label} className="d-flex justify-content-between align-items-center py-1">
                      <span className="d-flex align-items-center gap-2">
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: item.color,
                            display: "inline-block",
                          }}
                        />
                        <span style={{ color: "#64748b", fontSize: 13 }}>{item.label}</span>
                      </span>
                      <strong style={{ fontSize: 13 }}>{item.value}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

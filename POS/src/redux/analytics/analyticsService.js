import { authFetch, parseResponse } from "../utils/apiHelpers";

const qs = (params = {}) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== "") sp.set(k, v);
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
};

export const fetchDashboard = async ({ startDate, endDate } = {}) => {
  const response = await authFetch(`/analytics/dashboard${qs({ startDate, endDate })}`);
  return parseResponse(response, "Failed to load dashboard");
};

export const fetchSalesOverview = async ({ period = "week", startDate, endDate } = {}) => {
  const response = await authFetch(
    `/analytics/sales-overview${qs({ period, startDate, endDate })}`,
  );
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || "Failed to load sales overview");
  }
  // Keep full payload (period/data/summary) — do not unwrap .data only
  return payload;
};

export const fetchTopProducts = async ({ limit = 8, startDate, endDate } = {}) => {
  const response = await authFetch(
    `/analytics/top-products${qs({ limit, startDate, endDate })}`,
  );
  const payload = await parseResponse(response, "Failed to load top products");
  return Array.isArray(payload?.products) ? payload.products : Array.isArray(payload) ? payload : [];
};

export const fetchRecentActivities = async ({ limit = 10 } = {}) => {
  const response = await authFetch(`/analytics/recent-activities${qs({ limit })}`);
  const payload = await parseResponse(response, "Failed to load activities");
  return Array.isArray(payload?.activities) ? payload.activities : Array.isArray(payload) ? payload : [];
};

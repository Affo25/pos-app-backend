import { authFetch, parseResponse } from "../utils/apiHelpers";

const API_URL = "/returns";

export const fetchAllReturns = async () => {
  const response = await authFetch(`${API_URL}?limit=500`);
  return parseResponse(response, "Failed to fetch returns");
};

export const createReturn = async (data) => {
  const response = await authFetch(API_URL, {
    method: "POST",
    body: JSON.stringify(data),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = Array.isArray(payload?.errors)
      ? payload.errors.join(", ")
      : payload?.message || payload?.error;
    throw new Error(detail || "Failed to create return");
  }
  return payload?.data ?? payload;
};

export const updateReturn = async (id, data) => {
  const response = await authFetch(`${API_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return parseResponse(response, "Failed to update return");
};

export const deleteReturn = async (id) => {
  const response = await authFetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });
  return parseResponse(response, "Failed to delete return");
};

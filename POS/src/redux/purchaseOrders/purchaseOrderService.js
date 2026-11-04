import { authFetch, parseResponse } from "../utils/apiHelpers";

const API_URL = "/purchaseOrders";

export const fetchAllPurchaseOrders = async () => {
  const response = await authFetch(API_URL);
  return parseResponse(response, "Failed to fetch purchase orders");
};

export const fetchNextOrderNumber = async (orderDate) => {
  const qs = orderDate ? `?order_date=${encodeURIComponent(orderDate)}` : "";
  const response = await authFetch(`${API_URL}/next-order-number${qs}`);
  return parseResponse(response, "Failed to fetch next order number");
};

export const createPurchaseOrder = async (data) => {
  const response = await authFetch(API_URL, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return parseResponse(response, "Failed to create purchase order");
};

export const updatePurchaseOrder = async (id, data) => {
  const response = await authFetch(`${API_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return parseResponse(response, "Failed to update purchase order");
};

export const deletePurchaseOrder = async (id) => {
  const response = await authFetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });
  return parseResponse(response, "Failed to delete purchase order");
};

export const addPurchaseOrderReturn = async (id, data) => {
  const response = await authFetch(`${API_URL}/${id}/returns`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return parseResponse(response, "Failed to record purchase return");
};

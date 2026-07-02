import { authFetch, parseResponse } from "../utils/apiHelpers";

const API_URL = "/sales";

export const fetchAllSales = async () => {
  const response = await authFetch(API_URL);
  return parseResponse(response, "Failed to fetch sales");
};

export const createSale = async (data) => {
  const response = await authFetch(API_URL, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return parseResponse(response, "Failed to create sale");
};

export const updateSale = async (id, data) => {
  const response = await authFetch(`${API_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return parseResponse(response, "Failed to update sale");
};

export const deleteSale = async (id) => {
  const response = await authFetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });
  return parseResponse(response, "Failed to delete sale");
};

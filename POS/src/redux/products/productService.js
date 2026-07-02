import { authFetch, parseResponse } from "../utils/apiHelpers";

const API_URL = "/products";

export const fetchAllProducts = async () => {
  const response = await authFetch(API_URL);
  return parseResponse(response, "Failed to fetch products");
};

export const createProduct = async (data) => {
  const response = await authFetch(API_URL, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return parseResponse(response, "Failed to create product");
};

export const updateProduct = async (id, data) => {
  const response = await authFetch(`${API_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return parseResponse(response, "Failed to update product");
};

export const deleteProduct = async (id) => {
  const response = await authFetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });
  return parseResponse(response, "Failed to delete product");
};

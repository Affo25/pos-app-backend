import Cookies from "js-cookie";
import { authFetch, parseResponse, apiUrl } from "../utils/apiHelpers";

const API_URL = "/products";

export const fetchAllProducts = async () => {
  const response = await authFetch(API_URL);
  return parseResponse(response, "Failed to fetch products");
};

export const uploadProductImage = async (file) => {
  const token = Cookies.get("token");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "products");

  const response = await fetch(apiUrl("/uploads"), {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || payload?.detail || "Image upload failed");
  }
  return payload.url || payload?.data?.url;
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

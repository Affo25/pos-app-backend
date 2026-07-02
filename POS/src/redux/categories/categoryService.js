import { authFetch, parseResponse } from "../utils/apiHelpers";

const API_URL = "/categorys";

export const fetchAllCategories = async () => {
  const response = await authFetch(API_URL);
  return parseResponse(response, "Failed to fetch categories");
};

export const createCategory = async (data) => {
  const response = await authFetch(API_URL, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return parseResponse(response, "Failed to create category");
};

export const updateCategory = async (id, data) => {
  const response = await authFetch(`${API_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return parseResponse(response, "Failed to update category");
};

export const deleteCategory = async (id) => {
  const response = await authFetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });
  return parseResponse(response, "Failed to delete category");
};

import { authFetch, parseResponse } from "../utils/apiHelpers";

const API_URL = "/subCategorys";

export const fetchAllSubCategories = async () => {
  const response = await authFetch(API_URL);
  return parseResponse(response, "Failed to fetch sub categories");
};

export const createSubCategory = async (data) => {
  const response = await authFetch(API_URL, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return parseResponse(response, "Failed to create sub category");
};

export const updateSubCategory = async (id, data) => {
  const response = await authFetch(`${API_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return parseResponse(response, "Failed to update sub category");
};

export const deleteSubCategory = async (id) => {
  const response = await authFetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });
  return parseResponse(response, "Failed to delete sub category");
};

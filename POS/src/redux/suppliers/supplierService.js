import { authFetch, parseResponse } from "../utils/apiHelpers";

const API_URL = "/suppliers";

export const fetchAllSuppliers = async () => {
  const response = await authFetch(API_URL);
  return parseResponse(response, "Failed to fetch suppliers");
};

export const createSupplier = async (data) => {
  const response = await authFetch(API_URL, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return parseResponse(response, "Failed to create supplier");
};

export const updateSupplier = async (id, data) => {
  const response = await authFetch(`${API_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return parseResponse(response, "Failed to update supplier");
};

export const deleteSupplier = async (id) => {
  const response = await authFetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });
  return parseResponse(response, "Failed to delete supplier");
};

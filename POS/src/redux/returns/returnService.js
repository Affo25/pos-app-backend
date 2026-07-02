import { authFetch, parseResponse } from "../utils/apiHelpers";

const API_URL = "/returns";

export const fetchAllReturns = async () => {
  const response = await authFetch(API_URL);
  return parseResponse(response, "Failed to fetch returns");
};

export const createReturn = async (data) => {
  const response = await authFetch(API_URL, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return parseResponse(response, "Failed to create return");
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

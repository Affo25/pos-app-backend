import { authFetch, parseResponse } from "../utils/apiHelpers";

const API_URL = "/customers";

export const fetchAllCustomers = async () => {
  const response = await authFetch(API_URL);
  return parseResponse(response, "Failed to fetch customers");
};

export const createCustomer = async (data) => {
  const response = await authFetch(API_URL, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return parseResponse(response, "Failed to create customer");
};

export const updateCustomer = async (id, data) => {
  const response = await authFetch(`${API_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return parseResponse(response, "Failed to update customer");
};

export const deleteCustomer = async (id) => {
  const response = await authFetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });
  return parseResponse(response, "Failed to delete customer");
};

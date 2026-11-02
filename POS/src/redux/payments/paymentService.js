import { authFetch, parseResponse } from "../utils/apiHelpers";

const API_URL = "/payments";

export const fetchAllPayments = async () => {
  const response = await authFetch(API_URL);
  return parseResponse(response, "Failed to fetch payments");
};

export const deletePayment = async (id) => {
  const response = await authFetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });
  return parseResponse(response, "Failed to cancel payment");
};

import { authFetch, parseResponse } from "../utils/apiHelpers";

const API_URL = "/users";

export const fetchAllUsers = async () => {
  const response = await authFetch(API_URL);
  return parseResponse(response, "Failed to fetch users");
};

export const createUser = async (userData) => {
  const response = await authFetch(API_URL, {
    method: "POST",
    body: JSON.stringify(userData),
  });
  return parseResponse(response, "Failed to create user");
};

export const updateUser = async (id, userData) => {
  const response = await authFetch(`${API_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(userData),
  });
  return parseResponse(response, "Failed to update user");
};

export const deleteUser = async (id) => {
  const response = await authFetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });
  return parseResponse(response, "Failed to delete user");
};

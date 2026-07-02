import { getApiBase } from "../../config/runtimeConfig";

const API_URL = `${getApiBase()}/users`;

const parseResponse = async (response, fallbackMessage) => {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.message || fallbackMessage);
  }
  return payload;
};

export const login = async ({ email, password }) => {
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return parseResponse(response, "Login failed");
};

export const logout = async () => {
  const response = await fetch(`${API_URL}/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return parseResponse(response, "Logout failed");
};

import Cookies from "js-cookie";
import { getApiBase } from "../../config/runtimeConfig";

export const jsonHeaders = () => {
  const token = Cookies.get("token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

export const parseResponse = async (response, fallbackMessage) => {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || fallbackMessage);
  }
  return payload?.data ?? payload;
};

export const apiUrl = (path) => {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBase()}${normalized}`;
};

export const authFetch = (path, options = {}) =>
  fetch(apiUrl(path), {
    ...options,
    headers: { ...jsonHeaders(), ...options.headers },
  });

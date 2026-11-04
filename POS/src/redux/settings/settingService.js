import { authFetch, authFetchForm, parseResponse } from "../utils/apiHelpers";

const API_URL = "/settings";

export const fetchSettings = async () => {
  const response = await authFetch(API_URL);
  return parseResponse(response, "Failed to fetch settings");
};

export const updateSettings = async (data) => {
  const response = await authFetch(API_URL, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return parseResponse(response, "Failed to update settings");
};

export const uploadInvoiceLogo = async (file) => {
  const form = new FormData();
  form.append("file", file);
  const response = await authFetchForm(`${API_URL}/invoice-logo`, {
    method: "POST",
    body: form,
  });
  return parseResponse(response, "Failed to upload invoice logo");
};

export const uploadSidebarLogo = async (file) => {
  const form = new FormData();
  form.append("file", file);
  const response = await authFetchForm(`${API_URL}/sidebar-logo`, {
    method: "POST",
    body: form,
  });
  return parseResponse(response, "Failed to upload sidebar logo");
};

export const uploadAppLogo = async (file) => {
  const form = new FormData();
  form.append("file", file);
  const response = await authFetchForm(`${API_URL}/app-logo`, {
    method: "POST",
    body: form,
  });
  return parseResponse(response, "Failed to upload app logo");
};

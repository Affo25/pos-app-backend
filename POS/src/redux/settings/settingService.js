import { authFetch, parseResponse } from "../utils/apiHelpers";

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

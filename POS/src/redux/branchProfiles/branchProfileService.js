import { authFetch, parseResponse } from "../utils/apiHelpers";

const API_URL = "/branchProfiles";

export const fetchAllBranchProfiles = async () => {
  const response = await authFetch(API_URL);
  return parseResponse(response, "Failed to fetch branch profiles");
};

export const createBranchProfile = async (data) => {
  const response = await authFetch(API_URL, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return parseResponse(response, "Failed to create branch profile");
};

export const updateBranchProfile = async (id, data) => {
  const response = await authFetch(`${API_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return parseResponse(response, "Failed to update branch profile");
};

export const deleteBranchProfile = async (id) => {
  const response = await authFetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });
  return parseResponse(response, "Failed to delete branch profile");
};

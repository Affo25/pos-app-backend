import { authFetch, parseResponse } from "../utils/apiHelpers";

const API_URL = "/roles";

export const fetchPermissionCatalog = async () => {
  const response = await authFetch(`${API_URL}/catalog`);
  return parseResponse(response, "Failed to fetch permission catalog");
};

export const fetchAllRoles = async () => {
  const response = await authFetch(API_URL);
  return parseResponse(response, "Failed to fetch roles");
};

export const fetchRoleById = async (id) => {
  const response = await authFetch(`${API_URL}/${id}`);
  return parseResponse(response, "Failed to fetch role");
};

export const createRole = async (data) => {
  const response = await authFetch(API_URL, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return parseResponse(response, "Failed to create role");
};

export const updateRole = async (id, data) => {
  const response = await authFetch(`${API_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return parseResponse(response, "Failed to update role");
};

export const assignRolePermissions = async (id, selections) => {
  const response = await authFetch(`${API_URL}/${id}/assign`, {
    method: "POST",
    body: JSON.stringify({ selections }),
  });
  return parseResponse(response, "Failed to assign permissions");
};

export const removeRolePermissions = async (id, selections) => {
  const response = await authFetch(`${API_URL}/${id}/remove`, {
    method: "POST",
    body: JSON.stringify({ selections }),
  });
  return parseResponse(response, "Failed to remove permissions");
};

export const deleteRole = async (id) => {
  const response = await authFetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });
  return parseResponse(response, "Failed to delete role");
};

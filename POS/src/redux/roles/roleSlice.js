import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  roles: [],
  catalog: [],
  selectedRole: null,
  assigned: [],
  available: [],
  loading: false,
  error: null,
};

const roleSlice = createSlice({
  name: "roles",
  initialState,
  reducers: {
    operationStart(state) {
      state.loading = true;
      state.error = null;
    },
    operationSuccess(state) {
      state.loading = false;
    },
    operationFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    fetchRolesSuccess(state, action) {
      state.roles = action.payload;
      state.loading = false;
    },
    fetchCatalogSuccess(state, action) {
      state.catalog = action.payload;
    },
    selectRoleSuccess(state, action) {
      state.selectedRole = action.payload;
      state.assigned = action.payload.assigned || [];
      state.available = action.payload.available || [];
      state.loading = false;
    },
    clearSelectedRole(state) {
      state.selectedRole = null;
      state.assigned = [];
      state.available = [];
    },
  },
});

export const {
  operationStart,
  operationSuccess,
  operationFailure,
  fetchRolesSuccess,
  fetchCatalogSuccess,
  selectRoleSuccess,
  clearSelectedRole,
} = roleSlice.actions;

export const fetchAllRolesAction = () => ({ type: "roles/fetchAll" });
export const fetchPermissionCatalogAction = () => ({ type: "roles/fetchCatalog" });
export const selectRoleAction = (id) => ({ type: "roles/select", payload: id });
export const createRoleAction = (data) => ({ type: "roles/create", payload: data });
export const assignPermissionsAction = (id, selections) => ({
  type: "roles/assign",
  payload: { id, selections },
});
export const removePermissionsAction = (id, selections) => ({
  type: "roles/remove",
  payload: { id, selections },
});
export const deleteRoleAction = (id) => ({ type: "roles/delete", payload: id });

export default roleSlice.reducer;

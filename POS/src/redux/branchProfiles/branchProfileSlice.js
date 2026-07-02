import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  branchProfiles: [],
  loading: false,
  error: null,
};

const branchProfileSlice = createSlice({
  name: "branchProfiles",
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
    fetchBranchProfilesSuccess(state, action) {
      state.branchProfiles = action.payload;
      state.loading = false;
    },
  },
});

export const {
  operationStart,
  operationSuccess,
  operationFailure,
  fetchBranchProfilesSuccess,
} = branchProfileSlice.actions;

export const fetchAllBranchProfilesAction = () => ({
  type: "branchProfiles/fetchAll",
});
export const createBranchProfileAction = (data) => ({
  type: "branchProfiles/create",
  payload: data,
});
export const updateBranchProfileAction = (id, data) => ({
  type: "branchProfiles/update",
  payload: { id, data },
});
export const deleteBranchProfileAction = (id) => ({
  type: "branchProfiles/delete",
  payload: id,
});

export default branchProfileSlice.reducer;

import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  users: [],
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: "users",
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
    fetchUsersSuccess(state, action) {
      state.users = action.payload;
      state.loading = false;
    },
  },
});

export const {
  operationStart,
  operationSuccess,
  operationFailure,
  fetchUsersSuccess,
} = userSlice.actions;

export const fetchAllUsersAction = () => ({ type: "users/fetchAll" });
export const createUserAction = (userData) => ({
  type: "users/create",
  payload: userData,
});
export const updateUserAction = (id, data) => ({
  type: "users/update",
  payload: { id, data },
});
export const deleteUserAction = (id) => ({ type: "users/delete", payload: id });

export default userSlice.reducer;

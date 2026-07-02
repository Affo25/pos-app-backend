import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  customers: [],
  loading: false,
  error: null,
};

const customerSlice = createSlice({
  name: "customers",
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
    fetchCustomersSuccess(state, action) {
      state.customers = action.payload;
      state.loading = false;
    },
  },
});

export const {
  operationStart,
  operationSuccess,
  operationFailure,
  fetchCustomersSuccess,
} = customerSlice.actions;

export const fetchAllCustomersAction = () => ({ type: "customers/fetchAll" });
export const createCustomerAction = (data) => ({
  type: "customers/create",
  payload: data,
});
export const updateCustomerAction = (id, data) => ({
  type: "customers/update",
  payload: { id, data },
});
export const deleteCustomerAction = (id) => ({
  type: "customers/delete",
  payload: id,
});

export default customerSlice.reducer;

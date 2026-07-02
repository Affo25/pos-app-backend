import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  suppliers: [],
  loading: false,
  error: null,
};

const supplierSlice = createSlice({
  name: "suppliers",
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
    fetchSuppliersSuccess(state, action) {
      state.suppliers = action.payload;
      state.loading = false;
    },
  },
});

export const {
  operationStart,
  operationSuccess,
  operationFailure,
  fetchSuppliersSuccess,
} = supplierSlice.actions;

export const fetchAllSuppliersAction = () => ({ type: "suppliers/fetchAll" });
export const createSupplierAction = (data) => ({
  type: "suppliers/create",
  payload: data,
});
export const updateSupplierAction = (id, data) => ({
  type: "suppliers/update",
  payload: { id, data },
});
export const deleteSupplierAction = (id) => ({
  type: "suppliers/delete",
  payload: id,
});

export default supplierSlice.reducer;

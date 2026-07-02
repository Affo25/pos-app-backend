import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  sales: [],
  loading: false,
  error: null,
};

const saleSlice = createSlice({
  name: "sales",
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
    fetchSalesSuccess(state, action) {
      state.sales = action.payload;
      state.loading = false;
    },
  },
});

export const {
  operationStart,
  operationSuccess,
  operationFailure,
  fetchSalesSuccess,
} = saleSlice.actions;

export const fetchAllSalesAction = () => ({ type: "sales/fetchAll" });
export const createSaleAction = (data) => ({
  type: "sales/create",
  payload: data,
});
export const updateSaleAction = (id, data) => ({
  type: "sales/update",
  payload: { id, data },
});
export const deleteSaleAction = (id) => ({
  type: "sales/delete",
  payload: id,
});

export default saleSlice.reducer;

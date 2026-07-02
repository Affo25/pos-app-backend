import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  purchaseOrders: [],
  loading: false,
  error: null,
};

const purchaseOrderSlice = createSlice({
  name: "purchaseOrders",
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
    fetchPurchaseOrdersSuccess(state, action) {
      state.purchaseOrders = action.payload;
      state.loading = false;
    },
  },
});

export const {
  operationStart,
  operationSuccess,
  operationFailure,
  fetchPurchaseOrdersSuccess,
} = purchaseOrderSlice.actions;

export const fetchAllPurchaseOrdersAction = () => ({
  type: "purchaseOrders/fetchAll",
});
export const createPurchaseOrderAction = (data) => ({
  type: "purchaseOrders/create",
  payload: data,
});
export const updatePurchaseOrderAction = (id, data) => ({
  type: "purchaseOrders/update",
  payload: { id, data },
});
export const deletePurchaseOrderAction = (id) => ({
  type: "purchaseOrders/delete",
  payload: id,
});

export default purchaseOrderSlice.reducer;

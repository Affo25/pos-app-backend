import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  payments: [],
  loading: false,
  error: null,
};

const paymentSlice = createSlice({
  name: "payments",
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
    fetchPaymentsSuccess(state, action) {
      state.payments = action.payload;
      state.loading = false;
    },
  },
});

export const {
  operationStart,
  operationSuccess,
  operationFailure,
  fetchPaymentsSuccess,
} = paymentSlice.actions;

export const fetchAllPaymentsAction = () => ({ type: "payments/fetchAll" });
export const deletePaymentAction = (id) => ({
  type: "payments/delete",
  payload: id,
});

export default paymentSlice.reducer;

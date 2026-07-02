import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  returns: [],
  loading: false,
  error: null,
};

const returnSlice = createSlice({
  name: "returns",
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
    fetchReturnsSuccess(state, action) {
      state.returns = action.payload;
      state.loading = false;
    },
  },
});

export const {
  operationStart,
  operationSuccess,
  operationFailure,
  fetchReturnsSuccess,
} = returnSlice.actions;

export const fetchAllReturnsAction = () => ({ type: "returns/fetchAll" });
export const createReturnAction = (data) => ({
  type: "returns/create",
  payload: data,
});
export const updateReturnAction = (id, data) => ({
  type: "returns/update",
  payload: { id, data },
});
export const deleteReturnAction = (id) => ({
  type: "returns/delete",
  payload: id,
});

export default returnSlice.reducer;

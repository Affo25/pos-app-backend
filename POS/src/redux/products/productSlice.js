import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  products: [],
  loading: false,
  error: null,
};

const productSlice = createSlice({
  name: "products",
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
    fetchProductsSuccess(state, action) {
      state.products = action.payload;
      state.loading = false;
    },
  },
});

export const {
  operationStart,
  operationSuccess,
  operationFailure,
  fetchProductsSuccess,
} = productSlice.actions;

export const fetchAllProductsAction = () => ({ type: "products/fetchAll" });
export const createProductAction = (data) => ({
  type: "products/create",
  payload: data,
});
export const updateProductAction = (id, data) => ({
  type: "products/update",
  payload: { id, data },
});
export const deleteProductAction = (id) => ({
  type: "products/delete",
  payload: id,
});

export default productSlice.reducer;

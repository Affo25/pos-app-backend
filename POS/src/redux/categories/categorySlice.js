import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  categories: [],
  loading: false,
  error: null,
};

const categorySlice = createSlice({
  name: "categories",
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
    fetchCategoriesSuccess(state, action) {
      state.categories = action.payload;
      state.loading = false;
    },
  },
});

export const {
  operationStart,
  operationSuccess,
  operationFailure,
  fetchCategoriesSuccess,
} = categorySlice.actions;

export const fetchAllCategoriesAction = () => ({ type: "categories/fetchAll" });
export const createCategoryAction = (data) => ({
  type: "categories/create",
  payload: data,
});
export const updateCategoryAction = (id, data) => ({
  type: "categories/update",
  payload: { id, data },
});
export const deleteCategoryAction = (id) => ({
  type: "categories/delete",
  payload: id,
});

export default categorySlice.reducer;

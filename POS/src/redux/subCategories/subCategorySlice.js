import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  subCategories: [],
  loading: false,
  error: null,
};

const subCategorySlice = createSlice({
  name: "subCategories",
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
    fetchSubCategoriesSuccess(state, action) {
      state.subCategories = action.payload;
      state.loading = false;
    },
  },
});

export const {
  operationStart,
  operationSuccess,
  operationFailure,
  fetchSubCategoriesSuccess,
} = subCategorySlice.actions;

export const fetchAllSubCategoriesAction = () => ({
  type: "subCategories/fetchAll",
});
export const createSubCategoryAction = (data) => ({
  type: "subCategories/create",
  payload: data,
});
export const updateSubCategoryAction = (id, data) => ({
  type: "subCategories/update",
  payload: { id, data },
});
export const deleteSubCategoryAction = (id) => ({
  type: "subCategories/delete",
  payload: id,
});

export default subCategorySlice.reducer;

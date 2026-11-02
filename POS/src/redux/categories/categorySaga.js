import { all, takeLatest, put, call } from "redux-saga/effects";
import { toast } from "react-toastify";
import * as categoryService from "./categoryService";
import * as actions from "./categorySlice";
import { handleApiCall } from "../utils/sagaHelpers";

function* fetchAllCategories() {
  const { ok, result } = yield call(
    handleApiCall,
    actions,
    categoryService.fetchAllCategories,
  );
  if (!ok) return;
  yield put(actions.fetchCategoriesSuccess(result));
}

function* createCategory({ payload }) {
  const { ok } = yield call(
    handleApiCall,
    actions,
    categoryService.createCategory,
    payload,
  );
  if (!ok) return;
  toast.success("Category created successfully");
  yield call(fetchAllCategories);
}

function* updateCategory({ payload: { id, data } }) {
  const { ok } = yield call(
    handleApiCall,
    actions,
    categoryService.updateCategory,
    id,
    data,
  );
  if (!ok) return;
  yield call(fetchAllCategories);
  toast.success("Category updated successfully");
}

function* deleteCategory({ payload: id }) {
  const { ok } = yield call(
    handleApiCall,
    actions,
    categoryService.deleteCategory,
    id,
  );
  if (!ok) return;
  yield call(fetchAllCategories);
  toast.success("Category deleted successfully");
}

export default function* categorySaga() {
  yield all([
    takeLatest("categories/fetchAll", fetchAllCategories),
    takeLatest("categories/create", createCategory),
    takeLatest("categories/update", updateCategory),
    takeLatest("categories/delete", deleteCategory),
  ]);
}

import { all, takeLatest, put, call } from "redux-saga/effects";
import { toast } from "react-toastify";
import * as categoryService from "./categoryService";
import * as actions from "./categorySlice";

function* handleApiCall(apiFn, ...args) {
  try {
    yield put(actions.operationStart());
    const result = yield call(apiFn, ...args);
    yield put(actions.operationSuccess());
    return result;
  } catch (error) {
    yield put(actions.operationFailure(error.message));
    toast.error(error.message);
    throw error;
  }
}

function* fetchAllCategories() {
  const categories = yield handleApiCall(categoryService.fetchAllCategories);
  yield put(actions.fetchCategoriesSuccess(categories));
}

function* createCategory({ payload }) {
  yield handleApiCall(categoryService.createCategory, payload);
  toast.success("Category created successfully");
  yield call(fetchAllCategories);
}

function* updateCategory({ payload: { id, data } }) {
  yield handleApiCall(categoryService.updateCategory, id, data);
  yield call(fetchAllCategories);
  toast.success("Category updated successfully");
}

function* deleteCategory({ payload: id }) {
  yield handleApiCall(categoryService.deleteCategory, id);
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

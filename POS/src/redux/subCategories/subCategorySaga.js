import { all, takeLatest, put, call } from "redux-saga/effects";
import { toast } from "react-toastify";
import * as subCategoryService from "./subCategoryService";
import * as actions from "./subCategorySlice";

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

function* fetchAllSubCategories() {
  const subCategories = yield handleApiCall(
    subCategoryService.fetchAllSubCategories,
  );
  yield put(actions.fetchSubCategoriesSuccess(subCategories));
}

function* createSubCategory({ payload }) {
  yield handleApiCall(subCategoryService.createSubCategory, payload);
  toast.success("Sub category created successfully");
  yield call(fetchAllSubCategories);
}

function* updateSubCategory({ payload: { id, data } }) {
  yield handleApiCall(subCategoryService.updateSubCategory, id, data);
  yield call(fetchAllSubCategories);
  toast.success("Sub category updated successfully");
}

function* deleteSubCategory({ payload: id }) {
  yield handleApiCall(subCategoryService.deleteSubCategory, id);
  yield call(fetchAllSubCategories);
  toast.success("Sub category deleted successfully");
}

export default function* subCategorySaga() {
  yield all([
    takeLatest("subCategories/fetchAll", fetchAllSubCategories),
    takeLatest("subCategories/create", createSubCategory),
    takeLatest("subCategories/update", updateSubCategory),
    takeLatest("subCategories/delete", deleteSubCategory),
  ]);
}

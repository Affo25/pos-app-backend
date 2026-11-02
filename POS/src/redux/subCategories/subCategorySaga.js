import { all, takeLatest, put, call } from "redux-saga/effects";
import { toast } from "react-toastify";
import * as subCategoryService from "./subCategoryService";
import * as actions from "./subCategorySlice";
import { handleApiCall } from "../utils/sagaHelpers";

function* fetchAllSubCategories() {
  const { ok, result } = yield call(
    handleApiCall,
    actions,
    subCategoryService.fetchAllSubCategories,
  );
  if (!ok) return;
  yield put(actions.fetchSubCategoriesSuccess(result));
}

function* createSubCategory({ payload }) {
  const { ok } = yield call(
    handleApiCall,
    actions,
    subCategoryService.createSubCategory,
    payload,
  );
  if (!ok) return;
  toast.success("Sub category created successfully");
  yield call(fetchAllSubCategories);
}

function* updateSubCategory({ payload: { id, data } }) {
  const { ok } = yield call(
    handleApiCall,
    actions,
    subCategoryService.updateSubCategory,
    id,
    data,
  );
  if (!ok) return;
  yield call(fetchAllSubCategories);
  toast.success("Sub category updated successfully");
}

function* deleteSubCategory({ payload: id }) {
  const { ok } = yield call(
    handleApiCall,
    actions,
    subCategoryService.deleteSubCategory,
    id,
  );
  if (!ok) return;
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

import { all, takeLatest, put, call } from "redux-saga/effects";
import { toast } from "react-toastify";
import * as productService from "./productService";
import * as actions from "./productSlice";

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

function* fetchAllProducts() {
  const products = yield handleApiCall(productService.fetchAllProducts);
  yield put(actions.fetchProductsSuccess(products));
}

function* createProduct({ payload }) {
  yield handleApiCall(productService.createProduct, payload);
  toast.success("Product created successfully");
  yield call(fetchAllProducts);
}

function* updateProduct({ payload: { id, data } }) {
  yield handleApiCall(productService.updateProduct, id, data);
  yield call(fetchAllProducts);
  toast.success("Product updated successfully");
}

function* deleteProduct({ payload: id }) {
  yield handleApiCall(productService.deleteProduct, id);
  yield call(fetchAllProducts);
  toast.success("Product deleted successfully");
}

export default function* productSaga() {
  yield all([
    takeLatest("products/fetchAll", fetchAllProducts),
    takeLatest("products/create", createProduct),
    takeLatest("products/update", updateProduct),
    takeLatest("products/delete", deleteProduct),
  ]);
}

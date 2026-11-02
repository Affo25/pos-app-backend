import { all, takeLatest, put, call } from "redux-saga/effects";
import { toast } from "react-toastify";
import * as productService from "./productService";
import * as actions from "./productSlice";
import { handleApiCall } from "../utils/sagaHelpers";

function* fetchAllProducts() {
  const { ok, result } = yield call(
    handleApiCall,
    actions,
    productService.fetchAllProducts,
  );
  if (!ok) return;
  const list = Array.isArray(result)
    ? result
    : Array.isArray(result?.products)
      ? result.products
      : Array.isArray(result?.data)
        ? result.data
        : [];
  yield put(actions.fetchProductsSuccess(list));
}

function* createProduct({ payload }) {
  const { ok } = yield call(
    handleApiCall,
    actions,
    productService.createProduct,
    payload,
  );
  if (!ok) return;
  toast.success("Product created successfully");
  yield call(fetchAllProducts);
}

function* updateProduct({ payload: { id, data } }) {
  const { ok } = yield call(
    handleApiCall,
    actions,
    productService.updateProduct,
    id,
    data,
  );
  if (!ok) return;
  yield call(fetchAllProducts);
  toast.success("Product updated successfully");
}

function* deleteProduct({ payload: id }) {
  const { ok } = yield call(
    handleApiCall,
    actions,
    productService.deleteProduct,
    id,
  );
  if (!ok) return;
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

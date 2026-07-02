import { all, takeLatest, put, call } from "redux-saga/effects";
import { toast } from "react-toastify";
import * as supplierService from "./supplierService";
import * as actions from "./supplierSlice";

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

function* fetchAllSuppliers() {
  const suppliers = yield handleApiCall(supplierService.fetchAllSuppliers);
  yield put(actions.fetchSuppliersSuccess(suppliers));
}

function* createSupplier({ payload }) {
  yield handleApiCall(supplierService.createSupplier, payload);
  toast.success("Supplier created successfully");
  yield call(fetchAllSuppliers);
}

function* updateSupplier({ payload: { id, data } }) {
  yield handleApiCall(supplierService.updateSupplier, id, data);
  yield call(fetchAllSuppliers);
  toast.success("Supplier updated successfully");
}

function* deleteSupplier({ payload: id }) {
  yield handleApiCall(supplierService.deleteSupplier, id);
  yield call(fetchAllSuppliers);
  toast.success("Supplier deleted successfully");
}

export default function* supplierSaga() {
  yield all([
    takeLatest("suppliers/fetchAll", fetchAllSuppliers),
    takeLatest("suppliers/create", createSupplier),
    takeLatest("suppliers/update", updateSupplier),
    takeLatest("suppliers/delete", deleteSupplier),
  ]);
}

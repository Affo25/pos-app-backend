import { all, takeLatest, put, call } from "redux-saga/effects";
import { toast } from "react-toastify";
import * as supplierService from "./supplierService";
import * as actions from "./supplierSlice";
import { handleApiCall } from "../utils/sagaHelpers";

function* fetchAllSuppliers() {
  const { ok, result } = yield call(
    handleApiCall,
    actions,
    supplierService.fetchAllSuppliers,
  );
  if (!ok) return;
  yield put(actions.fetchSuppliersSuccess(result));
}

function* createSupplier({ payload }) {
  const { ok } = yield call(
    handleApiCall,
    actions,
    supplierService.createSupplier,
    payload,
  );
  if (!ok) return;
  toast.success("Supplier created successfully");
  yield call(fetchAllSuppliers);
}

function* updateSupplier({ payload: { id, data } }) {
  const { ok } = yield call(
    handleApiCall,
    actions,
    supplierService.updateSupplier,
    id,
    data,
  );
  if (!ok) return;
  yield call(fetchAllSuppliers);
  toast.success("Supplier updated successfully");
}

function* deleteSupplier({ payload: id }) {
  const { ok } = yield call(
    handleApiCall,
    actions,
    supplierService.deleteSupplier,
    id,
  );
  if (!ok) return;
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

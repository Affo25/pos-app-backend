import { all, takeLatest, put, call } from "redux-saga/effects";
import { toast } from "react-toastify";
import * as saleService from "./saleService";
import * as actions from "./saleSlice";

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

function* fetchAllSales() {
  const sales = yield handleApiCall(saleService.fetchAllSales);
  yield put(actions.fetchSalesSuccess(sales));
}

function* createSale({ payload }) {
  yield handleApiCall(saleService.createSale, payload);
  toast.success("Sale created successfully");
  yield call(fetchAllSales);
}

function* updateSale({ payload: { id, data } }) {
  yield handleApiCall(saleService.updateSale, id, data);
  yield call(fetchAllSales);
  toast.success("Sale updated successfully");
}

function* deleteSale({ payload: id }) {
  yield handleApiCall(saleService.deleteSale, id);
  yield call(fetchAllSales);
  toast.success("Sale deleted successfully");
}

export default function* saleSaga() {
  yield all([
    takeLatest("sales/fetchAll", fetchAllSales),
    takeLatest("sales/create", createSale),
    takeLatest("sales/update", updateSale),
    takeLatest("sales/delete", deleteSale),
  ]);
}

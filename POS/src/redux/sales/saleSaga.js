import { all, takeLatest, put, call } from "redux-saga/effects";
import { toast } from "react-toastify";
import * as saleService from "./saleService";
import * as actions from "./saleSlice";
import { handleApiCall } from "../utils/sagaHelpers";

function* fetchAllSales() {
  const { ok, result } = yield call(
    handleApiCall,
    actions,
    saleService.fetchAllSales,
  );
  if (!ok) return;
  yield put(actions.fetchSalesSuccess(result));
}

function* createSale({ payload }) {
  const { ok } = yield call(handleApiCall, actions, saleService.createSale, payload);
  if (!ok) return;
  toast.success("Sale created successfully");
  yield call(fetchAllSales);
}

function* updateSale({ payload: { id, data } }) {
  const { ok } = yield call(
    handleApiCall,
    actions,
    saleService.updateSale,
    id,
    data,
  );
  if (!ok) return;
  yield call(fetchAllSales);
  toast.success("Sale updated successfully");
}

function* deleteSale({ payload: id }) {
  const { ok } = yield call(handleApiCall, actions, saleService.deleteSale, id);
  if (!ok) return;
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

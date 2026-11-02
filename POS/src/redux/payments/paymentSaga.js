import { all, takeLatest, put, call } from "redux-saga/effects";
import { toast } from "react-toastify";
import * as paymentService from "./paymentService";
import * as actions from "./paymentSlice";
import { handleApiCall } from "../utils/sagaHelpers";

function* fetchAllPayments() {
  const { ok, result } = yield call(
    handleApiCall,
    actions,
    paymentService.fetchAllPayments,
  );
  if (!ok) return;
  yield put(actions.fetchPaymentsSuccess(Array.isArray(result) ? result : []));
}

function* deletePayment({ payload: id }) {
  const { ok } = yield call(
    handleApiCall,
    actions,
    paymentService.deletePayment,
    id,
  );
  if (!ok) return;
  yield call(fetchAllPayments);
  toast.success("Payment cancelled");
}

export default function* paymentSaga() {
  yield all([
    takeLatest("payments/fetchAll", fetchAllPayments),
    takeLatest("payments/delete", deletePayment),
  ]);
}

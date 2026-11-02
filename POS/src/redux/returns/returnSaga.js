import { all, takeLatest, put, call } from "redux-saga/effects";
import { toast } from "react-toastify";
import * as returnService from "./returnService";
import * as actions from "./returnSlice";
import { handleApiCall } from "../utils/sagaHelpers";

function* fetchAllReturns() {
  const { ok, result: payload } = yield call(
    handleApiCall,
    actions,
    returnService.fetchAllReturns,
  );
  if (!ok) return;
  const returns = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.returns)
      ? payload.returns
      : [];
  yield put(actions.fetchReturnsSuccess(returns));
}

function* createReturn({ payload }) {
  const { ok } = yield call(
    handleApiCall,
    actions,
    returnService.createReturn,
    payload,
  );
  if (!ok) return;
  toast.success("Return created successfully");
  yield call(fetchAllReturns);
}

function* updateReturn({ payload: { id, data } }) {
  const { ok } = yield call(
    handleApiCall,
    actions,
    returnService.updateReturn,
    id,
    data,
  );
  if (!ok) return;
  yield call(fetchAllReturns);
  toast.success("Return updated successfully");
}

function* deleteReturn({ payload: id }) {
  const { ok } = yield call(
    handleApiCall,
    actions,
    returnService.deleteReturn,
    id,
  );
  if (!ok) return;
  yield call(fetchAllReturns);
  toast.success("Return deleted successfully");
}

export default function* returnSaga() {
  yield all([
    takeLatest("returns/fetchAll", fetchAllReturns),
    takeLatest("returns/create", createReturn),
    takeLatest("returns/update", updateReturn),
    takeLatest("returns/delete", deleteReturn),
  ]);
}

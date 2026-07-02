import { all, takeLatest, put, call } from "redux-saga/effects";
import { toast } from "react-toastify";
import * as returnService from "./returnService";
import * as actions from "./returnSlice";

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

function* fetchAllReturns() {
  const returns = yield handleApiCall(returnService.fetchAllReturns);
  yield put(actions.fetchReturnsSuccess(returns));
}

function* createReturn({ payload }) {
  yield handleApiCall(returnService.createReturn, payload);
  toast.success("Return created successfully");
  yield call(fetchAllReturns);
}

function* updateReturn({ payload: { id, data } }) {
  yield handleApiCall(returnService.updateReturn, id, data);
  yield call(fetchAllReturns);
  toast.success("Return updated successfully");
}

function* deleteReturn({ payload: id }) {
  yield handleApiCall(returnService.deleteReturn, id);
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

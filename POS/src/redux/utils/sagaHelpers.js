import { put, call } from "redux-saga/effects";
import { toast } from "react-toastify";

/**
 * Runs an API call with start/success/failure actions.
 * Does not rethrow — avoids cancelling sibling takeLatest watchers on network errors.
 */
export function* handleApiCall(actions, apiFn, ...args) {
  try {
    yield put(actions.operationStart());
    const result = yield call(apiFn, ...args);
    yield put(actions.operationSuccess());
    return { ok: true, result };
  } catch (error) {
    const message = error?.message || "Request failed";
    yield put(actions.operationFailure(message));
    toast.error(message);
    return { ok: false, error: message };
  }
}

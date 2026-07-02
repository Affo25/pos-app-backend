import { takeLatest, put, call } from "redux-saga/effects";
import { toast } from "react-toastify";
import * as settingService from "./settingService";
import * as actions from "./settingSlice";

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

function* fetchSettings() {
  const settings = yield handleApiCall(settingService.fetchSettings);
  yield put(actions.fetchSettingsSuccess(settings));
}

function* updateSettings({ payload }) {
  const settings = yield handleApiCall(settingService.updateSettings, payload);
  yield put(actions.updateSettingsSuccess(settings));
  toast.success("Settings updated successfully");
}

export default function* settingSaga() {
  yield takeLatest("settings/fetch", fetchSettings);
  yield takeLatest("settings/update", updateSettings);
}

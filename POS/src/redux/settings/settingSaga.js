import { takeLatest, put, call } from "redux-saga/effects";
import { toast } from "react-toastify";
import * as settingService from "./settingService";
import * as actions from "./settingSlice";
import { handleApiCall } from "../utils/sagaHelpers";

function normalizeSettings(payload) {
  return payload?.settings ?? payload ?? null;
}

function* fetchSettings() {
  const { ok, result } = yield call(
    handleApiCall,
    actions,
    settingService.fetchSettings,
  );
  if (!ok) return;
  yield put(actions.fetchSettingsSuccess(normalizeSettings(result)));
}

function* updateSettings({ payload }) {
  const { ok, result } = yield call(
    handleApiCall,
    actions,
    settingService.updateSettings,
    payload,
  );
  if (!ok) return;
  yield put(actions.updateSettingsSuccess(normalizeSettings(result)));
  toast.success("Settings updated successfully");
}

export default function* settingSaga() {
  yield takeLatest("settings/fetch", fetchSettings);
  yield takeLatest("settings/update", updateSettings);
}

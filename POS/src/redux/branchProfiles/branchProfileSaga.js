import { all, takeLatest, put, call } from "redux-saga/effects";
import { toast } from "react-toastify";
import * as branchProfileService from "./branchProfileService";
import * as actions from "./branchProfileSlice";

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

function* fetchAllBranchProfiles() {
  const branchProfiles = yield handleApiCall(
    branchProfileService.fetchAllBranchProfiles,
  );
  yield put(actions.fetchBranchProfilesSuccess(branchProfiles));
}

function* createBranchProfile({ payload }) {
  yield handleApiCall(branchProfileService.createBranchProfile, payload);
  toast.success("Branch profile created successfully");
  yield call(fetchAllBranchProfiles);
}

function* updateBranchProfile({ payload: { id, data } }) {
  yield handleApiCall(branchProfileService.updateBranchProfile, id, data);
  yield call(fetchAllBranchProfiles);
  toast.success("Branch profile updated successfully");
}

function* deleteBranchProfile({ payload: id }) {
  yield handleApiCall(branchProfileService.deleteBranchProfile, id);
  yield call(fetchAllBranchProfiles);
  toast.success("Branch profile deleted successfully");
}

export default function* branchProfileSaga() {
  yield all([
    takeLatest("branchProfiles/fetchAll", fetchAllBranchProfiles),
    takeLatest("branchProfiles/create", createBranchProfile),
    takeLatest("branchProfiles/update", updateBranchProfile),
    takeLatest("branchProfiles/delete", deleteBranchProfile),
  ]);
}

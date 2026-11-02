import { all, takeLatest, put, call } from "redux-saga/effects";
import { toast } from "react-toastify";
import * as branchProfileService from "./branchProfileService";
import * as actions from "./branchProfileSlice";
import { handleApiCall } from "../utils/sagaHelpers";

function* fetchAllBranchProfiles() {
  const { ok, result } = yield call(
    handleApiCall,
    actions,
    branchProfileService.fetchAllBranchProfiles,
  );
  if (!ok) return;
  yield put(actions.fetchBranchProfilesSuccess(result));
}

function* createBranchProfile({ payload }) {
  const { ok } = yield call(
    handleApiCall,
    actions,
    branchProfileService.createBranchProfile,
    payload,
  );
  if (!ok) return;
  toast.success("Branch profile created successfully");
  yield call(fetchAllBranchProfiles);
}

function* updateBranchProfile({ payload: { id, data } }) {
  const { ok } = yield call(
    handleApiCall,
    actions,
    branchProfileService.updateBranchProfile,
    id,
    data,
  );
  if (!ok) return;
  yield call(fetchAllBranchProfiles);
  toast.success("Branch profile updated successfully");
}

function* deleteBranchProfile({ payload: id }) {
  const { ok } = yield call(
    handleApiCall,
    actions,
    branchProfileService.deleteBranchProfile,
    id,
  );
  if (!ok) return;
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

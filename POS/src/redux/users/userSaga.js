import { all, takeLatest, put, call } from "redux-saga/effects";
import { toast } from "react-toastify";
import * as userService from "./userService";
import * as actions from "./userSlice";
import { handleApiCall } from "../utils/sagaHelpers";

function* fetchAllUsers() {
  const { ok, result } = yield call(
    handleApiCall,
    actions,
    userService.fetchAllUsers,
  );
  if (!ok) return;
  yield put(actions.fetchUsersSuccess(result));
}

function* createUser({ payload }) {
  const { ok } = yield call(
    handleApiCall,
    actions,
    userService.createUser,
    payload,
  );
  if (!ok) return;
  toast.success("User created successfully");
  yield call(fetchAllUsers);
}

function* updateUser({ payload: { id, data } }) {
  const { ok } = yield call(
    handleApiCall,
    actions,
    userService.updateUser,
    id,
    data,
  );
  if (!ok) return;
  yield call(fetchAllUsers);
  toast.success("User updated successfully");
}

function* deleteUser({ payload: id }) {
  const { ok } = yield call(handleApiCall, actions, userService.deleteUser, id);
  if (!ok) return;
  yield call(fetchAllUsers);
  toast.success("User deleted successfully");
}

export default function* userSaga() {
  yield all([
    takeLatest("users/fetchAll", fetchAllUsers),
    takeLatest("users/create", createUser),
    takeLatest("users/update", updateUser),
    takeLatest("users/delete", deleteUser),
  ]);
}

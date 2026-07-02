import { all, takeLatest, put, call } from "redux-saga/effects";
import { toast } from "react-toastify";
import * as userService from "./userService";
import * as actions from "./userSlice";

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

function* fetchAllUsers() {
  const users = yield handleApiCall(userService.fetchAllUsers);
  yield put(actions.fetchUsersSuccess(users));
}

function* createUser({ payload }) {
  yield handleApiCall(userService.createUser, payload);
  toast.success("User created successfully");
  yield call(fetchAllUsers);
}

function* updateUser({ payload: { id, data } }) {
  yield handleApiCall(userService.updateUser, id, data);
  yield call(fetchAllUsers);
  toast.success("User updated successfully");
}

function* deleteUser({ payload: id }) {
  yield handleApiCall(userService.deleteUser, id);
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

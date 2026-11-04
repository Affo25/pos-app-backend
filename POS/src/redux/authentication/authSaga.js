import { takeLatest, put, call } from "redux-saga/effects";
import { toast } from "react-toastify";
import Cookies from "js-cookie";
import * as authService from "./authService";
import * as actions from "./authSlice";

function* login({ payload }) {
  try {
    yield put(actions.loginStart());
    const data = yield call(authService.login, payload);
    const { token, ...user } = data;

    Cookies.set("token", token, { expires: 7 });
    localStorage.setItem("user", JSON.stringify(user));

    yield put(actions.loginSuccess({ user, token }));
    toast.success(`Welcome back, ${user.name || "Admin"}!`);
  } catch (error) {
    yield put(actions.loginFailure(error.message));
    toast.error(error.message);
  }
}

function* logout() {
  try {
    yield call(authService.logout);
  } catch {
    // Clear local session even if backend logout fails.
  } finally {
    Cookies.remove("token");
    localStorage.removeItem("user");
    yield put(actions.logoutSuccess());
    toast.info("Logged out successfully");
  }
}

function* refreshProfile() {
  try {
    const profile = yield call(authService.fetchProfile);
    if (!profile) return;
    const existing = (() => {
      try {
        return JSON.parse(localStorage.getItem("user") || "null") || {};
      } catch {
        return {};
      }
    })();
    const nextUser = {
      ...existing,
      ...profile,
      id: profile.id || profile._id || existing.id,
      role_name: profile.role_name || profile.role_id?.name || existing.role_name || "",
    };
    localStorage.setItem("user", JSON.stringify(nextUser));
    yield put(actions.updateUserProfile(nextUser));
  } catch {
    // Keep cached user if profile refresh fails.
  }
}

export default function* authSaga() {
  yield takeLatest("auth/login", login);
  yield takeLatest("auth/logout", logout);
  yield takeLatest("auth/refreshProfile", refreshProfile);
}

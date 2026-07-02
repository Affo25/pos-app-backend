import { createSlice } from "@reduxjs/toolkit";
import Cookies from "js-cookie";

const storedToken = Cookies.get("token");
let storedUser = null;

try {
  const raw = localStorage.getItem("user");
  storedUser = raw ? JSON.parse(raw) : null;
} catch {
  storedUser = null;
}

const initialState = {
  user: storedUser,
  token: storedToken || null,
  isAuthenticated: Boolean(storedToken),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginStart(state) {
      state.loading = true;
      state.error = null;
    },
    loginSuccess(state, action) {
      state.loading = false;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.error = null;
    },
    loginFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
    },
    logoutSuccess(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logoutSuccess } =
  authSlice.actions;

export const loginAction = (credentials) => ({
  type: "auth/login",
  payload: credentials,
});
export const logoutAction = () => ({ type: "auth/logout" });

export default authSlice.reducer;

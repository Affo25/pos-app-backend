import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  settings: null,
  loading: false,
  error: null,
};

const settingSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    operationStart(state) {
      state.loading = true;
      state.error = null;
    },
    operationSuccess(state) {
      state.loading = false;
    },
    operationFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    fetchSettingsSuccess(state, action) {
      state.settings = action.payload;
      state.loading = false;
    },
    updateSettingsSuccess(state, action) {
      state.settings = action.payload;
      state.loading = false;
    },
  },
});

export const {
  operationStart,
  operationSuccess,
  operationFailure,
  fetchSettingsSuccess,
  updateSettingsSuccess,
} = settingSlice.actions;

export const fetchSettingsAction = () => ({ type: "settings/fetch" });
export const updateSettingsAction = (data) => ({
  type: "settings/update",
  payload: data,
});

export default settingSlice.reducer;

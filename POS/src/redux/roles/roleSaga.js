import { all, takeLatest, put, call } from "redux-saga/effects";
import { toast } from "react-toastify";
import * as roleService from "./roleService";
import * as actions from "./roleSlice";

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

function* fetchAllRoles() {
  const roles = yield handleApiCall(roleService.fetchAllRoles);
  yield put(actions.fetchRolesSuccess(roles));
}

function* fetchPermissionCatalog() {
  const catalog = yield handleApiCall(roleService.fetchPermissionCatalog);
  yield put(actions.fetchCatalogSuccess(catalog));
}

function* selectRole({ payload: id }) {
  const role = yield handleApiCall(roleService.fetchRoleById, id);
  yield put(actions.selectRoleSuccess(role));
}

function* createRole({ payload }) {
  yield handleApiCall(roleService.createRole, payload);
  toast.success("Role created successfully");
  yield call(fetchAllRoles);
}

function* assignPermissions({ payload: { id, selections } }) {
  const role = yield handleApiCall(
    roleService.assignRolePermissions,
    id,
    selections,
  );
  yield put(actions.selectRoleSuccess(role));
  yield call(fetchAllRoles);
  toast.success("Permissions assigned successfully");
}

function* removePermissions({ payload: { id, selections } }) {
  const role = yield handleApiCall(
    roleService.removeRolePermissions,
    id,
    selections,
  );
  yield put(actions.selectRoleSuccess(role));
  yield call(fetchAllRoles);
  toast.success("Permissions removed successfully");
}

function* deleteRole({ payload: id }) {
  yield handleApiCall(roleService.deleteRole, id);
  yield put(actions.clearSelectedRole());
  toast.success("Role deleted successfully");
  yield call(fetchAllRoles);
}

export default function* roleSaga() {
  yield all([
    takeLatest("roles/fetchAll", fetchAllRoles),
    takeLatest("roles/fetchCatalog", fetchPermissionCatalog),
    takeLatest("roles/select", selectRole),
    takeLatest("roles/create", createRole),
    takeLatest("roles/assign", assignPermissions),
    takeLatest("roles/remove", removePermissions),
    takeLatest("roles/delete", deleteRole),
  ]);
}

import { all, takeLatest, put, call } from "redux-saga/effects";
import { toast } from "react-toastify";
import * as roleService from "./roleService";
import * as actions from "./roleSlice";
import { handleApiCall } from "../utils/sagaHelpers";

function* fetchAllRoles() {
  const { ok, result } = yield call(
    handleApiCall,
    actions,
    roleService.fetchAllRoles,
  );
  if (!ok) return;
  yield put(actions.fetchRolesSuccess(result));
}

function* fetchPermissionCatalog() {
  const { ok, result } = yield call(
    handleApiCall,
    actions,
    roleService.fetchPermissionCatalog,
  );
  if (!ok) return;
  yield put(actions.fetchCatalogSuccess(result));
}

function* selectRole({ payload: id }) {
  const { ok, result } = yield call(
    handleApiCall,
    actions,
    roleService.fetchRoleById,
    id,
  );
  if (!ok) return;
  yield put(actions.selectRoleSuccess(result));
}

function* createRole({ payload }) {
  const { ok } = yield call(
    handleApiCall,
    actions,
    roleService.createRole,
    payload,
  );
  if (!ok) return;
  toast.success("Role created successfully");
  yield call(fetchAllRoles);
}

function* assignPermissions({ payload: { id, selections } }) {
  const { ok, result } = yield call(
    handleApiCall,
    actions,
    roleService.assignRolePermissions,
    id,
    selections,
  );
  if (!ok) return;
  yield put(actions.selectRoleSuccess(result));
  yield call(fetchAllRoles);
  toast.success("Permissions assigned successfully");
}

function* removePermissions({ payload: { id, selections } }) {
  const { ok, result } = yield call(
    handleApiCall,
    actions,
    roleService.removeRolePermissions,
    id,
    selections,
  );
  if (!ok) return;
  yield put(actions.selectRoleSuccess(result));
  yield call(fetchAllRoles);
  toast.success("Permissions removed successfully");
}

function* deleteRole({ payload: id }) {
  const { ok } = yield call(handleApiCall, actions, roleService.deleteRole, id);
  if (!ok) return;
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

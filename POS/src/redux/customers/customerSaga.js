import { all, takeLatest, put, call } from "redux-saga/effects";
import { toast } from "react-toastify";
import * as customerService from "./customerService";
import * as actions from "./customerSlice";
import { handleApiCall } from "../utils/sagaHelpers";

function* fetchAllCustomers() {
  const { ok, result } = yield call(
    handleApiCall,
    actions,
    customerService.fetchAllCustomers,
  );
  if (!ok) return;
  yield put(actions.fetchCustomersSuccess(result));
}

function* createCustomer({ payload }) {
  const { ok } = yield call(
    handleApiCall,
    actions,
    customerService.createCustomer,
    payload,
  );
  if (!ok) return;
  toast.success("Customer created successfully");
  yield call(fetchAllCustomers);
}

function* updateCustomer({ payload: { id, data } }) {
  const { ok } = yield call(
    handleApiCall,
    actions,
    customerService.updateCustomer,
    id,
    data,
  );
  if (!ok) return;
  yield call(fetchAllCustomers);
  toast.success("Customer updated successfully");
}

function* deleteCustomer({ payload: id }) {
  const { ok } = yield call(
    handleApiCall,
    actions,
    customerService.deleteCustomer,
    id,
  );
  if (!ok) return;
  yield call(fetchAllCustomers);
  toast.success("Customer deleted successfully");
}

export default function* customerSaga() {
  yield all([
    takeLatest("customers/fetchAll", fetchAllCustomers),
    takeLatest("customers/create", createCustomer),
    takeLatest("customers/update", updateCustomer),
    takeLatest("customers/delete", deleteCustomer),
  ]);
}

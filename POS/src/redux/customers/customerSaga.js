import { all, takeLatest, put, call } from "redux-saga/effects";
import { toast } from "react-toastify";
import * as customerService from "./customerService";
import * as actions from "./customerSlice";

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

function* fetchAllCustomers() {
  const customers = yield handleApiCall(customerService.fetchAllCustomers);
  yield put(actions.fetchCustomersSuccess(customers));
}

function* createCustomer({ payload }) {
  yield handleApiCall(customerService.createCustomer, payload);
  toast.success("Customer created successfully");
  yield call(fetchAllCustomers);
}

function* updateCustomer({ payload: { id, data } }) {
  yield handleApiCall(customerService.updateCustomer, id, data);
  yield call(fetchAllCustomers);
  toast.success("Customer updated successfully");
}

function* deleteCustomer({ payload: id }) {
  yield handleApiCall(customerService.deleteCustomer, id);
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

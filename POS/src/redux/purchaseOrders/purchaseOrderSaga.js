import { all, takeLatest, put, call } from "redux-saga/effects";
import { toast } from "react-toastify";
import * as purchaseOrderService from "./purchaseOrderService";
import * as actions from "./purchaseOrderSlice";

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

function* fetchAllPurchaseOrders() {
  const purchaseOrders = yield handleApiCall(
    purchaseOrderService.fetchAllPurchaseOrders,
  );
  yield put(actions.fetchPurchaseOrdersSuccess(purchaseOrders));
}

function* createPurchaseOrder({ payload }) {
  yield handleApiCall(purchaseOrderService.createPurchaseOrder, payload);
  toast.success("Purchase order created successfully");
  yield call(fetchAllPurchaseOrders);
}

function* updatePurchaseOrder({ payload: { id, data } }) {
  yield handleApiCall(purchaseOrderService.updatePurchaseOrder, id, data);
  yield call(fetchAllPurchaseOrders);
  toast.success("Purchase order updated successfully");
}

function* deletePurchaseOrder({ payload: id }) {
  yield handleApiCall(purchaseOrderService.deletePurchaseOrder, id);
  yield call(fetchAllPurchaseOrders);
  toast.success("Purchase order deleted successfully");
}

export default function* purchaseOrderSaga() {
  yield all([
    takeLatest("purchaseOrders/fetchAll", fetchAllPurchaseOrders),
    takeLatest("purchaseOrders/create", createPurchaseOrder),
    takeLatest("purchaseOrders/update", updatePurchaseOrder),
    takeLatest("purchaseOrders/delete", deletePurchaseOrder),
  ]);
}

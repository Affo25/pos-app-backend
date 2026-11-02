import { all, takeLatest, put, call } from "redux-saga/effects";
import { toast } from "react-toastify";
import * as purchaseOrderService from "./purchaseOrderService";
import * as actions from "./purchaseOrderSlice";
import { handleApiCall } from "../utils/sagaHelpers";

function* fetchAllPurchaseOrders() {
  const { ok, result } = yield call(
    handleApiCall,
    actions,
    purchaseOrderService.fetchAllPurchaseOrders,
  );
  if (!ok) return;
  yield put(actions.fetchPurchaseOrdersSuccess(result));
}

function* createPurchaseOrder({ payload }) {
  const { ok } = yield call(
    handleApiCall,
    actions,
    purchaseOrderService.createPurchaseOrder,
    payload,
  );
  if (!ok) return;
  toast.success("Purchase order created successfully");
  yield call(fetchAllPurchaseOrders);
}

function* updatePurchaseOrder({ payload: { id, data } }) {
  const { ok } = yield call(
    handleApiCall,
    actions,
    purchaseOrderService.updatePurchaseOrder,
    id,
    data,
  );
  if (!ok) return;
  yield call(fetchAllPurchaseOrders);
  toast.success("Purchase order updated successfully");
}

function* deletePurchaseOrder({ payload: id }) {
  const { ok } = yield call(
    handleApiCall,
    actions,
    purchaseOrderService.deletePurchaseOrder,
    id,
  );
  if (!ok) return;
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

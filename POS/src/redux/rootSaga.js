import { all } from "redux-saga/effects";
import userSaga from "./users/userSaga";
import authSaga from "./authentication/authSaga";
import productSaga from "./products/productSaga";
import customerSaga from "./customers/customerSaga";
import categorySaga from "./categories/categorySaga";
import subCategorySaga from "./subCategories/subCategorySaga";
import supplierSaga from "./suppliers/supplierSaga";
import saleSaga from "./sales/saleSaga";
import returnSaga from "./returns/returnSaga";
import purchaseOrderSaga from "./purchaseOrders/purchaseOrderSaga";
import branchProfileSaga from "./branchProfiles/branchProfileSaga";
import settingSaga from "./settings/settingSaga";
import roleSaga from "./roles/roleSaga";

export default function* rootSaga() {
  yield all([
    userSaga(),
    authSaga(),
    productSaga(),
    customerSaga(),
    categorySaga(),
    subCategorySaga(),
    supplierSaga(),
    saleSaga(),
    returnSaga(),
    purchaseOrderSaga(),
    branchProfileSaga(),
    settingSaga(),
    roleSaga(),
  ]);
}

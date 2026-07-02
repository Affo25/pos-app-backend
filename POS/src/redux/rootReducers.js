import { combineReducers } from "@reduxjs/toolkit";
import authReducer from "./authentication/authSlice";
import userReducer from "./users/userSlice";
import productReducer from "./products/productSlice";
import customerReducer from "./customers/customerSlice";
import categoryReducer from "./categories/categorySlice";
import subCategoryReducer from "./subCategories/subCategorySlice";
import supplierReducer from "./suppliers/supplierSlice";
import saleReducer from "./sales/saleSlice";
import returnReducer from "./returns/returnSlice";
import purchaseOrderReducer from "./purchaseOrders/purchaseOrderSlice";
import branchProfileReducer from "./branchProfiles/branchProfileSlice";
import settingsReducer from "./settings/settingSlice";
import roleReducer from "./roles/roleSlice";
import templateReducer from "../core/redux/reducer";
import templateInitial from "../core/redux/initial.value";

const nestedReducer = combineReducers({
  auth: authReducer,
  users: userReducer,
  products: productReducer,
  customers: customerReducer,
  categories: categoryReducer,
  subCategories: subCategoryReducer,
  suppliers: supplierReducer,
  sales: saleReducer,
  returns: returnReducer,
  purchaseOrders: purchaseOrderReducer,
  branchProfiles: branchProfileReducer,
  settings: settingsReducer,
  roles: roleReducer,
});

const templateKeys = Object.keys(templateInitial);

const pickTemplateState = (state = {}) => {
  const template = {};
  templateKeys.forEach((key) => {
    if (state[key] !== undefined) {
      template[key] = state[key];
    }
  });
  return { ...templateInitial, ...template };
};

export default function rootReducer(state, action) {
  const nested = nestedReducer(
    {
      auth: state?.auth,
      users: state?.users,
      products: state?.products,
      customers: state?.customers,
      categories: state?.categories,
      subCategories: state?.subCategories,
      suppliers: state?.suppliers,
      sales: state?.sales,
      returns: state?.returns,
      purchaseOrders: state?.purchaseOrders,
      branchProfiles: state?.branchProfiles,
      settings: state?.settings,
      roles: state?.roles,
    },
    action,
  );
  const template = templateReducer(pickTemplateState(state), action);
  return { ...template, ...nested };
}

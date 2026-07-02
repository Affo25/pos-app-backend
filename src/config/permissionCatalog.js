const ACTION_LABELS = {
  add: "Create",
  edit: "Edit",
  delete: "Delete",
  view: "View",
};

const PERMISSION_MODULES = [
  { component: "dashboard", label: "Dashboard", actions: ["view"] },
  { component: "users", label: "Users", actions: ["add", "edit", "delete", "view"] },
  { component: "roles", label: "Roles & Permissions", actions: ["add", "edit", "delete", "view"] },
  { component: "products", label: "Products", actions: ["add", "edit", "delete", "view"] },
  { component: "categories", label: "Categories", actions: ["add", "edit", "delete", "view"] },
  { component: "subCategories", label: "Sub Categories", actions: ["add", "edit", "delete", "view"] },
  { component: "customers", label: "Customers", actions: ["add", "edit", "delete", "view"] },
  { component: "suppliers", label: "Suppliers", actions: ["add", "edit", "delete", "view"] },
  { component: "sales", label: "Sales", actions: ["add", "edit", "delete", "view"] },
  { component: "returns", label: "Returns", actions: ["add", "edit", "delete", "view"] },
  { component: "purchaseOrders", label: "Purchase Orders", actions: ["add", "edit", "delete", "view"] },
  { component: "branchProfiles", label: "Branch Profiles", actions: ["add", "edit", "delete", "view"] },
  { component: "settings", label: "Settings", actions: ["add", "edit", "delete", "view"] },
];

const emptyPermission = (module) => ({
  key: module.component,
  component: module.component,
  add: false,
  edit: false,
  delete: false,
  view: false,
});

const fullPermission = (module) => {
  const permission = emptyPermission(module);
  module.actions.forEach((action) => {
    permission[action] = true;
  });
  return permission;
};

const buildFullPermissions = () => PERMISSION_MODULES.map(fullPermission);

const getAllPageKeys = () => PERMISSION_MODULES.map((module) => module.component);

const countGrantedActions = (permissions = []) => {
  let total = 0;
  permissions.forEach((permission) => {
    ["add", "edit", "delete", "view"].forEach((action) => {
      if (permission?.[action]) total += 1;
    });
  });
  return total;
};

const getCatalogGrouped = () =>
  PERMISSION_MODULES.map((module) => ({
    component: module.component,
    label: module.label,
    actions: module.actions.map((action) => ({
      action,
      label: ACTION_LABELS[action] || action,
    })),
  }));

const mergePermissions = (permissions = []) => {
  const map = new Map(PERMISSION_MODULES.map((module) => [module.component, emptyPermission(module)]));

  permissions.forEach((permission) => {
    const component = permission?.component;
    if (!component || !map.has(component)) return;
    const current = map.get(component);
    ["add", "edit", "delete", "view"].forEach((action) => {
      if (permission[action]) current[action] = true;
    });
  });

  return Array.from(map.values());
};

const splitAssignedAndAvailable = (permissions = []) => {
  const merged = mergePermissions(permissions);
  const assigned = [];
  const available = [];

  PERMISSION_MODULES.forEach((module, index) => {
    const permission = merged[index];
    const grantedActions = module.actions.filter((action) => permission[action]);
    const missingActions = module.actions.filter((action) => !permission[action]);

    if (grantedActions.length) {
      assigned.push({
        ...module,
        permission,
        grantedActions,
      });
    }

    if (missingActions.length) {
      available.push({
        ...module,
        permission,
        missingActions,
      });
    }
  });

  return { assigned, available, merged };
};

module.exports = {
  ACTION_LABELS,
  PERMISSION_MODULES,
  buildFullPermissions,
  getAllPageKeys,
  countGrantedActions,
  getCatalogGrouped,
  mergePermissions,
  splitAssignedAndAvailable,
  emptyPermission,
  fullPermission,
};

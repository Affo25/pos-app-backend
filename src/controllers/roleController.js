const Role = require("../models/Role");
const {
  getCatalogGrouped,
  mergePermissions,
  countGrantedActions,
  splitAssignedAndAvailable,
  emptyPermission,
  PERMISSION_MODULES,
} = require("../config/permissionCatalog");

const formatRole = (role) => {
  const permissions = mergePermissions(role.permissions);
  return {
    ...role.toObject(),
    permissions,
    permissionCount: countGrantedActions(permissions),
  };
};

exports.getPermissionCatalog = async (_req, res) => {
  try {
    res.status(200).json(getCatalogGrouped());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRoles = async (_req, res) => {
  try {
    const roles = await Role.find().sort({ createdAt: 1 });
    res.status(200).json(roles.map(formatRole));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    const permissions = mergePermissions(role.permissions);
    const { assigned, available } = splitAssignedAndAvailable(permissions);

    res.status(200).json({
      ...formatRole(role),
      assigned,
      available,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createRole = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const description = String(req.body.description || "").trim();

    if (!name) {
      return res.status(400).json({ message: "Role name is required" });
    }

    const key = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");

    const existing = await Role.findOne({ key });
    if (existing) {
      return res.status(400).json({ message: "Role with this name already exists" });
    }

    const role = await Role.create({
      name,
      key,
      description,
      permissions: PERMISSION_MODULES.map(emptyPermission),
      isSystem: false,
    });

    res.status(201).json(formatRole(role));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    if (req.body.name !== undefined) {
      role.name = String(req.body.name).trim();
    }

    if (req.body.description !== undefined) {
      role.description = String(req.body.description).trim();
    }

    await role.save();
    res.status(200).json(formatRole(role));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateRolePermissions = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    role.permissions = mergePermissions(req.body.permissions || []);
    await role.save();

    const permissions = mergePermissions(role.permissions);
    const { assigned, available } = splitAssignedAndAvailable(permissions);

    res.status(200).json({
      ...formatRole(role),
      assigned,
      available,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.assignPermissions = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    const selections = Array.isArray(req.body.selections) ? req.body.selections : [];
    const permissions = mergePermissions(role.permissions);

    selections.forEach(({ component, actions = [] }) => {
      const permission = permissions.find((item) => item.component === component);
      if (!permission) return;
      actions.forEach((action) => {
        if (["add", "edit", "delete", "view"].includes(action)) {
          permission[action] = true;
        }
      });
    });

    role.permissions = permissions;
    await role.save();

    const merged = mergePermissions(role.permissions);
    const { assigned, available } = splitAssignedAndAvailable(merged);

    res.status(200).json({
      ...formatRole(role),
      assigned,
      available,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.removePermissions = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    const selections = Array.isArray(req.body.selections) ? req.body.selections : [];
    const permissions = mergePermissions(role.permissions);

    selections.forEach(({ component, actions = [] }) => {
      const permission = permissions.find((item) => item.component === component);
      if (!permission) return;
      actions.forEach((action) => {
        if (["add", "edit", "delete", "view"].includes(action)) {
          permission[action] = false;
        }
      });
    });

    role.permissions = permissions;
    await role.save();

    const merged = mergePermissions(role.permissions);
    const { assigned, available } = splitAssignedAndAvailable(merged);

    res.status(200).json({
      ...formatRole(role),
      assigned,
      available,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    if (role.isSystem) {
      return res.status(400).json({ message: "System roles cannot be deleted" });
    }

    await role.deleteOne();
    res.status(200).json({ message: "Role deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

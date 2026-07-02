const express = require("express");
const { protect, checkRole } = require("../middlewares/authMiddleware");
const roleController = require("../controllers/roleController");

const router = express.Router();

router.get(
  "/catalog",
  protect,
  checkRole(["superAdmin", "admin"]),
  roleController.getPermissionCatalog,
);
router.get("/", protect, checkRole(["superAdmin", "admin"]), roleController.getRoles);
router.get(
  "/:id",
  protect,
  checkRole(["superAdmin", "admin"]),
  roleController.getRoleById,
);
router.post("/", protect, checkRole(["superAdmin"]), roleController.createRole);
router.put(
  "/:id",
  protect,
  checkRole(["superAdmin"]),
  roleController.updateRole,
);
router.put(
  "/:id/permissions",
  protect,
  checkRole(["superAdmin"]),
  roleController.updateRolePermissions,
);
router.post(
  "/:id/assign",
  protect,
  checkRole(["superAdmin"]),
  roleController.assignPermissions,
);
router.post(
  "/:id/remove",
  protect,
  checkRole(["superAdmin"]),
  roleController.removePermissions,
);
router.delete(
  "/:id",
  protect,
  checkRole(["superAdmin"]),
  roleController.deleteRole,
);

module.exports = router;
